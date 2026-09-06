import { describe, expect, it } from "vitest";
import {
  ABANDONMENT_GRACE_MS,
  MATCH_LOBBY_TIMEOUT_MS,
  MATCH_PLAY_WINDOW_MS,
  OPPONENT_PRESENCE_WARNING_MS,
  PLAYER_HEARTBEAT_INTERVAL_MS,
  PLAYER_HEARTBEAT_TIMEOUT_MS,
} from "@shared/const";
import { matchPlayWindowExpiry } from "./db";

/**
 * These thresholds only work in relation to each other, and the bug that
 * started this was two of them crossing. The relationships matter more than
 * the values, so they are asserted rather than left to be re-derived by
 * whoever next tunes a number.
 */
describe("liveness thresholds", () => {
  it("warns about an absent opponent only after a beat is genuinely late", () => {
    // The warning fired at 14s against a 15s heartbeat, so every match showed
    // "opponent connection unstable" on every cycle, forever.
    expect(OPPONENT_PRESENCE_WARNING_MS).toBeGreaterThan(
      PLAYER_HEARTBEAT_INTERVAL_MS
    );
  });

  it("leaves room for a missed beat before warning", () => {
    // One dropped request must not accuse a player of leaving.
    expect(OPPONENT_PRESENCE_WARNING_MS).toBeGreaterThanOrEqual(
      PLAYER_HEARTBEAT_INTERVAL_MS * 2
    );
  });

  it("warns before the server acts, not after", () => {
    // If these were the other way round the UI would call a player present
    // after the server had already dropped them.
    expect(OPPONENT_PRESENCE_WARNING_MS).toBeLessThan(
      PLAYER_HEARTBEAT_TIMEOUT_MS
    );
  });

  it("tolerates several missed beats before disconnecting", () => {
    expect(PLAYER_HEARTBEAT_TIMEOUT_MS).toBeGreaterThanOrEqual(
      PLAYER_HEARTBEAT_INTERVAL_MS * 3
    );
  });

  it("gives a disconnected player longer to return than it took to notice", () => {
    expect(ABANDONMENT_GRACE_MS).toBeGreaterThan(PLAYER_HEARTBEAT_TIMEOUT_MS);
  });

  it("gives a started match far longer than the lobby it came from", () => {
    // A quick-match ticket expired 15 minutes after it was created, and that
    // clock kept running once the game began.
    expect(MATCH_PLAY_WINDOW_MS).toBeGreaterThan(MATCH_LOBBY_TIMEOUT_MS);
    // Long enough that a real game never races it.
    expect(MATCH_PLAY_WINDOW_MS).toBeGreaterThan(ABANDONMENT_GRACE_MS * 4);
  });

  it("dates the play window from the moment play starts", () => {
    const before = Date.now();
    const expiry = matchPlayWindowExpiry().getTime();
    expect(expiry).toBeGreaterThanOrEqual(before + MATCH_PLAY_WINDOW_MS);
  });
});
