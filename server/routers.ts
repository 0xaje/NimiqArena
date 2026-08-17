import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPaymentIntent, getPaymentIntentForUser, updatePaymentIntent } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const clientNonceSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid payment idempotency nonce.");
const intentIdSchema = z.string().min(16).max(32);
const transactionHashSchema = z.string().regex(/^[0-9a-fA-F]{32,128}$/, "Invalid transaction hash.");

async function requireIntent(id: string, userId: number) {
  const intent = await getPaymentIntentForUser(id, userId);
  if (!intent) throw new TRPCError({ code: "NOT_FOUND", message: "Payment intent not found." });
  if (intent.expiresAt.getTime() <= Date.now() && !["verified", "submitted"].includes(intent.status)) {
    if (intent.status !== "expired") await updatePaymentIntent(id, userId, { status: "expired", failureCode: "expired" });
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment intent has expired." });
  }
  return intent;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  payment: router({
    createIntent: protectedProcedure
      .input(z.object({ clientNonce: clientNonceSchema }))
      .mutation(async ({ ctx, input }) => {
        const intent = await createPaymentIntent({ userId: ctx.user.id, clientNonce: input.clientNonce });
        return {
          id: intent.id,
          recipient: intent.recipient,
          valueLuna: intent.valueLuna,
          status: intent.status,
          expiresAt: intent.expiresAt,
        };
      }),
    getIntent: protectedProcedure
      .input(z.object({ id: intentIdSchema }))
      .query(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        return {
          id: intent.id,
          recipient: intent.recipient,
          valueLuna: intent.valueLuna,
          status: intent.status,
          transactionHash: intent.transactionHash,
          failureCode: intent.failureCode,
          expiresAt: intent.expiresAt,
        };
      }),
    markConfirmationPending: protectedProcedure
      .input(z.object({ id: intentIdSchema }))
      .mutation(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        if (!["created", "confirmation_pending"].includes(intent.status)) {
          throw new TRPCError({ code: "CONFLICT", message: `Intent cannot be confirmed from ${intent.status}.` });
        }
        const updated = await updatePaymentIntent(input.id, ctx.user.id, { status: "confirmation_pending" });
        return { id: updated?.id, status: updated?.status };
      }),
    failIntent: protectedProcedure
      .input(z.object({ id: intentIdSchema, code: z.enum(["permission_denied", "invalid_transaction", "provider_error", "unknown"]) }))
      .mutation(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        if (!["created", "confirmation_pending"].includes(intent.status)) {
          throw new TRPCError({ code: "CONFLICT", message: `Intent cannot fail from ${intent.status}.` });
        }
        const updated = await updatePaymentIntent(input.id, ctx.user.id, {
          status: input.code === "permission_denied" ? "rejected" : "failed",
          failureCode: input.code,
        });
        return { id: updated?.id, status: updated?.status, failureCode: updated?.failureCode };
      }),
    submitTransaction: protectedProcedure
      .input(z.object({ id: intentIdSchema, transactionHash: transactionHashSchema }))
      .mutation(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        if (!["created", "confirmation_pending"].includes(intent.status)) {
          throw new TRPCError({ code: "CONFLICT", message: `Intent cannot accept a hash from ${intent.status}.` });
        }
        const updated = await updatePaymentIntent(input.id, ctx.user.id, {
          status: "submitted",
          transactionHash: input.transactionHash,
          failureCode: null,
        });
        return {
          id: updated?.id,
          status: updated?.status,
          transactionHash: updated?.transactionHash,
          message: "Transaction submitted; settlement is pending server-side verification.",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
