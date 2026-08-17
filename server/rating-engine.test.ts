import { describe, expect, it } from "vitest";
import {
  calculateElo,
  calculateExpectedScore,
  DEFAULT_K_FACTOR,
  RATING_FLOOR,
  STARTING_RATING,
} from "./rating-engine";

describe("server-authoritative Elo rating engine", () => {
  it("computes 0.5 expected score for equal ratings", () => {
    const expected = calculateExpectedScore(1000, 1000);
    expect(expected).toBe(0.5);
  });

  it("calculates symmetrical rating change (+16 / -16) for equal rating win", () => {
    const result = calculateElo({
      ratingA: 1000,
      ratingB: 1000,
      outcomeA: "win",
    });

    expect(result.previousRatingA).toBe(1000);
    expect(result.previousRatingB).toBe(1000);
    expect(result.changeA).toBe(16);
    expect(result.changeB).toBe(-16);
    expect(result.newRatingA).toBe(1016);
    expect(result.newRatingB).toBe(984);
  });

  it("calculates underdog win with higher gain and higher loss for favorite", () => {
    // Underdog (800) beats Favorite (1200)
    const result = calculateElo({
      ratingA: 800,
      ratingB: 1200,
      outcomeA: "win",
    });

    expect(result.changeA).toBeGreaterThan(16);
    expect(result.changeB).toBeLessThan(-16);
    expect(result.changeA + result.changeB).toBe(0);
    expect(result.newRatingA).toBe(800 + result.changeA);
    expect(result.newRatingB).toBe(1200 + result.changeB);
  });

  it("guarantees at least +1 gain for win even if expected score is very high", () => {
    const result = calculateElo({
      ratingA: 2400,
      ratingB: 200,
      outcomeA: "win",
    });

    expect(result.changeA).toBeGreaterThanOrEqual(1);
    expect(result.newRatingA).toBe(2400 + result.changeA);
  });

  it("enforces rating floor (never drops below 100)", () => {
    const result = calculateElo({
      ratingA: 105,
      ratingB: 105,
      outcomeA: "loss",
    });

    expect(result.newRatingA).toBe(RATING_FLOOR);
    expect(result.changeA).toBe(-5);
  });

  it("handles draw outcome with zero net change for equal ratings", () => {
    const result = calculateElo({
      ratingA: 1000,
      ratingB: 1000,
      outcomeA: "draw",
    });

    expect(result.changeA).toBe(0);
    expect(result.changeB).toBe(0);
    expect(result.newRatingA).toBe(1000);
    expect(result.newRatingB).toBe(1000);
  });

  it("handles abandoned win and abandoned loss identically to regular match results", () => {
    const result = calculateElo({
      ratingA: 1000,
      ratingB: 1000,
      outcomeA: "abandoned_win",
    });

    expect(result.changeA).toBe(16);
    expect(result.changeB).toBe(-16);
    expect(result.newRatingA).toBe(1016);
    expect(result.newRatingB).toBe(984);
  });
});
