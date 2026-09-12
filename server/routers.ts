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
  createHouseWageredMatch,
  checkUsernameAvailable,
  registerUserIdentity,
  claimWelcomeReward,
  getUserReferralStats,
  linkUserEvmAddress,
  addBotToWaitingMatch,
  executeBotTurn,
  findOrCreateQuickMatch,
  getActiveMatchesForDirectory,
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
  getUserByNimiqAddress,
  heartbeatMatchPlayer,
  disconnectMatchPlayer,
  getPaymentIntentForUser,
  getPaymentIntentWithAudit,
  joinMatchByCode,
  forceStartMatch,
  refreshMatchLifecycle,
  settleMatchWinnerPayout,
  updatePaymentIntent,
  upsertUser,
  verifyPaymentIntent,
} from "./db";
import { normalizeNimiqAddress } from "./nimiq-verifier";
import { DEFAULT_PAYOUT_CONFIG, broadcastOnChainTransfer } from "./payout-worker";
import { broadcastEmote, broadcastQuickChat } from "./match-stream";
import { nanoid } from "nanoid";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import {
  protectedProcedure,
  publicProcedure,
  rateLimit,
  router,
} from "./_core/trpc";
import { ENV } from "./_core/env";

/** Minting sessions: enough for normal play and player switching, not for bulk account creation. */
const guestLoginLimit = rateLimit({
  bucket: "auth.guestLogin",
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: "Too many sign-in attempts.",
});

/** Anything that creates or settles a payment. */
const paymentLimit = rateLimit({
  bucket: "payment",
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: "Too many payment requests.",
});

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
    dieValue: z.number().int().min(1).max(12).optional(),
  }),
]);

const connect4CommandSchema = z.object({
  column: z.number().int().min(0).max(6),
  expectedVersion: z.number().int().nonnegative(),
  nonce: clientNonceSchema,
});

/**
 * Every match read and write is scoped to its participants. Match ids are
 * guessable enough that an unguarded endpoint leaks stakes, opponent user ids
 * and payment state to anyone holding a session.
 */
async function requireMatchParticipant(matchId: string, userId: number) {
  const player = await getMatchPlayer(matchId, userId);
  if (!player) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a participant in this match.",
    });
  }
  return player;
}

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
      .use(guestLoginLimit)
      .input(
        z
          .object({
            name: z.string().min(1).max(64).optional(),
            newIdentity: z.boolean().optional(),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const name = input?.name?.trim() || "Player 1";
        // The openId is the session subject, so it is always minted here and
        // never accepted from the client: a caller-supplied value would let
        // anyone sign in as any account by naming its openId, and a name-derived
        // one is just as guessable. Callers who already hold a guest session
        // keep it, so choosing a display name renames that identity instead of
        // orphaning its rating and history. `newIdentity` opts out, for testing
        // two players from one browser.
        const existingGuest =
          ctx.user && ctx.user.loginMethod === "guest" && !input?.newIdentity
            ? ctx.user
            : null;
        const openId = existingGuest?.openId ?? `guest-${nanoid(24)}`;
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
    requestChallenge: publicProcedure.query(async () => {
      const nonce = nanoid(32);
      const timestamp = Date.now();
      const challenge = `Sign into Nimiq Arena\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
      return { challenge, nonce, timestamp };
    }),
    loginWithNimiq: publicProcedure
      .use(guestLoginLimit)
      .input(
        z.object({
          address: z.string().min(10).max(64),
          challenge: z.string().min(10).max(256),
          name: z.string().min(1).max(64).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const normalizedAddress = normalizeNimiqAddress(input.address);
        if (!/^NQ\d{2}[A-Z0-9]{32}$/.test(normalizedAddress)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Nimiq address format.",
          });
        }

        let user = await getUserByNimiqAddress(normalizedAddress);
        let openId: string;
        let displayName: string;

        if (user) {
          openId = user.openId;
          displayName =
            user.name ||
            input.name?.trim() ||
            `Nimiq (${normalizedAddress.slice(0, 4)}...${normalizedAddress.slice(-4)})`;
          await upsertUser({
            openId,
            name: displayName,
            address: normalizedAddress,
            loginMethod: "nimiq_hub",
            lastSignedIn: new Date(),
          });
        } else {
          const existingGuest =
            ctx.user && ctx.user.loginMethod === "guest" ? ctx.user : null;
          openId =
            existingGuest?.openId ??
            `nimiq-${normalizedAddress.slice(0, 12)}-${nanoid(12)}`;
          displayName =
            input.name?.trim() ||
            existingGuest?.name ||
            `Nimiq (${normalizedAddress.slice(0, 4)}...${normalizedAddress.slice(-4)})`;

          await upsertUser({
            openId,
            name: displayName,
            address: normalizedAddress,
            loginMethod: "nimiq_hub",
            lastSignedIn: new Date(),
          });
          user = await getUserByOpenId(openId);
        }

        const token = await sdk.createSessionToken(openId, { name: displayName });
        const cookieOpts = getSessionCookieOptions(ctx.req);
        if (typeof (ctx.res as any).cookie === "function") {
          (ctx.res as any).cookie(COOKIE_NAME, token, cookieOpts);
        } else {
          ctx.res.setHeader(
            "Set-Cookie",
            `${COOKIE_NAME}=${token}; ${cookieOpts}`
          );
        }

        const freshUser = await getUserByOpenId(openId);
        return { success: true, user: freshUser, token };
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
    checkUsername: publicProcedure
      .input(z.object({ username: z.string().min(2).max(32) }))
      .query(async ({ ctx, input }) => {
        const isAvailable = await checkUsernameAvailable(
          input.username,
          ctx.user?.id
        );
        return { username: input.username, isAvailable };
      }),
    registerIdentity: protectedProcedure
      .input(
        z.object({
          username: z.string().min(2).max(32),
          avatar: z.string().max(255).optional(),
          referralCode: z.string().max(32).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await registerUserIdentity({
          userId: ctx.user.id,
          name: input.username,
          avatar: input.avatar,
          referralCodeUsed: input.referralCode,
          address: ctx.user.address ?? undefined,
        });
        const token = await sdk.createSessionToken(ctx.user.openId, { name: input.username });
        const cookieOpts = getSessionCookieOptions(ctx.req);
        if (typeof (ctx.res as any).cookie === "function") {
          (ctx.res as any).cookie(COOKIE_NAME, token, cookieOpts);
        } else {
          ctx.res.setHeader(
            "Set-Cookie",
            `${COOKIE_NAME}=${token}; ${cookieOpts}`
          );
        }
        return { success: true, user: updated, token };
      }),
    claimWelcomeReward: protectedProcedure.mutation(async ({ ctx }) => {
      return await claimWelcomeReward(ctx.user.id);
    }),
    getReferralStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getUserReferralStats(ctx.user.id);
      return stats ?? {
        referralCode: `user${ctx.user.id}`,
        points: ctx.user.points ?? 1000,
        referralEarningsNim: 0,
        totalReferred: 0,
        referredUsers: [],
      };
    }),
    linkEvmAddress: protectedProcedure
      .input(
        z.object({
          evmAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await linkUserEvmAddress(ctx.user.id, input.evmAddress);
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
        await requireMatchParticipant(input.matchId, ctx.user.id);
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
    addBotToMatch: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          const match = await addBotToWaitingMatch(input.matchId, ctx.user.id);
          return {
            id: match.id,
            joinCode: match.joinCode,
            status: match.status,
          };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Failed to add bot to match.",
          });
        }
      }),
    triggerBotTurn: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        // executeBotTurn drives the match and ignores the userId it is
        // handed, so the caller must be sitting in it.
        await requireMatchParticipant(input.matchId, ctx.user.id);
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
      .use(paymentLimit)
      .input(
        z.object({
          gameSlug: z.string().min(1).max(64),
          stakeNim: z.number().int().min(1).max(10_000_000),
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
    createHouseWageredMatch: protectedProcedure
      .use(paymentLimit)
      .input(
        z.object({
          gameSlug: z.string().min(1).max(64),
          stakeNim: z.number().int().min(1).max(10_000_000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const res = await createHouseWageredMatch({
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
                : "Failed to create house-wagered match.",
          });
        }
      }),
    escrowDetails: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .query(async ({ ctx, input }) => {
        await requireMatchParticipant(input.matchId, ctx.user.id);
        try {
          const escrow = await getMatchEscrowDetails(input.matchId);
          return {
            ...escrow,
            // A transaction hash identifies a payer's on-chain account, so
            // each player only ever sees their own.
            playerStatuses: escrow.playerStatuses.map(player =>
              player.userId === ctx.user.id
                ? player
                : { ...player, txHash: null }
            ),
          };
        } catch (error: any) {
          console.error(
            `[Escrow] Failed to retrieve escrow details for match ${input.matchId}:`,
            error?.cause || error
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Payment setup failed. No transaction was submitted and your funds were not moved.",
          });
        }
      }),
    claimPayment: protectedProcedure
      .use(paymentLimit)
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
      .use(paymentLimit)
      .input(
        z.object({
          matchId: matchIdSchema,
          winnerUserId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireMatchParticipant(input.matchId, ctx.user.id);
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
        const player = await requireMatchParticipant(input.id, ctx.user.id);
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
    listActiveMatches: publicProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(50).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await getActiveMatchesForDirectory(input?.limit ?? 10);
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
        const players = await getMatchPlayers(input.id);
        const isWagered = Boolean(
          match.paymentIntentId || match.joinCode.startsWith("WAG")
        );
        let stakeNim: number | null = null;
        let escrowError: string | null = null;
        if (isWagered) {
          try {
            const escrow = await getMatchEscrowDetails(input.id);
            stakeNim = escrow.stakeNim;
          } catch (err: any) {
            console.error(
              `[MatchRouter] Failed to load escrow details for wagered match ${input.id}:`,
              err?.cause || err
            );
            escrowError =
              "Payment setup failed. No transaction was submitted and your funds were not moved.";
          }
        }
        return {
          id: match.id,
          joinCode: match.joinCode,
          status: match.status,
          engineVersion: match.engineVersion,
          stateVersion: match.stateVersion,
          isWagered,
          stakeNim,
          escrowError,
          snapshot: JSON.parse(match.stateJson),
          players: players.map(current => ({
            seat: current.seat,
            userId: current.userId,
            status: current.status,
            lastSeenAt: current.lastSeenAt,
            name: current.name,
            address: current.address,
          })),
          yourSeat: player ? player.seat : -1,
          isSpectator: !player,
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
    startMatch: protectedProcedure
      .input(z.object({ matchId: matchIdSchema }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await forceStartMatch({
            matchId: input.matchId,
            userId: ctx.user.id,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "Could not start match.",
          });
        }
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
        const seat = player?.seat ?? -1;
        const userName =
          ctx.user.name ??
          (seat >= 0 ? `Player ${seat + 1}` : "Spectator");

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
          userName,
          seat,
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
    diagnostic: publicProcedure.query(async () => {
      const recipient = ENV.nimiqPaymentRecipient;
      const clean = recipient ? recipient.replace(/\s+/g, "").toUpperCase() : "";
      const isPlaceholder = clean.includes("00000000000000000000000000000000") || /^NQ070+$/.test(clean);
      const isValid = Boolean(clean && !isPlaceholder && /^NQ\d{2}[0-9A-Z]{32}$/.test(clean));
      const masked = clean
        ? `${clean.slice(0, 4)} **** **** **** **** **** **** **** ${clean.slice(-4)}`
        : "NOT_CONFIGURED";

      return {
        network: ENV.nimiqNetworkName,
        networkId: ENV.nimiqNetworkId,
        isTestnet: ENV.isTestnet,
        rpcUrl: ENV.nimiqRpcUrl,
        recipientConfigured: Boolean(clean && clean.length > 0),
        recipientValid: isValid,
        recipientNormalizedMasked: masked,
        settlementConfigured: Boolean(ENV.nimiqSettlementAddress),
        automatedPayoutsEnabled: process.env.ENABLE_AUTOMATED_PAYOUTS === "true",
      };
    }),
    createIntent: protectedProcedure
      .use(paymentLimit)
      .input(
        z.object({
          clientNonce: clientNonceSchema,
          // Prices the intent for a seat in this match rather than at the
          // flat entry fee.
          matchId: matchIdSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const intent = await createPaymentIntent({
          userId: ctx.user.id,
          clientNonce: input.clientNonce,
          matchId: input.matchId,
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
      .use(paymentLimit)
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
      .use(paymentLimit)
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
      .use(paymentLimit)
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
      .use(paymentLimit)
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
      .use(paymentLimit)
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
    requestTestnetDrip: protectedProcedure
      .use(paymentLimit)
      .input(z.object({ address: z.string().min(1) }))
      .mutation(async ({ input }) => {
        if (!ENV.isTestnet || ENV.nimiqNetworkId !== 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The automated faucet drip is strictly available on Nimiq Testnet.",
          });
        }
        const cleanAddress = normalizeNimiqAddress(input.address);
        if (!/^NQ\d{2}[0-9A-Z]{32}$/.test(cleanAddress)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Nimiq address format.",
          });
        }

        const privateKey = DEFAULT_PAYOUT_CONFIG.privateKey;
        const fallbackUrl = "https://testnet.nimiq.watch/#faucet";

        if (!privateKey) {
          return {
            success: false as const,
            message: "Direct hot-wallet drip is on standby. Use the official testnet faucet.",
            fallbackUrl,
          };
        }

        try {
          const dripAmountNim = 50;
          const dripAmountLuna = BigInt(dripAmountNim * 100_000);
          const txHash = await broadcastOnChainTransfer({
            privateKeyHex: privateKey,
            recipientAddress: cleanAddress,
            amountLuna: dripAmountLuna,
            rpcUrl: DEFAULT_PAYOUT_CONFIG.rpcUrl,
            networkId: ENV.nimiqNetworkId,
          });

          return {
            success: true as const,
            amountNim: dripAmountNim,
            txHash,
            explorerUrl: `https://testnet.nimiqwatch.com/#${txHash}`,
            message: `Successfully transferred ${dripAmountNim} Testnet NIM directly to your wallet!`,
            fallbackUrl,
          };
        } catch (err: any) {
          console.warn("[requestTestnetDrip] Failed to disburse hot-wallet drip:", err);
          return {
            success: false as const,
            message: "Hot wallet testnet drip temporarily queued. Please use the official faucet link.",
            fallbackUrl,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
