import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  applyLudoMatchCommand,
  createChallengeMatch,
  createPaymentIntent,
  getGameBySlug,
  getMatchById,
  getMatchPlayer,
  getMatchPlayers,
  getPaymentIntentForUser,
  joinMatchByCode,
  updatePaymentIntent,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const clientNonceSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid payment idempotency nonce.");
const intentIdSchema = z.string().min(16).max(32);
const transactionHashSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{32,128}$/, "Invalid transaction hash.");
const matchIdSchema = z.string().min(16).max(32);
const challengeCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{6,12}$/, "Invalid challenge code.");
const ludoCommandSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("roll"),
    expectedVersion: z.number().int().nonnegative(),
    nonce: clientNonceSchema,
  }),
  z.object({
    kind: z.literal("move"),
    expectedVersion: z.number().int().nonnegative(),
    nonce: clientNonceSchema,
    pieceIndex: z.number().int().min(0).max(3),
  }),
]);

async function requireIntent(id: string, userId: number) {
  const intent = await getPaymentIntentForUser(id, userId);
  if (!intent)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Payment intent not found.",
    });
  if (
    intent.expiresAt.getTime() <= Date.now() &&
    !["verified", "submitted"].includes(intent.status)
  ) {
    if (intent.status !== "expired")
      await updatePaymentIntent(id, userId, {
        status: "expired",
        failureCode: "expired",
      });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Payment intent has expired.",
    });
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
  game: router({
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        const game = await getGameBySlug(input.slug);
        if (!game)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Game not found.",
          });
        return game;
      }),
  }),
  match: router({
    createChallenge: protectedProcedure
      .input(z.object({ gameSlug: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const match = await createChallengeMatch({
          userId: ctx.user.id,
          gameSlug: input.gameSlug,
        });
        return {
          id: match.id,
          joinCode: match.joinCode,
          status: match.status,
          visibility: match.visibility,
          engineVersion: match.engineVersion,
          expiresAt: match.expiresAt,
        };
      }),
    joinByCode: protectedProcedure
      .input(z.object({ joinCode: challengeCodeSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          const joined = await joinMatchByCode({
            userId: ctx.user.id,
            joinCode: input.joinCode,
          });
          return {
            id: joined.match.id,
            joinCode: joined.match.joinCode,
            status: joined.match.status,
            seat: joined.player.seat,
            engineVersion: joined.match.engineVersion,
            expiresAt: joined.match.expiresAt,
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Match could not be joined.",
          });
        }
      }),
    getById: protectedProcedure
      .input(z.object({ id: matchIdSchema }))
      .query(async ({ ctx, input }) => {
        const match = await getMatchById(input.id);
        if (!match)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        const player = await getMatchPlayer(input.id, ctx.user.id);
        if (!player)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a participant in this match.",
          });
        return {
          id: match.id,
          joinCode: match.joinCode,
          status: match.status,
          visibility: match.visibility,
          engineVersion: match.engineVersion,
          stateVersion: match.stateVersion,
          seat: player.seat,
          expiresAt: match.expiresAt,
        };
      }),
    state: protectedProcedure
      .input(z.object({ id: matchIdSchema }))
      .query(async ({ ctx, input }) => {
        const match = await getMatchById(input.id);
        if (!match)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        const player = await getMatchPlayer(input.id, ctx.user.id);
        if (!player)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a participant in this match.",
          });
        const players = await getMatchPlayers(input.id);
        return {
          id: match.id,
          joinCode: match.joinCode,
          status: match.status,
          stateVersion: match.stateVersion,
          snapshot: JSON.parse(match.stateJson),
          players: players.map(current => ({
            seat: current.seat,
            status: current.status,
          })),
          yourSeat: player.seat,
          expiresAt: match.expiresAt,
        };
      }),
    command: protectedProcedure
      .input(z.object({ id: matchIdSchema, command: ludoCommandSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await applyLudoMatchCommand({
            matchId: input.id,
            userId: ctx.user.id,
            command: input.command,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Match command was rejected.";
          const code = /stale|changed|duplicate/i.test(message)
            ? "CONFLICT"
            : /not found|participant|joined player/i.test(message)
              ? "FORBIDDEN"
              : "BAD_REQUEST";
          throw new TRPCError({ code, message });
        }
      }),
  }),
  payment: router({
    createIntent: protectedProcedure
      .input(z.object({ clientNonce: clientNonceSchema }))
      .mutation(async ({ ctx, input }) => {
        const intent = await createPaymentIntent({
          userId: ctx.user.id,
          clientNonce: input.clientNonce,
        });
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
          throw new TRPCError({
            code: "CONFLICT",
            message: `Intent cannot be confirmed from ${intent.status}.`,
          });
        }
        const updated = await updatePaymentIntent(input.id, ctx.user.id, {
          status: "confirmation_pending",
        });
        return { id: updated?.id, status: updated?.status };
      }),
    failIntent: protectedProcedure
      .input(
        z.object({
          id: intentIdSchema,
          code: z.enum([
            "permission_denied",
            "invalid_transaction",
            "provider_error",
            "unknown",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        if (!["created", "confirmation_pending"].includes(intent.status)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Intent cannot fail from ${intent.status}.`,
          });
        }
        const updated = await updatePaymentIntent(input.id, ctx.user.id, {
          status: input.code === "permission_denied" ? "rejected" : "failed",
          failureCode: input.code,
        });
        return {
          id: updated?.id,
          status: updated?.status,
          failureCode: updated?.failureCode,
        };
      }),
    submitTransaction: protectedProcedure
      .input(
        z.object({ id: intentIdSchema, transactionHash: transactionHashSchema })
      )
      .mutation(async ({ ctx, input }) => {
        const intent = await requireIntent(input.id, ctx.user.id);
        if (!["created", "confirmation_pending"].includes(intent.status)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Intent cannot accept a hash from ${intent.status}.`,
          });
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
          message:
            "Transaction submitted; settlement is pending server-side verification.",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
