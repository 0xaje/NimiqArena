import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  applyLudoMatchCommand,
  createChallengeMatch,
  getDb,
  getMatchById,
  getUserByOpenId,
  joinMatchByCode,
  refreshMatchLifecycle,
  sweepMatchLifecycle,
} from "./db";
import { matchEvents, matchPlayers, matches, users } from "../drizzle/schema";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";
if (runDatabaseIntegration && process.env.NIMIQ_ARENA_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NIMIQ_ARENA_TEST_DATABASE_URL;
}

describe.skipIf(!runDatabaseIntegration)(
  "database-backed authoritative match persistence & lifecycle",
  () => {
    async function createTestUsers(prefix: string) {
      const db = await getDb();
      if (!db)
        throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const openId1 = `${prefix}-user1-${suffix}`;
      const openId2 = `${prefix}-user2-${suffix}`;
      const openId3 = `${prefix}-user3-${suffix}`;
      await db.insert(users).values([
        { openId: openId1, name: `${prefix} User 1`, role: "user" },
        { openId: openId2, name: `${prefix} User 2`, role: "user" },
        { openId: openId3, name: `${prefix} User 3`, role: "user" },
      ]);
      const user1 = await getUserByOpenId(openId1);
      const user2 = await getUserByOpenId(openId2);
      const user3 = await getUserByOpenId(openId3);
      if (!user1 || !user2 || !user3)
        throw new Error("Failed to create test users");

      const cleanup = async (matchIds: string[] = []) => {
        for (const matchId of matchIds) {
          await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
          await db
            .delete(matchPlayers)
            .where(eq(matchPlayers.matchId, matchId));
          await db.delete(matches).where(eq(matches.id, matchId));
        }
        await db.delete(users).where(eq(users.openId, openId1));
        await db.delete(users).where(eq(users.openId, openId2));
        await db.delete(users).where(eq(users.openId, openId3));
      };

      return { db, user1, user2, user3, cleanup, suffix };
    }

    it("creates a match, persists host seat 0, and records initial snapshot", async () => {
      const { user1, cleanup } = await createTestUsers("db-create");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        expect(created.status).toBe("waiting");
        expect(created.stateVersion).toBe(0);
        expect(created.joinCode).toHaveLength(10);

        const fetched = await getMatchById(created.id);
        expect(fetched).toBeDefined();
        expect(fetched?.hostUserId).toBe(user1.id);
        const snapshot = JSON.parse(fetched!.stateJson);
        expect(snapshot.version).toBe(0);
        expect(snapshot.players[0].pieces).toHaveLength(4);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("joins a match with seat 1 and transitions to in_progress", async () => {
      const { user1, user2, cleanup } = await createTestUsers("db-join");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        const joined = await joinMatchByCode({
          userId: user2.id,
          joinCode: created.joinCode,
        });

        expect(joined.player.seat).toBe(1);
        expect(joined.match.status).toBe("in_progress");

        const updated = await getMatchById(created.id);
        expect(updated?.status).toBe("in_progress");
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("handles duplicate joins idempotently without creating extra players", async () => {
      const { user1, user2, cleanup } = await createTestUsers("db-dup-join");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        // Host re-joins
        const hostJoin = await joinMatchByCode({
          userId: user1.id,
          joinCode: created.joinCode,
        });
        expect(hostJoin.player.seat).toBe(0);

        // Guest joins once
        const guestJoin1 = await joinMatchByCode({
          userId: user2.id,
          joinCode: created.joinCode,
        });
        expect(guestJoin1.player.seat).toBe(1);

        // Guest re-joins
        const guestJoin2 = await joinMatchByCode({
          userId: user2.id,
          joinCode: created.joinCode,
        });
        expect(guestJoin2.player.seat).toBe(1);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("rejects a 3rd player when the match is already full", async () => {
      const { user1, user2, user3, cleanup } = await createTestUsers("db-full");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({
          userId: user2.id,
          joinCode: created.joinCode,
        });

        await expect(
          joinMatchByCode({
            userId: user3.id,
            joinCode: created.joinCode,
          })
        ).rejects.toThrow("This match already has two players.");
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("expires an expired match and makes the sweep idempotent", async () => {
      const { db, user1, cleanup } = await createTestUsers("db-expire");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        const now = new Date();
        await db
          .update(matches)
          .set({ expiresAt: new Date(now.getTime() - 1_000) })
          .where(eq(matches.id, matchId));

        const refreshed = await refreshMatchLifecycle(matchId, now);
        expect(refreshed?.status).toBe("expired");

        // Subsequent sweep has nothing left to change
        expect((await sweepMatchLifecycle(now)).changed).toBe(0);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("applies roll command, increments version, and persists snapshot and event", async () => {
      const { db, user1, user2, cleanup, suffix } =
        await createTestUsers("db-cmd");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        const rollResult = await applyLudoMatchCommand({
          matchId: created.id,
          userId: user1.id,
          command: {
            kind: "roll",
            expectedVersion: 0,
            nonce: `roll-nonce-${suffix}`,
          },
        });

        expect(rollResult.snapshot.version).toBe(1);
        expect(rollResult.event.type).toBe("rolled");
        expect(rollResult.status).toBe("in_progress");

        // Verify matches table persistence
        const matchRow = await getMatchById(created.id);
        expect(matchRow?.stateVersion).toBe(1);
        const persistedSnapshot = JSON.parse(matchRow!.stateJson);
        expect(persistedSnapshot.version).toBe(1);

        // Verify match_events persistence
        const events = await db
          .select()
          .from(matchEvents)
          .where(eq(matchEvents.matchId, created.id));
        expect(events).toHaveLength(1);
        expect(events[0].version).toBe(1);
        expect(events[0].commandNonce).toBe(`roll-nonce-${suffix}`);
        expect(events[0].resultStatus).toBe("in_progress");
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("rejects command with stale version", async () => {
      const { user1, user2, cleanup, suffix } =
        await createTestUsers("db-stale");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        // Apply first valid roll to advance version to 1
        await applyLudoMatchCommand({
          matchId: created.id,
          userId: user1.id,
          command: {
            kind: "roll",
            expectedVersion: 0,
            nonce: `stale-nonce-1-${suffix}`,
          },
        });

        // Attempting another command with stale version 0 must be rejected
        await expect(
          applyLudoMatchCommand({
            matchId: created.id,
            userId: user1.id,
            command: {
              kind: "roll",
              expectedVersion: 0,
              nonce: `stale-nonce-2-${suffix}`,
            },
          })
        ).rejects.toThrow();
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("replays duplicate command nonce idempotently with exact original result", async () => {
      const { user1, user2, cleanup, suffix } =
        await createTestUsers("db-replay");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        const command = {
          kind: "roll" as const,
          expectedVersion: 0,
          nonce: `replay-nonce-${suffix}`,
        };

        const first = await applyLudoMatchCommand({
          matchId: created.id,
          userId: user1.id,
          command,
        });

        const replay = await applyLudoMatchCommand({
          matchId: created.id,
          userId: user1.id,
          command,
        });

        expect(first.idempotent).toBe(false);
        expect(replay.idempotent).toBe(true);
        expect(replay.snapshot).toEqual(first.snapshot);
        expect(replay.event).toEqual(first.event);
        expect(replay.status).toEqual(first.status);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("handles concurrent commands by executing one and rejecting the other", async () => {
      const { user1, user2, cleanup, suffix } =
        await createTestUsers("db-concur");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        const [res1, res2] = await Promise.allSettled([
          applyLudoMatchCommand({
            matchId: created.id,
            userId: user1.id,
            command: {
              kind: "roll",
              expectedVersion: 0,
              nonce: `concur-nonce-1-${suffix}`,
            },
          }),
          applyLudoMatchCommand({
            matchId: created.id,
            userId: user1.id,
            command: {
              kind: "roll",
              expectedVersion: 0,
              nonce: `concur-nonce-2-${suffix}`,
            },
          }),
        ]);

        const fulfilled = [res1, res2].filter(r => r.status === "fulfilled");
        const rejected = [res1, res2].filter(r => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("rolls back cleanly on command validation failure without corrupted state or version", async () => {
      const { db, user1, user2, cleanup, suffix } =
        await createTestUsers("db-rollback");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        // Host attempts to move a piece when dice hasn't been rolled yet (invalid engine command)
        await expect(
          applyLudoMatchCommand({
            matchId: created.id,
            userId: user1.id,
            command: {
              kind: "move",
              pieceIndex: 0,
              expectedVersion: 0,
              nonce: `invalid-move-nonce-${suffix}`,
            },
          })
        ).rejects.toThrow();

        // State version must remain 0
        const matchRow = await getMatchById(created.id);
        expect(matchRow?.stateVersion).toBe(0);

        // No event row should have been inserted
        const events = await db
          .select()
          .from(matchEvents)
          .where(eq(matchEvents.matchId, created.id));
        expect(events).toHaveLength(0);
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });

    it("disconnects stale players and cancels abandoned active matches", async () => {
      const { db, user1, user2, cleanup } = await createTestUsers("db-abandon");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user1.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;

        await joinMatchByCode({ userId: user2.id, joinCode: created.joinCode });

        const now = new Date();
        const old = new Date(now.getTime() - 11 * 60_000);
        await db
          .update(matches)
          .set({ updatedAt: old })
          .where(eq(matches.id, matchId));
        await db
          .update(matchPlayers)
          .set({ lastSeenAt: old })
          .where(eq(matchPlayers.matchId, matchId));

        expect((await sweepMatchLifecycle(now)).changed).toBe(1);
        const refreshed = await refreshMatchLifecycle(matchId, now);
        expect(refreshed?.status).toBe("cancelled");
      } finally {
        await cleanup(matchId ? [matchId] : []);
      }
    });
  }
);
