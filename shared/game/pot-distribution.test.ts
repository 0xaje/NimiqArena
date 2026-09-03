import { describe, expect, it } from "vitest";
import { calculatePotDistribution } from "./pot-distribution";

describe("Pot Distribution Engine (90/5/3/2 Model)", () => {
  it("calculates exact 90/5/3/2 split for 20,000 NIM pot", () => {
    const dist = calculatePotDistribution(20_000);
    expect(dist.totalPotNim).toBe(20_000);
    expect(dist.winnerNim).toBe(18_000); // 90%
    expect(dist.builderNim).toBe(1_000);  // 5%
    expect(dist.ecosystemNim).toBe(600);   // 3%
    expect(dist.charityNim).toBe(400);     // 2%

    const sum = dist.winnerNim + dist.builderNim + dist.ecosystemNim + dist.charityNim;
    expect(sum).toBe(20_000);
  });

  it("calculates exact split for 100 NIM pot without fractional loss", () => {
    const dist = calculatePotDistribution(100);
    expect(dist.winnerNim).toBe(90);
    expect(dist.builderNim).toBe(5);
    expect(dist.ecosystemNim).toBe(3);
    expect(dist.charityNim).toBe(2);
    expect(dist.winnerNim + dist.builderNim + dist.ecosystemNim + dist.charityNim).toBe(100);
  });

  it("calculates exact split for 50 NIM pot with Luna precision", () => {
    const dist = calculatePotDistribution(50);
    expect(dist.winnerNim).toBe(45);
    expect(dist.builderNim).toBe(2.5);
    expect(dist.ecosystemNim).toBe(1.5);
    expect(dist.charityNim).toBe(1);
    expect(dist.winnerNim + dist.builderNim + dist.ecosystemNim + dist.charityNim).toBe(50);
  });

  it("handles odd amounts safely in integer Luna units", () => {
    const dist = calculatePotDistribution(33.33);
    const sumLuna =
      BigInt(dist.winnerLuna) +
      BigInt(dist.builderLuna) +
      BigInt(dist.ecosystemLuna) +
      BigInt(dist.charityLuna);
    expect(sumLuna.toString()).toBe(dist.totalPotLuna);
  });
});
