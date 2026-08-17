import { describe, expect, it } from 'vitest';
import { devLeaderboard, devProfile } from '../src/data/devData';
import { NimiqArenaClient } from '../src/services/nimiqArenaClient';
import { NimiqMiniAppWallet } from '../src/services/nimiqWallet';
import type { PaymentIntent } from '../src/types/nimiq';

const account = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const recipient = 'NQ08 0000 0000 0000 0000 0000 0000 0000 0000';

function createProvider() {
  return {
    listAccounts: async () => [account],
    sign: async () => ({ publicKey: 'pub-key', signature: 'signature' }),
    sendBasicTransaction: async (tx: { recipient: string; value: number }) => {
      expect(tx).toEqual({ recipient, value: 100_000 });
      return 'tx-hash-1';
    },
    sendBasicTransactionWithData: async (tx: { recipient: string; value: number; data: string }) => {
      expect(tx).toEqual({ recipient, value: 100_000, data: 'arena:intent-1' });
      return 'tx-hash-2';
    },
  };
}

const intent: PaymentIntent = {
  intentId: 'intent-1',
  matchId: 'match-1',
  payer: account,
  recipient,
  amountLuna: 100_000,
  data: 'arena:intent-1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  state: 'awaiting_user',
};

describe('development preview boundaries', () => {
  it('keeps the current user consistent across profile and leaderboard preview data', () => {
    const current = devLeaderboard.find((entry) => entry.isCurrentUser);
    expect(current?.handle).toBe(devProfile.handle);
    expect(current?.rating).toBe(devProfile.rating);
  });
});

describe('NimiqMiniAppWallet', () => {
  it('discovers and selects an approved account, then signs the backend challenge', async () => {
    const wallet = new NimiqMiniAppWallet(createProvider());
    await expect(wallet.listAccounts()).resolves.toEqual([account]);
    await wallet.selectAccount(account);

    await expect(wallet.signChallenge('challenge-1', account, 'nimiq-arena challenge')).resolves.toEqual({
      challengeId: 'challenge-1',
      account,
      message: 'nimiq-arena challenge',
      publicKey: 'pub-key',
      signature: 'signature',
    });
  });

  it('submits the exact backend payment intent and returns only the provider hash', async () => {
    const wallet = new NimiqMiniAppWallet(createProvider());
    await wallet.listAccounts();
    await wallet.selectAccount(account);

    await expect(wallet.submitPayment(intent)).resolves.toEqual({
      intentId: 'intent-1',
      txHash: 'tx-hash-2',
      state: 'submitted',
    });
  });

  it('rejects payment intents that are expired or owned by another account', async () => {
    const wallet = new NimiqMiniAppWallet(createProvider());
    await wallet.listAccounts();
    await wallet.selectAccount(account);

    await expect(wallet.submitPayment({ ...intent, expiresAt: new Date(Date.now() - 1_000).toISOString() })).rejects.toThrow('expired');
    await expect(wallet.submitPayment({ ...intent, payer: 'NQ09 0000 0000 0000 0000 0000 0000 0000 0000' })).rejects.toThrow('does not match');
  });
});

describe('NimiqArenaClient', () => {
  it('completes challenge authentication through API and wallet boundaries', async () => {
    const wallet = new NimiqMiniAppWallet(createProvider());
    const api = {
      createAuthChallenge: async () => ({ challengeId: 'challenge-1', account, message: 'challenge', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
      createSession: async (input: { account: string; signature: string }) => {
        expect(input.account).toBe(account);
        expect(input.signature).toBe('signature');
        return { sessionToken: 'session-token' };
      },
      createPaymentIntent: async () => intent,
      submitPaymentHash: async () => ({ ...intent, state: 'submitted' as const }),
      getPaymentIntent: async () => intent,
    };
    const client = new NimiqArenaClient(wallet, api);

    await expect(client.authenticate(account)).resolves.toEqual({ sessionToken: 'session-token', account });
  });

  it('returns submitted server state and never upgrades it locally to verified', async () => {
    const wallet = new NimiqMiniAppWallet(createProvider());
    const api = {
      createAuthChallenge: async () => ({ challengeId: 'challenge-1', account, message: 'challenge', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
      createSession: async () => ({ sessionToken: 'session-token' }),
      createPaymentIntent: async () => intent,
      submitPaymentHash: async (_intentId: string, txHash: string) => ({ ...intent, state: 'submitted' as const, data: txHash }),
      getPaymentIntent: async () => intent,
    };
    const client = new NimiqArenaClient(wallet, api);

    await wallet.listAccounts();
    await wallet.selectAccount(account);
    await expect(client.payForMatch({ matchId: 'match-1', payer: account, idempotencyKey: 'request-1' })).resolves.toMatchObject({ state: 'submitted', txHash: 'tx-hash-2' });
  });
});
