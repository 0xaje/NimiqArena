import { describe, expect, it } from 'vitest';
import { devLeaderboard, devProfile } from '../src/data/devData';
import { nimiqWallet } from '../src/services/nimiqWallet';

describe('development preview boundaries', () => {
  it('keeps the current user consistent across profile and leaderboard preview data', () => {
    const current = devLeaderboard.find((entry) => entry.isCurrentUser);
    expect(current?.handle).toBe(devProfile.handle);
    expect(current?.rating).toBe(devProfile.rating);
  });

  it('does not simulate a wallet connection', async () => {
    expect(nimiqWallet.status).toBe('not-configured');
    await expect(nimiqWallet.connect()).rejects.toThrow('NOT IMPLEMENTED');
    await expect(nimiqWallet.requestPayment()).rejects.toThrow('NOT IMPLEMENTED');
  });
});
