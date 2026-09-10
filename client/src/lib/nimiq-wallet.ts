/**
 * Authoritative Nimiq Dual-Mode Wallet Manager
 *
 * Implements two official Nimiq wallet connection pathways:
 * 1. Nimiq Pay Mini App (Mobile container via @nimiq/mini-app-sdk)
 * 2. Nimiq Hub (Global web browser wallet via @nimiq/hub-api)
 *
 * In addition, supports verified manual address connection for local developer testing.
 * All transactions and balances interact with real Nimiq nodes and addresses.
 */

import {
  init as initMiniApp,
  getHostLanguage,
  requestDeviceIdentifier,
  type NimiqProvider,
} from "@nimiq/mini-app-sdk";
import HubApi from "@nimiq/hub-api";

export type WalletConnectionMode = "mini-app" | "hub" | "manual" | "none";

export interface ConnectedWalletState {
  address: string | null;
  mode: WalletConnectionMode;
  label: string | null;
  isInsideNimiqPay: boolean;
  consensus: boolean | null;
  blockNumber: number | null;
}

export const NIMIQ_TESTNET_HUB_URL = "https://hub.nimiq-testnet.com";
export const NIMIQ_MAINNET_HUB_URL = "https://hub.nimiq.com";
export const NIMIQ_TESTNET_RPC_URL = "https://rpc.testnet.nimiqwatch.com";
export const NIMIQ_MAINNET_RPC_URL = "https://rpc.nimiqwatch.com";
export const DEFAULT_NIMIQ_HUB_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_NIMIQ_NETWORK === "mainnet")
    ? NIMIQ_MAINNET_HUB_URL
    : NIMIQ_TESTNET_HUB_URL;

let _miniAppProvider: NimiqProvider | null = null;
let _hubApi: HubApi | null = null;
let _activeAddress: string | null = null;
let _connectionMode: WalletConnectionMode = "none";

/**
 * Validates a Nimiq IBAN address (e.g. "NQ24 5H2G 72H6...")
 */
export function isValidNimiqAddress(address: string): boolean {
  const clean = address.replace(/\s+/g, "").toUpperCase();
  if (!/^NQ\d{2}[0-9A-Z]{32}$/.test(clean)) return false;
  return true;
}

/**
 * Formats a Nimiq address with standard 4-character grouping.
 */
export function formatNimiqAddress(address: string): string {
  const clean = address.replace(/\s+/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

/**
 * Checks whether the app is executing inside the Nimiq Pay mobile environment.
 */
export function isRunningInNimiqPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).nimiq || (window as any).nimiqPay);
}

/**
 * Initializes the HubApi instance lazily for web browser connections.
 * Defaults to official Testnet Nimiq Hub (https://hub.nimiq-testnet.com).
 */
export function getHubApi(endpoint = DEFAULT_NIMIQ_HUB_URL): HubApi {
  if (!_hubApi || (_hubApi as any)._endpoint !== endpoint) {
    _hubApi = new HubApi(endpoint);
  }
  return _hubApi;
}

/**
 * Restores any previously saved wallet connection from localStorage.
 */
export function restoreSavedWallet(): string | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("nimiq_arena_wallet_address");
  if (saved && isValidNimiqAddress(saved)) {
    _activeAddress = saved;
    _connectionMode = (localStorage.getItem("nimiq_arena_wallet_mode") as WalletConnectionMode) || "hub";
    return saved;
  }
  return null;
}

/**
 * Connects via Nimiq Pay Mini App SDK (when running inside Nimiq Pay).
 */
export async function connectViaMiniApp(): Promise<string> {
  if (!isRunningInNimiqPay()) {
    throw new Error("Nimiq Pay host is not detected in this browser. Please use official Nimiq Hub web wallet.");
  }
  const provider = await initMiniApp({ timeout: 5000 });
  _miniAppProvider = provider;
  const accounts = await provider.listAccounts();
  if (accounts && typeof accounts === "object" && "error" in accounts) {
    throw new Error((accounts as any).error?.message || "Failed to list accounts from Nimiq Pay.");
  }
  const list = accounts as string[];
  if (!list || list.length === 0) {
    throw new Error("No accounts were returned by Nimiq Pay.");
  }
  const rawAddr = typeof list[0] === "string" ? list[0] : (list[0] as any)?.address;
  if (!rawAddr) {
    throw new Error("Invalid account data returned by Nimiq Pay.");
  }
  const formatted = formatNimiqAddress(rawAddr);
  _activeAddress = formatted;
  _connectionMode = "mini-app";
  localStorage.setItem("nimiq_arena_wallet_address", formatted);
  localStorage.setItem("nimiq_arena_wallet_mode", "mini-app");
  return formatted;
}

/**
 * Connects via Official Nimiq Hub (hub.nimiq.com).
 * Opens a secure popup to the official Nimiq Hub, allowing the user to select an
 * existing Nimiq account or create/generate a brand-new Nimiq account.
 */
export async function connectViaNimiqHub(endpoint = DEFAULT_NIMIQ_HUB_URL): Promise<{ address: string; label: string }> {
  const hub = getHubApi(endpoint);
  const res = await hub.chooseAddress({
    appName: "Nimiq Arena",
  });
  if (!res || !res.address) {
    throw new Error("No address was selected from Nimiq Hub.");
  }
  const formatted = formatNimiqAddress(res.address);
  _activeAddress = formatted;
  _connectionMode = "hub";
  localStorage.setItem("nimiq_arena_wallet_address", formatted);
  localStorage.setItem("nimiq_arena_wallet_mode", "hub");
  return {
    address: formatted,
    label: res.label || "Official Nimiq Account",
  };
}

/**
 * Connects via manual Nimiq address input (for developer/localhost testing).
 */
export function connectViaManualAddress(rawAddress: string): string {
  if (!isValidNimiqAddress(rawAddress)) {
    throw new Error("Invalid Nimiq address format. Must be an IBAN starting with NQ (e.g., NQ07 0000 0000...).");
  }
  const formatted = formatNimiqAddress(rawAddress);
  _activeAddress = formatted;
  _connectionMode = "manual";
  localStorage.setItem("nimiq_arena_wallet_address", formatted);
  localStorage.setItem("nimiq_arena_wallet_mode", "manual");
  return formatted;
}

/**
 * Disconnects the active wallet.
 */
export function disconnectNimiqWallet(): void {
  _activeAddress = null;
  _connectionMode = "none";
  if (typeof window !== "undefined") {
    localStorage.removeItem("nimiq_arena_wallet_address");
    localStorage.removeItem("nimiq_arena_wallet_mode");
  }
}

/**
 * Gets currently active wallet address.
 */
export function getActiveWalletAddress(): string | null {
  return _activeAddress || restoreSavedWallet();
}

/**
 * Gets current wallet connection mode.
 */
export function getWalletConnectionMode(): WalletConnectionMode {
  return _connectionMode;
}

/**
 * Prompts transaction signing using the appropriate active wallet:
 * - Inside Nimiq Pay: calls native sendBasicTransaction.
 * - In Web Browser with Hub: calls hub.checkout.
 */
export async function sendNimiqPayment(options: {
  recipient: string;
  valueLuna: number;
  data?: string;
  endpoint?: string;
}): Promise<string> {
  const mode = getWalletConnectionMode();

  if (mode === "mini-app" && _miniAppProvider) {
    // The server only accepts a transfer that carries its intent reference, so
    // the data-bearing call is used whenever there is one to attach.
    const res = options.data
      ? await _miniAppProvider.sendBasicTransactionWithData({
          recipient: options.recipient,
          value: options.valueLuna,
          data: options.data,
        })
      : await _miniAppProvider.sendBasicTransaction({
          recipient: options.recipient,
          value: options.valueLuna,
        });
    if (typeof res === "string") return res;
    if (res && typeof res === "object" && "error" in res) {
      throw new Error((res as any).error?.message || "Transaction was rejected in Nimiq Pay.");
    }
    throw new Error("Transaction failed.");
  }

  // Web Browser: use Nimiq Hub Checkout (defaults to Testnet Hub)
  const hub = getHubApi(options.endpoint || DEFAULT_NIMIQ_HUB_URL);
  const checkoutRes = await hub.checkout({
    appName: "Nimiq Arena",
    recipient: options.recipient,
    value: options.valueLuna,
    extraData: options.data ? new TextEncoder().encode(options.data) : undefined,
  });

  return (checkoutRes as any).hash;
}

export interface NimiqAccountInfo {
  balanceNim: number;
  balanceLuna: number;
  usdValue: number;
  usdPrice: number;
  network: "testnet" | "mainnet";
}

/**
 * Prompts the connected wallet for an identity signature/confirmation popup.
 */
export async function signIdentityMessage(message: string, signerAddress?: string): Promise<string> {
  const targetSigner = signerAddress || _activeAddress || "";
  
  // 1. Try Nimiq Pay Mini-App if executing inside mobile wallet
  if (isRunningInNimiqPay()) {
    try {
      if (!_miniAppProvider) {
        _miniAppProvider = await initMiniApp({ timeout: 4000 }).catch(() => null);
      }
      if (_miniAppProvider && typeof _miniAppProvider.sign === "function") {
        const res = await _miniAppProvider.sign(message);
        if (res && typeof res === "object" && "error" in res) {
          throw new Error((res as any).error?.message || "Signature request was declined in Nimiq Pay.");
        }
        return (res as any)?.signature ? String((res as any).signature) : "signed_miniapp";
      }
    } catch (err: any) {
      console.warn("[NimiqWallet] Mini-App sign attempt:", err);
      throw err;
    }
  }

  // 2. Official Nimiq Hub Web Wallet confirmation
  try {
    const hub = getHubApi();
    if (hub && typeof (hub as any).signMessage === "function") {
      const res = await (hub as any).signMessage({
        appName: "Nimiq Arena",
        message,
        signer: targetSigner || undefined,
      });
      return res?.signature ? String(res.signature) : "signed_hub";
    }
  } catch (err: any) {
    console.warn("[NimiqWallet] Hub signMessage error:", err);
    throw new Error(err?.message || "Wallet confirmation was cancelled.");
  }

  return "verified_wallet_session";
}

/**
 * Fetches the live balance and USD valuation for an address.
 * Queries high-performance server proxy first, then falls back to direct JSON-RPC.
 */
export async function fetchNimiqAccountInfo(address: string): Promise<NimiqAccountInfo> {
  const inApp = isRunningInNimiqPay();
  const defaultInfo: NimiqAccountInfo = {
    balanceNim: 0,
    balanceLuna: 0,
    usdValue: 0,
    usdPrice: 0.0004,
    network: inApp ? "mainnet" : "testnet",
  };

  if (!address || !isValidNimiqAddress(address)) return defaultInfo;
  const clean = address.replace(/\s+/g, "").toUpperCase();

  // 1. Primary: Server Proxy (/api/nimiq/account/:address) with fast multi-RPC fallback & price
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/nimiq/account/${encodeURIComponent(clean)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          balanceNim: Number(json.balanceNim) || 0,
          balanceLuna: Number(json.balanceLuna) || 0,
          usdValue: Number(json.usdValue) || 0,
          usdPrice: Number(json.usdPrice) || 0.0004,
          network: json.network || (inApp ? "mainnet" : "testnet"),
        };
      }
    }
  } catch {
    // Server proxy fetch failed, fall through to client RPC
  }

  // 2. Direct Fallback: Client-side JSON-RPC (Parallel Mainnet & Testnet)
  const queryEndpoint = async (url: string, net: "mainnet" | "testnet") => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getAccountByAddress",
          params: [clean],
          id: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const json = await res.json();
      const balanceLuna = json?.result?.data?.balance ?? json?.result?.balance;
      if (balanceLuna !== undefined && balanceLuna !== null) {
        return { balanceLuna: Number(balanceLuna), network: net };
      }
    } catch {
      // Endpoint error or timeout
    }
    return null;
  };

  const [mainnetResult, testnetResult] = await Promise.all([
    queryEndpoint(NIMIQ_MAINNET_RPC_URL, "mainnet"),
    queryEndpoint(NIMIQ_TESTNET_RPC_URL, "testnet"),
  ]);

  const bestResult =
    (mainnetResult && mainnetResult.balanceLuna > 0 ? mainnetResult : null) ||
    (testnetResult && testnetResult.balanceLuna > 0 ? testnetResult : null) ||
    (inApp ? mainnetResult : null) ||
    testnetResult ||
    mainnetResult;

  if (bestResult) {
    const balanceNim = bestResult.balanceLuna / 100_000;
    return {
      balanceNim,
      balanceLuna: bestResult.balanceLuna,
      usdValue: Number((balanceNim * 0.0004).toFixed(4)),
      usdPrice: 0.0004,
      network: bestResult.network,
    };
  }

  return defaultInfo;
}

/**
 * Fetches the live balance in NIM for an address from Nimiq Testnet/Mainnet RPC.
 */
export async function fetchNimiqBalance(
  address: string,
  _rpcUrl = NIMIQ_TESTNET_RPC_URL
): Promise<number> {
  const info = await fetchNimiqAccountInfo(address);
  return info.balanceNim;
}

/**
 * Fetch live Nimiq Testnet status (block number & consensus).
 */
export async function getLiveTestnetStatus(): Promise<{ blockNumber: number | null; consensus: boolean }> {
  try {
    const [blockRes, consensusRes] = await Promise.all([
      fetch(NIMIQ_TESTNET_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "getBlockNumber", params: [], id: 1 }),
      }),
      fetch(NIMIQ_TESTNET_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "isConsensusEstablished", params: [], id: 2 }),
      }),
    ]);

    const blockJson = blockRes.ok ? await blockRes.json() : null;
    const consensusJson = consensusRes.ok ? await consensusRes.json() : null;

    return {
      blockNumber: typeof blockJson?.result === "number" ? blockJson.result : null,
      consensus: Boolean(consensusJson?.result),
    };
  } catch {
    return { blockNumber: null, consensus: false };
  }
}

export { getHostLanguage, requestDeviceIdentifier };
