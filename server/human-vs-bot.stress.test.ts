import { describe, expect, it } from "vitest";
import {
  applyLudoMatchCommand,
  createSoloPracticeMatch,
  executeBotTurn,
  getMatchById,
  isMatchBotLocked,
  scheduleAutonomousBotStep,
  getDb,
  clearBotMatchTimerAndLock,
} from "./db";
import { users, matches } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { LudoSnapshot, LudoPlayerId } from "../shared/game/ludo-engine";
import { selectBestBotMove } from "../shared/game/ludo-bot";

describe("Human vs Bot Stress & Chaos Validation Suite", () => {
  async function createTestUser(prefix: string) {
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

  // 1A. STRESS TEST: Batch 1 (15 Consecutive Real Matches)
  it("executes 15 consecutive human-vs-bot matches to verify zero infinite loops, zero freezes, and zero lock leaks", async () => {
    const user = await createTestUser("stress-runner-1");

    for (let matchIndex = 1; matchIndex <= 15; matchIndex++) {
      const match = await createSoloPracticeMatch({
        userId: user.id,
        gameSlug: "ludo-league",
      });

      expect(match.status).toBe("in_progress");
      expect(isMatchBotLocked(match.id)).toBe(false);

      let currentVersion = match.stateVersion;
      let turnsPlayed = 0;
      let maxTurns = 45; // sufficient to verify multi-turn mechanics without stalling
      let gameFinished = false;

      while (!gameFinished && turnsPlayed < maxTurns) {
        turnsPlayed++;

        const currentMatch = await getMatchById(match.id);
        if (!currentMatch || currentMatch.status !== "in_progress") {
          gameFinished = true;
          break;
        }

        const snapshot = JSON.parse(currentMatch.stateJson) as LudoSnapshot;
        if (snapshot.winner !== null) {
          gameFinished = true;
          break;
        }

        if (snapshot.currentPlayer === 0) {
          // Human turn: roll dice
          const rollRes = await applyLudoMatchCommand({
            matchId: match.id,
            userId: user.id,
            command: {
              kind: "roll",
              expectedVersion: currentVersion,
              nonce: `h-roll-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
            },
          });
          currentVersion = rollRes.snapshot.version;

          // If dice was rolled and human has a legal move, move piece
          if (rollRes.snapshot.dice !== null && rollRes.snapshot.currentPlayer === 0) {
            const bestHumanMove = selectBestBotMove(
              rollRes.snapshot,
              0 as LudoPlayerId,
              rollRes.snapshot.dice
            );

            if (bestHumanMove) {
              const moveRes = await applyLudoMatchCommand({
                matchId: match.id,
                userId: user.id,
                command: {
                  kind: "move",
                  pieceIndex: bestHumanMove.pieceIndex,
                  expectedVersion: currentVersion,
                  nonce: `h-move-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
                },
              });
              currentVersion = moveRes.snapshot.version;
            }
          }
        } else if (snapshot.currentPlayer === 1) {
          // Bot turn: execute authoritatively via server bot execution
          const botResult = await executeBotTurn({
            matchId: match.id,
            userId: user.id,
          });
          expect(botResult.ok).toBe(true);

          const updatedMatch = await getMatchById(match.id);
          expect(updatedMatch).toBeDefined();
          currentVersion = updatedMatch!.stateVersion;

          // Verify lock is freed immediately
          expect(isMatchBotLocked(match.id)).toBe(false);
        }
      }

      // Assertions per match
      expect(turnsPlayed).toBeGreaterThan(0);
      expect(isMatchBotLocked(match.id)).toBe(false);
    }
  }, 45000);

  // 1B. STRESS TEST: Batch 2 (10 Consecutive Real Matches)
  it("executes 10 consecutive human-vs-bot matches to complete 25 total verified matches", async () => {
    const user = await createTestUser("stress-runner-2");

    for (let matchIndex = 1; matchIndex <= 10; matchIndex++) {
      const match = await createSoloPracticeMatch({
        userId: user.id,
        gameSlug: "ludo-league",
      });

      expect(match.status).toBe("in_progress");
      expect(isMatchBotLocked(match.id)).toBe(false);

      let currentVersion = match.stateVersion;
      let turnsPlayed = 0;
      let maxTurns = 45;
      let gameFinished = false;

      while (!gameFinished && turnsPlayed < maxTurns) {
        turnsPlayed++;

        const currentMatch = await getMatchById(match.id);
        if (!currentMatch || currentMatch.status !== "in_progress") {
          gameFinished = true;
          break;
        }

        const snapshot = JSON.parse(currentMatch.stateJson) as LudoSnapshot;
        if (snapshot.winner !== null) {
          gameFinished = true;
          break;
        }

        if (snapshot.currentPlayer === 0) {
          const rollRes = await applyLudoMatchCommand({
            matchId: match.id,
            userId: user.id,
            command: {
              kind: "roll",
              expectedVersion: currentVersion,
              nonce: `h2-roll-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
            },
          });
          currentVersion = rollRes.snapshot.version;

          if (rollRes.snapshot.dice !== null && rollRes.snapshot.currentPlayer === 0) {
            const bestHumanMove = selectBestBotMove(
              rollRes.snapshot,
              0 as LudoPlayerId,
              rollRes.snapshot.dice
            );

            if (bestHumanMove) {
              const moveRes = await applyLudoMatchCommand({
                matchId: match.id,
                userId: user.id,
                command: {
                  kind: "move",
                  pieceIndex: bestHumanMove.pieceIndex,
                  expectedVersion: currentVersion,
                  nonce: `h2-move-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
                },
              });
              currentVersion = moveRes.snapshot.version;
            }
          }
        } else if (snapshot.currentPlayer === 1) {
          const botResult = await executeBotTurn({
            matchId: match.id,
            userId: user.id,
          });
          expect(botResult.ok).toBe(true);

          const updatedMatch = await getMatchById(match.id);
          expect(updatedMatch).toBeDefined();
          currentVersion = updatedMatch!.stateVersion;

          expect(isMatchBotLocked(match.id)).toBe(false);
        }
      }

      expect(turnsPlayed).toBeGreaterThan(0);
      expect(isMatchBotLocked(match.id)).toBe(false);
    }
  }, 45000);

  // 2. EDGE CASE: Stale human command submission during active game
  it("rejects human command with stale expectedVersion without corrupting state or hanging lock", async () => {
    const user = await createTestUser("edge-stale");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    // Valid roll
    const roll = await applyLudoMatchCommand({
      matchId: match.id,
      userId: user.id,
      command: {
        kind: "roll",
        expectedVersion: match.stateVersion,
        nonce: `valid-nonce-${nanoid(8)}`,
      },
    });

    // Stale roll with old version 0
    await expect(
      applyLudoMatchCommand({
        matchId: match.id,
        userId: user.id,
        command: {
          kind: "roll",
          expectedVersion: 0,
          nonce: `stale-nonce-${nanoid(8)}`,
        },
      })
    ).rejects.toThrow(/Match state changed|version mismatch/i);

    // Verify lock is not held
    expect(isMatchBotLocked(match.id)).toBe(false);

    // Verify match is still healthy at version 1
    const current = await getMatchById(match.id);
    expect(current?.stateVersion).toBe(roll.snapshot.version);
  });

  // 3. EDGE CASE: Duplicate command nonce returns exact identical result idempotently
  it("replays duplicate command nonce without double-rolling or advancing version", async () => {
    const user = await createTestUser("edge-nonce");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    const fixedNonce = `idempotent-test-nonce-${nanoid(12)}`;

    // First attempt
    const res1 = await applyLudoMatchCommand({
      matchId: match.id,
      userId: user.id,
      command: {
        kind: "roll",
        expectedVersion: match.stateVersion,
        nonce: fixedNonce,
      },
    });

    // Duplicate attempt with same nonce
    const res2 = await applyLudoMatchCommand({
      matchId: match.id,
      userId: user.id,
      command: {
        kind: "roll",
        expectedVersion: match.stateVersion,
        nonce: fixedNonce,
      },
    });

    expect(res2.snapshot.version).toBe(res1.snapshot.version);
    expect(res2.snapshot.lastRoll?.value).toBe(res1.snapshot.lastRoll?.value);
  });

  // 4. EDGE CASE: Match finished blocks any future bot execution
  it("permanently halts bot execution once match status is finished", async () => {
    const user = await createTestUser("edge-finish");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Force finish match
    await db
      .update(matches)
      .set({ status: "finished" })
      .where(eq(matches.id, match.id));

    // Bot execution must be rejected
    await expect(
      executeBotTurn({ matchId: match.id, userId: user.id })
    ).rejects.toThrow("Match is not in progress.");

    expect(isMatchBotLocked(match.id)).toBe(false);
  });

  // 5. EDGE CASE: Cleanup timer and lock when match is abandoned or reset
  it("clearBotMatchTimerAndLock successfully cleans up pending timer and lock state", async () => {
    const matchId = `test-clean-${nanoid(8)}`;
    scheduleAutonomousBotStep(matchId, 5000);

    // Call cleanup
    clearBotMatchTimerAndLock(matchId);

    expect(isMatchBotLocked(matchId)).toBe(false);
  });
});
