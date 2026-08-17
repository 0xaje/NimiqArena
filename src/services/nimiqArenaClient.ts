import type { ArenaApi } from './arenaApi';
import type { NimiqWalletPort, PaymentIntent } from '../types/nimiq';

export interface AuthenticatedSession {
  sessionToken: string;
  account: string;
}

export interface PaidMatchSubmission {
  intent: PaymentIntent;
  txHash: string;
  state: PaymentIntent['state'];
}

/**
 * Application orchestration layer. Backend verification remains authoritative;
 * this client only coordinates user-approved provider actions and API calls.
 */
export class NimiqArenaClient {
  constructor(
    private readonly wallet: NimiqWalletPort,
    private readonly api: ArenaApi,
  ) {}

  async authenticate(account: string): Promise<AuthenticatedSession> {
    const accounts = await this.wallet.listAccounts();
    if (!accounts.includes(account)) throw new Error('Requested account was not approved by the wallet.');
    await this.wallet.selectAccount(account);

    const challenge = await this.api.createAuthChallenge(account);
    const signed = await this.wallet.signChallenge(challenge.challengeId, account, challenge.message);
    const session = await this.api.createSession(signed);
    return { sessionToken: session.sessionToken, account };
  }

  async payForMatch(input: { matchId: string; payer: string; idempotencyKey: string }): Promise<PaidMatchSubmission> {
    const intent = await this.api.createPaymentIntent(input);
    const submission = await this.wallet.submitPayment(intent);
    const serverState = await this.api.submitPaymentHash(intent.intentId, submission.txHash);

    return {
      intent: serverState,
      txHash: submission.txHash,
      state: serverState.state,
    };
  }
}
