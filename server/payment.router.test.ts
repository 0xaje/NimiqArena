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
});
