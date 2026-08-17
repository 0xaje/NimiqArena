import { describe, expect, it } from "vitest";
import { replayStoredMatchEvent } from "./match-event";

describe("replayStoredMatchEvent", () => {
  it("returns the stored snapshot and result status instead of current match state", () => {
    const originalSnapshot = { version: 4, currentPlayer: 0, winner: null };
    const stored = {
      snapshotJson: JSON.stringify(originalSnapshot),
      eventJson: JSON.stringify({ type: "roll", dice: 6 }),
      resultStatus: "in_progress",
    };

    const laterMatchStatus = "finished";
    const replay = replayStoredMatchEvent<
      typeof originalSnapshot,
      { type: string; dice: number }
    >(stored);

    expect(replay).toEqual({
      snapshot: originalSnapshot,
      event: { type: "roll", dice: 6 },
      status: "in_progress",
      idempotent: true,
    });
    expect(replay.status).not.toBe(laterMatchStatus);
  });
});
