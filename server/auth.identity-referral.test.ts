import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  checkUsernameAvailable: vi.fn(),
  registerUserIdentity: vi.fn(),
  claimWelcomeReward: vi.fn(),
  getUserReferralStats: vi.fn(),
  linkUserEvmAddress: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: { setHeader: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createMockUser(overrides: Partial<TrpcContext["user"]> = {}) {
  const now = new Date();
  return {
    id: 101,
    openId: "user-101",
    name: null,
    email: null,
    loginMethod: "nimiq_hub",
    role: "user" as const,
    address: "NQ0700000000000000000000000000000000",
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
    ...overrides,
  };
}

describe("Web3 Identity, Referral System & EVM Linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth.checkUsername", () => {
    it("verifies availability through database", async () => {
      dbMocks.checkUsernameAvailable.mockResolvedValue(true);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.auth.checkUsername({ username: "CryptoKing" });
      expect(result.isAvailable).toBe(true);
      expect(dbMocks.checkUsernameAvailable).toHaveBeenCalledWith("CryptoKing", undefined);
    });

    it("verifies unavailable status when username taken", async () => {
      dbMocks.checkUsernameAvailable.mockResolvedValue(false);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.auth.checkUsername({ username: "CryptoKing" });
      expect(result.isAvailable).toBe(false);
    });
  });

  describe("auth.registerIdentity", () => {
    it("rejects unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(
        caller.auth.registerIdentity({ username: "Jack" })
      ).rejects.toThrow("Please login");
    });

    it("registers username with avatar and returns updated user", async () => {
      const mockUser = createMockUser();

      const updatedUser = {
        ...mockUser,
        name: "Jack",
        avatar: "gladiator",
        points: 1000,
        referralCode: "JACK",
      };

      dbMocks.registerUserIdentity.mockResolvedValue(updatedUser);

      const caller = appRouter.createCaller(createContext(mockUser));
      const result = await caller.auth.registerIdentity({ username: "Jack", avatar: "gladiator" });

      expect(result.success).toBe(true);
      expect(result.user.points).toBe(1000);
      expect(result.user.avatar).toBe("gladiator");
      expect(dbMocks.registerUserIdentity).toHaveBeenCalledWith({
        userId: 101,
        name: "Jack",
        avatar: "gladiator",
        referralCodeUsed: undefined,
        address: "NQ0700000000000000000000000000000000",
      });
    });
  });

  describe("auth.claimWelcomeReward", () => {
    it("claims 1000 welcome points reward successfully", async () => {
      const mockUser = createMockUser({ welcomeClaimed: false });
      dbMocks.claimWelcomeReward.mockResolvedValue({
        success: true,
        alreadyClaimed: false,
        points: 2000,
        welcomeClaimed: true,
        message: "1,000 Welcome Arena Points added to your balance!",
      });

      const caller = appRouter.createCaller(createContext(mockUser));
      const result = await caller.auth.claimWelcomeReward();

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.points).toBe(2000);
      expect(dbMocks.claimWelcomeReward).toHaveBeenCalledWith(101);
    });
  });

  describe("auth.getReferralStats", () => {
    it("returns referral stats for authenticated user", async () => {
      const mockUser = createMockUser({ name: "Jack" });

      dbMocks.getUserReferralStats.mockResolvedValue({
        referralCode: "JACK",
        totalReferred: 4,
        points: 3000,
        referralEarningsNim: 15,
        referredUsers: [],
      });

      const caller = appRouter.createCaller(createContext(mockUser));
      const stats = await caller.auth.getReferralStats();

      expect(stats.referralCode).toBe("JACK");
      expect(stats.totalReferred).toBe(4);
      expect(stats.points).toBe(3000);
      expect(stats.referralEarningsNim).toBe(15);
    });
  });

  describe("auth.linkEvmAddress", () => {
    it("links EVM address to user profile", async () => {
      const mockUser = createMockUser({ name: "Jack" });

      dbMocks.linkUserEvmAddress.mockResolvedValue({
        success: true,
        ok: true,
        evmAddress: "0x1234567890123456789012345678901234567890",
      });

      const caller = appRouter.createCaller(createContext(mockUser));
      const res = await caller.auth.linkEvmAddress({
        evmAddress: "0x1234567890123456789012345678901234567890",
      });

      expect(res.success).toBe(true);
      expect(dbMocks.linkUserEvmAddress).toHaveBeenCalledWith(
        101,
        "0x1234567890123456789012345678901234567890"
      );
    });
  });
});
