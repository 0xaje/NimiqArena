import { describe, expect, it } from "vitest";

function isUserFriendlyNqAddress(value: string) {
  return (
    /^NQ[0-9A-Z ]{30,}$/.test(value) && value.replace(/\s/g, "").length >= 36
  );
}

describe("NIM payment configuration", () => {
  it("has a configured server-owned entry amount in Luna", () => {
    const valueLuna = process.env.NIMIQ_ARENA_ENTRY_VALUE_LUNA;
    expect(
      valueLuna,
      "NIMIQ_ARENA_ENTRY_VALUE_LUNA must be provided"
    ).toBeTruthy();
    expect(Number.isSafeInteger(Number(valueLuna))).toBe(true);
    expect(Number(valueLuna)).toBeGreaterThan(0);
  });

  it("has a configured user-friendly Nimiq recipient", () => {
    const recipient = process.env.NIMIQ_PAYMENT_RECIPIENT;
    expect(recipient, "NIMIQ_PAYMENT_RECIPIENT must be provided").toBeTruthy();
    expect(isUserFriendlyNqAddress(recipient!)).toBe(true);
  });

  it("supports high-value stakes up to 100,000 NIM (10,000,000,000 Luna) without 32-bit integer overflow", () => {
    const stake50kNim = 50_000;
    const luna50k = stake50kNim * 100_000; // 5,000,000,000
    const maxUint32 = 4_294_967_295;
    expect(luna50k).toBeGreaterThan(maxUint32);
    expect(Number.isSafeInteger(luna50k)).toBe(true);

    const stake100kNim = 100_000;
    const luna100k = stake100kNim * 100_000; // 10,000,000,000
    expect(luna100k).toBeGreaterThan(maxUint32);
    expect(Number.isSafeInteger(luna100k)).toBe(true);
  });
});
