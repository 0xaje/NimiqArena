import { describe, expect, it } from "vitest";
import { canRequestAccounts, featureLabel, formatAddress } from "./arena-state";

describe("Arena state helpers", () => {
  it("formats long Nimiq addresses without changing short values", () => {
    expect(formatAddress("NQ12345678901234567890")).toBe("NQ12345…67890");
    expect(formatAddress("NQ123")).toBe("NQ123");
  });

  it("only allows account requests when the official provider is ready", () => {
    expect(canRequestAccounts(true)).toBe(true);
    expect(canRequestAccounts(false)).toBe(false);
  });

  it("keeps feature state labels explicit", () => {
    expect(featureLabel("live")).toBe("LIVE");
    expect(featureLabel("not-live")).toBe("NOT LIVE");
    expect(featureLabel("not-implemented")).toBe("NOT IMPLEMENTED");
  });
});
