import { describe, it, expect, vi } from 'vitest';
import {
  normalizeNimiqAddress,
  isValidNimiqTxHash,
  verifyNimiqPayment,
  NimiqRpcTransaction,
} from './nimiq-verifier';

describe('normalizeNimiqAddress', () => {
  it('strips all whitespace and converts to uppercase', () => {
    expect(normalizeNimiqAddress('NQ81 C01N BASE 0000 0000')).toBe('NQ81C01NBASE00000000');
    expect(normalizeNimiqAddress('nq81 c01n base 0000')).toBe('NQ81C01NBASE0000');
    expect(normalizeNimiqAddress('   NQ07000000000000   ')).toBe('NQ07000000000000');
  });
});

describe('isValidNimiqTxHash', () => {
  it('validates 64-char hex hashes', () => {
    expect(isValidNimiqTxHash('3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a')).toBe(true);
    expect(isValidNimiqTxHash('3CD3908A903461DAB66CD71910D35C66564CA59983EEEB138DBD0BD93E647B3A')).toBe(true);
    expect(isValidNimiqTxHash('short-hash')).toBe(false);
    expect(isValidNimiqTxHash('zzzz908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a')).toBe(false);
  });
});

describe('verifyNimiqPayment pure logic', () => {
  const sampleTx: NimiqRpcTransaction = {
    hash: '3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a',
    blockNumber: 8841030,
    timestamp: 1786846535161,
    confirmations: 10,
    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
    to: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    value: 500000, // 5 NIM in Luna
    fee: 0,
    networkId: 5,
    executionResult: true,
  };

  it('rejects invalid hash format without making network calls', async () => {
    const res = await verifyNimiqPayment({
      transactionHash: 'invalid-hash',
      expectedRecipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
      expectedValueLuna: 500000,
    });
    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('verification_failed');
  });

  it('verifies valid transaction when recipient, value, and network match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: sampleTx },
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: 'NQ0700000000000000000000000000000000', // Unspaced
      expectedValueLuna: 500000,
      expectedNetworkId: 5,
      minConfirmations: 1,
    });

    expect(res.success).toBe(true);
    expect(res.transaction?.hash).toBe(sampleTx.hash);
    expect(res.transaction?.value).toBe(500000);
    vi.unstubAllGlobals();
  });

  it('rejects when recipient does not match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: sampleTx },
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: 'NQ99 WRON GREC IPIE NT00 0000 0000 0000 0000',
      expectedValueLuna: 500000,
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('wrong_recipient');
    vi.unstubAllGlobals();
  });

  it('rejects underpaid transactions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: sampleTx }, // Value is 500000
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: sampleTx.to,
      expectedValueLuna: 1000000, // Demands 10 NIM (1,000,000 Luna)
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('underpaid');
    vi.unstubAllGlobals();
  });

  it('rejects failed or reverted executionResult', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: { ...sampleTx, executionResult: false } },
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: sampleTx.to,
      expectedValueLuna: 500000,
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('execution_failed');
    vi.unstubAllGlobals();
  });

  it('rejects network mismatch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: { ...sampleTx, networkId: 42 } }, // Mainnet tx
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: sampleTx.to,
      expectedValueLuna: 500000,
      expectedNetworkId: 5, // Expected testnet
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('network_mismatch');
    vi.unstubAllGlobals();
  });

  it('rejects unconfirmed transactions when minConfirmations not met', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: { data: { ...sampleTx, confirmations: 0 } },
      }),
    }));

    const res = await verifyNimiqPayment({
      transactionHash: sampleTx.hash,
      expectedRecipient: sampleTx.to,
      expectedValueLuna: 500000,
      minConfirmations: 2,
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('unconfirmed');
    vi.unstubAllGlobals();
  });
});
