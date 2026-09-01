import {
  CONNECT4_COLS,
  checkConnect4Victory,
  cloneConnect4Snapshot,
  getLowestEmptyRow,
  type Connect4PlayerId,
  type Connect4Snapshot,
} from "./connect4-engine";

export interface Connect4BotChoice {
  column: number;
  score: number;
  reason: string;
}

export function selectBestConnect4Drop(
  snapshot: Connect4Snapshot,
  botPlayerId: Connect4PlayerId = 1
): Connect4BotChoice | null {
  const opponentId = (botPlayerId === 0 ? 1 : 0) as Connect4PlayerId;
  const validChoices: Connect4BotChoice[] = [];

  // Column weights for center control (center is tactically strongest)
  const centerWeights = [10, 30, 60, 100, 60, 30, 10];

  for (let col = 0; col < CONNECT4_COLS; col++) {
    const row = getLowestEmptyRow(snapshot.board, col);
    if (row === -1) continue; // Column is full

    let score = centerWeights[col];
    let reason = "Center positional control";

    // 1. Check if Bot can win immediately on this drop
    const simBoardBot = snapshot.board.map(c => [...c]);
    simBoardBot[col][row] = botPlayerId;
    if (checkConnect4Victory(simBoardBot, col, row)) {
      return {
        column: col,
        score: 10000,
        reason: "Winning 4-in-a-row drop",
      };
    }

    // 2. Check if Opponent would win on this square next turn -> BLOCK IT!
    const simBoardOpp = snapshot.board.map(c => [...c]);
    simBoardOpp[col][row] = opponentId;
    if (checkConnect4Victory(simBoardOpp, col, row)) {
      score += 5000;
      reason = "Block opponent winning drop";
    }

    // 3. Avoid giving opponent a winning move on the cell immediately above!
    if (row + 1 < 6) {
      const simBoardTrap = snapshot.board.map(c => [...c]);
      simBoardTrap[col][row] = botPlayerId;
      simBoardTrap[col][row + 1] = opponentId;
      if (checkConnect4Victory(simBoardTrap, col, row + 1)) {
        score -= 3000; // Blunder trap!
        reason = "Avoid setting up opponent win";
      }
    }

    validChoices.push({ column: col, score, reason });
  }

  if (validChoices.length === 0) return null;

  // Sort by score descending
  validChoices.sort((a, b) => b.score - a.score);
  return validChoices[0];
}
