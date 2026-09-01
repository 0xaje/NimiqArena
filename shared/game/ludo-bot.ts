import {
  LUDO_HOME_ENTRY,
  LUDO_SAFE_SQUARES,
  LUDO_TRACK_LENGTH,
  type LudoPlayerId,
  type LudoSnapshot,
} from "./ludo-engine";

export interface BotMoveChoice {
  pieceIndex: number;
  score: number;
  reason: string;
}

function getGlobalTrackPos(playerId: LudoPlayerId, progress: number): number {
  const start = playerId === 0 ? 0 : 26;
  return (start + progress) % LUDO_TRACK_LENGTH;
}

/**
 * Selects the optimal legal piece move for a bot player using heuristic evaluations.
 * Returns the pieceIndex (0..3) to move, or null if no legal moves exist.
 */
export function selectBestBotMove(
  snapshot: LudoSnapshot,
  botPlayerId: LudoPlayerId = 1,
  dice: number
): BotMoveChoice | null {
  const botPlayer = snapshot.players[botPlayerId];
  if (!botPlayer) return null;

  const opponentId: LudoPlayerId = (botPlayerId === 0 ? 1 : 0) as LudoPlayerId;
  const opponentPlayer = snapshot.players[opponentId];

  const validChoices: BotMoveChoice[] = [];

  botPlayer.pieces.forEach((piece, pieceIndex) => {
    const from = piece.position;
    if (from >= LUDO_HOME_ENTRY) return; // Already finished in home goal

    if (from === -1) {
      // Piece in base: can only leave on 6
      if (dice === 6) {
        // Base exit
        let score = 300;
        const entryGlobalPos = botPlayerId === 0 ? 0 : 26;
        // Check if opponent is sitting on bot's start cell
        const capturesOpponent = opponentPlayer.pieces.some(
          oppPiece =>
            oppPiece.position >= 0 &&
            oppPiece.position < LUDO_TRACK_LENGTH &&
            getGlobalTrackPos(opponentId, oppPiece.position) === entryGlobalPos
        );
        if (capturesOpponent) score += 500;

        validChoices.push({
          pieceIndex,
          score,
          reason: capturesOpponent
            ? "Exit base with immediate capture"
            : "Deploy piece from base",
        });
      }
      return;
    }

    const to = from + dice;
    if (to > LUDO_HOME_ENTRY) return; // Overshoots home goal

    let score = 50 + to;
    let reason = "Advance piece on track";

    // 1. Winning move (Home Goal)
    if (to === LUDO_HOME_ENTRY) {
      score += 1000;
      reason = "Score piece into Home Goal";
    }
    // 2. Track move checks
    else if (to < LUDO_TRACK_LENGTH) {
      const landingGlobal = getGlobalTrackPos(botPlayerId, to);
      const isSafe = LUDO_SAFE_SQUARES.has(landingGlobal);

      if (isSafe) {
        score += 150;
        reason = "Land on safe protected square";
      } else {
        // Check if lands on opponent piece (Capture!)
        const willCapture = opponentPlayer.pieces.some(
          oppPiece =>
            oppPiece.position >= 0 &&
            oppPiece.position < LUDO_TRACK_LENGTH &&
            getGlobalTrackPos(opponentId, oppPiece.position) === landingGlobal
        );

        if (willCapture) {
          score += 600;
          reason = "Capture opponent piece";
        }
      }
    }
    // 3. Home Stretch progress (progress 52..56)
    else if (to >= 52 && to < LUDO_HOME_ENTRY) {
      score += 250 + (to - 52) * 20;
      reason = "Advance deeper into home corridor";
    }

    validChoices.push({ pieceIndex, score, reason });
  });

  if (validChoices.length === 0) return null;

  // Sort by highest score
  validChoices.sort((a, b) => b.score - a.score);
  return validChoices[0];
}
