/**
 * Authoritative Single Source of Truth for Nimiq Network Configurations
 *
 * Enforces unified configuration across frontend, backend, RPC readers,
 * and payment verification services.
 */

export type NimiqNetworkId = "testnet" | "mainnet";
export type NimiqNetworkName = "TestAlbatross" | "MainAlbatross";

export interface NimiqNetworkConfig {
  id: NimiqNetworkId;
  name: NimiqNetworkName;
  networkId: number; // 5 for Testnet, 42 for Mainnet
  rpcUrl: string;
  fallbackRpcUrls: string[];
  hubUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  isTestnet: boolean;
}

export const NIMIQ_NETWORKS: Record<NimiqNetworkId, NimiqNetworkConfig> = {
  testnet: {
    id: "testnet",
    name: "TestAlbatross",
    networkId: 5,
    rpcUrl: "https://rpc.testnet.nimiqwatch.com",
    fallbackRpcUrls: [
      "https://rpc.testnet.nimiqwatch.com",
    ],
    hubUrl: "https://hub.nimiq-testnet.com",
    explorerUrl: "https://testnet.nimiqwatch.com",
    faucetUrl: "https://testnet.nimiq.watch/#faucet",
    isTestnet: true,
  },
  mainnet: {
    id: "mainnet",
    name: "MainAlbatross",
    networkId: 42,
    rpcUrl: "https://rpc.nimiqwatch.com",
    fallbackRpcUrls: [
      "https://rpc.nimiqwatch.com",
    ],
    hubUrl: "https://hub.nimiq.com",
    explorerUrl: "https://nimiqwatch.com",
    isTestnet: false,
  },
};

export const NIMIQ_TESTNET_NETWORK_ID = 5;
export const NIMIQ_MAINNET_NETWORK_ID = 42;

/**
 * Resolves network configuration from a network ID (number or string).
 */
export function getNimiqNetworkConfig(networkIdOrName?: number | string | null): NimiqNetworkConfig {
  if (typeof networkIdOrName === "number") {
    return networkIdOrName === NIMIQ_MAINNET_NETWORK_ID
      ? NIMIQ_NETWORKS.mainnet
      : NIMIQ_NETWORKS.testnet;
  }

  const normalized = String(networkIdOrName ?? "").trim().toLowerCase();
  if (normalized === "42" || normalized === "mainnet" || normalized === "mainalbatross") {
    return NIMIQ_NETWORKS.mainnet;
  }

  return NIMIQ_NETWORKS.testnet;
}

export function lunaToNim(luna: number | bigint | string): number {
  const num = typeof luna === "bigint" ? Number(luna) : Number(luna || 0);
  return num / 100_000;
}

export function nimToLuna(nim: number): number {
  return Math.round((Number(nim) || 0) * 100_000);
}

export function normalizeNimiqAddress(rawAddress: string): string {
  if (!rawAddress) return "";
  const cleaned = rawAddress.replace(/\s+/g, "").toUpperCase();
  // Format into standard NQxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}
