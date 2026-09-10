/**
 * Performance Timing Telemetry for Nimiq Arena
 * Measures hot-path latency across client -> server -> DB -> SSE -> client.
 * Safe for production: never logs secrets, tokens, or PII.
 */

export interface ActionTelemetryTiming {
  actionId: string;
  kind: "roll" | "move" | "connect4_drop";
  clientInputTs?: number;
  requestSentTs?: number;
  serverReceivedTs?: number;
  dbReadMs?: number;
  engineMs?: number;
  dbWriteMs?: number;
  serverTotalMs?: number;
  responseSentTs?: number;
  clientReceivedTs?: number;
  sseEventReceivedTs?: number;
  totalRoundTripMs?: number;
}

export interface TelemetrySummary {
  actionCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgDbReadMs: number;
  avgDbWriteMs: number;
  avgEngineMs: number;
  avgServerTotalMs: number;
}

export function calculateSummary(timings: number[]): { p50: number; p95: number; max: number } {
  if (timings.length === 0) return { p50: 0, p95: 0, max: 0 };
  const sorted = [...timings].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
  const max = sorted[sorted.length - 1];
  return { p50, p95, max };
}
