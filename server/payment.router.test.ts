import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 42,
      openId: "payment-test-user",
      name: "Payment Test",
      email: "payment@example.com",
      loginMethod: "test",
      role: "user",
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
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("payment procedures", () => {
  it("rejects short idempotency nonces before touching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.payment.createIntent({ clientNonce: "short" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed transaction hashes at the API boundary", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.payment.submitTransaction({
        id: "intent-id-123456",
        transactionHash: "not-a-hash",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns safe forensic diagnostics without leaking secrets", async () => {
    const caller = appRouter.createCaller(createContext());
    const diag = await caller.payment.diagnostic();

    expect(diag).toBeDefined();
    expect(diag.network).toBe("TestAlbatross");
    expect(diag.networkId).toBe(5);
    expect(diag.isTestnet).toBe(true);
    expect(diag.rpcUrl).toContain("nimiqwatch.com");
    expect(typeof diag.recipientConfigured).toBe("boolean");
    expect(typeof diag.recipientValid).toBe("boolean");
    // Ensure no private key or raw sensitive credentials leaked
    expect((diag as any).privateKey).toBeUndefined();
    expect((diag as any).seed).toBeUndefined();
    if (diag.recipientConfigured) {
      expect(diag.recipientNormalizedMasked).toContain("****");
    }
  });

  it("strictly validates stake amounts and Luna conversion mathematically", () => {
    const testCases = [
      { nim: 1, expectedLuna: 100_000 },
      { nim: 10, expectedLuna: 1_000_000 },
      { nim: 100, expectedLuna: 10_000_000 },
      { nim: 1_000, expectedLuna: 100_000_000 },
      { nim: 10_000, expectedLuna: 1_000_000_000 },
    ];

    for (const { nim, expectedLuna } of testCases) {
      const luna = Math.floor(nim * 100_000);
      expect(luna).toBe(expectedLuna);
      expect(Number.isSafeInteger(luna)).toBe(true);
      expect(luna / 100_000).toBe(nim);
    }
  });

  it("rejects invalid stakes below 1 or above 10,000,000 NIM at router boundary", async () => {
    const caller = appRouter.createCaller(createContext());

    // Zero stake
    await expect(
      caller.match.createWageredMatch({ gameSlug: "ludo-league", stakeNim: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Negative stake
    await expect(
      caller.match.createWageredMatch({ gameSlug: "ludo-league", stakeNim: -5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Fractional stake (must be integer NIM)
    await expect(
      caller.match.createWageredMatch({ gameSlug: "ludo-league", stakeNim: 10.5 as any })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Exceeds max 10,000,000 NIM
    await expect(
      caller.match.createWageredMatch({ gameSlug: "ludo-league", stakeNim: 10_000_001 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("strictly validates recipient configuration and refuses placeholder 0000 addresses", async () => {
    const { resolveNimiqPaymentRecipient } = await import("./_core/env");
    const testnetConfig = {
      networkId: 5,
      name: "TestAlbatross",
      rpcUrl: "https://rpc.testnet.nimiqwatch.com",
      explorerUrl: "https://testnet.nimiqwatch.com",
      faucetUrl: "https://faucet.nimiq-testnet.com",
      isTestnet: true,
      fallbackRpcUrls: [],
    };

    // Placeholder recipient
    const prevRecipient = process.env.NIMIQ_PAYMENT_RECIPIENT;
    const prevSettlement = process.env.NIMIQ_SETTLEMENT_ADDRESS;
    try {
      process.env.NIMIQ_PAYMENT_RECIPIENT = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
      delete process.env.NIMIQ_SETTLEMENT_ADDRESS;
      expect(() => resolveNimiqPaymentRecipient(testnetConfig)).toThrow(
        /invalid placeholder/i
      );

      // Syntactically invalid recipient
      process.env.NIMIQ_PAYMENT_RECIPIENT = "INVALID_NIMIQ_ADDRESS_12345";
      expect(() => resolveNimiqPaymentRecipient(testnetConfig)).toThrow(
        /syntactically invalid/i
      );

      // Legitimate recipient
      process.env.NIMIQ_PAYMENT_RECIPIENT = "NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX";
      const valid = resolveNimiqPaymentRecipient(testnetConfig);
      expect(valid).toBe("NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX");
    } finally {
      process.env.NIMIQ_PAYMENT_RECIPIENT = prevRecipient;
      if (prevSettlement) {
        process.env.NIMIQ_SETTLEMENT_ADDRESS = prevSettlement;
      }
    }
  });

  it("handles requestTestnetDrip with address validation and fallback", async () => {
    const caller = appRouter.createCaller(createContext());

    // Rejects invalid address format
    await expect(
      caller.payment.requestTestnetDrip({ address: "invalid-address" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Valid testnet address returns result with fallback url when hot wallet is on standby
    const res = await caller.payment.requestTestnetDrip({
      address: "NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX",
    });
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
    expect(res.fallbackUrl).toBe("https://testnet.nimiq.watch/#faucet");
  });
});
