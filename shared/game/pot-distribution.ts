/**
 * Shared Authoritative Pot Distribution Engine for Nimiq Arena
 * 
 * Official Match Pot Distribution Model:
 * 🏆 Winner — 90%
 * 👷 Builder — 5%
 * 🌐 Nimiq Ecosystem — 3%
 * ❤️ Charity — 2%
 * Total — 100%
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
  builderNim: number;
  builderLuna: string;
  ecosystemNim: number;
  ecosystemLuna: string;
  charityNim: number;
  charityLuna: string;
  percentages: {
    winner: 90;
    builder: 5;
    ecosystem: 3;
    charity: 2;
  };
}

export function calculatePotDistribution(totalPotNim: number): PotDistribution {
  const safePotNim = Math.max(0, Number(totalPotNim) || 0);
  const totalPotLuna = BigInt(Math.round(safePotNim * 100_000));

  // Integer Luna calculations
  const winnerLuna = (totalPotLuna * BigInt(90)) / BigInt(100);
  const builderLuna = (totalPotLuna * BigInt(5)) / BigInt(100);
  const ecosystemLuna = (totalPotLuna * BigInt(3)) / BigInt(100);
  // Charity receives remaining Luna to guarantee exact 100% balance with 0 rounding leakage
  const charityLuna = totalPotLuna - winnerLuna - builderLuna - ecosystemLuna;

  return {
    totalPotNim: safePotNim,
    totalPotLuna: totalPotLuna.toString(),
    winnerNim: Number(winnerLuna) / 100_000,
    winnerLuna: winnerLuna.toString(),
    builderNim: Number(builderLuna) / 100_000,
    builderLuna: builderLuna.toString(),
    ecosystemNim: Number(ecosystemLuna) / 100_000,
    ecosystemLuna: ecosystemLuna.toString(),
    charityNim: Number(charityLuna) / 100_000,
    charityLuna: charityLuna.toString(),
    percentages: {
      winner: 90,
      builder: 5,
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
