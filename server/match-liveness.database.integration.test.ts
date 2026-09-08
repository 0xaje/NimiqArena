import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createChallengeMatch,
  getDb,
  getMatchById,
  getUserByOpenId,
  joinMatchByCode,
  refreshMatchLifecycle,
  touchMatchPlayerPresence,
} from "./db";
import { matchEvents, matchPlayers, matches, users } from "../drizzle/schema";
import {
  MATCH_PLAY_WINDOW_MS,
  PLAYER_HEARTBEAT_TIMEOUT_MS,
} from "@shared/const";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";
if (runDatabaseIntegration && process.env.NIMIQ_ARENA_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NIMIQ_ARENA_TEST_DATABASE_URL;
}

describe.skipIf(!runDatabaseIntegration)("match liveness", () => {
  async function setup() {
    const db = await getDb();
    if (!db) throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const openIds = [`live-host-${suffix}`, `live-joiner-${suffix}`];
    await db
      .insert(users)
      .values(openIds.map(openId => ({ openId, name: "Liveness", role: "user" as const })));
    const [host, joiner] = await Promise.all(openIds.map(getUserByOpenId));
    if (!host || !joiner) throw new Error("user setup failed");

    const match = await createChallengeMatch({
      userId: host.id,
      gameSlug: "ludo-league",
    });

    const cleanup = async () => {
      await db.delete(matchEvents).where(eq(matchEvents.matchId, match.id));
      await db.delete(matchPlayers).where(eq(matchPlayers.matchId, match.id));
      await db.delete(matches).where(eq(matches.id, match.id));
      for (const openId of openIds) {
        await db.delete(users).where(eq(users.openId, openId));
      }
    };

    return { db, host, joiner, match, cleanup };
  }

  it("renews the match clock when play begins", async () => {
    const { joiner, match, cleanup } = await setup();
    try {
      const lobbyExpiry = match.expiresAt.getTime();

      await joinMatchByCode({
        userId: joiner.id,
        joinCode: match.joinCode,
      });

      const started = await getMatchById(match.id);
      expect(started?.status).toBe("in_progress");
      // The lobby clock kept running into the game, so a match died mid-play
      // at a time decided by when the invite was created.
      expect(started!.expiresAt.getTime()).toBeGreaterThan(lobbyExpiry);
      expect(started!.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + MATCH_PLAY_WINDOW_MS - 60_000
      );
    } finally {
      await cleanup();
    }
  });

  it("does not end a game at the deadline of the invite it grew out of", async () => {
    const { db, joiner, match, cleanup } = await setup();
    try {
      const lobbyExpiry = match.expiresAt.getTime();
      await joinMatchByCode({ userId: joiner.id, joinCode: match.joinCode });

      // Stand just past the moment the old lobby clock would have fired. This
      // is where a real game died: both players present, mid-match, ended by
      // the invite's deadline.
      const justPastLobbyDeadline = new Date(lobbyExpiry + 1000);

      // Both players are still playing at that moment, so their presence is
      // current as of the simulated time. Without this the test would only
      // prove that two absent players get cleaned up.
      await db
        .update(matchPlayers)
        .set({ lastSeenAt: justPastLobbyDeadline })
        .where(eq(matchPlayers.matchId, match.id));

      const refreshed = await refreshMatchLifecycle(
        match.id,
        justPastLobbyDeadline
      );

      expect(refreshed?.status).toBe("in_progress");
    } finally {
      await cleanup();
    }
  });

  it("still reaps a match that stalls past the whole play window", async () => {
    const { db, joiner, match, cleanup } = await setup();
    try {
      await joinMatchByCode({ userId: joiner.id, joinCode: match.joinCode });

      // The backstop is the one thing this clock is still for: a match where
      // nobody ever disconnects and nobody ever finishes.
      const pastPlayWindow = new Date(Date.now() + MATCH_PLAY_WINDOW_MS + 1000);
      const refreshed = await refreshMatchLifecycle(match.id, pastPlayWindow);

      expect(refreshed?.status).toBe("expired");
    } finally {
      await cleanup();
    }
  });

  it("counts an open stream as presence", async () => {
    const { db, host, joiner, match, cleanup } = await setup();
    try {
      await joinMatchByCode({ userId: joiner.id, joinCode: match.joinCode });

      // Simulate a backgrounded tab: the browser froze the heartbeat timer, so
      // this player's last contact is older than the server's tolerance.
      await db
        .update(matchPlayers)
        .set({
          lastSeenAt: new Date(Date.now() - PLAYER_HEARTBEAT_TIMEOUT_MS - 5_000),
        })
        .where(eq(matchPlayers.userId, joiner.id));

      // Their stream is still open, and it says so.
      await touchMatchPlayerPresence(match.id, joiner.id);
      await refreshMatchLifecycle(match.id);

      const rows = await db
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, match.id));
      const joinerRow = rows.find(row => row.userId === joiner.id);
      expect(joinerRow?.status).toBe("joined");

      // And the player who did go quiet is still dropped.
      await db
        .update(matchPlayers)
        .set({
          lastSeenAt: new Date(Date.now() - PLAYER_HEARTBEAT_TIMEOUT_MS - 5_000),
        })
        .where(eq(matchPlayers.userId, host.id));
      await refreshMatchLifecycle(match.id);

      const afterRows = await db
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, match.id));
      expect(afterRows.find(row => row.userId === host.id)?.status).toBe(
        "disconnected"
      );
    } finally {
      await cleanup();
    }
  });
});
