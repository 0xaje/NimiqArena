import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  applyLudoMatchCommand: vi.fn(),
  getGameBySlug: vi.fn(),
  getMatchById: vi.fn(),
  getMatchPlayer: vi.fn(),
  getMatchPlayers: vi.fn(),
  joinMatchByCode: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(userId = 7): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: userId,
      openId: `match-test-${userId}`,
      name: "Match Test",
      email: "match@example.com",
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

const match = {
  id: "match-1234567890123456",
  joinCode: "AB12CD34",
  status: "in_progress" as const,
  visibility: "challenge_friend" as const,
  engineVersion: "ludo-v1",
  stateVersion: 3,
  stateJson: JSON.stringify({ version: 3 }),
  hostUserId: 7,
  gameId: 1,
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getMatchById.mockResolvedValue(match);
  dbMocks.getMatchPlayer.mockResolvedValue({
    matchId: match.id,
    userId: 7,
    seat: 0,
    status: "joined",
  });
  dbMocks.getMatchPlayers.mockResolvedValue([
    { seat: 0, status: "joined" },
    { seat: 1, status: "joined" },
  ]);
});

describe("authoritative match command integration", () => {
  it("creates a real joined seat for a valid Challenge Friend code", async () => {
    dbMocks.joinMatchByCode.mockResolvedValue({
      match: { ...match, status: "in_progress" },
      player: { seat: 1 },
    });

    const result = await appRouter
      .createCaller(createContext(9))
      .match.joinByCode({
        joinCode: "AB12CD34",
      });

    expect(result).toMatchObject({
      id: match.id,
      joinCode: "AB12CD34",
      status: "in_progress",
      seat: 1,
    });
  });

  it.each([
    ["expired", "This match is no longer available."],
    ["full", "This match already has two players."],
  ])("rejects a %s Challenge Friend match", async (_label, message) => {
    dbMocks.joinMatchByCode.mockRejectedValue(new Error(message));

    await expect(
      appRouter
        .createCaller(createContext(9))
        .match.joinByCode({ joinCode: "AB12CD34" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message });
  });

  it("returns the existing seat for a duplicate join instead of creating another player", async () => {
    dbMocks.joinMatchByCode.mockResolvedValue({
      match,
      player: { seat: 0 },
    });

    const result = await appRouter
      .createCaller(createContext())
      .match.joinByCode({
        joinCode: "AB12CD34",
      });

    expect(result.seat).toBe(0);
    expect(dbMocks.joinMatchByCode).toHaveBeenCalledTimes(1);
  });

  it("rejects an unauthorized participant specifically on match.command", async () => {
    dbMocks.applyLudoMatchCommand.mockRejectedValue(
      new Error("You are not a joined player in this match.")
    );

    await expect(
      appRouter.createCaller(createContext(9)).match.command({
        id: match.id,
        command: {
          kind: "roll",
          expectedVersion: 3,
          nonce: "nonce-623456789012",
        },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the server result for a successful roll", async () => {
    dbMocks.applyLudoMatchCommand.mockResolvedValue({
      snapshot: { version: 4, currentPlayer: 0, dice: 6, winner: null },
      event: { type: "roll", playerId: 0, dice: 6 },
      status: "in_progress",
      idempotent: false,
    });

    const result = await appRouter.createCaller(createContext()).match.command({
      id: match.id,
      command: {
        kind: "roll",
        expectedVersion: 3,
        nonce: "nonce-123456789012",
      },
    });

    expect(result).toMatchObject({
      status: "in_progress",
      idempotent: false,
      snapshot: { version: 4, dice: 6 },
    });
    expect(dbMocks.applyLudoMatchCommand).toHaveBeenCalledWith({
      matchId: match.id,
      userId: 7,
      command: {
        kind: "roll",
        expectedVersion: 3,
        nonce: "nonce-123456789012",
      },
    });
  });

  it("maps stale-version conflicts to a typed conflict response", async () => {
    dbMocks.applyLudoMatchCommand.mockRejectedValue(
      new Error("Match state changed; retry with the latest state.")
    );
    await expect(
      appRouter.createCaller(createContext()).match.command({
        id: match.id,
        command: {
          kind: "roll",
          expectedVersion: 2,
          nonce: "nonce-223456789012",
        },
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a user who is not a joined participant", async () => {
    dbMocks.getMatchPlayer.mockResolvedValue(undefined);
    await expect(
      appRouter.createCaller(createContext(9)).match.getById({ id: match.id })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the original stored result for an idempotent duplicate nonce", async () => {
    dbMocks.applyLudoMatchCommand.mockResolvedValue({
      snapshot: { version: 4, currentPlayer: 0, dice: 6, winner: null },
      event: { type: "roll", playerId: 0, dice: 6 },
      status: "in_progress",
      idempotent: true,
    });

    const result = await appRouter.createCaller(createContext()).match.command({
      id: match.id,
      command: {
        kind: "roll",
        expectedVersion: 3,
        nonce: "nonce-323456789012",
      },
    });

    expect(result).toEqual({
      snapshot: { version: 4, currentPlayer: 0, dice: 6, winner: null },
      event: { type: "roll", playerId: 0, dice: 6 },
      status: "in_progress",
      idempotent: true,
    });
  });

  it("maps concurrent command rejection to a conflict for both callers", async () => {
    dbMocks.applyLudoMatchCommand.mockRejectedValue(
      new Error("Match state changed; retry with the latest state.")
    );
    const caller = appRouter.createCaller(createContext());
    const requests = await Promise.allSettled([
      caller.match.command({
        id: match.id,
        command: {
          kind: "roll",
          expectedVersion: 3,
          nonce: "nonce-423456789012",
        },
      }),
      caller.match.command({
        id: match.id,
        command: {
          kind: "roll",
          expectedVersion: 3,
          nonce: "nonce-523456789012",
        },
      }),
    ]);

    expect(requests).toHaveLength(2);
    expect(
      requests.every(
        request =>
          request.status === "rejected" && request.reason.code === "CONFLICT"
      )
    ).toBe(true);
  });
});
