import { describe, expect, it } from "vitest";
import { reconnectDelayMs, shouldResync } from "./reconnect-policy";

describe("reconnect policy", () => {
  it("uses capped exponential backoff", () => {
    expect(reconnectDelayMs(0)).toBe(1_000);
    expect(reconnectDelayMs(1)).toBe(2_000);
    expect(reconnectDelayMs(5)).toBe(30_000);
    expect(reconnectDelayMs(12)).toBe(30_000);
  });

  it("accepts equal or newer state versions and rejects stale updates", () => {
    expect(shouldResync(4, 4)).toBe(true);
    expect(shouldResync(4, 5)).toBe(true);
    expect(shouldResync(4, 3)).toBe(false);
  });
});
