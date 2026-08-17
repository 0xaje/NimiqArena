import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitStore>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  ipStore.forEach((record, key) => {
    if (record.resetTime <= now) {
      ipStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier: forwarded IP, socket remoteAddress, or fallback
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    let record = ipStore.get(ip);

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + options.windowMs };
      ipStore.set(ip, record);
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
