export const LUDO_PLAYER_COUNT = 2;
export const LUDO_PIECES_PER_PLAYER = 4;
export const LUDO_TRACK_LENGTH = 52;
export const TRACK_CELLS_BEFORE_HOME = 51;
export const LUDO_HOME_ENTRY = 56;
export const LUDO_SAFE_SQUARES = new Set<number>([]);

export type LudoMode = "2p_double" | "4p" | "2p_single";

export type LudoPlayerId = 0 | 1 | 2 | 3;
export type LudoPiece = { position: number };
export type LudoPlayer = { id: LudoPlayerId; pieces: LudoPiece[] };
export type LudoSnapshot = {
  matchId: string;
  version: number;
  currentPlayer: LudoPlayerId;
  dice: number | null;
  diceCount?: 1 | 2;
  diceValues?: [number, number] | null;
  remainingDice?: number[];
  rolledDoubles?: boolean;
  mode?: LudoMode;
  lastRoll?: {
    playerId: LudoPlayerId;
    value: number;
    diceValues?: [number, number];
    hadLegalMoves: boolean;
  } | null;
  players: LudoPlayer[];
  winner: LudoPlayerId | null;
  usedNonces: string[];
};

export type LudoCommand =
  | {
      kind: "roll";
      matchId: string;
      playerId: LudoPlayerId;
      expectedVersion: number;
      nonce: string;
    }
  | {
      kind: "move";
      matchId: string;
      playerId: LudoPlayerId;
      expectedVersion: number;
      nonce: string;
      pieceIndex: number;
      dieValue?: number;
    };

export type LudoEvent =
  | {
      type: "rolled";
      playerId: LudoPlayerId;
      value: number;
      hadLegalMoves: boolean;
    }
  | {
      type: "moved";
      playerId: LudoPlayerId;
      pieceIndex: number;
      from: number;
      to: number;
      dieUsed?: number;
      remainingDice?: number[];
      captured?: {
        playerId: LudoPlayerId;
        pieceIndex: number;
      };
      capturedPiece?: {
        playerId: LudoPlayerId;
        pieceIndex: number;
      };
    }
  | {
      type: "won";
      playerId: LudoPlayerId;
    };

export type LudoRejectionCode =
  | "MATCH_MISMATCH"
  | "STALE_VERSION"
  | "DUPLICATE_NONCE"
  | "NOT_YOUR_TURN"
  | "DICE_ALREADY_ROLLED"
  | "DICE_NOT_ROLLED"
  | "INVALID_DICE"
  | "INVALID_PIECE"
  | "ILLEGAL_MOVE"
  | "MATCH_FINISHED";
export type LudoResult =
  | { ok: true; snapshot: LudoSnapshot; event: LudoEvent }
  | { ok: false; code: LudoRejectionCode; reason: string };

export type DiceSource = () => number;

export function getPieceGlobalStart(
  playerId: number,
  pieceIndex = 0,
  mode: LudoMode = "2p_single"
): number {
  if (mode === "4p") {
    const starts = [0, 13, 26, 39];
    return starts[playerId % 4] ?? 0;
  }
  if (mode === "2p_double") {
    // Player 0: pieces 0..3 -> Red Yard (Start 0), pieces 4..7 -> Yellow Yard (Start 26)
    // Player 1: pieces 0..3 -> Green Yard (Start 13), pieces 4..7 -> Blue Yard (Start 39)
    if (playerId === 0) {
      return pieceIndex < 4 ? 0 : 26;
    } else {
      return pieceIndex < 4 ? 13 : 39;
    }
  }
  // 2p_single: Player 0 is 0 (Red), Player 1 is 26 (Yellow)
  return playerId === 0 ? 0 : 26;
}

export function createLudoSnapshot(
  matchId: string,
  mode: LudoMode = "2p_single",
  diceCount: 1 | 2 = 1
): LudoSnapshot {
  const piecesCount = mode === "2p_double" ? 8 : 4;
  const playerCount = mode === "4p" ? 4 : 2;

  return {
    matchId,
    version: 0,
    currentPlayer: 0,
    dice: null,
    diceCount,
    diceValues: null,
    mode,
    lastRoll: null,
    players: Array.from({ length: playerCount }, (_, idx) => ({
      id: idx as LudoPlayerId,
      pieces: Array.from({ length: piecesCount }, () => ({
        position: -1,
      })),
    })),
    winner: null,
    usedNonces: [],
  };
}

function reject(code: LudoRejectionCode, reason: string): LudoResult {
  return { ok: false, code, reason };
}

function cloneSnapshot(snapshot: LudoSnapshot): LudoSnapshot {
  return {
    ...snapshot,
    diceValues: snapshot.diceValues ? [snapshot.diceValues[0], snapshot.diceValues[1]] : null,
    remainingDice: snapshot.remainingDice ? [...snapshot.remainingDice] : undefined,
    rolledDoubles: snapshot.rolledDoubles,
    players: snapshot.players.map(player => ({
      ...player,
      pieces: player.pieces.map(piece => ({ ...piece })),
    })),
    usedNonces: [...snapshot.usedNonces],
  };
}

export function globalTrackPosition(
  playerId: LudoPlayerId,
  progress: number,
  pieceIndex = 0,
  mode: LudoMode = "2p_single"
) {
  const start = getPieceGlobalStart(playerId, pieceIndex, mode);
  return (start + progress) % LUDO_TRACK_LENGTH;
}

export function hasLegalMoves(
  snapshot: LudoSnapshot,
  playerId: LudoPlayerId,
  dice: number
): boolean {
  const player = snapshot.players[playerId];
  if (!player) return false;
  return player.pieces.some(piece => {
    if (piece.position === -1) return dice === 6;
    if (piece.position >= LUDO_HOME_ENTRY) return false;
    return piece.position + dice <= LUDO_HOME_ENTRY;
  });
}

export function hasLegalMovesForDice(
  snapshot: LudoSnapshot,
  playerId: LudoPlayerId,
  dicePool: number[]
): boolean {
  const player = snapshot.players[playerId];
  if (!player || !dicePool || dicePool.length === 0) return false;
  const hasSix = dicePool.includes(6);
  return player.pieces.some(piece => {
    if (piece.position === -1) return hasSix;
    if (piece.position >= LUDO_HOME_ENTRY) return false;
    return dicePool.some(d => piece.position + d <= LUDO_HOME_ENTRY);
  });
}

export function hasLegalMoves2D(
  snapshot: LudoSnapshot,
  playerId: LudoPlayerId,
  d1: number,
  d2: number
): boolean {
  return hasLegalMovesForDice(snapshot, playerId, [d1, d2]);
}

export function applyCommand(
  snapshot: LudoSnapshot,
  command: LudoCommand,
  randomSource: DiceSource
): LudoResult {
  if (command.matchId !== snapshot.matchId)
    return reject("MATCH_MISMATCH", "Command belongs to another match.");
  if (command.expectedVersion !== snapshot.version)
    return reject("STALE_VERSION", "Snapshot version is stale.");
  if (snapshot.usedNonces.includes(command.nonce))
    return reject("DUPLICATE_NONCE", "Command nonce has already been applied.");
  if (snapshot.winner !== null)
    return reject("MATCH_FINISHED", "Match already has a winner.");
  if (command.playerId !== snapshot.currentPlayer)
    return reject("NOT_YOUR_TURN", "It is not this player’s turn.");

  const mode = snapshot.mode ?? "2p_single";
  const totalPlayers = snapshot.players.length;

  if (command.kind === "roll") {
    if (snapshot.dice !== null && snapshot.remainingDice && snapshot.remainingDice.length > 0)
      return reject(
        "DICE_ALREADY_ROLLED",
        "Move the current dice before rolling again."
      );

    if (snapshot.diceCount === 2) {
      const d1 = randomSource();
      const d2 = randomSource();
      if (
        !Number.isInteger(d1) || d1 < 1 || d1 > 6 ||
        !Number.isInteger(d2) || d2 < 1 || d2 > 6
      ) {
        return reject(
          "INVALID_DICE",
          "Dice source must return an integer from 1 to 6."
        );
      }
      const next = cloneSnapshot(snapshot);
      next.version += 1;
      next.usedNonces.push(command.nonce);
      next.diceValues = [d1, d2];
      next.remainingDice = [d1, d2];
      next.rolledDoubles = d1 === 6 && d2 === 6;
      const combined = d1 + d2;
      next.dice = combined;

      const canMove = hasLegalMovesForDice(snapshot, command.playerId, [d1, d2]);
      if (!canMove) {
        next.dice = null;
        next.remainingDice = [];
        next.lastRoll = {
          playerId: command.playerId,
          value: combined,
          diceValues: [d1, d2],
          hadLegalMoves: false,
        };
        next.currentPlayer = ((command.playerId + 1) % totalPlayers) as LudoPlayerId;
        return {
          ok: true,
          snapshot: next,
          event: {
            type: "rolled",
            playerId: command.playerId,
            value: combined,
            hadLegalMoves: false,
          } as LudoEvent,
        };
      }

      next.lastRoll = {
        playerId: command.playerId,
        value: combined,
        diceValues: [d1, d2],
        hadLegalMoves: true,
      };
      return {
        ok: true,
        snapshot: next,
        event: {
          type: "rolled",
          playerId: command.playerId,
          value: combined,
          hadLegalMoves: true,
        } as LudoEvent,
      };
    }

    const value = randomSource();
    if (!Number.isInteger(value) || value < 1 || value > 6)
      return reject(
        "INVALID_DICE",
        "Dice source must return an integer from 1 to 6."
      );
    const next = cloneSnapshot(snapshot);
    next.version += 1;
    next.usedNonces.push(command.nonce);
    next.dice = value;
    next.remainingDice = [value];
    next.rolledDoubles = false;

    const canMove = hasLegalMoves(snapshot, command.playerId, value);
    if (!canMove) {
      // Rolling with zero legal moves forfeits the roll and passes turn
      next.dice = null;
      next.remainingDice = [];
      next.lastRoll = { playerId: command.playerId, value, hadLegalMoves: false };
      next.currentPlayer = ((command.playerId + 1) % totalPlayers) as LudoPlayerId;
      return {
        ok: true,
        snapshot: next,
        event: { type: "rolled", playerId: command.playerId, value, hadLegalMoves: false } as LudoEvent,
      };
    }

    next.lastRoll = { playerId: command.playerId, value, hadLegalMoves: true };
    return {
      ok: true,
      snapshot: next,
      event: { type: "rolled", playerId: command.playerId, value, hadLegalMoves: true } as LudoEvent,
    };
  }

  // Handle "move"
  const remaining = snapshot.remainingDice && snapshot.remainingDice.length > 0
    ? [...snapshot.remainingDice]
    : (snapshot.dice !== null ? [snapshot.dice] : []);

  if (remaining.length === 0)
    return reject("DICE_NOT_ROLLED", "Roll the dice before moving a piece.");

  const playerPieces = snapshot.players[command.playerId]?.pieces;
  if (
    !playerPieces ||
    !Number.isInteger(command.pieceIndex) ||
    command.pieceIndex < 0 ||
    command.pieceIndex >= playerPieces.length
  )
    return reject(
      "INVALID_PIECE",
      "Piece index is outside the player’s active pieces."
    );

  const piece = playerPieces[command.pieceIndex];
  const from = piece.position;
  if (from >= LUDO_HOME_ENTRY) {
    return reject("ILLEGAL_MOVE", "A finished piece cannot move again.");
  }

  // Check if player has other pieces that can legally move with remaining dice
  const otherPiecesCanMove = playerPieces.some((p, idx) => {
    if (idx === command.pieceIndex) return false;
    if (p.position >= 0 && p.position < LUDO_HOME_ENTRY) return true;
    if (p.position === -1 && remaining.includes(6)) return true;
    return false;
  });
  const isMultiDice = remaining.length === 2;
  const remainingSum = remaining.reduce((a, b) => a + b, 0);

  // Determine die to use (or combined sum of both remaining dice)
  let dieToUse: number;
  let isCombinedMove = false;

  if (command.dieValue !== undefined) {
    if (isMultiDice && command.dieValue === remainingSum) {
      isCombinedMove = true;
      dieToUse = remainingSum;
    } else if (!remaining.includes(command.dieValue)) {
      return reject("INVALID_DICE", "The specified die value is not available in remaining dice.");
    } else {
      dieToUse = command.dieValue;
    }

    if (from === -1) {
      if (dieToUse !== 6) {
        return reject("ILLEGAL_MOVE", "A piece can only leave base on a six.");
      }
    } else if (from + dieToUse > LUDO_HOME_ENTRY) {
      return reject("ILLEGAL_MOVE", "The move overshoots the home entry.");
    }
  } else {
    // Auto-select valid die for this piece from remaining
    const validDice = remaining.filter(d =>
      from === -1 ? d === 6 : from + d <= LUDO_HOME_ENTRY
    );
    if (validDice.length === 0) {
      return reject(
        "ILLEGAL_MOVE",
        from === -1
          ? "A piece can only leave base on a six."
          : "The move overshoots the home entry."
      );
    }

    // Prioritize die that captures an opponent piece
    let chosenDie = validDice[0];
    if (validDice.length > 1 && from >= 0) {
      for (const d of validDice) {
        const testTo = from + d;
        if (testTo < TRACK_CELLS_BEFORE_HOME) {
          const testLanding = globalTrackPosition(command.playerId, testTo, command.pieceIndex, mode);
          if (!LUDO_SAFE_SQUARES.has(testLanding)) {
            const wouldCapture = snapshot.players.some(opp =>
              opp.id !== command.playerId &&
              opp.pieces.some(
                (oppP, oppIdx) =>
                  oppP.position >= 0 &&
                  oppP.position < TRACK_CELLS_BEFORE_HOME &&
                  globalTrackPosition(opp.id, oppP.position, oppIdx, mode) === testLanding
              )
            );
            if (wouldCapture) {
              chosenDie = d;
              break;
            }
          }
        }
      }
    }
    dieToUse = chosenDie;
  }

  const to = from === -1 ? 0 : from + dieToUse;

  const next = cloneSnapshot(snapshot);
  const nextPiece = next.players[command.playerId].pieces[command.pieceIndex];
  nextPiece.position = to;

  let capturedPiece: { playerId: LudoPlayerId; pieceIndex: number } | undefined;

  // Final landing capture check (captures occur ONLY on the final landing square)
  if (to < TRACK_CELLS_BEFORE_HOME) {
    const landing = globalTrackPosition(command.playerId, to, command.pieceIndex, mode);

    if (!LUDO_SAFE_SQUARES.has(landing)) {
      for (const opponent of next.players) {
        if (opponent.id === command.playerId) continue;
        for (let oppIdx = 0; oppIdx < opponent.pieces.length; oppIdx++) {
          const oppPiece = opponent.pieces[oppIdx];
          if (
            oppPiece.position >= 0 &&
            oppPiece.position < TRACK_CELLS_BEFORE_HOME &&
            globalTrackPosition(opponent.id, oppPiece.position, oppIdx, mode) === landing
          ) {
            // Capture ONLY ONE piece even if multiple opponent pieces are stacked on this tile
            oppPiece.position = -1;
            capturedPiece = { playerId: opponent.id, pieceIndex: oppIdx };
            break;
          }
        }
        if (capturedPiece) break;
      }
    }
  }

  // Option 2: Capturing an opponent piece sends opponent to yard (-1) and scores capturing pawn into center Home Goal!
  if (capturedPiece) {
    nextPiece.position = LUDO_HOME_ENTRY;
  }
  const effectiveTo = nextPiece.position;

  // Splice used die / dice from next.remainingDice
  if (!next.remainingDice || next.remainingDice.length === 0) {
    next.remainingDice = remaining;
  }
  if (isCombinedMove) {
    next.remainingDice = [];
  } else {
    const dieIdx = next.remainingDice.indexOf(dieToUse);
    if (dieIdx !== -1) {
      next.remainingDice.splice(dieIdx, 1);
    }
  }
  next.dice = next.remainingDice.length > 0 ? next.remainingDice.reduce((a, b) => a + b, 0) : null;

  next.version += 1;
  next.usedNonces.push(command.nonce);

  // Check victory condition: a player wins ONLY when ALL of their pieces have reached the home goal
  const hasWon = next.players[command.playerId].pieces.every(
    p => p.position === LUDO_HOME_ENTRY
  );

  if (hasWon) {
    next.winner = command.playerId;
    next.dice = null;
    next.remainingDice = [];
    return {
      ok: true,
      snapshot: next,
      event: {
        type: "won",
        playerId: command.playerId,
      },
    };
  }

  // If there are still remaining dice from the roll, check if the current player can make legal moves
  if (next.remainingDice && next.remainingDice.length > 0) {
    const canContinue = hasLegalMovesForDice(
      next,
      command.playerId,
      next.remainingDice
    );
    if (canContinue) {
      // Player continues their turn to spend remaining dice!
      next.currentPlayer = command.playerId;
      return {
        ok: true,
        snapshot: next,
        event: {
          type: "moved",
          playerId: command.playerId,
          pieceIndex: command.pieceIndex,
          from,
          to: effectiveTo,
          dieUsed: dieToUse,
          remainingDice: [...next.remainingDice],
          ...(capturedPiece ? { captured: capturedPiece, capturedPiece } : {}),
        },
      };
    } else {
      // Forfeit unplayable remaining dice
      next.remainingDice = [];
      next.dice = null;
    }
  }

  // All dice in this turn's roll have been played (or forfeited):
  // Check bonus turn:
  // In 2-dice mode: ONLY double 6 ([6, 6]) grants a bonus roll!
  // In single-die mode: rolling a 6 grants a bonus roll!
  // Capturing an opponent or scoring home does NOT grant a bonus turn.
  const isTwoDice = snapshot.diceCount === 2 && Boolean(snapshot.diceValues);
  const earnedBonus = isTwoDice
    ? Boolean(snapshot.rolledDoubles)
    : (dieToUse === 6);

  if (!earnedBonus) {
    next.currentPlayer = ((command.playerId + 1) % totalPlayers) as LudoPlayerId;
  } else {
    next.currentPlayer = command.playerId;
  }

  next.dice = null;
  next.remainingDice = [];

  return {
    ok: true,
    snapshot: next,
    event: {
      type: "moved",
      playerId: command.playerId,
      pieceIndex: command.pieceIndex,
      from,
      to: effectiveTo,
      dieUsed: dieToUse,
      remainingDice: [],
      ...(capturedPiece ? { captured: capturedPiece, capturedPiece } : {}),
    },
  };
}
