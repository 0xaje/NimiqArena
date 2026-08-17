import type { NimiqWalletPort } from '../types/domain';

/**
 * Production boundary only. The frontend milestone intentionally does not initialize
 * @nimiq/mini-app-sdk or request wallet permissions. Callers receive an explicit error
 * instead of a simulated connection, balance, signing result, or payment.
 */
export const nimiqWallet: NimiqWalletPort = {
  status: 'not-configured',
  async connect(): Promise<never> {
    throw new Error('Nimiq wallet integration is NOT IMPLEMENTED in this frontend milestone.');
  },
  async requestPayment(): Promise<never> {
    throw new Error('NIM payments are NOT IMPLEMENTED in this frontend milestone.');
  },
};
