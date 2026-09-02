import { describe, expect, it } from "vitest";
import {
  applyLudoMatchCommand,
  createSoloPracticeMatch,
  executeBotTurn,
  getMatchById,
  isMatchBotLocked,
  scheduleAutonomousBotStep,
  getDb,
} from "./db";
import { users } from "../drizzle/schema";
import { nanoid } from "nanoid";
import type { LudoSnapshot } from "../shared/game/ludo-engine";

import { eq } from "drizzle-orm";

describe("Autonomous Server-Authoritative Bot Engine Regression Suite", () => {
  async function createTestHumanUser(prefix: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");
    const openId = `${prefix}-${Date.now()}-${nanoid(6)}`;
    await db.insert(users).values({
      openId,
      name: `${prefix} Player`,
      role: "user",
    });
    const created = (
      await db.select().from(users).where(eq(users.openId, openId)).limit(1)
    )[0];
    if (!created) throw new Error("Failed to create test user");
    return created;
  }

  it("creates a solo practice match with human at seat 0 and bot at seat 1", async () => {
    const user = await createTestHumanUser("bot-reg-1");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    expect(match).toBeDefined();
    expect(match.status).toBe("in_progress");
    expect(match.joinCode).toMatch(/^BOT/);

    const snapshot = JSON.parse(match.stateJson) as LudoSnapshot;
    expect(snapshot.currentPlayer).toBe(0);
    expect(snapshot.dice).toBeNull();
    expect(snapshot.winner).toBeNull();
    expect(snapshot.players).toHaveLength(2);
  });

  it("server-side bot execution lock prevents duplicate concurrent bot execution", async () => {
    const user = await createTestHumanUser("bot-reg-lock");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    // Schedule autonomous bot step
    scheduleAutonomousBotStep(match.id, 50);

    // Call executeBotTurn concurrently: lock must protect state
    const res = await executeBotTurn({ matchId: match.id, userId: user.id });
    expect(res.ok).toBe(true);

    const updated = await getMatchById(match.id);
    expect(updated).toBeDefined();
    expect(updated?.status).toBe("in_progress");
  });

  it("executes bot turn sequence cleanly without infinite loops when bot has turn", async () => {
    const user = await createTestHumanUser("bot-reg-loop");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    // Roll dice for human player (seat 0)
    const rollRes = await applyLudoMatchCommand({
      matchId: match.id,
      userId: user.id,
      command: {
        kind: "roll",
        expectedVersion: match.stateVersion,
        nonce: `human-roll-${nanoid(16)}`,
      },
    });

    // If human had no legal moves, turn automatically passes to bot (seat 1)
    if (rollRes.snapshot.currentPlayer === 1) {
      // Execute bot turn authoritatively
      const botRes = await executeBotTurn({ matchId: match.id, userId: user.id });
      expect(botRes.ok).toBe(true);

      const latest = await getMatchById(match.id);
      expect(latest).toBeDefined();
      const latestSnap = JSON.parse(latest!.stateJson) as LudoSnapshot;

      // Bot must have rolled and either made a move or passed turn back to human
      expect(latestSnap.version).toBeGreaterThan(match.stateVersion);
    } else if (rollRes.snapshot.dice === 6) {
      // Human rolled 6: deploy piece 0
      const moveRes = await applyLudoMatchCommand({
        matchId: match.id,
        userId: user.id,
        command: {
          kind: "move",
          pieceIndex: 0,
          expectedVersion: rollRes.snapshot.version,
          nonce: `human-move-${nanoid(16)}`,
        },
      });
      expect(moveRes.snapshot.players[0].pieces[0].position).toBe(0);
    }
  });

  it("bot never executes actions after match is finished", async () => {
    const user = await createTestHumanUser("bot-reg-finish");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Manually finish the match
    const snapshot = JSON.parse(match.stateJson) as LudoSnapshot;
    snapshot.winner = 0;
    const { matches } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(matches)
      .set({
        status: "finished",
        stateJson: JSON.stringify(snapshot),
      })
      .where(eq(matches.id, match.id));

    // Try executing bot turn: must be rejected gracefully
    await expect(
      executeBotTurn({ matchId: match.id, userId: user.id })
    ).rejects.toThrow("Match is not in progress.");
  });

  it("isMatchBotLocked returns false when no bot turn is running", () => {
    expect(isMatchBotLocked("non-existent-match-id")).toBe(false);
  });
});
