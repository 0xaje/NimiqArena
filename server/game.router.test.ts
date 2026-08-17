import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 7,
      openId: "game-test-user",
      name: "Game Test",
      email: "game@example.com",
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

describe("game and match router validation", () => {
  it("rejects an empty Challenge Friend game slug before reaching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.match.createChallenge({ gameSlug: "" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed match identifiers before reaching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.match.getById({ id: "short" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects invalid challenge-code formats before the join service", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.match.joinByCode({ joinCode: "bad code" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed command payloads before the engine", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.match.command({
        id: "match-id-with-valid-length",
        command: {
          kind: "move",
          expectedVersion: 0,
          nonce: "short",
          pieceIndex: 0,
        },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
