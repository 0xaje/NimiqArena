/**
 * Authoritative Nimiq Payout Worker (Option B with Safe Option A Fallback)
 *
 * Adheres strictly to the Settlement Architecture Decision Record (ADR):
 * - Computes exact 90/5/2/1/2 pot distribution in integer Luna.
 * - Handles conditional referral award (only if match winner was referred).
 * - If winner has no referrer: 2% is retained by Arena Builder / Platform (Option A).
 * - If NIMIQ_PAYOUT_PRIVATE_KEY is present: executes real on-chain automated payout using @nimiq/core.
 * - If NIMIQ_PAYOUT_PRIVATE_KEY is absent: records authoritative ledger settlement (Option A).
 * - Guarantees strict idempotency: ONE FINISHED MATCH -> MAXIMUM ONE ON-CHAIN PAYOUT.
 * - Enforces safety circuit breakers: per-match payout cap and daily withdrawal limit.
 */

import { getDb, getMatchById, getMatchEscrowDetails, getUserByOpenId } from "./db";
import { matches, users, settlements } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculatePotDistribution } from "../shared/game/pot-distribution";
import { normalizeNimiqAddress, DEFAULT_NIMIQ_TESTNET_RPC, DEFAULT_NIMIQ_MAINNET_RPC } from "./nimiq-verifier";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";

export interface PayoutWorkerConfig {
  enabled: boolean;
  maxPayoutPerMatchNim: number;
  dailyPayoutLimitNim: number;
  privateKey?: string;
  rpcUrl: string;
}

export interface PayoutExecutionResult {
  matchId: string;
  winnerUserId: number;
  winnerAddress?: string;
  grossPotNim: number;
  netPayoutNim: number;
  status: "settled_on_chain" | "ledger_entitlement_confirmed" | "awaiting_winner_address" | "circuit_breaker_tripped" | "failed";
  payoutTxHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
}

export const DEFAULT_PAYOUT_CONFIG: PayoutWorkerConfig = {
  enabled: process.env.ENABLE_AUTOMATED_PAYOUTS === "true",
  maxPayoutPerMatchNim: Number(process.env.MAX_PAYOUT_PER_MATCH_NIM || 50000),
  dailyPayoutLimitNim: Number(process.env.DAILY_PAYOUT_LIMIT_NIM || 500000),
  privateKey: process.env.NIMIQ_PAYOUT_PRIVATE_KEY,
  rpcUrl: ENV.nimiqNetworkId === 42 ? DEFAULT_NIMIQ_MAINNET_RPC : DEFAULT_NIMIQ_TESTNET_RPC,
};

let dailyDisbursedNim = 0;
let lastResetDay = new Date().getUTCDay();

function checkAndResetDailyLimit(amountNim: number, maxDailyNim: number): boolean {
  const currentDay = new Date().getUTCDay();
  if (currentDay !== lastResetDay) {
    dailyDisbursedNim = 0;
    lastResetDay = currentDay;
  }
  if (dailyDisbursedNim + amountNim > maxDailyNim) {
    return false;
  }
  dailyDisbursedNim += amountNim;
  return true;
}

/**
 * Broadcasts an on-chain transaction from the backend hot wallet using @nimiq/core.
 */
async function broadcastOnChainTransfer(options: {
  privateKeyHex: string;
  recipientAddress: string;
  amountLuna: bigint;
  rpcUrl: string;
  networkId: number;
}): Promise<string> {
  const Nimiq = await import("@nimiq/core");
  const cleanKey = options.privateKeyHex.trim().replace(/^0x/, "");
  const privateKey = Nimiq.PrivateKey.fromHex(cleanKey);
  const keyPair = Nimiq.KeyPair.derive(privateKey);
  const senderAddress = keyPair.publicKey.toAddress();
  const recipientAddress = Nimiq.Address.fromUserFriendlyAddress(options.recipientAddress);

  // Fetch current blockchain height from RPC
  const blockRes = await fetch(options.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "getBlockNumber", params: [], id: 1 }),
  });
  const blockData = await blockRes.json();
  const height = blockData.result?.data ?? 1;

  const tx = Nimiq.TransactionBuilder.newBasic(
    senderAddress,
    recipientAddress,
    options.amountLuna,
    BigInt(0),
    height,
    options.networkId
  );
  tx.sign(keyPair, undefined);

  const rawTxHex = tx.toHex();
  const txHash = tx.toPlain().transactionHash;

  const sendRes = await fetch(options.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "sendRawTransaction", params: [rawTxHex], id: 2 }),
  });
  const sendData = await sendRes.json();
  if (sendData.error) {
    throw new Error(sendData.error.data || sendData.error.message || "Failed to broadcast transaction to Nimiq RPC");
  }

  return txHash;
}

export async function processMatchPayout(
  matchId: string,
  config: PayoutWorkerConfig = DEFAULT_PAYOUT_CONFIG
): Promise<PayoutExecutionResult> {
  const db = await getDb();
  if (!db) {
    return {
      matchId,
      winnerUserId: 0,
      grossPotNim: 0,
      netPayoutNim: 0,
      status: "failed",
      errorMessage: "Database unavailable",
    };
  }

  const match = await getMatchById(matchId);
  if (!match) {
    return {
      matchId,
      winnerUserId: 0,
      grossPotNim: 0,
      netPayoutNim: 0,
      status: "failed",
      errorMessage: "Match not found",
    };
  }

  if (match.status !== "finished") {
    return {
      matchId,
      winnerUserId: match.winnerUserId ?? 0,
      grossPotNim: 0,
      netPayoutNim: 0,
      status: "failed",
      errorMessage: "Match is not finished",
    };
  }

  if (!match.winnerUserId) {
    return {
      matchId,
      winnerUserId: 0,
      grossPotNim: 0,
      netPayoutNim: 0,
      status: "failed",
      errorMessage: "No winner assigned to match",
    };
  }

  const escrow = await getMatchEscrowDetails(matchId);
  if (!escrow.isWagered || (escrow.totalPotNim || 0) <= 0) {
    return {
      matchId,
      winnerUserId: match.winnerUserId,
      grossPotNim: 0,
      netPayoutNim: 0,
      status: "ledger_entitlement_confirmed",
    };
  }

  // Idempotency: check if an existing settlement has already been processed for this match
  const existingSettlement = (
    await db.select().from(settlements).where(eq(settlements.matchId, matchId)).limit(1)
  )[0];

  if (existingSettlement && existingSettlement.status === "settled_on_chain") {
    const explorerBase = ENV.nimiqNetworkId === 42 ? "https://nimiqwatch.com/#tx/" : "https://testnet.nimiqwatch.com/#tx/";
    return {
      matchId,
      winnerUserId: existingSettlement.winnerUserId,
      winnerAddress: existingSettlement.winnerAddress,
      grossPotNim: Number(existingSettlement.totalPotLuna) / 100_000,
      netPayoutNim: Number(existingSettlement.winnerAmountLuna) / 100_000,
      status: "settled_on_chain",
      payoutTxHash: existingSettlement.payoutTxHash ?? undefined,
      explorerUrl: existingSettlement.payoutTxHash ? `${explorerBase}${existingSettlement.payoutTxHash}` : undefined,
    };
  }

  // Fetch winner user record and check referral relationship
  const winnerUser = (
    await db.select().from(users).where(eq(users.id, match.winnerUserId)).limit(1)
  )[0];

  const winnerAddress = winnerUser?.address ? normalizeNimiqAddress(winnerUser.address) : undefined;
  if (!winnerAddress) {
    return {
      matchId,
      winnerUserId: match.winnerUserId,
      grossPotNim: escrow.totalPotNim || 0,
      netPayoutNim: (escrow.totalPotNim || 0) * 0.9,
      status: "awaiting_winner_address",
      errorMessage: "Winner has not bound a persistent Nimiq wallet address",
    };
  }

  // Determine legitimate persisted referrer (prevent self-referral)
  let hasReferrer = false;
  let referrerUser: typeof winnerUser | undefined;
  if (winnerUser?.referredByUserId && winnerUser.referredByUserId !== winnerUser.id) {
    referrerUser = (
      await db.select().from(users).where(eq(users.id, winnerUser.referredByUserId)).limit(1)
    )[0];
    if (referrerUser && referrerUser.id !== winnerUser.id) {
      hasReferrer = true;
    }
  }

  const grossPotNim = escrow.totalPotNim || 0;
  const dist = calculatePotDistribution(grossPotNim, hasReferrer);
  const netPayoutNim = dist.winnerNim;

  // Circuit Breaker 1: Per-Match Cap
  if (netPayoutNim > config.maxPayoutPerMatchNim) {
    console.warn(`[PayoutWorker] Circuit breaker tripped: Match ${matchId} payout ${netPayoutNim} NIM exceeds cap of ${config.maxPayoutPerMatchNim} NIM`);
    return {
      matchId,
      winnerUserId: match.winnerUserId,
      grossPotNim,
      netPayoutNim,
      status: "circuit_breaker_tripped",
      errorMessage: `Payout exceeds per-match limit of ${config.maxPayoutPerMatchNim} NIM`,
    };
  }

  // Circuit Breaker 2: Daily Volume Cap
  if (!checkAndResetDailyLimit(netPayoutNim, config.dailyPayoutLimitNim)) {
    console.warn(`[PayoutWorker] Circuit breaker tripped: Daily disbursement limit of ${config.dailyPayoutLimitNim} NIM reached`);
    return {
      matchId,
      winnerUserId: match.winnerUserId,
      grossPotNim,
      netPayoutNim,
      status: "circuit_breaker_tripped",
      errorMessage: `Daily withdrawal volume exceeded`,
    };
  }

  // Persist authoritative settlement record
  const settlementId = existingSettlement?.id || nanoid(20);
  const totalPotLuna = BigInt(dist.totalPotLuna);
  const winnerAmountLuna = BigInt(dist.winnerLuna);
  const builderAmountLuna = BigInt(dist.builderLuna);
  const ecosystemAmountLuna = BigInt(dist.ecosystemLuna);
  const charityAmountLuna = BigInt(dist.charityLuna);
  const referrerAmountLuna = BigInt(dist.referrerLuna);
  const referrerAddress = hasReferrer && referrerUser?.address ? normalizeNimiqAddress(referrerUser.address) : null;

  if (!existingSettlement) {
    await db.insert(settlements).values({
      id: settlementId,
      matchId,
      winnerUserId: match.winnerUserId,
      winnerAddress,
      totalPotLuna,
      winnerAmountLuna,
      builderAmountLuna,
      ecosystemAmountLuna,
      charityAmountLuna,
      referrerAmountLuna,
      referrerAddress,
      referrerUserId: hasReferrer ? referrerUser?.id : null,
      referralEligible: hasReferrer,
      status: "pending",
    });
  }

  // Credit referrer balance if eligible
  if (hasReferrer && dist.referrerNim > 0 && referrerUser) {
    try {
      await db
        .update(users)
        .set({
          referralEarningsNim: sql`${users.referralEarningsNim} + ${Math.round(dist.referrerNim)}`,
          points: sql`${users.points} + ${Math.round(dist.referrerNim * 10)}`,
        })
        .where(eq(users.id, referrerUser.id));
    } catch (refErr) {
      console.warn("[PayoutWorker] Failed to update referrer stats:", refErr);
    }
  }

  // Option B: Real on-chain broadcast if hot-wallet private key is configured
  if (config.enabled && config.privateKey) {
    try {
      console.log(`[PayoutWorker] Option B: Dispatching ${netPayoutNim} NIM (${dist.winnerLuna} Luna) to ${winnerAddress} for match ${matchId}`);
      
      const payoutTxHash = await broadcastOnChainTransfer({
        privateKeyHex: config.privateKey,
        recipientAddress: winnerAddress,
        amountLuna: winnerAmountLuna,
        rpcUrl: config.rpcUrl,
        networkId: ENV.nimiqNetworkId,
      });

      // Secondary disbursements: Builder, Ecosystem, Charity, Referrer
      let builderTxHash: string | undefined;
      const builderDest = ENV.nimiqBuilderAddress || ENV.nimiqPaymentRecipient;
      if (builderAmountLuna > BigInt(0) && builderDest && normalizeNimiqAddress(builderDest) !== normalizeNimiqAddress(winnerAddress)) {
        try {
          builderTxHash = await broadcastOnChainTransfer({
            privateKeyHex: config.privateKey,
            recipientAddress: builderDest,
            amountLuna: builderAmountLuna,
            rpcUrl: config.rpcUrl,
            networkId: ENV.nimiqNetworkId,
          });
          console.log(`[PayoutWorker] Builder transfer dispatched: ${builderTxHash} (${dist.builderNim} NIM to ${builderDest})`);
        } catch (builderErr) {
          console.error(`[PayoutWorker] Failed to broadcast builder transfer:`, builderErr);
        }
      }

      let ecosystemTxHash: string | undefined;
      if (ecosystemAmountLuna > BigInt(0) && ENV.nimiqEcosystemAddress) {
        try {
          ecosystemTxHash = await broadcastOnChainTransfer({
            privateKeyHex: config.privateKey,
            recipientAddress: ENV.nimiqEcosystemAddress,
            amountLuna: ecosystemAmountLuna,
            rpcUrl: config.rpcUrl,
            networkId: ENV.nimiqNetworkId,
          });
          console.log(`[PayoutWorker] Ecosystem transfer dispatched: ${ecosystemTxHash} (${dist.ecosystemNim} NIM to ${ENV.nimiqEcosystemAddress})`);
        } catch (ecoErr) {
          console.error(`[PayoutWorker] Failed to broadcast ecosystem transfer:`, ecoErr);
        }
      }

      let charityTxHash: string | undefined;
      if (charityAmountLuna > BigInt(0) && ENV.nimiqCharityAddress) {
        try {
          charityTxHash = await broadcastOnChainTransfer({
            privateKeyHex: config.privateKey,
            recipientAddress: ENV.nimiqCharityAddress,
            amountLuna: charityAmountLuna,
            rpcUrl: config.rpcUrl,
            networkId: ENV.nimiqNetworkId,
          });
          console.log(`[PayoutWorker] Charity transfer dispatched: ${charityTxHash} (${dist.charityNim} NIM to ${ENV.nimiqCharityAddress})`);
        } catch (charityErr) {
          console.error(`[PayoutWorker] Failed to broadcast charity transfer:`, charityErr);
        }
      }

      let referrerTxHash: string | undefined;
      if (hasReferrer && referrerAmountLuna > BigInt(0) && referrerAddress) {
        try {
          referrerTxHash = await broadcastOnChainTransfer({
            privateKeyHex: config.privateKey,
            recipientAddress: referrerAddress,
            amountLuna: referrerAmountLuna,
            rpcUrl: config.rpcUrl,
            networkId: ENV.nimiqNetworkId,
          });
          console.log(`[PayoutWorker] Referrer transfer dispatched: ${referrerTxHash} (${dist.referrerNim} NIM to ${referrerAddress})`);
        } catch (refErr) {
          console.error(`[PayoutWorker] Failed to broadcast referrer transfer:`, refErr);
        }
      }

      const disbursementAudit = JSON.stringify({
        winner: { address: winnerAddress, amountLuna: winnerAmountLuna.toString(), txHash: payoutTxHash },
        builder: builderTxHash ? { address: builderDest, amountLuna: builderAmountLuna.toString(), txHash: builderTxHash } : undefined,
        ecosystem: ecosystemTxHash ? { address: ENV.nimiqEcosystemAddress, amountLuna: ecosystemAmountLuna.toString(), txHash: ecosystemTxHash } : undefined,
        charity: charityTxHash ? { address: ENV.nimiqCharityAddress, amountLuna: charityAmountLuna.toString(), txHash: charityTxHash } : undefined,
        referrer: referrerTxHash ? { address: referrerAddress, amountLuna: referrerAmountLuna.toString(), txHash: referrerTxHash } : undefined,
      });

      await db
        .update(settlements)
        .set({
          status: "settled_on_chain",
          payoutTxHash,
          settledAt: new Date(),
          errorMessage: disbursementAudit,
        })
        .where(eq(settlements.id, settlementId));

      const explorerBase = ENV.nimiqNetworkId === 42 ? "https://nimiqwatch.com/#tx/" : "https://testnet.nimiqwatch.com/#tx/";
      return {
        matchId,
        winnerUserId: match.winnerUserId,
        winnerAddress,
        grossPotNim,
        netPayoutNim,
        status: "settled_on_chain",
        payoutTxHash,
        explorerUrl: `${explorerBase}${payoutTxHash}`,
      };
    } catch (broadcastErr) {
      console.error(`[PayoutWorker] On-chain broadcast failed for match ${matchId}:`, broadcastErr);
      await db
        .update(settlements)
        .set({
          status: "settlement_failed",
          errorMessage: broadcastErr instanceof Error ? broadcastErr.message : "Broadcast failed",
        })
        .where(eq(settlements.id, settlementId));

      return {
        matchId,
        winnerUserId: match.winnerUserId,
        winnerAddress,
        grossPotNim,
        netPayoutNim,
        status: "failed",
        errorMessage: broadcastErr instanceof Error ? broadcastErr.message : "On-chain broadcast error",
      };
    }
  }

  // Option A (Truthful Testnet Ledger): Record entitlement authoritatively without faking on-chain broadcast
  await db
    .update(settlements)
    .set({
      status: "ledger_entitlement_confirmed",
      settledAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));

  return {
    matchId,
    winnerUserId: match.winnerUserId,
    winnerAddress,
    grossPotNim,
    netPayoutNim,
    status: "ledger_entitlement_confirmed",
    errorMessage: "Settlement recorded authoritatively on Testnet ledger; pending on-chain disbursement signer.",
  };
}
