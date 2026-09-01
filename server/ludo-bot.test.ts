import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectBestBotMove } from "../shared/game/ludo-bot";
import { createLudoSnapshot } from "../shared/game/ludo-engine";

const dbMocks = vi.hoisted(() => ({
  createSoloPracticeMatch: vi.fn(),
  executeBotTurn: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    ...dbMocks,
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(userId = 9901): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: userId,
      openId: `solo-test-${userId}`,
      name: "Solo Practice Player",
      email: "solo@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Ludo AI Bot Heuristic Engine", () => {
  it("selects base exit when bot rolls a 6 with all pieces in base", () => {
    const snapshot = createLudoSnapshot("match-bot-1");
    // All Bot (Player 1) pieces are at -1
    const move = selectBestBotMove(snapshot, 1, 6);
    expect(move).not.toBeNull();
    expect(move?.pieceIndex).toBe(0);
    expect(move?.score).toBeGreaterThanOrEqual(300);
  });

  it("returns null when bot rolls < 6 and all pieces are in base", () => {
    const snapshot = createLudoSnapshot("match-bot-1");
    const move = selectBestBotMove(snapshot, 1, 4);
    expect(move).toBeNull();
  });

  it("prioritizes scoring into Home Goal (57) above general movement", () => {
    const snapshot = createLudoSnapshot("match-bot-1");
    // Piece 0 at position 53 (needs 4 to reach 57)
    snapshot.players[1].pieces[0].position = 53;
    // Piece 1 at position 10 on track
    snapshot.players[1].pieces[1].position = 10;

    const move = selectBestBotMove(snapshot, 1, 4);
    expect(move).not.toBeNull();
    expect(move?.pieceIndex).toBe(0); // Chooses winning piece
    expect(move?.reason).toContain("Home Goal");
  });

  it("prioritizes capturing opponent piece over regular advancement", () => {
    const snapshot = createLudoSnapshot("match-bot-1");
    // Bot piece 0 is at progress 5 (global track = (26 + 5) % 52 = 31)
    snapshot.players[1].pieces[0].position = 5;
    // Opponent (Player 0) has a piece on global track 34 (progress 34 for P0)
    snapshot.players[0].pieces[0].position = 34;

    // Bot rolls a 3 -> 5 + 3 = 8 (global track = (26 + 8) % 52 = 34) -> CAPTURE!
    const move = selectBestBotMove(snapshot, 1, 3);
    expect(move).not.toBeNull();
    expect(move?.pieceIndex).toBe(0);
    expect(move?.reason).toContain("Capture opponent piece");
  });
});

describe("Solo Practice Match Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a solo match with bot in progress", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    dbMocks.createSoloPracticeMatch.mockResolvedValue({
      id: "match-solo-12345",
      joinCode: "BOTABCD12",
      status: "in_progress",
      visibility: "challenge_friend",
      engineVersion: "ludo-v1",
      expiresAt,
    });

    const caller = appRouter.createCaller(createContext(9901));
    const res = await caller.match.createSoloMatch({
      gameSlug: "ludo-league",
    });

    expect(dbMocks.createSoloPracticeMatch).toHaveBeenCalledWith({
      userId: 9901,
      gameSlug: "ludo-league",
    });
    expect(res.id).toBe("match-solo-12345");
    expect(res.status).toBe("in_progress");
  });

  it("triggers bot turn execution", async () => {
    dbMocks.executeBotTurn.mockResolvedValue({
      ok: true,
      snapshot: { version: 2, currentPlayer: 0 },
    });

    const caller = appRouter.createCaller(createContext(9901));
    const res = await caller.match.triggerBotTurn({
      matchId: "match-solo-12345",
    });

    expect(dbMocks.executeBotTurn).toHaveBeenCalledWith({
      matchId: "match-solo-12345",
      userId: 9901,
    });
    expect(res.ok).toBe(true);
  });
});
