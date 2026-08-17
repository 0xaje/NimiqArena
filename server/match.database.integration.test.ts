import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  applyLudoMatchCommand,
  createChallengeMatch,
  getDb,
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
  "database-backed authoritative match persistence",
  () => {
    it("persists and exactly replays a duplicate command", async () => {
      const db = await getDb();
      if (!db)
        throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const hostOpenId = `db-match-host-${suffix}`;
      const guestOpenId = `db-match-guest-${suffix}`;
      await db.insert(users).values([
        { openId: hostOpenId, name: "DB Match Host", role: "user" },
        { openId: guestOpenId, name: "DB Match Guest", role: "user" },
      ]);

      const host = await getUserByOpenId(hostOpenId);
      const guest = await getUserByOpenId(guestOpenId);
      if (!host || !guest) throw new Error("Test users were not created.");

      try {
        const created = await createChallengeMatch({
          userId: host.id,
          gameSlug: "ludo-league",
        });
        await joinMatchByCode({ userId: guest.id, joinCode: created.joinCode });
        const command = {
          kind: "roll" as const,
          expectedVersion: 0,
          nonce: `db-nonce-${suffix}`,
        };

        const first = await applyLudoMatchCommand({
          matchId: created.id,
          userId: host.id,
          command,
        });
        const replay = await applyLudoMatchCommand({
          matchId: created.id,
          userId: host.id,
          command,
        });

        expect(replay).toEqual(first);
        expect(replay.idempotent).toBe(true);
      } finally {
        const dbMatch = await db
          .select({ id: matches.id })
          .from(matches)
          .leftJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
          .where(
            and(
              eq(matchPlayers.userId, host.id),
              eq(matches.hostUserId, host.id)
            )
          )
          .limit(1);
        const matchId = dbMatch[0]?.id;
        if (matchId) {
          await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
          await db
            .delete(matchPlayers)
            .where(eq(matchPlayers.matchId, matchId));
          await db.delete(matches).where(eq(matches.id, matchId));
        }
        await db.delete(users).where(eq(users.openId, hostOpenId));
        await db.delete(users).where(eq(users.openId, guestOpenId));
      }
    });

    it("expires an expired match and makes the sweep idempotent", async () => {
      const db = await getDb();
      if (!db)
        throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const openId = `db-expiry-${suffix}`;
      await db
        .insert(users)
        .values({ openId, name: "DB Expiry User", role: "user" });
      const user = await getUserByOpenId(openId);
      if (!user) throw new Error("Test user was not created.");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: user.id,
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
        expect((await sweepMatchLifecycle(now)).changed).toBe(0);
      } finally {
        if (matchId) {
          await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
          await db
            .delete(matchPlayers)
            .where(eq(matchPlayers.matchId, matchId));
          await db.delete(matches).where(eq(matches.id, matchId));
        }
        await db.delete(users).where(eq(users.openId, openId));
      }
    });

    it("disconnects stale players and cancels abandoned active matches", async () => {
      const db = await getDb();
      if (!db)
        throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const hostOpenId = `db-abandon-host-${suffix}`;
      const guestOpenId = `db-abandon-guest-${suffix}`;
      await db.insert(users).values([
        { openId: hostOpenId, name: "DB Abandon Host", role: "user" },
        { openId: guestOpenId, name: "DB Abandon Guest", role: "user" },
      ]);
      const host = await getUserByOpenId(hostOpenId);
      const guest = await getUserByOpenId(guestOpenId);
      if (!host || !guest) throw new Error("Test users were not created.");
      let matchId: string | undefined;
      try {
        const created = await createChallengeMatch({
          userId: host.id,
          gameSlug: "ludo-league",
        });
        matchId = created.id;
        await joinMatchByCode({ userId: guest.id, joinCode: created.joinCode });
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
        if (matchId) {
          await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
          await db
            .delete(matchPlayers)
            .where(eq(matchPlayers.matchId, matchId));
          await db.delete(matches).where(eq(matches.id, matchId));
        }
        await db.delete(users).where(eq(users.openId, hostOpenId));
        await db.delete(users).where(eq(users.openId, guestOpenId));
      }
    });
  }
);
