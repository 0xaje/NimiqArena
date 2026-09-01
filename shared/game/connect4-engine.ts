export const CONNECT4_COLS = 7;
export const CONNECT4_ROWS = 6;

export type Connect4PlayerId = 0 | 1;
export type Connect4Cell = Connect4PlayerId | null;

export interface Connect4Snapshot {
  matchId: string;
  version: number;
  currentPlayer: Connect4PlayerId;
  board: Connect4Cell[][]; // board[col][row], where row 0 is bottom, row 5 is top
  winner: Connect4PlayerId | "draw" | null;
  winningLine: [number, number][] | null; // [[col, row], [col, row], [col, row], [col, row]]
  usedNonces: string[];
}

export type Connect4Command = {
  kind: "drop";
  matchId: string;
  playerId: Connect4PlayerId;
  expectedVersion: number;
  nonce: string;
  column: number; // 0..6
};

export type Connect4Event =
  | {
      type: "dropped";
      playerId: Connect4PlayerId;
      column: number;
      row: number;
    }
  | {
      type: "won";
      winner: Connect4PlayerId;
      winningLine: [number, number][];
    }
  | {
      type: "draw";
    };

export type Connect4RejectionReason =
  | "STALE_VERSION"
  | "DUPLICATE_NONCE"
  | "NOT_YOUR_TURN"
  | "MATCH_FINISHED"
  | "COLUMN_FULL"
  | "INVALID_COLUMN";

export type Connect4ApplyResult =
  | {
      ok: true;
      snapshot: Connect4Snapshot;
      event: Connect4Event;
    }
  | {
      ok: false;
      code: Connect4RejectionReason;
      message: string;
    };

export function createConnect4Snapshot(matchId: string): Connect4Snapshot {
  const board: Connect4Cell[][] = [];
  for (let col = 0; col < CONNECT4_COLS; col++) {
    board.push(new Array(CONNECT4_ROWS).fill(null));
  }

  return {
    matchId,
    version: 0,
    currentPlayer: 0,
    board,
    winner: null,
    winningLine: null,
    usedNonces: [],
  };
}

export function cloneConnect4Snapshot(
  snapshot: Connect4Snapshot
): Connect4Snapshot {
  return {
    ...snapshot,
    board: snapshot.board.map(col => [...col]),
    winningLine: snapshot.winningLine
      ? snapshot.winningLine.map(([c, r]) => [c, r])
      : null,
    usedNonces: [...snapshot.usedNonces],
  };
}

export function getLowestEmptyRow(
  board: Connect4Cell[][],
  col: number
): number {
  if (col < 0 || col >= CONNECT4_COLS) return -1;
  for (let row = 0; row < CONNECT4_ROWS; row++) {
    if (board[col][row] === null) {
      return row;
    }
  }
  return -1; // Column full
}

export function checkConnect4Victory(
  board: Connect4Cell[][],
  lastCol: number,
  lastRow: number
): [number, number][] | null {
  const target = board[lastCol][lastRow];
  if (target === null) return null;

  const directions: [number, number][] = [
    [1, 0], // Horizontal
    [0, 1], // Vertical
    [1, 1], // Diagonal /
    [1, -1], // Diagonal \
  ];

  for (const [dc, dr] of directions) {
    const line: [number, number][] = [[lastCol, lastRow]];

    // Look forward
    for (let step = 1; step < 4; step++) {
      const c = lastCol + dc * step;
      const r = lastRow + dr * step;
      if (
        c >= 0 &&
        c < CONNECT4_COLS &&
        r >= 0 &&
        r < CONNECT4_ROWS &&
        board[c][r] === target
      ) {
        line.push([c, r]);
      } else {
        break;
      }
    }

    // Look backward
    for (let step = 1; step < 4; step++) {
      const c = lastCol - dc * step;
      const r = lastRow - dr * step;
      if (
        c >= 0 &&
        c < CONNECT4_COLS &&
        r >= 0 &&
        r < CONNECT4_ROWS &&
        board[c][r] === target
      ) {
        line.push([c, r]);
      } else {
        break;
      }
    }

    if (line.length >= 4) {
      return line.slice(0, 4);
    }
  }

  return null;
}

export function isBoardFull(board: Connect4Cell[][]): boolean {
  for (let col = 0; col < CONNECT4_COLS; col++) {
    if (board[col][CONNECT4_ROWS - 1] === null) {
      return false;
    }
  }
  return true;
}

export function applyConnect4Command(
  snapshot: Connect4Snapshot,
  command: Connect4Command
): Connect4ApplyResult {
  const reject = (
    code: Connect4RejectionReason,
    message: string
  ): Connect4ApplyResult => ({
    ok: false,
    code,
    message,
  });

  if (command.expectedVersion !== snapshot.version) {
    return reject(
      "STALE_VERSION",
      `Expected state version ${command.expectedVersion} but found ${snapshot.version}.`
    );
  }
  if (snapshot.usedNonces.includes(command.nonce)) {
    return reject(
      "DUPLICATE_NONCE",
      "Command nonce has already been applied."
    );
  }
  if (snapshot.winner !== null) {
    return reject("MATCH_FINISHED", "Match already finished.");
  }
  if (command.playerId !== snapshot.currentPlayer) {
    return reject("NOT_YOUR_TURN", "It is not this player's turn.");
  }
  if (
    !Number.isInteger(command.column) ||
    command.column < 0 ||
    command.column >= CONNECT4_COLS
  ) {
    return reject(
      "INVALID_COLUMN",
      `Column must be an integer from 0 to ${CONNECT4_COLS - 1}.`
    );
  }

  const dropRow = getLowestEmptyRow(snapshot.board, command.column);
  if (dropRow === -1) {
    return reject("COLUMN_FULL", `Column ${command.column} is full.`);
  }

  const next = cloneConnect4Snapshot(snapshot);
  next.board[command.column][dropRow] = command.playerId;
  next.version += 1;
  next.usedNonces.push(command.nonce);

  const winningLine = checkConnect4Victory(
    next.board,
    command.column,
    dropRow
  );

  if (winningLine) {
    next.winner = command.playerId;
    next.winningLine = winningLine;
    return {
      ok: true,
      snapshot: next,
      event: {
        type: "won",
        winner: command.playerId,
        winningLine,
      },
    };
  }

  if (isBoardFull(next.board)) {
    next.winner = "draw";
    return {
      ok: true,
      snapshot: next,
      event: { type: "draw" },
    };
  }

  // Turn passes to next player
  next.currentPlayer = (command.playerId === 0 ? 1 : 0) as Connect4PlayerId;

  return {
    ok: true,
    snapshot: next,
    event: {
      type: "dropped",
      playerId: command.playerId,
      column: command.column,
      row: dropRow,
    },
  };
}
