/**
 * Authoritative Nimiq Diagnostics & Forensic Types
 * Strictly adhere to Master Engineering Rules:
 * - NEVER log private keys, secrets, cookies, JWTs, or wallet credentials.
 * - Capture real runtime state, latency, and boundary events.
 */

export interface SafeAccountLog {
  accountCount: number;
  address: string | null;
  addressLength: number;
}

export type RpcAccountLookupStatus =
  | "IDLE"
  | "QUERYING"
  | "RPC_POSITIVE_BALANCE"
  | "RPC_ZERO_BALANCE"
  | "RPC_FAILED";

export interface DiscoveredAccountInfo {
  address: string;
  balanceNim: number | null;
  balanceLuna: number | null;
  status: RpcAccountLookupStatus;
  isActive: boolean;
}

export interface NimiqForensicReport {
  timestamp: string;
  buildCommit: string;
  buildTimestamp: string;
  sdkVersion: string;
  windowNimiqPresent: boolean;
  windowNimiqPayPresent: boolean;
  providerStatus: "NOT_CHECKED" | "INITIALIZING" | "CONNECTED" | "TIMED_OUT" | "FAILED";
  providerError: string | null;
  listAccountsStatus: "IDLE" | "CALLING" | "SUCCESS" | "EMPTY" | "ERROR";
  rawAccountCount: number;
  connectedAddress: string | null;
  connectedAddressLength: number;
  discoveredAccounts: DiscoveredAccountInfo[];
  consensusEstablished: boolean | null;
  blockNumber: number | null;
  networkConfigured: "TestAlbatross" | "MainAlbatross";
  rpcHost: string;
  rpcStatus: RpcAccountLookupStatus;
  rpcLatencyMs: number | null;
  rpcAccountType: string | null;
  rpcBlockHeight: number | null;
  rpcRawBalanceLuna: number | null;
  rpcConvertedBalanceNim: number | null;
  rpcError: string | null;
  frontendStateBalanceNim: number | null;
  frontendBalanceStatus: string | null;
  balanceComponentState: "RENDERED" | "LOADING" | "HIDDEN" | "UNAVAILABLE";
  auditLogs: Array<{
    timestamp: string;
    step: string;
    message: string;
    details?: any;
  }>;
}
