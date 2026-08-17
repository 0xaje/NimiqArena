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
});
