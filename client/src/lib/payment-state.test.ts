import { describe, expect, it } from "vitest";
import { canRetryPayment, createPaymentNonce } from "./payment-state";

describe("payment retry state", () => {
  it("allows a fresh attempt after rejection or failure", () => {
    expect(canRetryPayment("idle")).toBe(true);
    expect(canRetryPayment("rejected")).toBe(true);
    expect(canRetryPayment("failed")).toBe(true);
    expect(canRetryPayment("expired")).toBe(true);
    expect(canRetryPayment("confirming")).toBe(false);
    expect(canRetryPayment("submitted")).toBe(false);
  });

  it("creates a nonce accepted by the payment API", () => {
    const nonce = createPaymentNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
  });
});
