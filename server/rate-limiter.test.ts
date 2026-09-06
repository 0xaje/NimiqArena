import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import {
  consumeRateLimit,
  createRateLimiter,
  getClientKey,
  rateLimiterSize,
  resetRateLimiterState,
} from "./_core/rateLimiter";

/**
 * Express computes `req.ip` from the `trust proxy` setting; these fakes stand
 * in for the two deployments that matter.
 */
function requestFrom(options: {
  socketAddress: string;
  forwardedFor?: string;
  trustProxy: boolean;
}): Request {
  const forwarded = options.forwardedFor;
  return {
    // With trust proxy off Express ignores the header entirely.
    ip:
      options.trustProxy && forwarded
        ? forwarded.split(",")[0].trim()
        : options.socketAddress,
    headers: forwarded ? { "x-forwarded-for": forwarded } : {},
    socket: { remoteAddress: options.socketAddress },
  } as unknown as Request;
}

function responseSpy() {
  const res = {
    statusCode: 0,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number };
}

describe("client identity", () => {
  beforeEach(() => resetRateLimiterState());

  it("ignores a forged X-Forwarded-For when the app trusts no proxy", () => {
    const req = requestFrom({
      socketAddress: "203.0.113.9",
      forwardedFor: "1.2.3.4",
      trustProxy: false,
    });
    expect(getClientKey(req)).toBe("203.0.113.9");
  });

  it("uses the forwarded client when the app is configured behind a proxy", () => {
    const req = requestFrom({
      socketAddress: "10.0.0.1",
      forwardedFor: "198.51.100.7",
      trustProxy: true,
    });
    expect(getClientKey(req)).toBe("198.51.100.7");
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimiterState());

  it("cannot be escaped by rotating the forwarded header", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });
    let allowed = 0;

    for (let i = 0; i < 10; i++) {
      const req = requestFrom({
        socketAddress: "203.0.113.9",
        forwardedFor: `9.9.9.${i}`,
        trustProxy: false,
      });
      const next = vi.fn();
      limiter(req, responseSpy(), next);
      if (next.mock.calls.length) allowed++;
    }

    expect(allowed).toBe(3);
    // One caller, one bucket, however many identities they claimed.
    expect(rateLimiterSize()).toBe(1);
  });

  it("limits each client separately and answers 429 with Retry-After", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const first = requestFrom({ socketAddress: "203.0.113.1", trustProxy: false });
    const second = requestFrom({ socketAddress: "203.0.113.2", trustProxy: false });

    const firstNext = vi.fn();
    limiter(first, responseSpy(), firstNext);
    expect(firstNext).toHaveBeenCalled();

    const blockedRes = responseSpy();
    const blockedNext = vi.fn();
    limiter(first, blockedRes, blockedNext);
    expect(blockedNext).not.toHaveBeenCalled();
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(Number)
    );

    const secondNext = vi.fn();
    limiter(second, responseSpy(), secondNext);
    expect(secondNext).toHaveBeenCalled();
  });

  it("keeps per-procedure buckets independent", () => {
    const spend = (bucket: string) =>
      consumeRateLimit({
        bucket,
        identity: "user:1",
        windowMs: 60_000,
        maxRequests: 2,
      }).allowed;

    expect(spend("payment")).toBe(true);
    expect(spend("payment")).toBe(true);
    expect(spend("payment")).toBe(false);
    // A spent payment budget does not lock the caller out of signing in.
    expect(spend("auth.guestLogin")).toBe(true);
  });

  it("reports how long a blocked caller must wait", () => {
    const spend = () =>
      consumeRateLimit({
        bucket: "payment",
        identity: "user:2",
        windowMs: 60_000,
        maxRequests: 1,
      });

    expect(spend().allowed).toBe(true);
    const blocked = spend();
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
  });
});
