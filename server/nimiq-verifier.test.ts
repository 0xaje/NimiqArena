import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  normalizeNimiqAddress,
  isValidNimiqTxHash,
  verifyNimiqPayment,
  decodeNimiqTransactionData,
  defaultFallbackRpcUrls,
  DEFAULT_NIMIQ_MAINNET_RPC,
  DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS,
  NIMIQ_MAINNET_NETWORK_ID,
  NIMIQ_TESTNET_NETWORK_ID,
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

describe('intent binding', () => {
  const hash = '3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a';
  const recipient = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

  function stubTransaction(overrides: Record<string, unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: {
            data: {
              hash,
              blockNumber: 100,
              timestamp: Date.now(),
              confirmations: 12,
              from: 'NQ11 SOME SEND ER00 0000 0000 0000 0000 0000',
              to: 'NQ0700000000000000000000000000000000',
              value: 100000,
              fee: 0,
              networkId: 5,
              executionResult: true,
              ...overrides,
            },
          },
        }),
      }),
    );
  }

  afterEach(() => vi.unstubAllGlobals());

  it('decodes hex recipient data', () => {
    // "intent-abc" in hex
    expect(
      decodeNimiqTransactionData({ recipientData: '696e74656e742d616263' }),
    ).toBe('intent-abc');
    expect(decodeNimiqTransactionData({ recipientData: undefined })).toBeNull();
    expect(decodeNimiqTransactionData({ recipientData: '' })).toBeNull();
    expect(decodeNimiqTransactionData({ recipientData: 'nothex' })).toBeNull();
  });

  it('reads the legacy data field when recipientData is absent', () => {
    expect(
      decodeNimiqTransactionData({
        recipientData: undefined,
        data: '696e74656e742d616263',
      }),
    ).toBe('intent-abc');
  });

  it('accepts a transfer carrying the expected intent reference', async () => {
    stubTransaction({ recipientData: '696e74656e742d616263' });

    const res = await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: recipient,
      expectedValueLuna: 100000,
      expectedData: 'intent-abc',
    });

    expect(res.success).toBe(true);
  });

  it('refuses a transfer that names a different intent', async () => {
    // The payer's own transaction, replayed against someone else's intent.
    stubTransaction({ recipientData: '696e74656e742d616263' });

    const res = await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: recipient,
      expectedValueLuna: 100000,
      expectedData: 'intent-xyz',
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('data_mismatch');
  });

  it('refuses an unbound transfer to the treasury', async () => {
    // Anyone can watch the treasury address and copy a hash off the chain;
    // without a reference there is nothing tying it to the claimant.
    stubTransaction({ recipientData: undefined });

    const res = await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: recipient,
      expectedValueLuna: 100000,
      expectedData: 'intent-abc',
    });

    expect(res.success).toBe(false);
    expect(res.failureReason).toBe('data_mismatch');
  });

  it('still verifies when no binding is required', async () => {
    stubTransaction({ recipientData: undefined });

    const res = await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: recipient,
      expectedValueLuna: 100000,
    });

    expect(res.success).toBe(true);
  });
});

describe('network routing', () => {
  const hash = '3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a';

  afterEach(() => vi.unstubAllGlobals());

  it('keeps fallback endpoints on the network being verified', () => {
    expect(defaultFallbackRpcUrls(NIMIQ_TESTNET_NETWORK_ID)).toEqual(
      DEFAULT_NIMIQ_TESTNET_FALLBACK_RPCS,
    );
    // A mainnet verification must never fall back to a testnet node.
    expect(
      defaultFallbackRpcUrls(NIMIQ_MAINNET_NETWORK_ID).some(url =>
        /testnet/i.test(url),
      ),
    ).toBe(false);
  });

  it('defaults the endpoint to the mainnet node when verifying mainnet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', result: { data: null } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
      expectedValueLuna: 1,
      expectedNetworkId: NIMIQ_MAINNET_NETWORK_ID,
    });

    const calledUrls = fetchMock.mock.calls.map(call => String(call[0]));
    expect(calledUrls[0]).toBe(DEFAULT_NIMIQ_MAINNET_RPC);
    expect(calledUrls.some(url => /testnet/i.test(url))).toBe(false);
  });

  it('honours an explicitly configured endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', result: { data: null } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await verifyNimiqPayment({
      transactionHash: hash,
      expectedRecipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
      expectedValueLuna: 1,
      expectedNetworkId: NIMIQ_MAINNET_NETWORK_ID,
      rpcUrl: 'https://rpc.example.internal',
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe('https://rpc.example.internal');
  });
});
