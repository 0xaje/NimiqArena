export const LUDO_PLAYER_COUNT = 2;
export const LUDO_PIECES_PER_PLAYER = 4;
export const LUDO_TRACK_LENGTH = 52;
export const LUDO_HOME_ENTRY = 57;
export const LUDO_SAFE_SQUARES = new Set([0, 13, 26, 39]);

export type LudoMode = "2p_double" | "4p" | "2p_single";

export type LudoPlayerId = 0 | 1 | 2 | 3;
export type LudoPiece = { position: number };
export type LudoPlayer = { id: LudoPlayerId; pieces: LudoPiece[] };
export type LudoSnapshot = {
  matchId: string;
  version: number;
  currentPlayer: LudoPlayerId;
  dice: number | null;
  mode?: LudoMode;
  lastRoll?: {
    playerId: LudoPlayerId;
    value: number;
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
    };

export type LudoEvent =
  | {
      type: "rolled";
      playerId: LudoPlayerId;
      value: number;
      hadLegalMoves?: boolean;
    }
  | {
      type: "moved";
      playerId: LudoPlayerId;
      pieceIndex: number;
      from: number;
      to: number;
      capturedPiece?: { playerId: LudoPlayerId; pieceIndex: number };
    }
  | { type: "won"; playerId: LudoPlayerId };

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
  mode: LudoMode = "2p_single"
): LudoSnapshot {
  const piecesCount = mode === "2p_double" ? 8 : 4;
  const playerCount = mode === "4p" ? 4 : 2;

  return {
    matchId,
    version: 0,
    currentPlayer: 0,
    dice: null,
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
    if (snapshot.dice !== null)
      return reject(
        "DICE_ALREADY_ROLLED",
        "Move the current dice before rolling again."
      );
    const value = randomSource();
    if (!Number.isInteger(value) || value < 1 || value > 6)
      return reject(
        "INVALID_DICE",
        "Dice source must return an integer from 1 to 6."
      );
    const next = cloneSnapshot(snapshot);
    next.version += 1;
    next.usedNonces.push(command.nonce);

    const canMove = hasLegalMoves(snapshot, command.playerId, value);
    if (!canMove) {
      // Rolling with zero legal moves forfeits the roll and passes turn
      next.dice = null;
      next.lastRoll = { playerId: command.playerId, value, hadLegalMoves: false };
      next.currentPlayer = ((command.playerId + 1) % totalPlayers) as LudoPlayerId;
      return {
        ok: true,
        snapshot: next,
        event: { type: "rolled", playerId: command.playerId, value, hadLegalMoves: false } as LudoEvent,
      };
    }

    next.dice = value;
    next.lastRoll = { playerId: command.playerId, value, hadLegalMoves: true };
    return {
      ok: true,
      snapshot: next,
      event: { type: "rolled", playerId: command.playerId, value, hadLegalMoves: true } as LudoEvent,
    };
  }

  if (snapshot.dice === null)
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
  const dice = snapshot.dice;
  const from = piece.position;
  const to = from === -1 ? (dice === 6 ? 0 : -1) : from + dice;
  if (from === -1 && dice !== 6)
    return reject("ILLEGAL_MOVE", "A piece can only leave base on a six.");
  if (to > LUDO_HOME_ENTRY)
    return reject("ILLEGAL_MOVE", "The move overshoots the home entry.");
  if (from === -1 && dice === 6) {
    // Entry is legal base exit
  } else if (from >= LUDO_HOME_ENTRY) {
    return reject("ILLEGAL_MOVE", "A finished piece cannot move again.");
  }

  const next = cloneSnapshot(snapshot);
  const nextPiece = next.players[command.playerId].pieces[command.pieceIndex];
  nextPiece.position = to;

  let capturedPiece: { playerId: LudoPlayerId; pieceIndex: number } | undefined;
  if (to < LUDO_TRACK_LENGTH) {
    const landing = globalTrackPosition(command.playerId, to, command.pieceIndex, mode);

    if (LUDO_SAFE_SQUARES.has(landing)) {
      // Safe star square: protected from captures
    } else {
      // Check for capture of any opponent piece on this cell
      for (const opponent of next.players) {
        if (opponent.id === command.playerId) continue;
        const opponentIndex = opponent.pieces.findIndex(
          (oppPiece, oppIdx) =>
            oppPiece.position >= 0 &&
            oppPiece.position < LUDO_TRACK_LENGTH &&
            globalTrackPosition(opponent.id, oppPiece.position, oppIdx, mode) === landing
        );
        if (opponentIndex >= 0) {
          opponent.pieces[opponentIndex].position = -1;
          capturedPiece = { playerId: opponent.id, pieceIndex: opponentIndex };
          break;
        }
      }
    }
  }

  next.version += 1;
  next.dice = null;
  next.usedNonces.push(command.nonce);

  // Win check: 4 pieces in home goal (or all pieces if fewer than 4)
  const requiredWins = Math.min(4, next.players[command.playerId].pieces.length);
  const homeCount = next.players[command.playerId].pieces.filter(
    p => p.position === LUDO_HOME_ENTRY
  ).length;

  if (homeCount >= requiredWins) {
    next.winner = command.playerId;
    return {
      ok: true,
      snapshot: next,
      event: { type: "won", playerId: command.playerId },
    };
  }

  // Turn rotation: roll of 6 or a capture awards a bonus turn!
  if (dice !== 6 && !capturedPiece) {
    next.currentPlayer = ((command.playerId + 1) % totalPlayers) as LudoPlayerId;
  }

  return {
    ok: true,
    snapshot: next,
    event: {
      type: "moved",
      playerId: command.playerId,
      pieceIndex: command.pieceIndex,
      from,
      to,
      ...(capturedPiece ? { capturedPiece } : {}),
    },
  };
}
