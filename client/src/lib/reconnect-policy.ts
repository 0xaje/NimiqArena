export const MAX_RECONNECT_DELAY_MS = 30_000;

export function reconnectDelayMs(attempt: number, baseDelayMs = 1_000) {
  const exponent = Math.min(Math.max(attempt, 0), 5);
  return Math.min(MAX_RECONNECT_DELAY_MS, baseDelayMs * 2 ** exponent);
}

export function shouldResync(
  lastStateVersion: number,
  incomingStateVersion: number
) {
  return incomingStateVersion >= lastStateVersion;
}
