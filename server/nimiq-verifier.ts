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
  | 'unconfirmed'
  | 'verification_failed';

export interface NimiqVerificationResult {
  success: boolean;
  transaction?: NimiqRpcTransaction;
  failureReason?: NimiqVerificationFailureReason;
  errorMessage?: string;
  rawResponse?: unknown;
}

export const DEFAULT_NIMIQ_TESTNET_RPC = 'https://rpc.testnet.nimiqwatch.com';
export const DEFAULT_NIMIQ_MAINNET_RPC = 'https://rpc.nimiqwatch.com';
export const DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS = [
  'https://rpc.testnet.nimiqwatch.com',
  'https://testnet.nimiq.network:8443',
];

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
 * Fetches transaction details from a Nimiq JSON-RPC endpoint with automated failover.
 */
export async function getNimiqTransaction(
  hash: string,
  rpcUrl: string = DEFAULT_NIMIQ_TESTNET_RPC,
  timeoutMs: number = 10000,
): Promise<{ transaction: NimiqRpcTransaction | null; error?: string; raw?: unknown }> {
  const cleanHash = hash.trim();
  if (!isValidNimiqTxHash(cleanHash)) {
    return { transaction: null, error: 'Invalid transaction hash format' };
  }

  // Build candidate RPC endpoints (requested primary + known fallbacks)
  const candidateUrls = [rpcUrl, ...DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS.filter(u => u !== rpcUrl)];

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
    expectedNetworkId = 5, // Default to Testnet (5)
    minConfirmations = 1,
    rpcUrl = DEFAULT_NIMIQ_TESTNET_RPC,
    timeoutMs = 10000,
  } = options;

  const { transaction, error, raw } = await getNimiqTransaction(transactionHash, rpcUrl, timeoutMs);

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

  // 4. Check payment amount in Luna
  if (transaction.value < expectedValueLuna) {
    return {
      success: false,
      failureReason: 'underpaid',
      errorMessage: `Underpaid: expected at least ${expectedValueLuna} Luna, received ${transaction.value} Luna`,
      transaction,
      rawResponse: raw,
    };
  }

  // 5. Check block confirmation depth
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
