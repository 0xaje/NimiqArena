export type WalletStatus =
  | 'unavailable'
  | 'initializing'
  | 'ready'
  | 'account-requested'
  | 'account-selected'
  | 'authenticating'
  | 'authenticated'
  | 'denied'
  | 'error';

export interface WalletSnapshot {
  status: WalletStatus;
  accounts: string[];
  selectedAccount: string | null;
  error: string | null;
}

export interface SignedChallenge {
  challengeId: string;
  account: string;
  message: string;
  publicKey: string;
  signature: string;
}

export interface PaymentIntent {
  intentId: string;
  matchId: string;
  payer: string;
  recipient: string;
  amountLuna: number;
  data?: string;
  expiresAt: string;
  state: 'created' | 'awaiting_user' | 'submitted' | 'pending' | 'verified' | 'rejected' | 'failed' | 'mismatch' | 'expired';
}

export interface PaymentSubmission {
  intentId: string;
  txHash: string;
  state: 'submitted';
}

export interface NimiqWalletPort {
  initialize(): Promise<WalletSnapshot>;
  listAccounts(): Promise<string[]>;
  selectAccount(account: string): Promise<WalletSnapshot>;
  signChallenge(challengeId: string, account: string, message: string): Promise<SignedChallenge>;
  submitPayment(intent: PaymentIntent): Promise<PaymentSubmission>;
  getSnapshot(): WalletSnapshot;
}
