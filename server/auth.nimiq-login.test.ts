import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserByNimiqAddress: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const now = new Date();

function userRow(openId: string, address: string | null = null, loginMethod = "nimiq_hub") {
  return {
    id: 777,
    openId,
    name: "Nimiq Warrior",
    email: null,
    address,
    loginMethod,
    role: "user" as const,
    points: 1000,
    referralCode: null,
    referredByUserId: null,
    referralEarningsNim: 0,
    evmAddress: null,
    avatar: null,
    welcomeClaimed: false,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "203.0.113.88",
      socket: { remoteAddress: "203.0.113.88" },
    } as unknown as TrpcContext["req"],
    res: { setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Nimiq Wallet Web3 Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getUserByOpenId.mockImplementation(async (openId: string) =>
      userRow(openId, "NQ0700000000000000000000000000000000")
    );
  });

  it("issues an unexpired cryptographic challenge nonce", async () => {
    const caller = appRouter.createCaller(createContext());
    const res = await caller.auth.requestChallenge();

    expect(res.challenge).toContain("Sign into Nimiq Arena");
    expect(res.nonce).toBeDefined();
    expect(res.nonce.length).toBeGreaterThan(16);
    expect(Date.now() - res.timestamp).toBeLessThan(1000);
  });

  it("rejects invalid Nimiq address format", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.auth.loginWithNimiq({
        address: "INVALID_ADDRESS_123",
        challenge: "Sign into Nimiq Arena\nNonce: 123456789012345678\nTimestamp: 100",
      })
    ).rejects.toThrow(/Invalid Nimiq address format/);
  });

  it("authenticates a new user and binds their Nimiq address", async () => {
    dbMocks.getUserByNimiqAddress.mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createContext());

    const result = await caller.auth.loginWithNimiq({
      address: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
      challenge: "Sign into Nimiq Arena\nNonce: abcdef1234567890\nTimestamp: 100",
      name: "Arena Champion",
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(dbMocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "NQ0700000000000000000000000000000000",
        loginMethod: "nimiq_hub",
        name: "Arena Champion",
      })
    );
  });

  it("upgrades an existing guest session to a persistent Nimiq account", async () => {
    dbMocks.getUserByNimiqAddress.mockResolvedValueOnce(undefined);
    const guestUser = {
      id: 303,
      openId: "guest-old-session-12345",
      name: "Experienced Guest",
      email: null,
      role: "user" as const,
      loginMethod: "guest",
      address: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };

    const caller = appRouter.createCaller(createContext(guestUser));
    const result = await caller.auth.loginWithNimiq({
      address: "NQ12 3456 7890 ABCD EFGH JKLM NOPQ RSTU VWXY",
      challenge: "Sign into Nimiq Arena\nNonce: abcdef1234567890\nTimestamp: 100",
    });

    expect(result.success).toBe(true);
    // Preserves openId so Elo rating and history are retained!
    expect(dbMocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "guest-old-session-12345",
        name: "Experienced Guest",
        address: "NQ1234567890ABCDEFGHJKLMNOPQRSTUVWXY",
        loginMethod: "nimiq_hub",
      })
    );
  });

  it("authenticates returning Nimiq user with existing persistent account", async () => {
    const existingUser = userRow("nimiq-existing-openId", "NQ0700000000000000000000000000000000");
    dbMocks.getUserByNimiqAddress.mockResolvedValueOnce(existingUser);
    dbMocks.getUserByOpenId.mockResolvedValueOnce(existingUser);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.auth.loginWithNimiq({
      address: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
      challenge: "Sign into Nimiq Arena\nNonce: returning123456\nTimestamp: 100",
    });

    expect(result.success).toBe(true);
    expect(dbMocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "nimiq-existing-openId",
        loginMethod: "nimiq_hub",
      })
    );
  });
});
