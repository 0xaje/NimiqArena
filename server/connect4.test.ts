import { describe, expect, it } from "vitest";
import {
  applyConnect4Command,
  checkConnect4Victory,
  createConnect4Snapshot,
  getLowestEmptyRow,
  isBoardFull,
  type Connect4Snapshot,
} from "../shared/game/connect4-engine";
import { selectBestConnect4Drop } from "../shared/game/connect4-bot";

describe("Connect 4 Engine & Victory Detector", () => {
  it("initializes a fresh 7x6 board with Player 0 to move", () => {
    const snap = createConnect4Snapshot("test-match-1");
    expect(snap.currentPlayer).toBe(0);
    expect(snap.version).toBe(0);
    expect(snap.winner).toBeNull();
    expect(snap.board.length).toBe(7);
    expect(snap.board[0].length).toBe(6);
    expect(snap.board[0][0]).toBeNull();
  });

  it("applies gravity correctly on column drops and toggles turn", () => {
    let snap = createConnect4Snapshot("test-match-1");

    // Player 0 drops in column 3 (lands on row 0)
    const res1 = applyConnect4Command(snap, {
      kind: "drop",
      matchId: "test-match-1",
      playerId: 0,
      column: 3,
      expectedVersion: 0,
      nonce: "nonce-1",
    });

    expect(res1.ok).toBe(true);
    if (!res1.ok) return;
    expect(res1.snapshot.board[3][0]).toBe(0);
    expect(res1.snapshot.currentPlayer).toBe(1);
    expect(res1.snapshot.version).toBe(1);

    // Player 1 drops in column 3 (lands on row 1)
    const res2 = applyConnect4Command(res1.snapshot, {
      kind: "drop",
      matchId: "test-match-1",
      playerId: 1,
      column: 3,
      expectedVersion: 1,
      nonce: "nonce-2",
    });

    expect(res2.ok).toBe(true);
    if (!res2.ok) return;
    expect(res2.snapshot.board[3][1]).toBe(1);
    expect(res2.snapshot.currentPlayer).toBe(0);
  });

  it("detects horizontal 4-in-a-row victory", () => {
    let snap = createConnect4Snapshot("test-match-1");
    // Col 0, 1, 2, 3 on bottom row for Player 0
    snap.board[0][0] = 0;
    snap.board[1][0] = 0;
    snap.board[2][0] = 0;
    snap.version = 6;

    const res = applyConnect4Command(snap, {
      kind: "drop",
      matchId: "test-match-1",
      playerId: 0,
      column: 3,
      expectedVersion: 6,
      nonce: "nonce-win",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.snapshot.winner).toBe(0);
    expect(res.snapshot.winningLine).toBeDefined();
    expect(res.snapshot.winningLine?.length).toBe(4);
  });

  it("detects vertical 4-in-a-row victory", () => {
    let snap = createConnect4Snapshot("test-match-1");
    // Col 2 rows 0, 1, 2 for Player 0
    snap.board[2][0] = 0;
    snap.board[2][1] = 0;
    snap.board[2][2] = 0;
    snap.version = 6;

    const res = applyConnect4Command(snap, {
      kind: "drop",
      matchId: "test-match-1",
      playerId: 0,
      column: 2,
      expectedVersion: 6,
      nonce: "nonce-win-vert",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.snapshot.winner).toBe(0);
    expect(res.snapshot.winningLine?.length).toBe(4);
  });

  it("detects diagonal 4-in-a-row victory", () => {
    const snap = createConnect4Snapshot("test-match-1");
    // (0,0), (1,1), (2,2), (3,3)
    snap.board[0][0] = 0;
    snap.board[1][1] = 0;
    snap.board[2][2] = 0;
    snap.board[3][3] = 0;

    const line = checkConnect4Victory(snap.board, 3, 3);
    expect(line).not.toBeNull();
    expect(line?.length).toBe(4);
  });
});

describe("Connect 4 AI Bot Evaluator", () => {
  it("prioritizes winning drop immediately when 3-in-a-row is ready", () => {
    const snap = createConnect4Snapshot("bot-test");
    // Bot (1) has 3 in a row vertically on column 2 (rows 0, 1, 2)
    snap.board[2][0] = 1;
    snap.board[2][1] = 1;
    snap.board[2][2] = 1;
    snap.currentPlayer = 1;

    const choice = selectBestConnect4Drop(snap, 1);
    expect(choice).not.toBeNull();
    expect(choice?.column).toBe(2);
    expect(choice?.score).toBe(10000);
  });

  it("blocks opponent winning drop when opponent has 3 in a row", () => {
    const snap = createConnect4Snapshot("bot-test");
    // Opponent (0) has 3 in a row horizontally on cols 1, 2, 3 row 0
    snap.board[1][0] = 0;
    snap.board[2][0] = 0;
    snap.board[3][0] = 0;
    snap.currentPlayer = 1;

    const choice = selectBestConnect4Drop(snap, 1);
    expect(choice).not.toBeNull();
    // Col 0 or Col 4 blocks the opponent win
    expect([0, 4]).toContain(choice?.column);
    expect(choice?.reason).toContain("Block opponent");
  });
});
