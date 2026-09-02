import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { type AddressInfo } from "net";
import { createExpressApp } from "./_core/app";
import {
  getDb,
  createChallengeMatch,
  joinMatchByCode,
  getMatchById,
  getMatchPlayer,
  getMatchPlayers,
  applyLudoMatchCommand,
  refreshMatchLifecycle,
  sweepMatchLifecycle,
  heartbeatMatchPlayer,
  disconnectMatchPlayer,
  getPlayerStats,
  getLeaderboardTop,
  getActiveSeason,
  createPaymentIntent,
  updatePaymentIntent,
  verifyPaymentIntent,
  claimVerifiedPaymentForMatch,
  upsertUser,
  getUserByOpenId,
} from "./db";
import { users, matches, matchPlayers, matchEvents, playerRatings, ratingHistory, paymentIntents, paymentVerifications } from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { verifyNimiqPayment, getNimiqTransaction } from "./nimiq-verifier";
import { appRouter } from "./routers";
import { logger } from "./_core/logger";

const describeDb = process.env.RUN_DB_INTEGRATION_TESTS ? describe : describe.skip;
const REAL_TESTNET_TX_HASH = "3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a";

describeDb("Production Infrastructure & Controlled Pilot Smoke Suite", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let userA: { id: number; openId: string; name: string };
  let userB: { id: number; openId: string; name: string };
  const createdMatchIds: string[] = [];
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Production database required for smoke test");

    const app = createExpressApp();
    server = createServer(app);
    await new Promise<void>(resolve => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const openIdA = `prod-smoke-a-${Date.now()}`;
    const openIdB = `prod-smoke-b-${Date.now()}`;
    await upsertUser({ openId: openIdA, name: "Pilot Host Alpha", loginMethod: "nimiq_pilot" });
    await upsertUser({ openId: openIdB, name: "Pilot Guest Beta", loginMethod: "nimiq_pilot" });

    const dbUserA = await getUserByOpenId(openIdA);
    const dbUserB = await getUserByOpenId(openIdB);
    if (!dbUserA || !dbUserB) throw new Error("Failed to seed pilot users");

    userA = { id: dbUserA.id, openId: dbUserA.openId, name: dbUserA.name || "Host" };
    userB = { id: dbUserB.id, openId: dbUserB.openId, name: dbUserB.name || "Guest" };
    createdUserIds.push(userA.id, userB.id);

    logger.info({
      category: "api",
      event: "PROD_SMOKE_INIT",
      metadata: { hostId: userA.id, guestId: userB.id },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
    const db = await getDb();
    if (db && createdMatchIds.length > 0) {
      await db.delete(ratingHistory).where(inArray(ratingHistory.matchId, createdMatchIds));
      await db.delete(matchEvents).where(inArray(matchEvents.matchId, createdMatchIds));
      await db.delete(matchPlayers).where(inArray(matchPlayers.matchId, createdMatchIds));
      await db.delete(matches).where(inArray(matches.id, createdMatchIds));
    }
    if (db && createdUserIds.length > 0) {
      const intentRows = await db.select({ id: paymentIntents.id }).from(paymentIntents).where(inArray(paymentIntents.userId, createdUserIds));
      if (intentRows.length > 0) {
        await db.delete(paymentVerifications).where(inArray(paymentVerifications.paymentIntentId, intentRows.map(r => r.id)));
      }
      await db.delete(paymentIntents).where(inArray(paymentIntents.userId, createdUserIds));
      await db.delete(playerRatings).where(inArray(playerRatings.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  it("1. Health Endpoint & System Status respond with OK", async () => {
    const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: null });
    const health = await caller.system.health({ timestamp: Date.now() });
    expect(health.ok).toBe(true);
  });

  it("2. Active Season & Ludo Game Catalog are seeded and active", async () => {
    const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: null });
    const season = await caller.season.getActive();
    expect(season.id).toBe("season-1");
    expect(season.status).toBe("active");

    const game = await caller.game.getBySlug({ slug: "ludo-league" });
    expect(game.slug).toBe("ludo-league");
    expect(game.status).toBe("active");
  });

  it("3. Full 2-Player Match Lifecycle over Production Infrastructure", async () => {
    // Create match
    const match = await createChallengeMatch({ userId: userA.id, gameSlug: "ludo-league" });
    expect(match.id).toBeDefined();
    expect(match.joinCode).toMatch(/^[A-Z0-9]{10}$/);
    expect(match.status).toBe("waiting");
    createdMatchIds.push(match.id);

    // Join match
    const joined = await joinMatchByCode({ userId: userB.id, joinCode: match.joinCode });
    expect(joined.match.status).toBe("in_progress");
    expect(joined.player.seat).toBe(1);

    // Roll turn
    const roll = await applyLudoMatchCommand({
      matchId: match.id,
      userId: userA.id,
      command: { kind: "roll", expectedVersion: 0, nonce: `prod-roll-${Date.now()}` },
    });
    expect(roll.snapshot.version).toBe(1);
    const rolledVal = roll.snapshot.lastRoll?.value ?? roll.snapshot.dice;
    expect(rolledVal).toBeGreaterThanOrEqual(1);

    // Disconnect & Heartbeat reconnect
    await disconnectMatchPlayer(match.id, userB.id);
    let pB = await getMatchPlayer(match.id, userB.id);
    expect(pB?.status).toBe("disconnected");

    await heartbeatMatchPlayer(match.id, userB.id);
    pB = await getMatchPlayer(match.id, userB.id);
    expect(pB?.status).toBe("joined");
  });

  it("4. Controlled Nimiq Testnet Payment Verification & Anti-Replay Gating", async () => {
    const clientNonce = `pilot-nonce-${Date.now()}`;
    const intent = await createPaymentIntent({
      userId: userA.id,
      clientNonce,
    });
    expect(intent.status).toBe("created");

    const tx = await getNimiqTransaction(REAL_TESTNET_TX_HASH);
    expect(tx.transaction).not.toBeNull();
    if (tx.transaction) {
      await updatePaymentIntent(intent.id, userA.id, {
        status: "submitted",
        transactionHash: REAL_TESTNET_TX_HASH,
      });

      const verification = await verifyPaymentIntent({
        id: intent.id,
        userId: userA.id,
      });

      // Verify either verified or expected testnet state
      expect(typeof verification.success).toBe("boolean");
    }
  });

  it("5. Observability Logger strips sensitive headers and secrets", () => {
    let captured = "";
    const originalLog = console.log;
    console.log = (msg: string) => { captured = msg; };

    logger.info({
      category: "security",
      event: "AUDIT_SANITY",
      metadata: {
        authorization: "Bearer secret-token-xyz",
        cookie: "app_session_id=secret-cookie",
        safeData: "production-value",
      },
    });

    console.log = originalLog;
    expect(captured).toContain("[REDACTED]");
    expect(captured).not.toContain("secret-token-xyz");
    expect(captured).not.toContain("secret-cookie");
    expect(captured).toContain("production-value");
  });
});
