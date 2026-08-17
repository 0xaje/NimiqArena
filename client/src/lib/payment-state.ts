export type PaymentPhase =
  | "idle"
  | "creating"
  | "confirming"
  | "submitted"
  | "verifying"
  | "verified"
  | "rejected"
  | "failed"
  | "expired"
  | "invalid"
  | "underpaid"
  | "wrong_recipient"
  | "duplicate"
  | "verification_failed";

export function createPaymentNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    .padEnd(16, "0")
    .slice(0, 64);
}

export function canRetryPayment(phase: PaymentPhase) {
  return (
    phase === "idle" ||
    phase === "rejected" ||
    phase === "failed" ||
    phase === "expired" ||
    phase === "invalid" ||
    phase === "underpaid" ||
    phase === "wrong_recipient" ||
    phase === "duplicate" ||
    phase === "verification_failed"
  );
}
