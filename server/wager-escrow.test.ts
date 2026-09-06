import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getMatchPlayer: vi.fn(),
  createWageredChallengeMatch: vi.fn(),
  getMatchEscrowDetails: vi.fn(),
  claimVerifiedPaymentForMatch: vi.fn(),
  settleMatchWinnerPayout: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    ...dbMocks,
  };
});

/** The router now checks match participation, so every seated caller needs one. */
function seatedPlayer(userId: number, matchId = "match-under-test") {
  const now = new Date();
  return {
    id: 1,
    matchId,
    userId,
    seat: 0 as const,
    status: "joined" as const,
    paymentIntentId: null,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(userId = 7701): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: userId,
      openId: `wager-test-${userId}`,
      name: "Wager Challenger",
      email: "wager@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Wagered NIM Matches & Escrow Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getMatchPlayer.mockResolvedValue(seatedPlayer(7701));
  });

  it("createWageredMatch creates a match with stake and payment intent", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    dbMocks.createWageredChallengeMatch.mockResolvedValue({
      match: {
        id: "match-wager-12345",
        joinCode: "WAGABC12",
        status: "waiting",
        expiresAt,
      },
      hostPaymentIntentId: "intent-host-123",
      stakeNim: 50,
      valueLuna: 5_000_000,
    });

    const caller = appRouter.createCaller(createContext(7701));
    const res = await caller.match.createWageredMatch({
      gameSlug: "ludo-league",
      stakeNim: 50,
    });

    expect(dbMocks.createWageredChallengeMatch).toHaveBeenCalledWith({
      userId: 7701,
      gameSlug: "ludo-league",
      stakeNim: 50,
    });
    expect(res.id).toBe("match-wager-12345");
    expect(res.stakeNim).toBe(50);
    expect(res.hostPaymentIntentId).toBe("intent-host-123");
  });

  it("escrowDetails returns real-time pot and deposit verification status", async () => {
    dbMocks.getMatchEscrowDetails.mockResolvedValue({
      matchId: "match-wager-12345",
      isWagered: true,
      stakeNim: 50,
      totalPotNim: 100,
      escrowState: "locked_in_escrow",
      allVerified: true,
      playerStatuses: [
        {
          userId: 7701,
          seat: 0,
          paymentIntentId: "intent-host-123",
          status: "verified",
          verified: true,
          txHash: "0xhash1",
        },
        {
          userId: 7702,
          seat: 1,
          paymentIntentId: "intent-guest-456",
          status: "verified",
          verified: true,
          txHash: "0xhash2",
        },
      ],
      treasuryAddress: "NQ07 0000 0000 0000 0000 0000 0000 0000",
    });

    const caller = appRouter.createCaller(createContext(7701));
    const res = await caller.match.escrowDetails({
      matchId: "match-wager-12345",
    });

    expect(dbMocks.getMatchEscrowDetails).toHaveBeenCalledWith(
      "match-wager-12345"
    );
    expect(res.totalPotNim).toBe(100);
    expect(res.escrowState).toBe("locked_in_escrow");
    expect(res.allVerified).toBe(true);
  });

  it("claimPayment attaches verified intent to player match seat", async () => {
    dbMocks.claimVerifiedPaymentForMatch.mockResolvedValue({
      success: true,
      matchId: "match-wager-12345",
      paymentIntentId: "intent-guest-456",
    });

    const caller = appRouter.createCaller(createContext(7702));
    const res = await caller.match.claimPayment({
      matchId: "match-wager-12345",
      paymentIntentId: "intent-guest-456",
    });

    expect(dbMocks.claimVerifiedPaymentForMatch).toHaveBeenCalledWith({
      matchId: "match-wager-12345",
      userId: 7702,
      paymentIntentId: "intent-guest-456",
    });
    expect(res.success).toBe(true);
  });

  it("settlePayout calculates 100% pot with protocol fee and returns explorer receipt", async () => {
    dbMocks.settleMatchWinnerPayout.mockResolvedValue({
      success: true,
      matchId: "match-wager-12345",
      winnerUserId: 7701,
      winnerName: "Wager Challenger",
      grossPotNim: 100,
      protocolFeeNim: 10,
      netPayoutNim: 90,
      payoutTxHash: "0xpayouttx123456",
      settledAt: new Date().toISOString(),
      network: "testnet",
      explorerUrl: "https://test.nimiq.watch/#0xpayouttx123456",
    });

    const caller = appRouter.createCaller(createContext(7701));
    const res = await caller.match.settlePayout({
      matchId: "match-wager-12345",
      winnerUserId: 7701,
    });

    expect(dbMocks.settleMatchWinnerPayout).toHaveBeenCalledWith({
      matchId: "match-wager-12345",
      winnerUserId: 7701,
    });
    expect(res.netPayoutNim).toBe(90);
    expect(res.payoutTxHash).toBe("0xpayouttx123456");
  });

  describe("match scoping", () => {
    it("refuses escrow and payout reads from outside the match", async () => {
      // A session is not authorisation: escrow exposes the stake, both user
      // ids and payment state, so an outsider holding a match id gets nothing.
      dbMocks.getMatchPlayer.mockResolvedValue(undefined);
      const caller = appRouter.createCaller(createContext(9999));

      await expect(
        caller.match.escrowDetails({ matchId: "match-wager-12345" })
      ).rejects.toThrow(/not a participant/i);
      await expect(
        caller.match.settlePayout({
          matchId: "match-wager-12345",
          winnerUserId: 7701,
        })
      ).rejects.toThrow(/not a participant/i);

      expect(dbMocks.getMatchEscrowDetails).not.toHaveBeenCalled();
      expect(dbMocks.settleMatchWinnerPayout).not.toHaveBeenCalled();
    });

    it("shows a player their own transaction hash and nobody else's", async () => {
      dbMocks.getMatchPlayer.mockResolvedValue(seatedPlayer(7701));
      dbMocks.getMatchEscrowDetails.mockResolvedValue({
        matchId: "match-wager-12345",
        isWagered: true,
        stakeNim: 50,
        totalPotNim: 100,
        escrowState: "locked_in_escrow",
        allVerified: true,
        treasuryAddress: "NQ0700000000000000000000000000000000",
        playerStatuses: [
          {
            userId: 7701,
            seat: 0,
            paymentIntentId: "intent-a",
            status: "verified",
            verified: true,
            txHash: "mine",
          },
          {
            userId: 7702,
            seat: 1,
            paymentIntentId: "intent-b",
            status: "verified",
            verified: true,
            txHash: "theirs",
          },
        ],
      });

      const caller = appRouter.createCaller(createContext(7701));
      const res = await caller.match.escrowDetails({
        matchId: "match-wager-12345",
      });

      expect(res.playerStatuses.find(p => p.userId === 7701)?.txHash).toBe("mine");
      expect(res.playerStatuses.find(p => p.userId === 7702)?.txHash).toBeNull();
      // Everything else about the opponent's deposit stays visible.
      expect(res.playerStatuses.find(p => p.userId === 7702)?.verified).toBe(true);
    });
  });
});
