export type PaymentPhase = "idle" | "creating" | "confirming" | "submitted" | "rejected" | "failed" | "expired";

export function createPaymentNonce() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.padEnd(16, "0").slice(0, 64);
}

export function canRetryPayment(phase: PaymentPhase) {
  return phase === "idle" || phase === "rejected" || phase === "failed" || phase === "expired";
}
