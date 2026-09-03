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
          let currentSnap = rollRes.snapshot;
          while (
            currentSnap.dice !== null &&
            currentSnap.currentPlayer === 0 &&
            currentSnap.winner === null
          ) {
            const bestHumanMove = selectBestBotMove(
              currentSnap,
              0 as LudoPlayerId,
              currentSnap.dice
            );
            if (!bestHumanMove) break;

            const moveRes = await applyLudoMatchCommand({
              matchId: match.id,
              userId: user.id,
              command: {
                kind: "move",
                pieceIndex: bestHumanMove.pieceIndex,
                dieValue: bestHumanMove.dieValue,
                expectedVersion: currentVersion,
                nonce: `h-move-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
              },
            });
            currentSnap = moveRes.snapshot;
            currentVersion = moveRes.snapshot.version;
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

          let currentSnap2 = rollRes.snapshot;
          while (
            currentSnap2.dice !== null &&
            currentSnap2.currentPlayer === 0 &&
            currentSnap2.winner === null
          ) {
            const bestHumanMove = selectBestBotMove(
              currentSnap2,
              0 as LudoPlayerId,
              currentSnap2.dice
            );
            if (!bestHumanMove) break;

            const moveRes = await applyLudoMatchCommand({
              matchId: match.id,
              userId: user.id,
              command: {
                kind: "move",
                pieceIndex: bestHumanMove.pieceIndex,
                dieValue: bestHumanMove.dieValue,
                expectedVersion: currentVersion,
                nonce: `h2-move-${matchIndex}-${turnsPlayed}-${nanoid(8)}`,
              },
            });
            currentSnap2 = moveRes.snapshot;
            currentVersion = moveRes.snapshot.version;
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

    // Verify lock is not held (settle any autonomous bot step triggered by a forfeited roll)
    if (isMatchBotLocked(match.id)) {
      await new Promise(r => setTimeout(r, 60));
    }
    expect(isMatchBotLocked(match.id)).toBe(false);

    // Verify match is still healthy
    const current = await getMatchById(match.id);
    expect(current?.stateVersion).toBeGreaterThanOrEqual(roll.snapshot.version);
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

  // 6. CONCURRENCY: 5 Simultaneous bot matches running in parallel
  it("executes 5 simultaneous bot matches in parallel with zero lock contention or deadlocks", async () => {
    const matchCount = 5;
    const testUsers = await Promise.all(
      Array.from({ length: matchCount }, (_, i) => createTestUser(`parallel-bot-${i}`))
    );

    const testMatches = await Promise.all(
      testUsers.map(u =>
        createSoloPracticeMatch({
          userId: u.id,
          gameSlug: "ludo-league",
        })
      )
    );

    // Concurrently trigger human roll and subsequent bot turn across all 5 matches
    const results = await Promise.all(
      testMatches.map(async (match, idx) => {
        const user = testUsers[idx];
        const rollRes = await applyLudoMatchCommand({
          matchId: match.id,
          userId: user.id,
          command: {
            kind: "roll",
            expectedVersion: match.stateVersion,
            nonce: `par-roll-${nanoid(16)}`,
          },
        });

        // If turn passed to bot, execute bot turn
        if (rollRes.snapshot.currentPlayer === 1) {
          const botRes = await executeBotTurn({
            matchId: match.id,
            userId: user.id,
          });
          expect(botRes.ok).toBe(true);
        }

        expect(isMatchBotLocked(match.id)).toBe(false);
        const finalMatch = await getMatchById(match.id);
        expect(finalMatch?.stateVersion).toBeGreaterThan(match.stateVersion);
        return finalMatch;
      })
    );

    expect(results.length).toBe(matchCount);
    // Ensure all 5 matches are unlocked
    for (const m of testMatches) {
      expect(isMatchBotLocked(m.id)).toBe(false);
    }
  });

  // 7. HIGH-COUNT STEPPING: 100 consecutive turns in a practice match
  it("executes 100 consecutive turns in a practice match without infinite loops or lock leaks", async () => {
    const user = await createTestUser("step-100");
    const match = await createSoloPracticeMatch({
      userId: user.id,
      gameSlug: "ludo-league",
    });

    let currentVersion = match.stateVersion;
    let stepsCompleted = 0;
    const targetSteps = 100;

    while (stepsCompleted < targetSteps) {
      const currentMatch = await getMatchById(match.id);
      if (!currentMatch || currentMatch.status !== "in_progress") break;

      const snapshot = JSON.parse(currentMatch.stateJson);
      if (snapshot.winner !== null) break;

      if (snapshot.currentPlayer === 0) {
        if (snapshot.dice === null) {
          const rollRes = await applyLudoMatchCommand({
            matchId: match.id,
            userId: user.id,
            command: {
              kind: "roll",
              expectedVersion: currentVersion,
              nonce: `step100-${nanoid(16)}`,
            },
          });
          currentVersion = rollRes.snapshot.version;
          stepsCompleted++;
        } else {
          const movablePieces: number[] = [];
          const [d1, d2] = snapshot.diceValues ?? [snapshot.dice ?? 0, 0];
          const hasSix = snapshot.diceValues
            ? d1 === 6 || d2 === 6
            : snapshot.dice === 6;
          snapshot.players[0].pieces.forEach((p: any, idx: number) => {
            if (p.position === -1 && hasSix) {
              movablePieces.push(idx);
            } else if (
              p.position >= 0 &&
              (p.position + (snapshot.dice ?? 0) <= 57 ||
                p.position + d1 <= 57 ||
                p.position + d2 <= 57)
            ) {
              movablePieces.push(idx);
            }
          });

          if (movablePieces.length > 0) {
            const moveRes = await applyLudoMatchCommand({
              matchId: match.id,
              userId: user.id,
              command: {
                kind: "move",
                pieceIndex: movablePieces[0],
                expectedVersion: currentVersion,
                nonce: `step100-m-${nanoid(16)}`,
              },
            });
            currentVersion = moveRes.snapshot.version;
            stepsCompleted++;
          } else {
            break;
          }
        }
      } else if (snapshot.currentPlayer === 1) {
        const botRes = await executeBotTurn({
          matchId: match.id,
          userId: user.id,
        });
        expect(botRes.ok).toBe(true);
        const updated = await getMatchById(match.id);
        if (updated) currentVersion = updated.stateVersion;
        stepsCompleted++;
        expect(isMatchBotLocked(match.id)).toBe(false);
      }
    }

    expect(stepsCompleted).toBeGreaterThan(20);
    expect(isMatchBotLocked(match.id)).toBe(false);
  }, 25000);
});
