/* Courtline Editorial reminder: small pure helpers keep truth labels deterministic and testable. */
export type FeatureState = "live" | "not-live" | "not-implemented";

export function formatAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

export function canRequestAccounts(providerReady: boolean) {
  return providerReady;
}

export function featureLabel(state: FeatureState) {
  if (state === "live") return "LIVE";
  if (state === "not-live") return "NOT LIVE";
  return "NOT IMPLEMENTED";
}
