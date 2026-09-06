import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  createPaymentIntent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { resetRateLimiterState } from "./_core/rateLimiter";

const now = new Date();

function guestUser(id: number) {
  return {
    id,
    openId: `guest-${id}`,
    name: "Rate Limited",
    email: null,
    loginMethod: "guest",
    role: "user" as const,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function createContext(
  user: TrpcContext["user"],
  ip = "203.0.113.5"
): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip,
      socket: { remoteAddress: ip },
    } as unknown as TrpcContext["req"],
    res: { setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("per-procedure rate limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiterState();
    dbMocks.getUserByOpenId.mockResolvedValue(guestUser(4242));
    dbMocks.createPaymentIntent.mockResolvedValue({
      id: "intent-rate-limit-01",
      recipient: "NQ0700000000000000000000000000000000",
      valueLuna: 100000,
      status: "created",
      expiresAt: new Date(Date.now() + 600_000),
    });
  });

  it("caps anonymous account minting per client address", async () => {
    const caller = appRouter.createCaller(createContext(null));

    for (let i = 0; i < 10; i++) {
      await expect(
        caller.auth.guestLogin({ name: `Player ${i}` })
      ).resolves.toBeDefined();
    }

    await expect(
      caller.auth.guestLogin({ name: "One too many" })
    ).rejects.toThrow(/too many sign-in attempts/i);
    expect(dbMocks.upsertUser).toHaveBeenCalledTimes(10);
  });

  it("counts a signed-in caller's payment requests against their own budget", async () => {
    const caller = appRouter.createCaller(createContext(guestUser(4242)));

    for (let i = 0; i < 20; i++) {
      await caller.payment.createIntent({
        clientNonce: `nonce-abcdef-${i}0000`,
      });
    }
    await expect(
      caller.payment.createIntent({ clientNonce: "nonce-abcdef-final0" })
    ).rejects.toThrow(/too many payment requests/i);

    // A different user sharing the same address is unaffected.
    const other = appRouter.createCaller(createContext(guestUser(4343)));
    await expect(
      other.payment.createIntent({ clientNonce: "nonce-abcdef-other0" })
    ).resolves.toBeDefined();
  });

  it("keeps the sign-in and payment budgets separate", async () => {
    const caller = appRouter.createCaller(createContext(guestUser(4242)));
    for (let i = 0; i < 20; i++) {
      await caller.payment.createIntent({
        clientNonce: `nonce-abcdef-${i}1111`,
      });
    }
    await expect(
      caller.payment.createIntent({ clientNonce: "nonce-abcdef-blocked" })
    ).rejects.toThrow(/too many payment requests/i);

    // Spending the payment budget must not lock the player out of the app.
    await expect(
      caller.auth.guestLogin({ name: "Still me" })
    ).resolves.toBeDefined();
  });
});
