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

const NIMIQ_TESTNET_ID = 5;
const NIMIQ_MAINNET_ID = 42;

/**
 * Resolves the Nimiq network, refusing configurations that would verify
 * payments against the wrong chain.
 */
function resolveNimiqNetwork(): { networkId: number; rpcUrl: string } {
  const networkId = Number(process.env.NIMIQ_NETWORK_ID ?? NIMIQ_TESTNET_ID);
  if (networkId !== NIMIQ_TESTNET_ID && networkId !== NIMIQ_MAINNET_ID) {
    throw new Error(
      `FATAL: NIMIQ_NETWORK_ID must be ${NIMIQ_TESTNET_ID} (testnet) or ${NIMIQ_MAINNET_ID} (mainnet); received "${process.env.NIMIQ_NETWORK_ID}".`
    );
  }

  const rpcUrl =
    process.env.NIMIQ_RPC_URL ||
    (networkId === NIMIQ_MAINNET_ID
      ? "https://rpc.nimiqwatch.com"
      : "https://rpc.testnet.nimiqwatch.com");

  if (networkId === NIMIQ_MAINNET_ID && /testnet/i.test(rpcUrl)) {
    throw new Error(
      `FATAL: NIMIQ_NETWORK_ID is set to mainnet but NIMIQ_RPC_URL points at a testnet node (${rpcUrl}). Payments would be verified against the wrong chain.`
    );
  }

  return { networkId, rpcUrl };
}

const nimiqNetwork = resolveNimiqNetwork();

/**
 * How many reverse proxies sit in front of this process.
 *
 * Express only believes `X-Forwarded-For` when this says so, and rate limiting
 * keys on the result. Trusting the header without a proxy in front lets any
 * caller forge their own identity; not trusting it behind one lumps every user
 * onto the proxy's address. Neither is guessable from inside the process, so
 * the deployment has to say. Default is 0: trust nothing.
 */
function resolveTrustProxy(): number | false {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw || raw === "false" || raw === "0") return false;
  if (raw === "true") return 1;

  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(
      `FATAL: TRUST_PROXY must be a non-negative integer count of proxy hops, "true", or "false"; received "${raw}".`
    );
  }
  return hops === 0 ? false : hops;
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
  nimiqNetworkId: nimiqNetwork.networkId,
  nimiqRpcUrl: nimiqNetwork.rpcUrl,
  trustProxy: resolveTrustProxy(),
};

