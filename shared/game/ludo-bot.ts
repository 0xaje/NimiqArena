import {
  LUDO_HOME_ENTRY,
  LUDO_SAFE_SQUARES,
  LUDO_TRACK_LENGTH,
  getPieceGlobalStart,
  type LudoPlayerId,
  type LudoSnapshot,
} from "./ludo-engine";

export interface BotMoveChoice {
  pieceIndex: number;
  dieValue: number;
  score: number;
  reason: string;
}

function getGlobalTrackPos(
  playerId: LudoPlayerId,
  progress: number,
  pieceIndex = 0,
  mode = "2p_single"
): number {
  const start = getPieceGlobalStart(playerId, pieceIndex, mode as any);
  return (start + progress) % LUDO_TRACK_LENGTH;
}

/**
 * Selects the optimal legal piece move for a bot player using heuristic evaluations.
 * Returns the pieceIndex and dieValue to move, or null if no legal moves exist.
 */
export function selectBestBotMove(
  snapshot: LudoSnapshot,
  botPlayerId: LudoPlayerId = 1,
  dice: number
): BotMoveChoice | null {
  const botPlayer = snapshot.players[botPlayerId];
  if (!botPlayer) return null;

  const mode = snapshot.mode ?? "2p_single";
  const opponentId: LudoPlayerId = (botPlayerId === 0 ? 1 : 0) as LudoPlayerId;
  const opponentPlayer = snapshot.players[opponentId];

  const remaining = snapshot.remainingDice && snapshot.remainingDice.length > 0
    ? snapshot.remainingDice
    : [dice];
  const isMultiDice = remaining.length === 2;
  const remainingSum = remaining.reduce((a, b) => a + b, 0);

  // Check if player has other pieces that can legally move with the available dice
  const otherPiecesCanMove = (targetIdx: number) =>
    botPlayer.pieces.some((p, idx) => {
      if (idx === targetIdx) return false;
      if (p.position === -1) return remaining.includes(6);
      if (p.position >= 0 && p.position < LUDO_HOME_ENTRY) {
        return remaining.some(d => p.position + d <= LUDO_HOME_ENTRY);
      }
      return false;
    });

  const availableDice = Array.from(new Set(remaining));
  const validChoices: BotMoveChoice[] = [];

  botPlayer.pieces.forEach((piece, pieceIndex) => {
    const from = piece.position;
    if (from >= LUDO_HOME_ENTRY) return; // Already finished in home goal

    if (from === -1) {
      if (remaining.includes(6)) {
        let score = 300;
        const entryGlobalPos = getPieceGlobalStart(botPlayerId, pieceIndex, mode as any);

        // Check if opponent is sitting on starting square
        const capturesOpponent = opponentPlayer?.pieces.some(
          (oppPiece, oppIdx) =>
            oppPiece.position >= 0 &&
            oppPiece.position < LUDO_TRACK_LENGTH &&
            getGlobalTrackPos(opponentId, oppPiece.position, oppIdx, mode) === entryGlobalPos
        );
        if (capturesOpponent) score += 1200;

        validChoices.push({
          pieceIndex,
          dieValue: 6,
          score,
          reason: capturesOpponent
            ? "Exit base with immediate capture & goal"
            : "Deploy piece from base",
        });
      }
      return;
    }

    // Piece is on track (from >= 0)
    // RULE: If this is the sole piece that can move and multiple dice remain,
    // it MUST move the combined sum in a single leap! It cannot split into intermediate partial-dice moves.
    const mustMoveCombined = isMultiDice && !otherPiecesCanMove(pieceIndex) && from + remainingSum <= LUDO_HOME_ENTRY;

    const candidateDice = mustMoveCombined
      ? [remainingSum]
      : availableDice;

    for (const currentDie of candidateDice) {
      const to = from + currentDie;
      if (to > LUDO_HOME_ENTRY) {
        continue; // Overshoots home goal
      }

      let score = 50 + to;
      let reason = mustMoveCombined
        ? `Leap forward combined roll of ${currentDie}`
        : "Advance piece on track";

      // 0. Threat Escape Check: is piece currently in danger on the track?
      if (from < LUDO_TRACK_LENGTH) {
        const currentGlobal = getGlobalTrackPos(botPlayerId, from, pieceIndex, mode);
        const currentIsSafe = LUDO_SAFE_SQUARES.has(currentGlobal);

        if (!currentIsSafe) {
          const isUnderThreat = opponentPlayer?.pieces.some((oppPiece, oppIdx) => {
            if (oppPiece.position < 0 || oppPiece.position >= LUDO_TRACK_LENGTH) return false;
            const oppGlobal = getGlobalTrackPos(opponentId, oppPiece.position, oppIdx, mode);
            const distBehind = (currentGlobal - oppGlobal + LUDO_TRACK_LENGTH) % LUDO_TRACK_LENGTH;
            return distBehind >= 1 && distBehind <= 6;
          });

          if (isUnderThreat) {
            score += 250;
            reason = "Escape opponent threat";
          }
        }
      }

      // 1. Winning move (Home Goal)
      if (to === LUDO_HOME_ENTRY) {
        score += 1000;
        reason = "Score piece into Home Goal";
      }
      // 2. Track move checks
      else if (to < LUDO_TRACK_LENGTH) {
        const landingGlobal = getGlobalTrackPos(botPlayerId, to, pieceIndex, mode);
        const isSafe = LUDO_SAFE_SQUARES.has(landingGlobal);

        if (isSafe) {
          score += 150;
          reason = "Land on safe protected square";
        } else {
          // Check if lands on opponent piece (Capture!)
          const willCapture = opponentPlayer?.pieces.some(
            (oppPiece, oppIdx) =>
              oppPiece.position >= 0 &&
              oppPiece.position < LUDO_TRACK_LENGTH &&
              getGlobalTrackPos(opponentId, oppPiece.position, oppIdx, mode) === landingGlobal
          );

          if (willCapture) {
            score += 1500;
            reason = "Capture opponent piece & score instant home goal";
          } else {
            // Risk avoidance: landing 1-6 steps in front of an opponent
            const landsInDanger = opponentPlayer?.pieces.some((oppPiece, oppIdx) => {
              if (oppPiece.position < 0 || oppPiece.position >= LUDO_TRACK_LENGTH) return false;
              const oppGlobal = getGlobalTrackPos(opponentId, oppPiece.position, oppIdx, mode);
              const distBehind = (landingGlobal - oppGlobal + LUDO_TRACK_LENGTH) % LUDO_TRACK_LENGTH;
              return distBehind >= 1 && distBehind <= 6;
            });

            if (landsInDanger) {
              score -= 90;
            }
          }
        }

        // Reward pieces nearing the home entrance (progress 40-51)
        if (to >= 40) {
          score += 40;
        }
      }
      // 3. Home Stretch progress (progress 51..55)
      else if (to >= 51 && to < LUDO_HOME_ENTRY) {
        score += 250 + (to - 51) * 20;
        reason = "Advance deeper into home corridor";
      }

      validChoices.push({ pieceIndex, dieValue: currentDie, score, reason });
    }
  });

  if (validChoices.length === 0) return null;

  // Sort by highest score
  validChoices.sort((a, b) => b.score - a.score);
  return validChoices[0];
}
