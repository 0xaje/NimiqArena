import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { consumeRateLimit, getClientKey } from "./rateLimiter";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Per-caller limit for a single procedure.
 *
 * The HTTP limiter sees only `/api/trpc`, so a caller within their overall
 * budget can still spend all of it minting sessions or payment intents. Keyed
 * on the user when there is one, and on the client address otherwise, so an
 * anonymous caller cannot escape the limit by not logging in.
 */
export function rateLimit(options: {
  bucket: string;
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  return t.middleware(async ({ ctx, next }) => {
    const identity = ctx.user
      ? `user:${ctx.user.id}`
      : `ip:${getClientKey(ctx.req)}`;

    const { allowed, retryAfterMs } = consumeRateLimit({
      bucket: options.bucket,
      identity,
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
    });

    if (!allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `${options.message} Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
      });
    }

    return next();
  });
}

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
