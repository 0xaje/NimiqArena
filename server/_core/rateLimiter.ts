import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

/**
 * Ceiling on tracked keys. The store is in-memory and keyed by client, so
 * without a bound a caller that varies its identity every request grows the
 * process heap until it falls over.
 */
const MAX_TRACKED_KEYS = 20_000;

const ipStore = new Map<string, RateLimitStore>();

/** Drops expired entries, then the oldest ones if still over the ceiling. */
function pruneStore(now: number) {
  ipStore.forEach((record, key) => {
    if (record.resetTime <= now) {
      ipStore.delete(key);
    }
  });
  if (ipStore.size <= MAX_TRACKED_KEYS) return;

  const overflow = ipStore.size - MAX_TRACKED_KEYS;
  const oldestFirst = Array.from(ipStore.entries()).sort(
    (a, b) => a[1].resetTime - b[1].resetTime
  );
  for (let i = 0; i < overflow; i++) {
    ipStore.delete(oldestFirst[i][0]);
  }
}

// Cleanup stale entries every 5 minutes
setInterval(() => pruneStore(Date.now()), 5 * 60 * 1000);

/**
 * Identifies the client for rate limiting.
 *
 * `req.ip` respects Express's `trust proxy` setting, so a forwarded address is
 * only believed when the deployment has declared it sits behind a proxy.
 * Reading X-Forwarded-For unconditionally let a caller rotate the header to
 * get an unlimited number of fresh buckets.
 */
export function getClientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown-ip";
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientKey(req);
    const now = Date.now();
    let record = ipStore.get(key);

    if (!record || record.resetTime <= now) {
      if (ipStore.size >= MAX_TRACKED_KEYS) pruneStore(now);
      record = { count: 1, resetTime: now + options.windowMs };
      ipStore.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > options.maxRequests) {
      res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        error: options.message || "Too many requests. Please slow down.",
        retryAfterMs: record.resetTime - now,
      });
    }

    return next();
  };
}

/**
 * Counts one hit against a named bucket and reports whether it is allowed.
 *
 * The HTTP limiter above can only see the tRPC endpoint as a whole, so this
 * backs a per-procedure limit for the few operations worth guarding tightly:
 * minting sessions and moving money.
 */
export function consumeRateLimit(options: {
  bucket: string;
  identity: string;
  windowMs: number;
  maxRequests: number;
}): { allowed: boolean; retryAfterMs: number } {
  const key = `${options.bucket}:${options.identity}`;
  const now = Date.now();
  const record = ipStore.get(key);

  if (!record || record.resetTime <= now) {
    if (ipStore.size >= MAX_TRACKED_KEYS) pruneStore(now);
    ipStore.set(key, { count: 1, resetTime: now + options.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  record.count += 1;
  if (record.count > options.maxRequests) {
    return { allowed: false, retryAfterMs: record.resetTime - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

/** Test seam: clears all tracked clients. */
export function resetRateLimiterState() {
  ipStore.clear();
}

/** Test seam: number of tracked clients. */
export function rateLimiterSize() {
  return ipStore.size;
}

// Global API rate limiter: 120 requests per minute
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: "API rate limit exceeded. Please wait a minute.",
});

// Stricter Match Command & Payment rate limiter: 60 requests per minute
export const commandRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Match command rate limit exceeded. Please slow down.",
});
