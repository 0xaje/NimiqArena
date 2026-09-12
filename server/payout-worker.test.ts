import { describe, expect, it, vi, beforeEach } from "vitest";
import { processMatchPayout, type PayoutWorkerConfig } from "./payout-worker";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getMatchById: vi.fn(),
  getMatchEscrowDetails: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

vi.mock("@nimiq/core", () => ({
  PrivateKey: {
    fromHex: () => ({}),
  },
  KeyPair: {
    derive: () => ({
      publicKey: {
        toAddress: () => ({
          toUserFriendlyAddress: () => "NQ0700000000000000000000000000000000",
        }),
      },
    }),
  },
  Address: {
    fromUserFriendlyAddress: () => ({}),
  },
  TransactionBuilder: {
    newBasic: () => ({
      sign: () => {},
      toHex: () => "dummy-hex",
      toPlain: () => ({ transactionHash: "dummy-payout-tx-hash-12345" }),
    }),
  },
}));

function createMockDb(userData: any = null) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => (userData ? [userData] : []),
        }),
      }),
    }),
    insert: () => ({
      values: () => Promise.resolve(),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  };
}

describe("Payout Worker & Circuit Breakers", () => {
  const mockConfig: PayoutWorkerConfig = {
    enabled: true,
    maxPayoutPerMatchNim: 100,
    dailyPayoutLimitNim: 500,
    rpcUrl: "https://rpc.testnet.nimiqwatch.com",
    privateKey: "dummy-key-for-unit-test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails fast when match is not finished", async () => {
    dbMocks.getDb.mockResolvedValue(createMockDb());
    dbMocks.getMatchById.mockResolvedValue({
      id: "match-unfinished",
      status: "in_progress",
      winnerUserId: null,
    });

    const result = await processMatchPayout("match-unfinished", mockConfig);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("not finished");
  });

  it("trips circuit breaker if net payout exceeds maxPayoutPerMatchNim", async () => {
    dbMocks.getDb.mockResolvedValue(
      createMockDb({
        id: 99,
        name: "Whale Winner",
        address: "NQ0700000000000000000000000000000000",
      })
    );
    dbMocks.getMatchById.mockResolvedValue({
      id: "match-whale",
      status: "finished",
      winnerUserId: 99,
    });
    dbMocks.getMatchEscrowDetails.mockResolvedValue({
      isWagered: true,
      totalPotNim: 1000, // 90% is 900 NIM, which exceeds 100 NIM cap!
    });

    const result = await processMatchPayout("match-whale", mockConfig);
    expect(result.status).toBe("circuit_breaker_tripped");
    expect(result.errorMessage).toContain("per-match limit");
  });

  it("requests winner address if winner has not bound a Nimiq wallet", async () => {
    dbMocks.getDb.mockResolvedValue(
      createMockDb({ id: 88, name: "Guest Winner", address: null })
    );
    dbMocks.getMatchById.mockResolvedValue({
      id: "match-guest-win",
      status: "finished",
      winnerUserId: 88,
    });
    dbMocks.getMatchEscrowDetails.mockResolvedValue({
      isWagered: true,
      totalPotNim: 20,
    });

    const result = await processMatchPayout("match-guest-win", mockConfig);
    expect(result.status).toBe("awaiting_winner_address");
    expect(result.errorMessage).toContain(
      "not bound a persistent Nimiq wallet address"
    );
  });

  it("falls back to Option A (ledger entitlement) when automated payouts are disabled", async () => {
    dbMocks.getDb.mockResolvedValue(
      createMockDb({
        id: 77,
        name: "Nimiq Winner",
        address: "NQ0700000000000000000000000000000000",
      })
    );
    dbMocks.getMatchById.mockResolvedValue({
      id: "match-ledger-pilot",
      status: "finished",
      winnerUserId: 77,
    });
    dbMocks.getMatchEscrowDetails.mockResolvedValue({
      isWagered: true,
      totalPotNim: 20,
    });

    const pilotConfig: PayoutWorkerConfig = {
      ...mockConfig,
      enabled: false,
      privateKey: undefined,
    };

    const result = await processMatchPayout("match-ledger-pilot", pilotConfig);
    expect(result.status).toBe("ledger_entitlement_confirmed");
    expect(result.winnerAddress).toBe("NQ0700000000000000000000000000000000");
    expect(result.netPayoutNim).toBe(18); // 90% of 20 NIM
  });

  it("processes automated payout (Option B) when enabled with hot-wallet key", async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      const body = JSON.parse(opts?.body || "{}");
      if (body.method === "getBlockNumber") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ result: { data: 500000 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: { data: "success" } }),
      });
    });

    dbMocks.getDb.mockResolvedValue(
      createMockDb({
        id: 77,
        name: "Nimiq Winner",
        address: "NQ0700000000000000000000000000000000",
      })
    );
    dbMocks.getMatchById.mockResolvedValue({
      id: "match-hot-wallet",
      status: "finished",
      winnerUserId: 77,
    });
    dbMocks.getMatchEscrowDetails.mockResolvedValue({
      isWagered: true,
      totalPotNim: 20,
    });

    const result = await processMatchPayout("match-hot-wallet", mockConfig);
    expect(result.status).toBe("settled_on_chain");
    expect(result.winnerAddress).toBe("NQ0700000000000000000000000000000000");
    expect(result.netPayoutNim).toBe(18);
    expect(result.payoutTxHash).toBe("dummy-payout-tx-hash-12345");
  });
});
