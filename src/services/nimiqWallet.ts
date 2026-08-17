import { ErrorResponse, init, type NimiqProvider, type SignatureResult } from '@nimiq/mini-app-sdk';
import type {
  NimiqWalletPort,
  PaymentIntent,
  PaymentSubmission,
  SignedChallenge,
  WalletSnapshot,
} from '../types/nimiq';

const INIT_TIMEOUT_MS = 10_000;

type WalletProvider = Pick<NimiqProvider, 'listAccounts' | 'sign' | 'sendBasicTransaction' | 'sendBasicTransactionWithData'>;

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object'
    && value !== null
    && 'error' in value
    && typeof (value as { error?: unknown }).error === 'object'
    && (value as { error?: unknown }).error !== null;
}

function providerError(value: unknown): Error {
  if (isErrorResponse(value)) {
    return new Error(value.error.message || 'Nimiq provider request failed.');
  }
  if (value instanceof Error) return value;
  return new Error(String(value));
}

function assertPositiveLuna(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Payment amount must be a positive integer amount in Luna.');
  }
}

/**
 * Browser-side adapter for the Nimiq Mini App SDK.
 *
 * This adapter only requests user-approved provider operations. It does not
 * create backend sessions, verify signatures, or mark payments as settled.
 */
export class NimiqMiniAppWallet implements NimiqWalletPort {
  private provider: WalletProvider | null = null;

  constructor(provider: WalletProvider | null = null) {
    this.provider = provider;
  }
  private snapshot: WalletSnapshot = {
    status: 'unavailable',
    accounts: [],
    selectedAccount: null,
    error: null,
  };

  async initialize(): Promise<WalletSnapshot> {
    if (this.provider) return this.getSnapshot();

    this.snapshot = { ...this.snapshot, status: 'initializing', error: null };

    try {
      this.provider = await init({ timeout: INIT_TIMEOUT_MS });
      this.snapshot = { ...this.snapshot, status: 'ready' };
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        status: 'unavailable',
        error: providerError(error).message,
      };
    }

    return this.getSnapshot();
  }

  async listAccounts(): Promise<string[]> {
    const provider = await this.requireProvider();
    this.snapshot = { ...this.snapshot, status: 'account-requested', error: null };

    try {
      const result = await provider.listAccounts();
      if (isErrorResponse(result)) throw providerError(result);

      this.snapshot = {
        ...this.snapshot,
        status: 'ready',
        accounts: result,
        error: null,
      };
      return result;
    } catch (error) {
      const normalized = providerError(error);
      this.snapshot = {
        ...this.snapshot,
        status: normalized.message.toLowerCase().includes('denied') ? 'denied' : 'error',
        error: normalized.message,
      };
      throw normalized;
    }
  }

  async selectAccount(account: string): Promise<WalletSnapshot> {
    if (!account || !this.snapshot.accounts.includes(account)) {
      throw new Error('Selected account is not present in the approved account list.');
    }

    this.snapshot = {
      ...this.snapshot,
      status: 'account-selected',
      selectedAccount: account,
      error: null,
    };
    return this.getSnapshot();
  }

  async signChallenge(challengeId: string, account: string, message: string): Promise<SignedChallenge> {
    const provider = await this.requireProvider();
    if (!challengeId.trim() || !message.trim()) throw new Error('Challenge ID and message are required.');
    if (this.snapshot.selectedAccount !== account) throw new Error('The challenge account is not the selected wallet account.');

    this.snapshot = { ...this.snapshot, status: 'authenticating', error: null };

    try {
      const result = await provider.sign(message);
      if (isErrorResponse(result)) throw providerError(result);
      const signature = result as SignatureResult;
      this.snapshot = { ...this.snapshot, status: 'account-selected' };
      return {
        challengeId,
        account,
        message,
        publicKey: signature.publicKey,
        signature: signature.signature,
      };
    } catch (error) {
      const normalized = providerError(error);
      this.snapshot = {
        ...this.snapshot,
        status: normalized.message.toLowerCase().includes('denied') ? 'denied' : 'error',
        error: normalized.message,
      };
      throw normalized;
    }
  }

  async submitPayment(intent: PaymentIntent): Promise<PaymentSubmission> {
    const provider = await this.requireProvider();
    assertPositiveLuna(intent.amountLuna);
    if (!intent.intentId || !intent.matchId || !intent.payer || !intent.recipient) {
      throw new Error('Payment intent is incomplete.');
    }
    if (this.snapshot.selectedAccount !== intent.payer) {
      throw new Error('Payment payer does not match the selected wallet account.');
    }
    if (new Date(intent.expiresAt).getTime() <= Date.now()) {
      throw new Error('Payment intent has expired.');
    }
    if (!['created', 'awaiting_user'].includes(intent.state)) {
      throw new Error(`Payment intent cannot be submitted from state: ${intent.state}.`);
    }

    try {
      const result = intent.data
        ? await provider.sendBasicTransactionWithData({
          recipient: intent.recipient,
          value: intent.amountLuna,
          data: intent.data,
        })
        : await provider.sendBasicTransaction({
          recipient: intent.recipient,
          value: intent.amountLuna,
        });

      if (isErrorResponse(result)) throw providerError(result);
      if (typeof result !== 'string' || result.length === 0) throw new Error('Nimiq provider returned an invalid transaction hash.');

      return { intentId: intent.intentId, txHash: result, state: 'submitted' };
    } catch (error) {
      throw providerError(error);
    }
  }

  getSnapshot(): WalletSnapshot {
    return { ...this.snapshot, accounts: [...this.snapshot.accounts] };
  }

  private async requireProvider(): Promise<WalletProvider> {
    if (this.provider) return this.provider;
    const snapshot = await this.initialize();
    if (!this.provider) throw new Error(snapshot.error ?? 'Nimiq Pay provider is unavailable.');
    return this.provider;
  }
}

export const nimiqWallet = new NimiqMiniAppWallet();
