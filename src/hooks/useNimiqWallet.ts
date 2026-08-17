import { useCallback, useState } from 'react';
import { nimiqWallet } from '../services/nimiqWallet';
import type { PaymentIntent, SignedChallenge, WalletSnapshot } from '../types/nimiq';

export function useNimiqWallet() {
  const [snapshot, setSnapshot] = useState<WalletSnapshot>(nimiqWallet.getSnapshot());

  const initialize = useCallback(async () => {
    const next = await nimiqWallet.initialize();
    setSnapshot(next);
    return next;
  }, []);

  const listAccounts = useCallback(async () => {
    const accounts = await nimiqWallet.listAccounts();
    setSnapshot(nimiqWallet.getSnapshot());
    return accounts;
  }, []);

  const selectAccount = useCallback(async (account: string) => {
    const next = await nimiqWallet.selectAccount(account);
    setSnapshot(next);
    return next;
  }, []);

  const signChallenge = useCallback(async (challengeId: string, account: string, message: string): Promise<SignedChallenge> => {
    const signed = await nimiqWallet.signChallenge(challengeId, account, message);
    setSnapshot(nimiqWallet.getSnapshot());
    return signed;
  }, []);

  const submitPayment = useCallback(async (intent: PaymentIntent) => {
    const submission = await nimiqWallet.submitPayment(intent);
    setSnapshot(nimiqWallet.getSnapshot());
    return submission;
  }, []);

  return { snapshot, initialize, listAccounts, selectAccount, signChallenge, submitPayment };
}
