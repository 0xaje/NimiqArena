/**
 * Shared Authoritative Pot Distribution Engine for Nimiq Arena
 * 
 * Official Match Pot Distribution Model:
 * - Winner: 90%
 * - Builder Fee: 5%
 * - Nimiq Ecosystem Pool: 3%
 * - Charity Vault: 2%
 * Total: 100%
 *
 * All financial allocations are computed in integer Luna (1 NIM = 100,000 Luna)
 * to prevent floating-point inaccuracies or value leakage.
 */

export const LUNA_PER_NIM = BigInt(100_000);

export interface PotDistribution {
  totalPotNim: number;
  totalPotLuna: string; // stringified bigint for JSON/RPC safety
  winnerNim: number;
  winnerLuna: string;
  referrerNim: number;
  referrerLuna: string;
  builderNim: number;
  builderLuna: string;
  ecosystemNim: number;
  ecosystemLuna: string;
  charityNim: number;
  charityLuna: string;
  percentages: {
    winner: number;
    referrer: number;
    builder: number;
    ecosystem: number;
    charity: number;
  };
}

export function calculatePotDistribution(
  totalPotNim: number,
  hasReferrer: boolean = false
): PotDistribution {
  const safePotNim = Math.max(0, Number(totalPotNim) || 0);
  const totalPotLuna = BigInt(Math.round(safePotNim * 100_000));

  // Integer Luna calculations strictly adhering to Section 16 economic model:
  // 90% Winner, 5% Builder, 3% Ecosystem, 2% Charity
  const winnerLuna = (totalPotLuna * BigInt(90)) / BigInt(100);
  const referrerLuna = hasReferrer
    ? (totalPotLuna * BigInt(2)) / BigInt(100) // 2% referral commission out of builder share
    : BigInt(0);
  const builderLuna = hasReferrer
    ? (totalPotLuna * BigInt(3)) / BigInt(100) // 3% net builder pool when referral paid
    : (totalPotLuna * BigInt(5)) / BigInt(100); // 5% builder pool when no referrer
  const ecosystemLuna = (totalPotLuna * BigInt(3)) / BigInt(100); // 3% Nimiq ecosystem/community pool
  
  // Charity receives remaining Luna (2%) to guarantee exact 100% balance with 0 rounding leakage
  const charityLuna = totalPotLuna - winnerLuna - referrerLuna - builderLuna - ecosystemLuna;

  return {
    totalPotNim: safePotNim,
    totalPotLuna: totalPotLuna.toString(),
    winnerNim: Number(winnerLuna) / 100_000,
    winnerLuna: winnerLuna.toString(),
    referrerNim: Number(referrerLuna) / 100_000,
    referrerLuna: referrerLuna.toString(),
    builderNim: Number(builderLuna) / 100_000,
    builderLuna: builderLuna.toString(),
    ecosystemNim: Number(ecosystemLuna) / 100_000,
    ecosystemLuna: ecosystemLuna.toString(),
    charityNim: Number(charityLuna) / 100_000,
    charityLuna: charityLuna.toString(),
    percentages: {
      winner: 90,
      referrer: hasReferrer ? 2 : 0,
      builder: hasReferrer ? 3 : 5,
      ecosystem: 3,
      charity: 2,
    },
  };
}

export function formatNim(nim: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(nim);
}
