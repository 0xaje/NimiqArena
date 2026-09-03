const isProduction = process.env.NODE_ENV === "production";

function resolveCookieSecret(): string {
  const secret = process.env.JWT_SECRET;
  const defaultDevSecret =
    "nimiq-arena-development-jwt-secret-key-32-chars-long";

  if (isProduction) {
    if (!secret) {
      throw new Error(
        "FATAL: Production mode requires JWT_SECRET environment variable to be explicitly set. Refusing to start with insecure defaults."
      );
    }
    if (secret === defaultDevSecret) {
      throw new Error(
        "FATAL: Production mode cannot use the known development fallback JWT_SECRET. Please supply a unique production secret."
      );
    }
    return secret;
  }

  return secret || defaultDevSecret;
}

export const ENV = {
  appId: process.env.VITE_APP_ID || "nimiq-arena-app",
  cookieSecret: resolveCookieSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  nimiqPaymentRecipient: process.env.NIMIQ_PAYMENT_RECIPIENT ?? "",
  nimiqArenaEntryValueLuna: Number(
    process.env.NIMIQ_ARENA_ENTRY_VALUE_LUNA ?? 0
  ),
  nimiqNetworkId: Number(process.env.NIMIQ_NETWORK_ID ?? 5),
  nimiqRpcUrl:
    process.env.NIMIQ_RPC_URL || "https://rpc.testnet.nimiqwatch.com",
};

