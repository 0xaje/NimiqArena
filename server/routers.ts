import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  applyConnect4MatchCommand,
  applyLudoMatchCommand,
  cancelWaitingMatch,
  claimVerifiedPaymentForMatch,
  createChallengeMatch,
  createPaymentIntent,
  createSoloPracticeMatch,
  createWageredChallengeMatch,
  executeBotTurn,
  findOrCreateQuickMatch,
  getActiveSeason,
  getGameBySlug,
  getLeaderboardTop,
  getMatchById,
  getMatchEscrowDetails,
  getMatchPlayer,
  getMatchPlayers,
  getMatchQueueStatus,
  getPlayerStats,
  getUserByOpenId,
  heartbeatMatchPlayer,
  disconnectMatchPlayer,
  getPaymentIntentForUser,
  getPaymentIntentWithAudit,
  joinMatchByCode,
  refreshMatchLifecycle,
  settleMatchWinnerPayout,
  updatePaymentIntent,
  upsertUser,
  verifyPaymentIntent,
} from "./db";
import { broadcastEmote, broadcastQuickChat } from "./match-stream";
import { nanoid } from "nanoid";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
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
    pieceIndex: z.number().int().min(0).max(7),
  }),
]);

const connect4CommandSchema = z.object({
  column: z.number().int().min(0).max(6),
  expectedVersion: z.number().int().nonnegative(),
  nonce: clientNonceSchema,
});

async function requireIntent(id: string, userId: number) {
  const intent = await getPaymentIntentForUser(id, userId);
  if (!intent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Payment intent was not found.",
    });
  }
  return intent;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    guestLogin: publicProcedure
      .input(
        z
          .object({
            name: z.string().min(1).max(64).optional(),
            openId: z.string().min(1).max(64).optional(),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const name = input?.name?.trim() || "Player 1";
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const openId = input?.openId || `guest-${slug}`;
        await upsertUser({
          openId,
          name,
          loginMethod: "guest",
          lastSignedIn: new Date(),
        });
        const user = await getUserByOpenId(openId);
        if (!user)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "User creation failed.",
          });

        const token = await sdk.createSessionToken(openId, { name });
        const cookieOpts = getSessionCookieOptions(ctx.req);
        if (typeof (ctx.res as any).cookie === "function") {
          (ctx.res as any).cookie(COOKIE_NAME, token, cookieOpts);
        } else {
          ctx.res.setHeader(
            "Set-Cookie",
            `${COOKIE_NAME}=${token}; ${cookieOpts}`
          );
        }
        return { success: true, user, token };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOpts = getSessionCookieOptions(ctx.req);
      if (typeof (ctx.res as any).clearCookie === "function") {
        (ctx.res as any).clearCookie(COOKIE_NAME, {
          ...cookieOpts,
          maxAge: -1,
        });
      } else {
        ctx.res.setHeader(
          "Set-Cookie",
          `${COOKIE_NAME}=; Max-Age=0; ${cookieOpts}`
        );
      }
      return { success: true };
    }),
    stats: protectedProcedure
      .input(
        z
          .object({
            gameSlug: z.string().min(1).max(64).optional(),
            seasonId: z.string().min(1).max(32).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await getPlayerStats({
          userId: ctx.user.id,
          gameSlug: input?.gameSlug,
          seasonId: input?.seasonId,
        });
      }),
  }),
  season: router({
    getActive: publicProcedure.query(async () => {
      const season = await getActiveSeason();
      if (!season)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active season found.",
        });
      return season;
    }),
  }),
  leaderboard: router({
    getTop: publicProcedure
      .input(
        z
          .object({
            gameSlug: z.string().min(1).max(64).optional(),
            seasonId: z.string().min(1).max(32).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getLeaderboardTop({
          gameSlug: input?.gameSlug,
          seasonId: input?.seasonId,
          limit: input?.limit,
        });
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
    findOrCreateQuickMatch: protectedProcedure
      .input(z.object({ gameSlug: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await findOrCreateQuickMatch({
            userId: ctx.user.id,
            gameSlug: input.gameSlug,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to queue for quick match.",
          });
        }
      }),
    cancelWaitingMatch: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        const res = await cancelWaitingMatch({
          userId: ctx.user.id,
          matchId: input.matchId,
        });
        if (!res.ok) {
          throw new TRPCError({
            code: "CONFLICT",
            message: res.reason || "Could not cancel match search.",
          });
        }
        return { success: true };
      }),
    queueStatus: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .query(async ({ ctx, input }) => {
        try {
          return await getMatchQueueStatus({
            userId: ctx.user.id,
            matchId: input.matchId,
          });
        } catch (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              error instanceof Error
                ? error.message
                : "Match was not found.",
          });
        }
      }),
    createSoloMatch: protectedProcedure
      .input(z.object({ gameSlug: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const match = await createSoloPracticeMatch({
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
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to create practice match.",
          });
        }
      }),
    triggerBotTurn: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await executeBotTurn({
            matchId: input.matchId,
            userId: ctx.user.id,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to execute bot turn.",
          });
        }
      }),
    createWageredMatch: protectedProcedure
      .input(
        z.object({
          gameSlug: z.string().min(1).max(64),
          stakeNim: z.number().int().min(1).max(10000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const res = await createWageredChallengeMatch({
            userId: ctx.user.id,
            gameSlug: input.gameSlug,
            stakeNim: input.stakeNim,
          });
          return {
            id: res.match.id,
            joinCode: res.match.joinCode,
            status: res.match.status,
            hostPaymentIntentId: res.hostPaymentIntentId,
            stakeNim: res.stakeNim,
            valueLuna: res.valueLuna,
            expiresAt: res.match.expiresAt,
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to create wagered match.",
          });
        }
      }),
    escrowDetails: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .query(async ({ input }) => {
        try {
          return await getMatchEscrowDetails(input.matchId);
        } catch (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              error instanceof Error
                ? error.message
                : "Escrow details not found.",
          });
        }
      }),
    claimPayment: protectedProcedure
      .input(
        z.object({
          matchId: matchIdSchema,
          paymentIntentId: z.string().min(1).max(32),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await claimVerifiedPaymentForMatch({
            matchId: input.matchId,
            userId: ctx.user.id,
            paymentIntentId: input.paymentIntentId,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to claim payment for match.",
          });
        }
      }),
    settlePayout: protectedProcedure
      .input(
        z.object({
          matchId: matchIdSchema,
          winnerUserId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await settleMatchWinnerPayout({
            matchId: input.matchId,
            winnerUserId: input.winnerUserId,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to settle payout.",
          });
        }
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
        const match = await refreshMatchLifecycle(input.id);
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
          engineVersion: match.engineVersion,
          stateVersion: match.stateVersion,
          snapshot: JSON.parse(match.stateJson),
          players: players.map(current => ({
            seat: current.seat,
            status: current.status,
            lastSeenAt: current.lastSeenAt,
          })),
          yourSeat: player.seat,
          expiresAt: match.expiresAt,
        };
      }),
    heartbeat: protectedProcedure
      .input(z.object({ id: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          await refreshMatchLifecycle(input.id);
          return await heartbeatMatchPlayer(input.id, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              error instanceof Error ? error.message : "Heartbeat rejected.",
          });
        }
      }),
    disconnect: protectedProcedure
      .input(z.object({ id: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        await disconnectMatchPlayer(input.id, ctx.user.id);
        return { ok: true as const };
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
    connect4Command: protectedProcedure
      .input(z.object({ id: matchIdSchema, command: connect4CommandSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await applyConnect4MatchCommand({
            matchId: input.id,
            userId: ctx.user.id,
            command: input.command,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Connect 4 command was rejected.";
          const code = /stale|changed|duplicate/i.test(message)
            ? "CONFLICT"
            : /not found|participant|joined player/i.test(message)
              ? "FORBIDDEN"
              : "BAD_REQUEST";
          throw new TRPCError({ code, message });
        }
      }),
    sendEmote: protectedProcedure
      .input(
        z.object({
          matchId: matchIdSchema,
          emote: z.enum([
            "bullseye",
            "rocket",
            "diamond",
            "shock",
            "gg",
            "crown",
            "fire",
            "skull",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const player = await getMatchPlayer(input.matchId, ctx.user.id);
        if (!player || player.status !== "joined") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not an active player in this match.",
          });
        }
        const emojiMap: Record<string, string> = {
          bullseye: "🎯",
          rocket: "🚀",
          diamond: "💎",
          shock: "😱",
          gg: "👏",
          crown: "👑",
          fire: "🔥",
          skull: "💀",
        };
        const emoji = emojiMap[input.emote] ?? "✨";
        broadcastEmote(input.matchId, {
          id: nanoid(12),
          userId: ctx.user.id,
          userName: ctx.user.name ?? `Player ${player.seat + 1}`,
          seat: player.seat,
          emote: input.emote,
          emoji,
          timestamp: Date.now(),
        });
        return { ok: true as const };
      }),
    sendQuickChat: protectedProcedure
      .input(
        z.object({
          matchId: matchIdSchema,
          message: z.string().trim().min(1).max(64),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const player = await getMatchPlayer(input.matchId, ctx.user.id);
        if (!player || player.status !== "joined") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not an active player in this match.",
          });
        }
        broadcastQuickChat(input.matchId, {
          id: nanoid(12),
          userId: ctx.user.id,
          userName: ctx.user.name ?? `Player ${player.seat + 1}`,
          seat: player.seat,
          message: input.message,
          timestamp: Date.now(),
        });
        return { ok: true as const };
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
        const result = await getPaymentIntentWithAudit(input.id, ctx.user.id);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment intent was not found.",
          });
        }
        return result;
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
        if (!["created", "confirmation_pending", "submitted"].includes(intent.status)) {
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
    verify: protectedProcedure
      .input(z.object({ id: intentIdSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await verifyPaymentIntent({
            id: input.id,
            userId: ctx.user.id,
          });
          return result;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Payment verification failed.",
          });
        }
      }),
    claimForMatch: protectedProcedure
      .input(
        z.object({
          matchId: matchIdSchema,
          paymentIntentId: intentIdSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await claimVerifiedPaymentForMatch({
            matchId: input.matchId,
            userId: ctx.user.id,
            paymentIntentId: input.paymentIntentId,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Could not claim payment for match entry.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
