/**
 * Server-authoritative Elo rating engine for competitive match results.
 * Standard calibration: K=32, Starting=1000, Floor=100.
 */

export const STARTING_RATING = 1000;
export const RATING_FLOOR = 100;
export const DEFAULT_K_FACTOR = 32;

export type MatchOutcome =
  | "win"
  | "loss"
  | "draw"
  | "abandoned_loss"
  | "abandoned_win";

export interface EloCalculationInput {
  ratingA: number;
  ratingB: number;
  outcomeA: "win" | "loss" | "draw" | "abandoned_loss" | "abandoned_win";
  kFactor?: number;
}

export interface EloCalculationResult {
  previousRatingA: number;
  previousRatingB: number;
  changeA: number;
  changeB: number;
  newRatingA: number;
  newRatingB: number;
  expectedScoreA: number;
  expectedScoreB: number;
}

/**
 * Computes the expected score for player A against player B:
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(
  ratingA: number,
  ratingB: number
): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates deterministic Elo rating changes for two players given the outcome for player A.
 */
export function calculateElo(input: EloCalculationInput): EloCalculationResult {
  const ratingA = Math.max(RATING_FLOOR, Math.round(input.ratingA));
  const ratingB = Math.max(RATING_FLOOR, Math.round(input.ratingB));
  const k = input.kFactor ?? DEFAULT_K_FACTOR;

  const expectedScoreA = calculateExpectedScore(ratingA, ratingB);
  const expectedScoreB = 1 - expectedScoreA;

  let actualScoreA: number;
  let isWinA = false;
  let isWinB = false;

  switch (input.outcomeA) {
    case "win":
    case "abandoned_win":
      actualScoreA = 1.0;
      isWinA = true;
      break;
    case "loss":
    case "abandoned_loss":
      actualScoreA = 0.0;
      isWinB = true;
      break;
    case "draw":
      actualScoreA = 0.5;
      break;
    default:
      actualScoreA = 0.5;
  }

  const rawChangeA = k * (actualScoreA - expectedScoreA);
  let changeA = Math.round(rawChangeA);

  // Guarantee minimum delta of 1 for decisive matches
  if (isWinA && changeA < 1) changeA = 1;
  if (isWinB && changeA > -1) changeA = -1;

  // Rating floor protection
  if (ratingA + changeA < RATING_FLOOR) {
    changeA = RATING_FLOOR - ratingA;
  }

  // Normalize -0
  if (changeA === 0) changeA = 0;

  // Player B receives inverse change bounded by floor
  let changeB = changeA === 0 ? 0 : -changeA;
  if (ratingB + changeB < RATING_FLOOR) {
    changeB = RATING_FLOOR - ratingB;
  }
  if (changeB === 0) changeB = 0;

  return {
    previousRatingA: ratingA,
    previousRatingB: ratingB,
    changeA,
    changeB,
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    expectedScoreA: Math.round(expectedScoreA * 10000) / 10000,
    expectedScoreB: Math.round(expectedScoreB * 10000) / 10000,
  };
}
