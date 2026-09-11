import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createLudoSnapshot,
  type LudoSnapshot,
  type LudoPiece,
} from "../../../shared/game/ludo-engine";

const roll = (snapshot: LudoSnapshot, nonce: string, value: number) =>
  applyCommand(
    snapshot,
    {
      kind: "roll",
      matchId: snapshot.matchId,
      playerId: snapshot.currentPlayer,
      expectedVersion: snapshot.version,
      nonce,
    },
    () => value
  );
const move = (snapshot: LudoSnapshot, nonce: string, pieceIndex = 0) =>
  applyCommand(
    snapshot,
    {
      kind: "move",
      matchId: snapshot.matchId,
      playerId: snapshot.currentPlayer,
      expectedVersion: snapshot.version,
      nonce,
      pieceIndex,
    },
    () => 1
  );

describe("ludo engine", () => {
  it("creates a deterministic initial snapshot", () => {
    const snapshot = createLudoSnapshot("match-1");
    expect(snapshot.version).toBe(0);
    expect(snapshot.currentPlayer).toBe(0);
    expect(
      snapshot.players[0].pieces.every((piece: LudoPiece) => piece.position === -1)
    ).toBe(true);
  });

  it("rolls through the server-owned random source", () => {
    const result = roll(createLudoSnapshot("match-1", "2p_single", 1), "roll-1", 6);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.dice).toBe(6);
  });

  it("passes turn when rolling without legal moves, and enables move on a six", () => {
    // Player 0 rolls a 5 with all pieces in base (no legal moves)
    const first = roll(createLudoSnapshot("match-1", "2p_single", 1), "roll-1", 5);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.snapshot.dice).toBe(null);
    expect(first.snapshot.lastRoll).toEqual({
      playerId: 0,
      value: 5,
      hadLegalMoves: false,
    });
    // Turn automatically passes to Player 1
    expect(first.snapshot.currentPlayer).toBe(1);

    // Player 1 rolls a 6 (has legal move to leave base)
    const six = roll(first.snapshot, "roll-2", 6);
    expect(six.ok).toBe(true);
    if (!six.ok) return;
    expect(six.snapshot.dice).toBe(6);
    expect(six.snapshot.currentPlayer).toBe(1);

    // Player 1 moves piece 0 out of base
    const entered = move(six.snapshot, "move-2", 0);
    expect(entered.ok).toBe(true);
    if (entered.ok) {
      expect(entered.snapshot.players[1].pieces[0].position).toBe(0);
      // Extra turn awarded on 6!
      expect(entered.snapshot.currentPlayer).toBe(1);
      expect(entered.snapshot.dice).toBe(null);
    }
  });

  it("rejects stale versions and duplicate nonces", () => {
    const initial = createLudoSnapshot("match-1");
    const first = roll(initial, "same-nonce", 2);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(roll(first.snapshot, "same-nonce", 2)).toMatchObject({
      ok: false,
      code: "DUPLICATE_NONCE",
    });
    expect(
      applyCommand(
        first.snapshot,
        {
          kind: "roll",
          matchId: first.snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "new-nonce",
        },
        () => 2
      )
    ).toMatchObject({ ok: false, code: "STALE_VERSION" });
  });

  it("captures an opponent on a non-safe track square and instantly scores to center", () => {
    const snapshot = createLudoSnapshot("match-1", "2p_single", 1);
    snapshot.dice = 1;
    snapshot.players[0].pieces[0].position = 4;
    snapshot.players[1].pieces[0].position = 31;
    // Give player 0 a second piece on track to verify normal continuation when not sole piece
    snapshot.players[0].pieces[1].position = 10;
    const result = move(snapshot, "capture-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.players[1].pieces[0].position).toBe(-1);
      expect(result.snapshot.players[0].pieces[0].position).toBe(56);
      expect(result.event).toMatchObject({
        type: "moved",
        to: 56,
        capturedPiece: { playerId: 1, pieceIndex: 0 },
      });
      expect(result.snapshot.winner).toBe(null);
    }
  });

  it("wins the match when sole active piece captures opponent and scores home", () => {
    const snapshot = createLudoSnapshot("match-sole-win", "2p_single", 1);
    snapshot.dice = 1;
    snapshot.players[0].pieces[0].position = 4;
    snapshot.players[1].pieces[0].position = 31;
    // Pieces 1..3 remain in base (-1)
    const result = move(snapshot, "capture-sole");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.players[1].pieces[0].position).toBe(-1);
      expect(result.snapshot.players[0].pieces[0].position).toBe(56);
      expect(result.snapshot.winner).toBe(0);
      expect(result.event).toMatchObject({
        type: "won",
        playerId: 0,
      });
    }
  });

  it("captures an opponent piece even on the starting square (no safe squares)", () => {
    const snapshot = createLudoSnapshot("match-start-cap", "2p_single", 1);
    snapshot.dice = 2;
    // Player 0 piece 0 is at progress 0 (global 0, the Red start square)
    snapshot.players[0].pieces[0].position = 0;
    // Player 1 piece 0 is at progress 24 (global (26 + 24) % 52 = 50)
    // Moving 2 steps -> global (50 + 2) % 52 = 0 -> lands on Player 0's start square!
    snapshot.players[1].pieces[0].position = 24;
    snapshot.currentPlayer = 1;

    const result = applyCommand(
      snapshot,
      {
        kind: "move",
        matchId: snapshot.matchId,
        playerId: 1,
        expectedVersion: 0,
        nonce: "cap-start-sq",
        pieceIndex: 0,
        dieValue: 2,
      },
      () => 1
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Player 0's piece was captured on its start square and sent back to base!
      expect(result.snapshot.players[0].pieces[0].position).toBe(-1);
      // Player 1's capturing piece instantly scored to center (56)!
      expect(result.snapshot.players[1].pieces[0].position).toBe(56);
    }
  });

  it("returns a winner when all pieces reach home", () => {
    const snapshot = createLudoSnapshot("match-1", "2p_single", 1);
    snapshot.dice = 1;
    snapshot.players[0].pieces = snapshot.players[0].pieces.map(
      (piece: LudoPiece, index: number) => ({ position: index === 0 ? 55 : 56 })
    );
    const result = move(snapshot, "win-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.winner).toBe(0);
  });

  describe("true dual-dice rules (strict 6-to-exit)", () => {
    it("strictly rejects yard exit on [3, 3] and passes turn when all pieces are in yard", () => {
      const snapshot = createLudoSnapshot("match-dual-1", "2p_single", 2);
      let rollCount = 0;
      // Mock random source to return [3, 3]
      const result = applyCommand(
        snapshot,
        {
          kind: "roll",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "roll-3-3",
        },
        () => 3
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.diceValues).toEqual([3, 3]);
      expect(result.snapshot.lastRoll?.hadLegalMoves).toBe(false);
      // Because neither die is a 6 and all pieces are in yard, turn must pass to player 1!
      expect(result.snapshot.currentPlayer).toBe(1);
      expect(result.snapshot.dice).toBe(null);
    });

    it("allows yard exit when at least one die lands on 6 (e.g. [6, 2])", () => {
      const snapshot = createLudoSnapshot("match-dual-2", "2p_single", 2);
      let callIdx = 0;
      // Mock random source to return 6, then 2
      const result = applyCommand(
        snapshot,
        {
          kind: "roll",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "roll-6-2",
        },
        () => {
          callIdx++;
          return callIdx === 1 ? 6 : 2;
        }
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.diceValues).toEqual([6, 2]);
      expect(result.snapshot.lastRoll?.hadLegalMoves).toBe(true);
      expect(result.snapshot.currentPlayer).toBe(0); // Player 0 can now move

      // Move 1: piece 0 exits base with the 6 (remaining dice has [2])
      const moveRes1 = applyCommand(
        result.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: result.snapshot.version,
          nonce: "move-piece-0-step1",
          pieceIndex: 0,
        },
        () => 1
      );

      expect(moveRes1.ok).toBe(true);
      if (!moveRes1.ok) return;
      expect(moveRes1.snapshot.players[0].pieces[0].position).toBe(0);
      expect(moveRes1.snapshot.remainingDice).toEqual([2]);
      expect(moveRes1.snapshot.currentPlayer).toBe(0); // Player 0 still has their 2 to play!

      // Move 2: advance piece 0 by remaining 2 (from 0 to 2)
      const moveRes2 = applyCommand(
        moveRes1.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: moveRes1.snapshot.version,
          nonce: "move-piece-0-step2",
          pieceIndex: 0,
        },
        () => 1
      );

      expect(moveRes2.ok).toBe(true);
      if (!moveRes2.ok) return;
      expect(moveRes2.snapshot.players[0].pieces[0].position).toBe(2);
      expect(moveRes2.snapshot.remainingDice).toEqual([]);
      // Turn passes to Player 1 because [6, 2] is not doubles
      expect(moveRes2.snapshot.currentPlayer).toBe(1);
    });

    it("awards bonus turn on doubles (e.g. [4, 4]) when moving on track", () => {
      const snapshot = createLudoSnapshot("match-dual-3", "2p_single", 2);
      snapshot.players[0].pieces[0].position = 10; // First piece on track
      snapshot.players[0].pieces[1].position = 0;  // Second piece on track (allows splitting dice)

      const rollRes = applyCommand(
        snapshot,
        {
          kind: "roll",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "roll-4-4",
        },
        () => 4
      );

      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;
      expect(rollRes.snapshot.diceValues).toEqual([4, 4]);
      expect(rollRes.snapshot.remainingDice).toEqual([4, 4]);

      // Move 1: advance by first 4 (10 -> 14)
      const moveRes1 = applyCommand(
        rollRes.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: rollRes.snapshot.version,
          nonce: "move-4-4-step1",
          pieceIndex: 0,
        },
        () => 1
      );

      expect(moveRes1.ok).toBe(true);
      if (!moveRes1.ok) return;
      expect(moveRes1.snapshot.players[0].pieces[0].position).toBe(14);
      expect(moveRes1.snapshot.remainingDice).toEqual([4]);
      expect(moveRes1.snapshot.currentPlayer).toBe(0);

      // Move 2: advance by second 4 (14 -> 18)
      const moveRes2 = applyCommand(
        moveRes1.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: moveRes1.snapshot.version,
          nonce: "move-4-4-step2",
          pieceIndex: 0,
        },
        () => 1
      );

      expect(moveRes2.ok).toBe(true);
      if (!moveRes2.ok) return;
      expect(moveRes2.snapshot.players[0].pieces[0].position).toBe(18);
      expect(moveRes2.snapshot.remainingDice).toEqual([]);
      // Extra turn awarded for doubles [4, 4]!
      expect(moveRes2.snapshot.currentPlayer).toBe(0);
    });

    it("captures opponent at intermediate step (0+5=5) during dual dice roll [5, 3] and scores to home", () => {
      const snapshot = createLudoSnapshot("match-dual-sole", "2p_single", 2);
      snapshot.players[0].pieces[0].position = 0; // Sole piece on track
      // Opponent at global track 5 (which is position 31 for Player 1: (26 + 31) % 52 = 5)
      snapshot.players[1].pieces[0].position = 31;

      let rollIdx = 0;
      const dice = [5, 3];
      const rollRes = applyCommand(
        snapshot,
        {
          kind: "roll",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "roll-5-3",
        },
        () => dice[rollIdx++]
      );

      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;
      expect(rollRes.snapshot.diceValues).toEqual([5, 3]);

      // Move sole piece: captures opponent on intermediate 5 and scores to home 56
      const moveRes = applyCommand(
        rollRes.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: rollRes.snapshot.version,
          nonce: "move-combined",
          pieceIndex: 0,
          dieValue: 8,
        },
        () => 1
      );

      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;
      // Capturing piece scored to center 56!
      expect(moveRes.snapshot.players[0].pieces[0].position).toBe(56);
      // Opponent was captured (back to -1)
      expect(moveRes.snapshot.players[1].pieces[0].position).toBe(-1);
      // Winner declared because sole active piece scored home
      expect(moveRes.snapshot.winner).toBe(0);
    });

    it("allows splitting dice [5, 3] when another piece is outside, capturing opponent at distance 5 and scoring to center", () => {
      const snapshot = createLudoSnapshot("match-dual-split", "2p_single", 2);
      snapshot.players[0].pieces[0].position = 0; // Piece 0
      snapshot.players[0].pieces[1].position = 20; // Piece 1 also outside!
      snapshot.players[1].pieces[0].position = 31; // Opponent at global track 5

      let rollIdx = 0;
      const dice = [5, 3];
      const rollRes = applyCommand(
        snapshot,
        {
          kind: "roll",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: 0,
          nonce: "roll-5-3-split",
        },
        () => dice[rollIdx++]
      );

      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Move Piece 0 using die 5: lands on opponent at 5!
      const moveRes1 = applyCommand(
        rollRes.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: rollRes.snapshot.version,
          nonce: "move-split-capture",
          pieceIndex: 0,
          dieValue: 5,
        },
        () => 1
      );

      expect(moveRes1.ok).toBe(true);
      if (!moveRes1.ok) return;
      // Opponent knocked back to base -1
      expect(moveRes1.snapshot.players[1].pieces[0].position).toBe(-1);
      // Capturing Piece 0 instantly scores to center (56)!
      expect(moveRes1.snapshot.players[0].pieces[0].position).toBe(56);
      // Remaining die 3 is available for Piece 1
      expect(moveRes1.snapshot.remainingDice).toEqual([3]);

      // Move Piece 1 using remaining die 3 (20 -> 23)
      const moveRes2 = applyCommand(
        moveRes1.snapshot,
        {
          kind: "move",
          matchId: snapshot.matchId,
          playerId: 0,
          expectedVersion: moveRes1.snapshot.version,
          nonce: "move-split-piece1",
          pieceIndex: 1,
          dieValue: 3,
        },
        () => 1
      );

      expect(moveRes2.ok).toBe(true);
      if (!moveRes2.ok) return;
      expect(moveRes2.snapshot.players[0].pieces[1].position).toBe(23);
      expect(moveRes2.snapshot.remainingDice).toEqual([]);
    });
  });
});
