import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import {
  createPaymentIntent,
  getDb,
  getUserByOpenId,
  updatePaymentIntent,
  verifyPaymentIntent,
} from "./db";
import { paymentIntents, users } from "../drizzle/schema";
import { normalizeNimiqAddress } from "./nimiq-verifier";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";
if (runDatabaseIntegration && process.env.NIMIQ_ARENA_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NIMIQ_ARENA_TEST_DATABASE_URL;
}

const TX_HASH =
  "aa11908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a";

describe.skipIf(!runDatabaseIntegration)(
  "one transaction settles one intent",
  () => {
    async function setup() {
      const db = await getDb();
      if (!db) throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const openIds = [`dup-a-${suffix}`, `dup-b-${suffix}`];
      await db.insert(users).values(
        openIds.map(openId => ({ openId, name: "Dup Tester", role: "user" as const }))
      );
      const [userA, userB] = await Promise.all(openIds.map(getUserByOpenId));
      if (!userA || !userB) throw new Error("user setup failed");

      const cleanup = async () => {
        for (const user of [userA, userB]) {
          await db.delete(paymentIntents).where(eq(paymentIntents.userId, user.id));
        }
        for (const openId of openIds) {
          await db.delete(users).where(eq(users.openId, openId));
        }
      };

      return { db, userA, userB, cleanup };
    }

    /** Chain response for a transfer bound to `intentId`. */
    function stubChain(intentId: string, valueLuna: number) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            result: {
              data: {
                hash: TX_HASH,
                blockNumber: 4_120_000,
                timestamp: Date.now(),
                confirmations: 30,
                from: "NQ11 SOME SEND ER00 0000 0000 0000 0000 0000",
                to: normalizeNimiqAddress(
                  process.env.NIMIQ_PAYMENT_RECIPIENT as string
                ),
                value: valueLuna,
                fee: 0,
                networkId: 5,
                executionResult: true,
                recipientData: Buffer.from(intentId, "utf8").toString("hex"),
              },
            },
          }),
        })
      );
    }

    it("refuses to verify a hash a second intent already settled", async () => {
      const { userA, userB, cleanup } = await setup();
      try {
        const first = await createPaymentIntent({
          userId: userA.id,
          clientNonce: `dup-nonce-first-01${Date.now()}`.slice(0, 40),
        });
        await updatePaymentIntent(first.id, userA.id, {
          status: "submitted",
          transactionHash: TX_HASH,
        });
        stubChain(first.id, first.valueLuna);
        const firstResult = await verifyPaymentIntent({
          id: first.id,
          userId: userA.id,
        });
        expect(firstResult.success).toBe(true);

        const second = await createPaymentIntent({
          userId: userB.id,
          clientNonce: `dup-nonce-second-1${Date.now()}`.slice(0, 40),
        });
        await updatePaymentIntent(second.id, userB.id, {
          status: "submitted",
          transactionHash: TX_HASH,
        });
        stubChain(second.id, second.valueLuna);
        const secondResult = await verifyPaymentIntent({
          id: second.id,
          userId: userB.id,
        });

        expect(secondResult.success).toBe(false);
        expect(secondResult.intent.status).toBe("duplicate");
      } finally {
        vi.unstubAllGlobals();
        await cleanup();
      }
    });

    it("lets the database refuse a second verified row for one hash", async () => {
      const { db, userA, userB, cleanup } = await setup();
      try {
        // Drive the invariant directly, bypassing every application check:
        // this is what a lost race would try to write.
        const first = await createPaymentIntent({
          userId: userA.id,
          clientNonce: `dup-raw-first-0001${Date.now()}`.slice(0, 40),
        });
        const second = await createPaymentIntent({
          userId: userB.id,
          clientNonce: `dup-raw-second-001${Date.now()}`.slice(0, 40),
        });

        await db
          .update(paymentIntents)
          .set({ status: "verified", transactionHash: TX_HASH })
          .where(eq(paymentIntents.id, first.id));

        await expect(
          db
            .update(paymentIntents)
            .set({ status: "verified", transactionHash: TX_HASH })
            .where(eq(paymentIntents.id, second.id))
        ).rejects.toThrow();

        // The loser stays unverified, so the pot can never count it.
        const rows = await db
          .select()
          .from(paymentIntents)
          .where(eq(paymentIntents.id, second.id));
        expect(rows[0].status).not.toBe("verified");
      } finally {
        await cleanup();
      }
    });

    it("still allows two unverified intents to hold the same hash", async () => {
      const { db, userA, userB, cleanup } = await setup();
      try {
        // Otherwise anyone could poison a payer's hash by submitting it first
        // on an intent of their own and blocking the real payer from
        // recording it.
        const first = await createPaymentIntent({
          userId: userA.id,
          clientNonce: `dup-un-first-00001${Date.now()}`.slice(0, 40),
        });
        const second = await createPaymentIntent({
          userId: userB.id,
          clientNonce: `dup-un-second-0001${Date.now()}`.slice(0, 40),
        });

        await updatePaymentIntent(first.id, userA.id, {
          status: "submitted",
          transactionHash: TX_HASH,
        });
        await updatePaymentIntent(second.id, userB.id, {
          status: "submitted",
          transactionHash: TX_HASH,
        });

        const rows = await db
          .select()
          .from(paymentIntents)
          .where(eq(paymentIntents.transactionHash, TX_HASH));
        expect(rows.length).toBe(2);
      } finally {
        await cleanup();
      }
    });
  }
);
