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
    const result = roll(createLudoSnapshot("match-1"), "roll-1", 6);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.dice).toBe(6);
  });

  it("passes turn when rolling without legal moves, and enables move on a six", () => {
    // Player 0 rolls a 5 with all pieces in base (no legal moves)
    const first = roll(createLudoSnapshot("match-1"), "roll-1", 5);
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

  it("captures an opponent on a non-safe track square", () => {
    const snapshot = createLudoSnapshot("match-1");
    snapshot.dice = 1;
    snapshot.players[0].pieces[0].position = 4;
    snapshot.players[1].pieces[0].position = 31;
    const result = move(snapshot, "capture-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.players[1].pieces[0].position).toBe(-1);
      expect(result.event).toMatchObject({
        type: "moved",
        capturedPiece: { playerId: 1, pieceIndex: 0 },
      });
    }
  });

  it("returns a winner when all pieces reach home", () => {
    const snapshot = createLudoSnapshot("match-1");
    snapshot.dice = 1;
    snapshot.players[0].pieces = snapshot.players[0].pieces.map(
      (piece: LudoPiece, index: number) => ({ position: index === 0 ? 56 : 57 })
    );
    const result = move(snapshot, "win-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.winner).toBe(0);
  });
});
