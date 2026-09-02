import { describe, it, expect, beforeEach } from "vitest";
import {
  isValidNimiqAddress,
  formatNimiqAddress,
  connectViaManualAddress,
  disconnectNimiqWallet,
  getActiveWalletAddress,
  getWalletConnectionMode,
  restoreSavedWallet,
} from "./nimiq-wallet";

// Polyfill localStorage in Node test environment
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
(globalThis as any).localStorage = localStorageMock;
(globalThis as any).window = { localStorage: localStorageMock };

describe("Authoritative Nimiq Wallet Manager", () => {
  const validAddress = "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
  const validAddressNoSpaces = "NQ0700000000000000000000000000000000";
  const realSample = "NQ245H2G72H6F6M24J94472T5NBL5X0XBN97";

  beforeEach(() => {
    disconnectNimiqWallet();
    localStorage.clear();
  });

  describe("isValidNimiqAddress", () => {
    it("accepts valid Nimiq 36-character IBAN addresses with spaces", () => {
      expect(isValidNimiqAddress(validAddress)).toBe(true);
      expect(isValidNimiqAddress("NQ24 5H2G 72H6 F6M2 4J94 472T 5NBL 5X0X BN97")).toBe(true);
    });

    it("accepts valid Nimiq IBAN addresses without spaces", () => {
      expect(isValidNimiqAddress(realSample)).toBe(true);
    });

    it("rejects invalid addresses (wrong prefix, wrong length, bad characters)", () => {
      expect(isValidNimiqAddress("0x1234567890abcdef")).toBe(false);
      expect(isValidNimiqAddress("NQ01 TOO SHORT")).toBe(false);
      expect(isValidNimiqAddress("NQ99 INVALID_SPECIAL_CHARS!@#$%^&*()")).toBe(false);
      expect(isValidNimiqAddress("")).toBe(false);
    });
  });

  describe("formatNimiqAddress", () => {
    it("formats 36-character address into 4-character blocks", () => {
      const formatted = formatNimiqAddress(realSample);
      expect(formatted).toBe("NQ24 5H2G 72H6 F6M2 4J94 472T 5NBL 5X0X BN97");
    });
  });

  describe("manual wallet connection and persistence", () => {
    it("connects valid manual address and persists to localStorage", () => {
      const connected = connectViaManualAddress(realSample);
      expect(connected).toBe("NQ24 5H2G 72H6 F6M2 4J94 472T 5NBL 5X0X BN97");
      expect(getActiveWalletAddress()).toBe(connected);
      expect(getWalletConnectionMode()).toBe("manual");
      expect(localStorage.getItem("nimiq_arena_wallet_address")).toBe(connected);
    });

    it("throws when connecting an invalid address format", () => {
      expect(() => connectViaManualAddress("invalid_address")).toThrow("Invalid Nimiq address format");
    });

    it("restores previously saved wallet from localStorage on reboot", () => {
      localStorage.setItem("nimiq_arena_wallet_address", "NQ24 5H2G 72H6 F6M2 4J94 472T 5NBL 5X0X BN97");
      localStorage.setItem("nimiq_arena_wallet_mode", "hub");

      const restored = restoreSavedWallet();
      expect(restored).toBe("NQ24 5H2G 72H6 F6M2 4J94 472T 5NBL 5X0X BN97");
      expect(getWalletConnectionMode()).toBe("hub");
    });

    it("disconnects wallet and clears localStorage cleanly", () => {
      connectViaManualAddress(realSample);
      expect(getActiveWalletAddress()).not.toBeNull();

      disconnectNimiqWallet();
      expect(getActiveWalletAddress()).toBeNull();
      expect(getWalletConnectionMode()).toBe("none");
      expect(localStorage.getItem("nimiq_arena_wallet_address")).toBeNull();
    });
  });
});
