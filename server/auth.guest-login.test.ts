import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const now = new Date();

function userRow(openId: string, loginMethod: string | null = "guest") {
  return {
    id: 501,
    openId,
    name: "Player 1",
    email: null,
    loginMethod,
    role: "user" as const,
    address: null,
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
      ip: "203.0.113.5",
      socket: { remoteAddress: "203.0.113.5" },
    } as unknown as TrpcContext["req"],
    res: { setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function mintedOpenId() {
  return dbMocks.upsertUser.mock.calls.at(-1)?.[0].openId as string;
}

describe("guest login identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getUserByOpenId.mockImplementation(async (openId: string) =>
      userRow(openId)
    );
  });

  it("ignores a caller-supplied openId instead of honouring it", async () => {
    const caller = appRouter.createCaller(createContext());

    // The old contract accepted this field and signed a session for whatever
    // it named, which is sign-in as any account whose openId you can guess.
    // The field is now unknown to the schema, so zod strips it and the server
    // mints its own subject.
    const res = await caller.auth.guestLogin({
      name: "Attacker",
      openId: "oauth-victim-openid",
    } as never);

    expect(mintedOpenId()).not.toBe("oauth-victim-openid");
    expect(mintedOpenId()).toMatch(/^guest-[A-Za-z0-9_-]{24}$/);
    expect(res.user?.openId).not.toBe("oauth-victim-openid");
  });

  it("does not derive the identity from the display name", async () => {
    const caller = appRouter.createCaller(createContext());
    await caller.auth.guestLogin({ name: "Player 1" });
    const first = mintedOpenId();

    const second = appRouter.createCaller(createContext());
    await second.auth.guestLogin({ name: "Player 1" });

    // Same name, different people: a name-derived openId would collide and
    // hand the second caller the first caller's account.
    expect(first).not.toBe(mintedOpenId());
    expect(first).toMatch(/^guest-[A-Za-z0-9_-]{24}$/);
  });

  it("keeps an existing guest identity when renaming", async () => {
    const existing = userRow("guest-existing-identity-01");
    const caller = appRouter.createCaller(createContext(existing));

    await caller.auth.guestLogin({ name: "Renamed" });

    // Renaming must not orphan the player's rating and match history.
    expect(mintedOpenId()).toBe("guest-existing-identity-01");
    expect(dbMocks.upsertUser.mock.calls.at(-1)?.[0].name).toBe("Renamed");
  });

  it("mints a separate identity when a second player is requested", async () => {
    const existing = userRow("guest-existing-identity-01");
    const caller = appRouter.createCaller(createContext(existing));

    await caller.auth.guestLogin({ name: "Player 2", newIdentity: true });

    expect(mintedOpenId()).not.toBe("guest-existing-identity-01");
  });

  it("never rebinds a non-guest session onto a guest identity", async () => {
    const oauthUser = userRow("oauth-real-user", "google");
    const caller = appRouter.createCaller(createContext(oauthUser));

    await caller.auth.guestLogin({ name: "Sneaky" });

    // An OAuth account must not be renamed or taken over through guest login.
    expect(mintedOpenId()).not.toBe("oauth-real-user");
    expect(mintedOpenId()).toMatch(/^guest-/);
  });
});
