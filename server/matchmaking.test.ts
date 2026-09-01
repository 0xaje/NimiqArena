import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findOrCreateQuickMatch: vi.fn(),
  cancelWaitingMatch: vi.fn(),
  getMatchQueueStatus: vi.fn(),
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

function createContext(userId = 8801): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      name: "Quick Match Tester",
      email: "tester@example.com",
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

describe("Public Quick Matchmaking Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findOrCreateQuickMatch returns waiting status for new ticket", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    dbMocks.findOrCreateQuickMatch.mockResolvedValue({
      matchId: "match-quick-12345",
      status: "waiting",
      seat: 0,
      expiresAt,
    });

    const caller = appRouter.createCaller(createContext(8801));
    const res = await caller.match.findOrCreateQuickMatch({
      gameSlug: "ludo-league",
    });

    expect(dbMocks.findOrCreateQuickMatch).toHaveBeenCalledWith({
      userId: 8801,
      gameSlug: "ludo-league",
    });
    expect(res.matchId).toBe("match-quick-12345");
    expect(res.status).toBe("waiting");
    expect(res.seat).toBe(0);
  });

  it("findOrCreateQuickMatch returns in_progress status when matched immediately", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    dbMocks.findOrCreateQuickMatch.mockResolvedValue({
      matchId: "match-quick-12345",
      status: "in_progress",
      seat: 1,
      expiresAt,
    });

    const caller = appRouter.createCaller(createContext(8802));
    const res = await caller.match.findOrCreateQuickMatch({
      gameSlug: "ludo-league",
    });

    expect(res.matchId).toBe("match-quick-12345");
    expect(res.status).toBe("in_progress");
    expect(res.seat).toBe(1);
  });

  it("cancelWaitingMatch successfully cancels a waiting ticket", async () => {
    dbMocks.cancelWaitingMatch.mockResolvedValue({ ok: true });

    const caller = appRouter.createCaller(createContext(8801));
    const res = await caller.match.cancelWaitingMatch({
      matchId: "match-quick-12345",
    });

    expect(dbMocks.cancelWaitingMatch).toHaveBeenCalledWith({
      userId: 8801,
      matchId: "match-quick-12345",
    });
    expect(res.success).toBe(true);
  });

  it("queueStatus returns live match status and opponent info", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    dbMocks.getMatchQueueStatus.mockResolvedValue({
      matchId: "match-quick-12345",
      status: "in_progress",
      playerCount: 2,
      opponent: { id: 8802, name: "Challenger 2" },
      expiresAt,
    });

    const caller = appRouter.createCaller(createContext(8801));
    const res = await caller.match.queueStatus({
      matchId: "match-quick-12345",
    });

    expect(dbMocks.getMatchQueueStatus).toHaveBeenCalledWith({
      userId: 8801,
      matchId: "match-quick-12345",
    });
    expect(res.status).toBe("in_progress");
    expect(res.playerCount).toBe(2);
    expect(res.opponent?.name).toBe("Challenger 2");
  });
});
