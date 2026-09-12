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

import {
  getNimiqNetworkConfig,
  NIMIQ_TESTNET_NETWORK_ID,
  NIMIQ_MAINNET_NETWORK_ID,
  type NimiqNetworkConfig,
} from "@shared/nimiq-network";

/**
 * Resolves the Nimiq network, refusing configurations that would verify
 * payments against the wrong chain.
 */
function resolveNimiqNetwork(): NimiqNetworkConfig {
  const rawId = process.env.NIMIQ_NETWORK_ID;
  const networkId = Number(rawId ?? NIMIQ_TESTNET_NETWORK_ID);
  if (networkId !== NIMIQ_TESTNET_NETWORK_ID && networkId !== NIMIQ_MAINNET_NETWORK_ID) {
    throw new Error(
      `FATAL: NIMIQ_NETWORK_ID must be ${NIMIQ_TESTNET_NETWORK_ID} (testnet) or ${NIMIQ_MAINNET_NETWORK_ID} (mainnet); received "${rawId}".`
    );
  }

  const baseConfig = getNimiqNetworkConfig(networkId);
  const rpcUrl = process.env.NIMIQ_RPC_URL || baseConfig.rpcUrl;

  if (networkId === NIMIQ_MAINNET_NETWORK_ID && /testnet/i.test(rpcUrl)) {
    throw new Error(
      `FATAL: NIMIQ_NETWORK_ID is set to mainnet but NIMIQ_RPC_URL points at a testnet node (${rpcUrl}). Payments would be verified against the wrong chain.`
    );
  }

  // Safe startup diagnostic output (NO secrets/keys)
  console.log(`[NimiqArena] Network Configuration: ${baseConfig.name} (Chain ID: ${networkId})`);
  console.log(`[NimiqArena] Blockchain RPC Endpoint: ${rpcUrl}`);

  return {
    ...baseConfig,
    rpcUrl,
  };
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

/**
 * Resolves and strictly validates the Nimiq payment recipient address.
 * Never silently falls back to 0000... placeholder.
 */
export function resolveNimiqPaymentRecipient(network: NimiqNetworkConfig): string {
  const raw = (
    process.env.NIMIQ_SETTLEMENT_ADDRESS ||
    process.env.NIMIQ_PAYMENT_RECIPIENT ||
    ""
  ).trim();

  if (!raw) {
    if (isProduction) {
      throw new Error(
        `FATAL: Nimiq payment recipient is not configured for ${network.name}. Set NIMIQ_SETTLEMENT_ADDRESS or NIMIQ_PAYMENT_RECIPIENT to a valid ${network.name} Nimiq address.`
      );
    }
    console.warn(
      `[NimiqArena] NOTICE: NIMIQ_PAYMENT_RECIPIENT is unset. Payment intent creation will be rejected until configured.`
    );
    return "";
  }

  const clean = raw.replace(/\s+/g, "").toUpperCase();
  if (clean.includes("00000000000000000000000000000000") || /^NQ070+$/.test(clean)) {
    throw new Error(
      `FATAL: Nimiq payment recipient is set to an invalid placeholder ("${raw}"). A real, arena-controlled Nimiq address must be configured via NIMIQ_SETTLEMENT_ADDRESS or NIMIQ_PAYMENT_RECIPIENT.`
    );
  }

  if (!/^NQ\d{2}[0-9A-Z]{32}$/.test(clean)) {
    throw new Error(
      `FATAL: Nimiq payment recipient ("${raw}") is syntactically invalid. Expected 36-character IBAN format (e.g. NQ51 85HV...).`
    );
  }

  return raw;
}

export function resolveOptionalNimiqAddress(rawAddress?: string): string {
  const raw = (rawAddress || "").trim();
  if (!raw) return "";
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^NQ\d{2}[0-9A-Z]{32}$/.test(clean)) {
    console.warn(`[NimiqArena] Invalid Nimiq address supplied: "${raw}"`);
    return "";
  }
  return raw;
}

const resolvedRecipient = resolveNimiqPaymentRecipient(nimiqNetwork);

export const ENV = {
  appId: process.env.VITE_APP_ID || "nimiq-arena-app",
  cookieSecret: resolveCookieSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  nimiqPaymentRecipient: resolvedRecipient,
  nimiqSettlementAddress: resolvedRecipient,
  nimiqBuilderAddress:
    resolveOptionalNimiqAddress(process.env.NIMIQ_BUILDER_ADDRESS) || resolvedRecipient,
  nimiqCharityAddress:
    resolveOptionalNimiqAddress(process.env.NIMIQ_CHARITY_ADDRESS),
  nimiqEcosystemAddress:
    resolveOptionalNimiqAddress(process.env.NIMIQ_ECOSYSTEM_ADDRESS),
  nimiqArenaEntryValueLuna: Number(
    process.env.NIMIQ_ARENA_ENTRY_VALUE_LUNA || 100_000
  ),
  nimiqNetworkId: nimiqNetwork.networkId,
  nimiqNetworkName: nimiqNetwork.name,
  nimiqRpcUrl: nimiqNetwork.rpcUrl,
  nimiqExplorerUrl: nimiqNetwork.explorerUrl,
  nimiqFaucetUrl: nimiqNetwork.faucetUrl,
  isTestnet: nimiqNetwork.isTestnet,
  trustProxy: resolveTrustProxy(),
};

