import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  addBotToWaitingMatch,
  claimVerifiedPaymentForMatch,
  createPaymentIntent,
  createWageredChallengeMatch,
  getDb,
  getMatchById,
  getMatchEscrowDetails,
  getUserByOpenId,
  joinMatchByCode,
} from "./db";
import {
  matchEvents,
  matchPlayers,
  matches,
  paymentIntents,
  users,
} from "../drizzle/schema";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";
if (runDatabaseIntegration && process.env.NIMIQ_ARENA_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NIMIQ_ARENA_TEST_DATABASE_URL;
}

const STAKE_NIM = 50;
const STAKE_LUNA = STAKE_NIM * 100_000;

describe.skipIf(!runDatabaseIntegration)("wagered escrow", () => {
  async function setup() {
    const db = await getDb();
    if (!db) throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hostOpenId = `wager-host-${suffix}`;
    const joinerOpenId = `wager-joiner-${suffix}`;
    const outsiderOpenId = `wager-outsider-${suffix}`;
    await db.insert(users).values([
      { openId: hostOpenId, name: "Wager Host", role: "user" },
      { openId: joinerOpenId, name: "Wager Joiner", role: "user" },
      { openId: outsiderOpenId, name: "Wager Outsider", role: "user" },
    ]);

    const host = await getUserByOpenId(hostOpenId);
    const joiner = await getUserByOpenId(joinerOpenId);
    const outsider = await getUserByOpenId(outsiderOpenId);
    if (!host || !joiner || !outsider) throw new Error("user setup failed");

    const created = await createWageredChallengeMatch({
      userId: host.id,
      gameSlug: "ludo-league",
      stakeNim: STAKE_NIM,
    });

    const cleanup = async () => {
      await db.delete(matchEvents).where(eq(matchEvents.matchId, created.match.id));
      await db.delete(matchPlayers).where(eq(matchPlayers.matchId, created.match.id));
      await db.delete(matches).where(eq(matches.id, created.match.id));
      for (const userId of [host.id, joiner.id, outsider.id]) {
        await db.delete(paymentIntents).where(eq(paymentIntents.userId, userId));
      }
      for (const openId of [hostOpenId, joinerOpenId, outsiderOpenId]) {
        await db.delete(users).where(eq(users.openId, openId));
      }
    };

    /** Marks an intent verified without going to the chain. */
    const markVerified = async (intentId: string) => {
      await db
        .update(paymentIntents)
        .set({ status: "verified", verifiedAt: new Date() })
        .where(eq(paymentIntents.id, intentId));
    };

    return { db, host, joiner, outsider, created, cleanup, markVerified };
  }

  it("prices a seat at the match stake, not the flat entry fee", async () => {
    const { joiner, created, cleanup } = await setup();
    try {
      await joinMatchByCode({
        userId: joiner.id,
        joinCode: created.match.joinCode,
      });

      const intent = await createPaymentIntent({
        userId: joiner.id,
        clientNonce: `wager-nonce-joiner-01${Date.now()}`.slice(0, 40),
        matchId: created.match.id,
      });

      // The flat arena entry fee is far below a 50 NIM stake; charging it
      // would buy a seat in this pot for a fraction of the stake.
      expect(intent.valueLuna).toBe(STAKE_LUNA);
    } finally {
      await cleanup();
    }
  });

  it("reuses the host's stake intent rather than charging a second one", async () => {
    const { host, created, cleanup } = await setup();
    try {
      const intent = await createPaymentIntent({
        userId: host.id,
        clientNonce: `wager-nonce-host-01${Date.now()}`.slice(0, 40),
        matchId: created.match.id,
      });

      expect(intent.id).toBe(created.hostPaymentIntentId);
      expect(intent.valueLuna).toBe(STAKE_LUNA);
    } finally {
      await cleanup();
    }
  });

  it("refuses a deposit that does not cover the stake", async () => {
    const { joiner, created, cleanup, markVerified } = await setup();
    try {
      await joinMatchByCode({
        userId: joiner.id,
        joinCode: created.match.joinCode,
      });

      // A flat-fee intent, verified on chain, offered against a 50 NIM seat.
      const cheap = await createPaymentIntent({
        userId: joiner.id,
        clientNonce: `wager-nonce-cheap-01${Date.now()}`.slice(0, 40),
      });
      expect(cheap.valueLuna).toBeLessThan(STAKE_LUNA);
      await markVerified(cheap.id);

      await expect(
        claimVerifiedPaymentForMatch({
          matchId: created.match.id,
          userId: joiner.id,
          paymentIntentId: cheap.id,
        })
      ).rejects.toThrow(/does not cover/i);
    } finally {
      await cleanup();
    }
  });

  it("refuses a claim from someone with no seat in the match", async () => {
    const { outsider, created, cleanup, markVerified } = await setup();
    try {
      const intent = await createPaymentIntent({
        userId: outsider.id,
        clientNonce: `wager-nonce-outsider1${Date.now()}`.slice(0, 40),
      });
      await markVerified(intent.id);

      // This used to update zero rows and report success.
      await expect(
        claimVerifiedPaymentForMatch({
          matchId: created.match.id,
          userId: outsider.id,
          paymentIntentId: intent.id,
        })
      ).rejects.toThrow(/not a participant/i);
    } finally {
      await cleanup();
    }
  });

  it("does not start a wagered match on join, and starts it once both stakes are in", async () => {
    const { host, joiner, created, cleanup, markVerified } = await setup();
    try {
      await joinMatchByCode({
        userId: joiner.id,
        joinCode: created.match.joinCode,
      });

      // Joining used to flip the match straight to in_progress, so a full
      // game could be played and "settled" against an unfunded pot.
      const afterJoin = await getMatchById(created.match.id);
      expect(afterJoin?.status).toBe("waiting");

      const hostIntent = await createPaymentIntent({
        userId: host.id,
        clientNonce: `wager-nonce-host-02${Date.now()}`.slice(0, 40),
        matchId: created.match.id,
      });
      await markVerified(hostIntent.id);
      const hostClaim = await claimVerifiedPaymentForMatch({
        matchId: created.match.id,
        userId: host.id,
        paymentIntentId: hostIntent.id,
      });

      // One stake is not escrow.
      expect(hostClaim.escrowFunded).toBe(false);
      expect((await getMatchById(created.match.id))?.status).toBe("waiting");

      const joinerIntent = await createPaymentIntent({
        userId: joiner.id,
        clientNonce: `wager-nonce-joiner02${Date.now()}`.slice(0, 40),
        matchId: created.match.id,
      });
      await markVerified(joinerIntent.id);
      const joinerClaim = await claimVerifiedPaymentForMatch({
        matchId: created.match.id,
        userId: joiner.id,
        paymentIntentId: joinerIntent.id,
      });

      expect(joinerClaim.escrowFunded).toBe(true);
      expect((await getMatchById(created.match.id))?.status).toBe("in_progress");

      const escrow = await getMatchEscrowDetails(created.match.id);
      expect(escrow.allVerified).toBe(true);
      expect(escrow.escrowState).toBe("locked_in_escrow");
      expect(escrow.totalPotNim).toBe(STAKE_NIM * 2);
    } finally {
      await cleanup();
    }
  });

  it("refuses to put a bot in a wagered seat", async () => {
    const { host, created, cleanup } = await setup();
    try {
      // A bot posts no stake, and adding one starts the match - which would
      // walk straight around the escrow gate.
      await expect(
        addBotToWaitingMatch(created.match.id, host.id)
      ).rejects.toThrow(/cannot be played against a bot/i);

      expect((await getMatchById(created.match.id))?.status).toBe("waiting");
    } finally {
      await cleanup();
    }
  });

  it("executes full 2-player 5,000 NIM challenge match end-to-end with atomic NOT_FUNDED -> PARTIALLY_FUNDED -> FUNDED transitions", async () => {
    const { db, host, joiner, cleanup, markVerified } = await setup();
    const WAGER_5000_NIM = 5_000;
    const WAGER_5000_LUNA = 500_000_000; // 5,000 NIM * 100,000 Luna per NIM (10^5 invariant)
    const TOTAL_POT_NIM = 10_000;
    const TOTAL_POT_LUNA = 1_000_000_000;

    const match5000 = await createWageredChallengeMatch({
      userId: host.id,
      gameSlug: "ludo-league",
      stakeNim: WAGER_5000_NIM,
    });

    try {
      // 1. Initial State: Host created 5,000 NIM match, guest not joined yet
      let escrow = await getMatchEscrowDetails(match5000.match.id);
      expect(escrow.stakeNim).toBe(WAGER_5000_NIM);
      expect(escrow.totalFundedNim).toBe(0);
      expect(escrow.totalFundedLuna).toBe(0);
      expect(escrow.fundingProgress).toBe("NOT_FUNDED");
      expect(escrow.allVerified).toBe(false);
      expect(escrow.playerStatuses.length).toBe(1);
      expect(escrow.playerStatuses[0].userId).toBe(host.id);
      expect(escrow.playerStatuses[0].fundingStatus).toBe("PAYMENT_PENDING");
      expect(escrow.playerStatuses[0].committedNim).toBe(0);
      expect(escrow.playerStatuses[0].committedLuna).toBe(0);

      // 2. Guest joins match via joinCode
      await joinMatchByCode({
        userId: joiner.id,
        joinCode: match5000.match.joinCode,
      });

      // Match remains waiting, NOT_FUNDED
      const afterJoinMatch = await getMatchById(match5000.match.id);
      expect(afterJoinMatch?.status).toBe("waiting");

      escrow = await getMatchEscrowDetails(match5000.match.id);
      expect(escrow.stakeNim).toBe(WAGER_5000_NIM);
      expect(escrow.totalFundedNim).toBe(0);
      expect(escrow.totalFundedLuna).toBe(0);
      expect(escrow.fundingProgress).toBe("NOT_FUNDED");
      expect(escrow.allVerified).toBe(false);

      const hostP1 = escrow.playerStatuses.find((p) => p.userId === host.id);
      const joinerP2 = escrow.playerStatuses.find((p) => p.userId === joiner.id);
      expect(hostP1?.fundingStatus).toBe("PAYMENT_PENDING");
      expect(hostP1?.committedNim).toBe(0);
      expect(joinerP2?.fundingStatus).toBe("NOT_FUNDED");
      expect(joinerP2?.committedNim).toBe(0);

      // 3. Host deposits & verifies 5,000 NIM (500,000,000 Luna)
      await markVerified(match5000.hostPaymentIntentId);
      const hostClaim = await claimVerifiedPaymentForMatch({
        matchId: match5000.match.id,
        userId: host.id,
        paymentIntentId: match5000.hostPaymentIntentId,
      });

      expect(hostClaim.escrowFunded).toBe(false);
      expect((await getMatchById(match5000.match.id))?.status).toBe("waiting");

      // Escrow is now PARTIALLY_FUNDED (5,000 NIM out of 10,000 NIM)
      escrow = await getMatchEscrowDetails(match5000.match.id);
      expect(escrow.totalFundedNim).toBe(WAGER_5000_NIM);
      expect(escrow.totalFundedLuna).toBe(WAGER_5000_LUNA);
      expect(escrow.fundingProgress).toBe("PARTIALLY_FUNDED");
      expect(escrow.allVerified).toBe(false);

      const hostP1Funded = escrow.playerStatuses.find((p) => p.userId === host.id);
      const joinerP2Unfunded = escrow.playerStatuses.find((p) => p.userId === joiner.id);
      expect(hostP1Funded?.fundingStatus).toBe("FUNDED");
      expect(hostP1Funded?.committedNim).toBe(WAGER_5000_NIM);
      expect(hostP1Funded?.committedLuna).toBe(WAGER_5000_LUNA);
      expect(joinerP2Unfunded?.fundingStatus).toBe("NOT_FUNDED");
      expect(joinerP2Unfunded?.committedNim).toBe(0);

      // 4. Guest creates 5,000 NIM payment intent
      const joinerIntent = await createPaymentIntent({
        userId: joiner.id,
        clientNonce: `wager-5k-joiner-${Date.now()}`.slice(0, 40),
        matchId: match5000.match.id,
      });

      expect(joinerIntent.valueLuna).toBe(WAGER_5000_LUNA);

      // 5. Guest deposits & verifies
      await markVerified(joinerIntent.id);
      const joinerClaim = await claimVerifiedPaymentForMatch({
        matchId: match5000.match.id,
        userId: joiner.id,
        paymentIntentId: joinerIntent.id,
      });

      // Escrow is now completely FUNDED -> Match atomically transitions to in_progress!
      expect(joinerClaim.escrowFunded).toBe(true);
      const finalMatch = await getMatchById(match5000.match.id);
      expect(finalMatch?.status).toBe("in_progress");

      escrow = await getMatchEscrowDetails(match5000.match.id);
      expect(escrow.totalFundedNim).toBe(TOTAL_POT_NIM);
      expect(escrow.totalFundedLuna).toBe(TOTAL_POT_LUNA);
      expect(escrow.totalPotNim).toBe(TOTAL_POT_NIM);
      expect(escrow.fundingProgress).toBe("FUNDED");
      expect(escrow.allVerified).toBe(true);
      expect(escrow.escrowState).toBe("locked_in_escrow");

      const hostFinal = escrow.playerStatuses.find((p) => p.userId === host.id);
      const joinerFinal = escrow.playerStatuses.find((p) => p.userId === joiner.id);
      expect(hostFinal?.fundingStatus).toBe("FUNDED");
      expect(hostFinal?.committedNim).toBe(WAGER_5000_NIM);
      expect(hostFinal?.committedLuna).toBe(WAGER_5000_LUNA);
      expect(joinerFinal?.fundingStatus).toBe("FUNDED");
      expect(joinerFinal?.committedNim).toBe(WAGER_5000_NIM);
      expect(joinerFinal?.committedLuna).toBe(WAGER_5000_LUNA);
    } finally {
      await db.delete(matchEvents).where(eq(matchEvents.matchId, match5000.match.id));
      await db.delete(matchPlayers).where(eq(matchPlayers.matchId, match5000.match.id));
      await db.delete(matches).where(eq(matches.id, match5000.match.id));
      await db.delete(paymentIntents).where(eq(paymentIntents.id, match5000.hostPaymentIntentId));
      await cleanup();
    }
  });
});
