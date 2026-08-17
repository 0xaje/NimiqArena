export const LUDO_PLAYER_COUNT = 2;
export const LUDO_PIECES_PER_PLAYER = 4;
export const LUDO_TRACK_LENGTH = 52;
export const LUDO_HOME_ENTRY = 57;
export const LUDO_SAFE_SQUARES = new Set([0, 13, 26, 39]);

export type LudoPlayerId = 0 | 1;
export type LudoPiece = { position: number };
export type LudoPlayer = { id: LudoPlayerId; pieces: LudoPiece[] };
export type LudoSnapshot = {
  matchId: string;
  version: number;
  currentPlayer: LudoPlayerId;
  dice: number | null;
  players: [LudoPlayer, LudoPlayer];
  winner: LudoPlayerId | null;
  usedNonces: string[];
};

export type LudoCommand =
  | { kind: "roll"; matchId: string; playerId: LudoPlayerId; expectedVersion: number; nonce: string }
  | { kind: "move"; matchId: string; playerId: LudoPlayerId; expectedVersion: number; nonce: string; pieceIndex: number };

export type LudoEvent =
  | { type: "rolled"; playerId: LudoPlayerId; value: number }
  | { type: "moved"; playerId: LudoPlayerId; pieceIndex: number; from: number; to: number; capturedPiece?: { playerId: LudoPlayerId; pieceIndex: number } }
  | { type: "won"; playerId: LudoPlayerId };

export type LudoRejectionCode = "MATCH_MISMATCH" | "STALE_VERSION" | "DUPLICATE_NONCE" | "NOT_YOUR_TURN" | "DICE_ALREADY_ROLLED" | "DICE_NOT_ROLLED" | "INVALID_DICE" | "INVALID_PIECE" | "ILLEGAL_MOVE" | "MATCH_FINISHED";
export type LudoResult = { ok: true; snapshot: LudoSnapshot; event: LudoEvent } | { ok: false; code: LudoRejectionCode; reason: string };

export type DiceSource = () => number;

export function createLudoSnapshot(matchId: string): LudoSnapshot {
  return {
    matchId,
    version: 0,
    currentPlayer: 0,
    dice: null,
    players: [
      { id: 0, pieces: Array.from({ length: LUDO_PIECES_PER_PLAYER }, () => ({ position: -1 })) },
      { id: 1, pieces: Array.from({ length: LUDO_PIECES_PER_PLAYER }, () => ({ position: -1 })) },
    ],
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
    players: snapshot.players.map(player => ({ ...player, pieces: player.pieces.map(piece => ({ ...piece })) })) as [LudoPlayer, LudoPlayer],
    usedNonces: [...snapshot.usedNonces],
  };
}

function globalTrackPosition(playerId: LudoPlayerId, progress: number) {
  const start = playerId === 0 ? 0 : 26;
  return (start + progress) % LUDO_TRACK_LENGTH;
}

function isSafe(progress: number) {
  return progress >= 0 && progress < LUDO_TRACK_LENGTH && LUDO_SAFE_SQUARES.has(progress);
}

export function applyCommand(snapshot: LudoSnapshot, command: LudoCommand, randomSource: DiceSource): LudoResult {
  if (command.matchId !== snapshot.matchId) return reject("MATCH_MISMATCH", "Command belongs to another match.");
  if (command.expectedVersion !== snapshot.version) return reject("STALE_VERSION", "Snapshot version is stale.");
  if (snapshot.usedNonces.includes(command.nonce)) return reject("DUPLICATE_NONCE", "Command nonce has already been applied.");
  if (snapshot.winner !== null) return reject("MATCH_FINISHED", "Match already has a winner.");
  if (command.playerId !== snapshot.currentPlayer) return reject("NOT_YOUR_TURN", "It is not this player’s turn.");

  if (command.kind === "roll") {
    if (snapshot.dice !== null) return reject("DICE_ALREADY_ROLLED", "Move the current dice before rolling again.");
    const value = randomSource();
    if (!Number.isInteger(value) || value < 1 || value > 6) return reject("INVALID_DICE", "Dice source must return an integer from 1 to 6.");
    const next = cloneSnapshot(snapshot);
    next.version += 1;
    next.dice = value;
    next.usedNonces.push(command.nonce);
    return { ok: true, snapshot: next, event: { type: "rolled", playerId: command.playerId, value } };
  }

  if (snapshot.dice === null) return reject("DICE_NOT_ROLLED", "Roll the dice before moving a piece.");
  if (!Number.isInteger(command.pieceIndex) || command.pieceIndex < 0 || command.pieceIndex >= LUDO_PIECES_PER_PLAYER) return reject("INVALID_PIECE", "Piece index is outside the player’s four pieces.");
  const piece = snapshot.players[command.playerId].pieces[command.pieceIndex];
  const dice = snapshot.dice;
  const from = piece.position;
  const to = from === -1 ? (dice === 6 ? 0 : -1) : from + dice;
  if (from === -1 && dice !== 6) return reject("ILLEGAL_MOVE", "A piece can only leave base on a six.");
  if (to > LUDO_HOME_ENTRY) return reject("ILLEGAL_MOVE", "The move overshoots the home entry.");
  if (from === -1 && dice === 6) {
    // Entry is the only legal base move and is represented by progress zero.
  } else if (from >= LUDO_HOME_ENTRY) {
    return reject("ILLEGAL_MOVE", "A finished piece cannot move again.");
  }

  const next = cloneSnapshot(snapshot);
  const nextPiece = next.players[command.playerId].pieces[command.pieceIndex];
  nextPiece.position = to;
  let capturedPiece: { playerId: LudoPlayerId; pieceIndex: number } | undefined;
  if (to < LUDO_TRACK_LENGTH) {
    const landing = globalTrackPosition(command.playerId, to);
    if (LUDO_SAFE_SQUARES.has(landing)) {
      next.version += 1;
      next.dice = null;
      next.usedNonces.push(command.nonce);
      const hasWonOnSafe = next.players[command.playerId].pieces.every(currentPiece => currentPiece.position === LUDO_HOME_ENTRY);
      if (hasWonOnSafe) {
        next.winner = command.playerId;
        return { ok: true, snapshot: next, event: { type: "won", playerId: command.playerId } };
      }
      if (dice !== 6) next.currentPlayer = (command.playerId === 0 ? 1 : 0) as LudoPlayerId;
      return { ok: true, snapshot: next, event: { type: "moved", playerId: command.playerId, pieceIndex: command.pieceIndex, from, to } };
    }
    const opponent = (command.playerId === 0 ? 1 : 0) as LudoPlayerId;
    const opponentIndex = next.players[opponent].pieces.findIndex(opponentPiece => opponentPiece.position >= 0 && opponentPiece.position < LUDO_TRACK_LENGTH && globalTrackPosition(opponent, opponentPiece.position) === landing);
    if (opponentIndex >= 0) {
      next.players[opponent].pieces[opponentIndex].position = -1;
      capturedPiece = { playerId: opponent, pieceIndex: opponentIndex };
    }
  }

  next.version += 1;
  next.dice = null;
  next.usedNonces.push(command.nonce);
  const hasWon = next.players[command.playerId].pieces.every(currentPiece => currentPiece.position === LUDO_HOME_ENTRY);
  if (hasWon) {
    next.winner = command.playerId;
    return { ok: true, snapshot: next, event: { type: "won", playerId: command.playerId } };
  }
  if (dice !== 6 && !capturedPiece) next.currentPlayer = (command.playerId === 0 ? 1 : 0) as LudoPlayerId;
  return { ok: true, snapshot: next, event: { type: "moved", playerId: command.playerId, pieceIndex: command.pieceIndex, from, to, ...(capturedPiece ? { capturedPiece } : {}) } };
}
