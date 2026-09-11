/**
 * Authoritative Nimiq PoS Transaction Verifier
 *
 * Connects directly to Nimiq JSON-RPC endpoints to verify transaction hashes,
 * recipient addresses, transferred Luna values, block heights, and execution status.
 */

export interface NimiqRpcTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  confirmations: number;
  size?: number;
  relatedAddresses?: string[];
  from: string;
  fromType?: number;
  to: string;
  toType?: number;
  value: number; // In Luna (1 NIM = 100,000 Luna)
  fee: number;
  senderData?: string;
  recipientData?: string;
  flags?: number;
  validityStartHeight?: number;
  proof?: string;
  networkId?: number; // 5 = Testnet, 42 = Mainnet
  executionResult?: boolean;
}

export interface NimiqVerificationOptions {
  transactionHash: string;
  expectedRecipient: string;
  expectedValueLuna: number;
  expectedNetworkId?: number; // Default: 5 for testnet
  /**
   * Value the payer must have written into the transaction's recipient data.
   * Nimiq transfers carry no reference to what they were for, so without this
   * any transfer to the treasury settles any intent that names its hash.
   */
  expectedData?: string;
  minConfirmations?: number; // Default: 1
  rpcUrl?: string;
  timeoutMs?: number;
}

export type NimiqVerificationFailureReason =
  | 'invalid'
  | 'underpaid'
  | 'wrong_recipient'
  | 'execution_failed'
  | 'network_mismatch'
  | 'data_mismatch'
  | 'unconfirmed'
  | 'verification_failed';

export interface NimiqVerificationResult {
  success: boolean;
  transaction?: NimiqRpcTransaction;
  failureReason?: NimiqVerificationFailureReason;
  errorMessage?: string;
  rawResponse?: unknown;
}

import {
  NIMIQ_NETWORKS,
  NIMIQ_TESTNET_NETWORK_ID,
  NIMIQ_MAINNET_NETWORK_ID,
} from '@shared/nimiq-network';

export { NIMIQ_TESTNET_NETWORK_ID, NIMIQ_MAINNET_NETWORK_ID };

export const DEFAULT_NIMIQ_TESTNET_RPC = NIMIQ_NETWORKS.testnet.rpcUrl;
export const DEFAULT_NIMIQ_MAINNET_RPC = NIMIQ_NETWORKS.mainnet.rpcUrl;
export const DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS = NIMIQ_NETWORKS.testnet.fallbackRpcUrls;
export const DEFAULT_NIMIQ_MAINNET_FALLBACK_RPCS = NIMIQ_NETWORKS.mainnet.fallbackRpcUrls;

/**
 * Fallback endpoints for a network. Falling back across networks would query a
 * chain the transaction cannot be on, so each network keeps its own list.
 */
export function defaultFallbackRpcUrls(networkId: number): string[] {
  return networkId === NIMIQ_MAINNET_NETWORK_ID
    ? DEFAULT_NIMIQ_MAINNET_FALLBACK_RPCS
    : DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS;
}

/**
 * Normalizes a Nimiq IBAN address (e.g., "NQ81 C01N BASE..." -> "NQ81C01NBASE...")
 */
export function normalizeNimiqAddress(address: string): string {
  return address.replace(/\s+/g, '').trim().toUpperCase();
}

/**
 * Validates basic structure of a Nimiq 64-character hex transaction hash.
 */
export function isValidNimiqTxHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash.trim());
}

/**
 * Reads the recipient data a payer attached to a transaction.
 *
 * Albatross returns it hex-encoded, under `recipientData` on current nodes and
 * `data` on older ones. Returns null when the transaction carries none.
 */
export function decodeNimiqTransactionData(
  transaction: Pick<NimiqRpcTransaction, 'recipientData'> & { data?: string },
): string | null {
  const raw = transaction.recipientData ?? transaction.data ?? null;
  if (!raw) return null;

  const hex = raw.trim();
  if (hex.length === 0) return null;
  if (!/^([0-9a-fA-F]{2})+$/.test(hex)) return null;

  try {
    const bytes = Uint8Array.from(
      hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)),
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
  } catch {
    return null;
  }
}

/**
 * Fetches transaction details from a Nimiq JSON-RPC endpoint with automated failover.
 */
export async function getNimiqTransaction(
  hash: string,
  rpcUrl: string = DEFAULT_NIMIQ_TESTNET_RPC,
  timeoutMs: number = 10000,
  fallbackRpcUrls: string[] = DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS,
): Promise<{ transaction: NimiqRpcTransaction | null; error?: string; raw?: unknown }> {
  const cleanHash = hash.trim();
  if (!isValidNimiqTxHash(cleanHash)) {
    return { transaction: null, error: 'Invalid transaction hash format' };
  }

  // Build candidate RPC endpoints (requested primary + known fallbacks)
  const candidateUrls = [rpcUrl, ...fallbackRpcUrls.filter(u => u !== rpcUrl)];

  let lastError = 'RPC request failed';
  for (const currentUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getTransactionByHash',
          params: [cleanHash],
          id: 1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        lastError = `RPC HTTP error: ${res.status} ${res.statusText}`;
        continue;
      }

      const payload = (await res.json()) as {
        jsonrpc: string;
        result?: { data: NimiqRpcTransaction | null };
        error?: { code: number; message: string; data?: string };
      };

      if (payload.error) {
        return {
          transaction: null,
          error: payload.error.data || payload.error.message,
          raw: payload,
        };
      }

      const tx = payload.result?.data ?? null;
      return { transaction: tx, raw: payload };
    } catch (err: any) {
      lastError = err.name === 'AbortError' ? 'RPC request timed out' : err.message || String(err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { transaction: null, error: lastError };
}

/**
 * Authoritatively verifies a Nimiq transaction against expected payment criteria.
 */
export async function verifyNimiqPayment(
  options: NimiqVerificationOptions,
): Promise<NimiqVerificationResult> {
  const {
    transactionHash,
    expectedRecipient,
    expectedValueLuna,
    expectedNetworkId = NIMIQ_TESTNET_NETWORK_ID,
    expectedData,
    minConfirmations = 1,
    rpcUrl = expectedNetworkId === NIMIQ_MAINNET_NETWORK_ID
      ? DEFAULT_NIMIQ_MAINNET_RPC
      : DEFAULT_NIMIQ_TESTNET_RPC,
    timeoutMs = 10000,
  } = options;

  const { transaction, error, raw } = await getNimiqTransaction(
    transactionHash,
    rpcUrl,
    timeoutMs,
    defaultFallbackRpcUrls(expectedNetworkId),
  );

  if (!transaction) {
    return {
      success: false,
      failureReason: error && error.toLowerCase().includes('not found') ? 'invalid' : 'verification_failed',
      errorMessage: error || 'Transaction not found on Nimiq network',
      rawResponse: raw,
    };
  }

  // 1. Check execution status (if present on Albatross PoS)
  if (transaction.executionResult === false) {
    return {
      success: false,
      failureReason: 'execution_failed',
      errorMessage: 'Transaction reverted or failed execution on-chain',
      transaction,
      rawResponse: raw,
    };
  }

  // 2. Check network ID match (if returned by RPC)
  if (
    transaction.networkId !== undefined &&
    expectedNetworkId !== undefined &&
    transaction.networkId !== expectedNetworkId
  ) {
    return {
      success: false,
      failureReason: 'network_mismatch',
      errorMessage: `Network mismatch: expected network ${expectedNetworkId}, got ${transaction.networkId}`,
      transaction,
      rawResponse: raw,
    };
  }

  // 3. Check recipient address match (normalized)
  const normalizedActualRecipient = normalizeNimiqAddress(transaction.to);
  const normalizedExpectedRecipient = normalizeNimiqAddress(expectedRecipient);

  if (normalizedActualRecipient !== normalizedExpectedRecipient) {
    return {
      success: false,
      failureReason: 'wrong_recipient',
      errorMessage: `Recipient mismatch: expected ${normalizedExpectedRecipient}, received ${normalizedActualRecipient}`,
      transaction,
      rawResponse: raw,
    };
  }

  // 4. Check the payer bound this transfer to this intent
  if (expectedData) {
    const actualData = decodeNimiqTransactionData(transaction);
    if (actualData !== expectedData) {
      return {
        success: false,
        failureReason: 'data_mismatch',
        errorMessage: `Transaction is not bound to this payment intent: expected reference ${expectedData}, found ${actualData ?? 'none'}`,
        transaction,
        rawResponse: raw,
      };
    }
  }

  // 5. Check payment amount in Luna
  if (transaction.value < expectedValueLuna) {
    return {
      success: false,
      failureReason: 'underpaid',
      errorMessage: `Underpaid: expected at least ${expectedValueLuna} Luna, received ${transaction.value} Luna`,
      transaction,
      rawResponse: raw,
    };
  }

  // 6. Check block confirmation depth
  if (minConfirmations > 0 && (transaction.confirmations ?? 0) < minConfirmations) {
    return {
      success: false,
      failureReason: 'unconfirmed',
      errorMessage: `Insufficient confirmations: required ${minConfirmations}, current ${transaction.confirmations ?? 0}`,
      transaction,
      rawResponse: raw,
    };
  }

  return {
    success: true,
    transaction,
    rawResponse: raw,
  };
}
