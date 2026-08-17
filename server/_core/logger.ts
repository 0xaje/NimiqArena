type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  category: "api" | "match" | "stream" | "payment" | "db" | "security";
  event: string;
  matchId?: string;
  userId?: number;
  paymentIntentId?: string;
  error?: string | Error;
  metadata?: Record<string, unknown>;
}

// Patterns for sensitive fields that must be scrubbed
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "token",
  "jwt",
  "secret",
  "privatekey",
  "password",
  "seed",
  "signature",
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 4) return "[DeepObject]";
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1));
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitize(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function writeLog(level: LogLevel, payload: LogPayload) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = payload.metadata ? sanitize(payload.metadata) : undefined;
  const errorMessage =
    payload.error instanceof Error
      ? payload.error.message
      : typeof payload.error === "string"
        ? payload.error
        : undefined;

  const logEntry = {
    timestamp,
    level,
    category: payload.category,
    event: payload.event,
    matchId: payload.matchId,
    userId: payload.userId,
    paymentIntentId: payload.paymentIntentId,
    error: errorMessage,
    meta: sanitizedMeta,
  };

  const output = `[${timestamp}] [${level.toUpperCase()}] [${payload.category.toUpperCase()}] ${payload.event} ${JSON.stringify(logEntry)}`;

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (payload: LogPayload) => writeLog("info", payload),
  warn: (payload: LogPayload) => writeLog("warn", payload),
  error: (payload: LogPayload) => writeLog("error", payload),

  apiError: (event: string, err: unknown, userId?: number) =>
    writeLog("error", {
      category: "api",
      event,
      userId,
      error: err instanceof Error ? err : String(err),
    }),

  matchEvent: (event: string, matchId: string, userId?: number, metadata?: Record<string, unknown>) =>
    writeLog("info", {
      category: "match",
      event,
      matchId,
      userId,
      metadata,
    }),

  matchError: (event: string, matchId: string, err: unknown, userId?: number) =>
    writeLog("warn", {
      category: "match",
      event,
      matchId,
      userId,
      error: err instanceof Error ? err : String(err),
    }),

  paymentAudit: (event: string, paymentIntentId: string, userId?: number, metadata?: Record<string, unknown>) =>
    writeLog("info", {
      category: "payment",
      event,
      paymentIntentId,
      userId,
      metadata,
    }),

  paymentError: (event: string, paymentIntentId: string, err: unknown, userId?: number) =>
    writeLog("error", {
      category: "payment",
      event,
      paymentIntentId,
      userId,
      error: err instanceof Error ? err : String(err),
    }),

  streamEvent: (event: string, matchId: string, userId?: number) =>
    writeLog("info", {
      category: "stream",
      event,
      matchId,
      userId,
    }),
};
