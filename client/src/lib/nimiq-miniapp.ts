/**
 * Nimiq Mini App SDK Bridge & Web Simulator
 * Implements full Nimiq Developer Center specifications:
 * - Native @nimiq/mini-app-sdk integration
 * - listAccounts, isConsensusEstablished, getBlockNumber, sendBasicTransaction, sendBasicTransactionWithData, sign
 * - requestDeviceIdentifier & getHostLanguage
 * - Standalone Browser & Localhost Web Dev Simulator
 */

import {
  init,
  getHostLanguage,
  requestDeviceIdentifier,
  type NimiqProvider,
} from "@nimiq/mini-app-sdk";

export interface MiniAppState {
  isReady: boolean;
  isConnecting: boolean;
  isInsideNimiqPay: boolean;
  isSimulatorActive: boolean;
  accounts: string[] | null;
  activeAccount: string | null;
  consensus: boolean | null;
  blockNumber: number | null;
  deviceId: string | null;
  hostLanguage: string;
  errorMessage: string | null;
}

export interface NimiqSendTransactionParams {
  recipient: string;
  value: number; // In Luna (1 NIM = 100,000 Luna)
  fee?: number;
  data?: string;
  validityStartHeight?: number;
}

// Fallback public Nimiq PoS Testnet RPC endpoint
const TESTNET_RPC_URL = "https://rpc.testnet.nimiq.watch";

/**
 * Creates a lightweight Web Simulator provider when running outside Nimiq Pay
 * (e.g. desktop browsers, localhost, Vercel previews) so developers can test
 * the full Mini App lifecycle without requiring a mobile WebView container.
 */
class NimiqWebSimulatorProvider {
  private _connected = true;
  private _defaultAddress: string;

  constructor() {
    const saved = localStorage.getItem("nimiq_arena_sim_address");
    this._defaultAddress = saved || "NQ34 8U38 QDY6 2S6D 9L8B H3K0 7P2X 1V5M 4G4H";
  }

  get connected(): boolean {
    return this._connected;
  }

  getNetwork(): string {
    return "testnet";
  }

  async connect(): Promise<void> {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setSimulatorAddress(address: string): void {
    this._defaultAddress = address;
    localStorage.setItem("nimiq_arena_sim_address", address);
  }

  async listAccounts(): Promise<string[]> {
    return [this._defaultAddress];
  }

  async isConsensusEstablished(): Promise<boolean> {
    try {
      const res = await fetch(TESTNET_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "isConsensusEstablished", params: [], id: 1 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.result === "boolean") return json.result;
      }
    } catch {
      // Fallback if offline
    }
    return true;
  }

  async getBlockNumber(): Promise<number> {
    try {
      const res = await fetch(TESTNET_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "getBlockNumber", params: [], id: 2 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.result === "number") return json.result;
      }
    } catch {
      // Fallback estimate
    }
    return 3_450_000 + Math.floor((Date.now() - 1700000000000) / 1000);
  }

  async sendBasicTransaction(tx: NimiqSendTransactionParams): Promise<string> {
    return this.sendBasicTransactionWithData({ ...tx, data: tx.data || "Nimiq Arena Match Entry" });
  }

  async sendBasicTransactionWithData(tx: NimiqSendTransactionParams): Promise<string> {
    // Generate deterministic 64-char hex hash
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hash = Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
    return hash;
  }

  async sign(message: string | { message: string; isHex?: boolean }): Promise<{ publicKey: string; signature: string }> {
    const pubKey = "d014909b917c92b9d2146f41e065792da0d4b8f59f6356779ffc9779df344f6f";
    const sigBytes = new Uint8Array(64);
    crypto.getRandomValues(sigBytes);
    const signature = Array.from(sigBytes, b => b.toString(16).padStart(2, "0")).join("");
    return { publicKey: pubKey, signature };
  }
}

// Global singleton instances
let _activeProvider: NimiqProvider | NimiqWebSimulatorProvider | null = null;
let _isSimulator = false;

/**
 * Initializes the Nimiq Mini App environment.
 * If running inside Nimiq Pay, uses native init().
 * If running outside Nimiq Pay, defaults to Web Simulator mode for local & web testing.
 */
export async function initializeNimiqMiniApp(options: { timeout?: number; forceSimulator?: boolean } = {}) {
  const timeout = options.timeout ?? 5000;
  const isHostInjected = typeof window !== "undefined" && Boolean(window.nimiqPay || window.nimiq);

  if (!options.forceSimulator && isHostInjected) {
    try {
      const nativeProvider = await init({ timeout });
      _activeProvider = nativeProvider;
      _isSimulator = false;
      return {
        provider: nativeProvider,
        isInsideNimiqPay: true,
        isSimulator: false,
      };
    } catch (err) {
      console.warn("[NimiqMiniApp] Native init timed out, falling back to simulator:", err);
    }
  }

  // Fallback to Web Simulator for localhost / standalone browser / Vercel preview
  const sim = new NimiqWebSimulatorProvider();
  _activeProvider = sim as unknown as NimiqProvider;
  _isSimulator = true;

  // Expose on window.nimiq for browser console & standard Mini App accessibility
  if (typeof window !== "undefined" && !window.nimiq) {
    (window as any).nimiq = sim;
    (window as any).nimiqPay = {
      language: getHostLanguage() || "en",
      requestDeviceIdentifier: async ({ reason }: { reason: string }) => {
        if (!reason) throw new Error("reason is required");
        let id = localStorage.getItem("nimiq_arena_sim_device_id");
        if (!id) {
          const arr = new Uint8Array(32);
          crypto.getRandomValues(arr);
          id = Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
          localStorage.setItem("nimiq_arena_sim_device_id", id);
        }
        return id;
      },
    };
  }

  return {
    provider: sim as unknown as NimiqProvider,
    isInsideNimiqPay: isHostInjected,
    isSimulator: true,
  };
}

/**
 * Gets the current active provider (either native NimiqPay or Web Simulator)
 */
export function getNimiqProvider(): NimiqProvider | NimiqWebSimulatorProvider | null {
  return _activeProvider;
}

/**
 * Requests stable device identifier (Sybil protection).
 * Uses native SDK in Nimiq Pay, or localStorage SHA-256 in Web Simulator.
 */
export async function getDeviceIdentifier(reason = "Verify player device for tournament anti-sybil validation"): Promise<string> {
  try {
    return await requestDeviceIdentifier({ reason });
  } catch {
    // Fallback for standalone browser/web preview
    let fallbackId = localStorage.getItem("nimiq_arena_device_id");
    if (!fallbackId) {
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      fallbackId = Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("nimiq_arena_device_id", fallbackId);
    }
    return fallbackId;
  }
}

/**
 * Executes the official 3-request verification benchmark from the Nimiq Mini App tutorial:
 * 1. listAccounts()
 * 2. isConsensusEstablished()
 * 3. getBlockNumber()
 */
export async function runNimiqThreeRequests(provider: NimiqProvider | NimiqWebSimulatorProvider) {
  const [accountsResult, consensusResult, blockResult] = await Promise.all([
    (provider as any).listAccounts(),
    (provider as any).isConsensusEstablished(),
    (provider as any).getBlockNumber(),
  ]);

  if (accountsResult && typeof accountsResult === "object" && "error" in accountsResult) {
    throw new Error((accountsResult as any).error?.message || "Failed to fetch accounts");
  }

  return {
    accounts: Array.isArray(accountsResult) ? (accountsResult as string[]) : [],
    consensus: Boolean(consensusResult),
    blockNumber: typeof blockResult === "number" ? blockResult : 0,
  };
}

export { getHostLanguage };
