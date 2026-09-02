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
export const NIMIQ_TESTNET_RPC_URL = "https://rpc.testnet.nimiq.watch";

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
 * Defaults to official Mainnet Nimiq Hub (https://hub.nimiq.com).
 */
export function getHubApi(endpoint = NIMIQ_MAINNET_HUB_URL): HubApi {
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
  const addr = list[0];
  _activeAddress = addr;
  _connectionMode = "mini-app";
  localStorage.setItem("nimiq_arena_wallet_address", addr);
  localStorage.setItem("nimiq_arena_wallet_mode", "mini-app");
  return addr;
}

/**
 * Connects via Official Nimiq Hub (hub.nimiq.com).
 * Opens a secure popup to the official Nimiq Hub, allowing the user to select an
 * existing Nimiq account or create/generate a brand-new Nimiq account.
 */
export async function connectViaNimiqHub(endpoint = NIMIQ_MAINNET_HUB_URL): Promise<{ address: string; label: string }> {
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
}): Promise<string> {
  const mode = getWalletConnectionMode();

  if (mode === "mini-app" && _miniAppProvider) {
    const res = await _miniAppProvider.sendBasicTransaction({
      recipient: options.recipient,
      value: options.valueLuna,
    });
    if (typeof res === "string") return res;
    if (res && typeof res === "object" && "error" in res) {
      throw new Error((res as any).error?.message || "Transaction was rejected in Nimiq Pay.");
    }
    throw new Error("Transaction failed.");
  }

  // Web Browser: use Nimiq Hub Checkout
  const hub = getHubApi();
  const checkoutRes = await hub.checkout({
    appName: "Nimiq Arena",
    recipient: options.recipient,
    value: options.valueLuna,
    extraData: options.data ? new TextEncoder().encode(options.data) : undefined,
  });

  // checkout returns a SignedTransaction or SimpleResult
  if ((checkoutRes as any).hash) {
    return (checkoutRes as any).hash;
  }

  throw new Error("Checkout did not return a transaction hash.");
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
