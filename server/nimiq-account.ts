import type { Express, Request, Response } from "express";
import { normalizeNimiqAddress } from "./nimiq-verifier";

interface CachedAccount {
  balanceNim: number;
  balanceLuna: number;
  network: "testnet" | "mainnet";
  usdPrice: number;
  usdValue: number;
  cachedAt: number;
}

const accountCache = new Map<string, CachedAccount>();
const CACHE_TTL_MS = 10_000; // 10 seconds

let cachedUsdPrice = 0.0004;
let priceLastFetched = 0;
const PRICE_TTL_MS = 5 * 60_000; // 5 minutes

export async function fetchNimiqUsdPrice(): Promise<number> {
  const now = Date.now();
  if (now - priceLastFetched < PRICE_TTL_MS) {
    return cachedUsdPrice;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd",
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (typeof data?.["nimiq-2"]?.usd === "number" && data["nimiq-2"].usd > 0) {
        cachedUsdPrice = data["nimiq-2"].usd;
        priceLastFetched = now;
      }
    }
  } catch (e) {
    // transient price fetch error, use last known price
  }
  return cachedUsdPrice;
}

async function queryRpcAccount(rpcUrl: string, address: string, timeoutMs = 5000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getAccountByAddress",
        params: [address],
        id: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    if (json?.error) return null;
    const luna = json?.result?.data?.balance ?? json?.result?.balance;
    if (luna !== undefined && luna !== null) {
      return Number(luna);
    }
    return 0;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

const TESTNET_RPCS = [
  "https://rpc.testnet.nimiqwatch.com",
];
const MAINNET_RPCS = [
  "https://rpc.nimiqwatch.com",
];

async function queryRpcWithFallbacks(urls: string[], address: string, timeoutMs = 6000): Promise<number | null> {
  for (const url of urls) {
    const res = await queryRpcAccount(url, address, timeoutMs);
    if (res !== null) return res;
  }
  return null;
}

export async function getLiveAccountBalance(
  rawAddress: string,
  preferredNetwork: "testnet" | "mainnet" = "testnet"
) {
  const clean = normalizeNimiqAddress(rawAddress);
  if (!/^NQ\d{2}[A-Z0-9]{32}$/.test(clean)) {
    throw new Error("Invalid Nimiq address format");
  }

  const cacheKey = `${clean}_${preferredNetwork}`;
  // Check cache
  const cached = accountCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const usdPrice = await fetchNimiqUsdPrice();

  let balanceLuna = 0;
  let network: "testnet" | "mainnet" = preferredNetwork;

  if (preferredNetwork === "testnet") {
    // Query Testnet RPC directly
    const testnetLuna = await queryRpcWithFallbacks(TESTNET_RPCS, clean, 6000);
    balanceLuna = testnetLuna ?? 0;
    network = "testnet";
  } else {
    // Query Mainnet RPC directly
    const mainnetLuna = await queryRpcWithFallbacks(MAINNET_RPCS, clean, 6000);
    balanceLuna = mainnetLuna ?? 0;
    network = "mainnet";
  }

  const finalLuna = balanceLuna ?? 0;
  const balanceNim = finalLuna / 100_000;
  const usdValue = Number((balanceNim * usdPrice).toFixed(4));

  const result: CachedAccount = {
    balanceNim,
    balanceLuna: finalLuna,
    network,
    usdPrice,
    usdValue,
    cachedAt: Date.now(),
  };

  accountCache.set(cacheKey, result);
  return result;
}

export function registerNimiqAccountRoutes(app: Express) {
  app.get("/api/nimiq/account/:address", async (req: Request, res: Response) => {
    try {
      const address = req.params.address;
      const preferredNetwork = (req.query.network === "mainnet" ? "mainnet" : "testnet") as "testnet" | "mainnet";
      const account = await getLiveAccountBalance(address, preferredNetwork);
      res.json({
        success: true,
        address: normalizeNimiqAddress(address),
        ...account,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to query Nimiq account balance",
      });
    }
  });

  app.get("/api/nimiq/price", async (_req: Request, res: Response) => {
    const usd = await fetchNimiqUsdPrice();
    res.json({
      success: true,
      currency: "USD",
      usdPrice: usd,
      timestamp: Date.now(),
    });
  });
}
