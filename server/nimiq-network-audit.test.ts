import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NIMIQ_NETWORKS,
  getNimiqNetworkConfig,
  lunaToNim,
  nimToLuna,
  normalizeNimiqAddress,
} from "../shared/nimiq-network";
import { calculatePotDistribution } from "../shared/game/pot-distribution";
import { getLiveAccountBalance } from "./nimiq-account";

describe("Nimiq Network Audit & Integrity", () => {
  describe("1. Single Source of Truth Network Configuration", () => {
    it("provides correct TestAlbatross configuration", () => {
      const testnet = getNimiqNetworkConfig("testnet");
      expect(testnet.id).toBe("testnet");
      expect(testnet.networkId).toBe(5);
      expect(testnet.name).toBe("TestAlbatross");
      expect(testnet.rpcUrl).toContain("nimiqwatch.com");
      expect(testnet.fallbackRpcUrls.length).toBeGreaterThan(0);
      expect(testnet.explorerUrl).toContain("testnet");
    });

    it("provides correct MainAlbatross configuration", () => {
      const mainnet = getNimiqNetworkConfig("mainnet");
      expect(mainnet.id).toBe("mainnet");
      expect(mainnet.networkId).toBe(42);
      expect(mainnet.name).toBe("MainAlbatross");
      expect(mainnet.rpcUrl).toContain("nimiqwatch.com");
    });

    it("defaults to testnet safely if given undefined or invalid input", () => {
      const fallback = getNimiqNetworkConfig(undefined as any);
      expect(fallback.id).toBe("testnet");
      expect(fallback.networkId).toBe(5);
    });
  });

  describe("2. Luna & NIM Conversions", () => {
    it("converts Luna to NIM accurately (1 NIM = 100,000 Luna)", () => {
      expect(lunaToNim(100_000)).toBe(1);
      expect(lunaToNim(50_000_000)).toBe(500);
      expect(lunaToNim(0)).toBe(0);
      expect(lunaToNim(1)).toBe(0.00001);
    });

    it("converts NIM to Luna accurately as integers", () => {
      expect(nimToLuna(1)).toBe(100_000);
      expect(nimToLuna(500)).toBe(50_000_000);
      expect(nimToLuna(0.5)).toBe(50_000);
    });
  });

  describe("3. Address Normalization", () => {
    it("normalizes spaced and unspaced Nimiq addresses into standard 9-group format", () => {
      const raw = "NQ0700000000000000000000000000000000";
      const formatted = normalizeNimiqAddress(raw);
      expect(formatted).toBe("NQ07 0000 0000 0000 0000 0000 0000 0000 0000");

      const withSpaces = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
      expect(normalizeNimiqAddress(withSpaces)).toBe("NQ07 0000 0000 0000 0000 0000 0000 0000 0000");
    });
  });

  describe("4. Albatross PoS JSON-RPC Account Balance Parsing", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("correctly parses Albatross nested result format ({ result: { data: { balance } } })", async () => {
      const mockAddress = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: {
            address: mockAddress,
            balance: 2_500_000_000, // 25,000 NIM
            type: "basic",
          },
          metadata: {
            blockNumber: 450123,
            blockHash: "abc123hash",
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getLiveAccountBalance(mockAddress, "testnet");
      expect(result.status).toBe("available");
      expect(result.balanceLuna).toBe(2_500_000_000);
      expect(result.balanceNim).toBe(25_000);
      expect(result.blockHeight).toBe(450123);
      expect(result.accountType).toBe("basic");
    });

    it("identifies real zero balance account distinctly from RPC failure", async () => {
      const mockAddress = "NQ07 0000 0000 0000 0000 0000 0000 0000 0001";
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: {
            address: mockAddress,
            balance: 0,
            type: "basic",
          },
          metadata: {
            blockNumber: 450124,
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getLiveAccountBalance(mockAddress, "testnet");
      expect(result.status).toBe("zero");
      expect(result.balanceLuna).toBe(0);
      expect(result.balanceNim).toBe(0);
    });

    it("NEVER coerces network/RPC error into 0 balance (differentiates unavailable vs 0)", async () => {
      const mockAddress = "NQ07 0000 0000 0000 0000 0000 0000 0000 0002";

      // Mock network failure on RPC
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

      const result = await getLiveAccountBalance(mockAddress, "testnet");
      // Crucial: status must be "unavailable", NOT a confirmed 0 balance
      expect(result.status).toBe("unavailable");
      expect(result.balanceNim).toBe(0);
    });

    it("handles HTTP error status codes safely without returning confirmed 0 balance", async () => {
      const mockAddress = "NQ07 0000 0000 0000 0000 0000 0000 0000 0003";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } as Response);

      const result = await getLiveAccountBalance(mockAddress, "testnet");
      expect(result.status).toBe("unavailable");
    });
  });

  describe("5. Pot Distribution Economic Model (Section 16)", () => {
    it("distributes 20,000 NIM pot adhering to 90/5/2/1/2 model", () => {
      const totalPotNim = 20_000;

      // Case A: Winner with eligible referrer (5% Builder, 2% Referrer)
      const distWithRef = calculatePotDistribution(totalPotNim, true);
      expect(distWithRef.winnerNim).toBe(18_000);
      expect(distWithRef.builderNim).toBe(1_000);
      expect(distWithRef.ecosystemNim).toBe(400);
      expect(distWithRef.charityNim).toBe(200);
      expect(distWithRef.referrerNim).toBe(400);

      const sumWithRef =
        BigInt(distWithRef.winnerLuna) +
        BigInt(distWithRef.builderLuna) +
        BigInt(distWithRef.ecosystemLuna) +
        BigInt(distWithRef.charityLuna) +
        BigInt(distWithRef.referrerLuna);
      expect(sumWithRef).toBe(BigInt(distWithRef.totalPotLuna));

      // Case B: Winner without referrer (Option A: Builder retains 7%)
      const distNoRef = calculatePotDistribution(totalPotNim, false);
      expect(distNoRef.winnerNim).toBe(18_000);
      expect(distNoRef.builderNim).toBe(1_400);
      expect(distNoRef.ecosystemNim).toBe(400);
      expect(distNoRef.charityNim).toBe(200);
      expect(distNoRef.referrerNim).toBe(0);

      const sumNoRef =
        BigInt(distNoRef.winnerLuna) +
        BigInt(distNoRef.builderLuna) +
        BigInt(distNoRef.ecosystemLuna) +
        BigInt(distNoRef.charityLuna);
      expect(sumNoRef).toBe(BigInt(distNoRef.totalPotLuna));
    });

    it("handles odd amounts without losing Luna via remainder allocation to charity/winner", () => {
      const oddPotNim = 1.00003;
      const dist = calculatePotDistribution(oddPotNim);

      const sumLuna =
        BigInt(dist.winnerLuna) +
        BigInt(dist.referrerLuna) +
        BigInt(dist.builderLuna) +
        BigInt(dist.ecosystemLuna) +
        BigInt(dist.charityLuna);
      expect(sumLuna).toBe(BigInt(dist.totalPotLuna));
    });
  });
});
