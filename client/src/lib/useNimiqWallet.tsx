import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import React from "react";
import {
  getActiveWalletAddress,
  restoreSavedWallet,
  connectViaMiniApp,
  disconnectNimiqWallet,
  isRunningInNimiqPay,
  fetchNimiqAccountInfo,
  type NimiqAccountInfo,
} from "./nimiq-wallet";

interface NimiqWalletContextValue {
  address: string | null;
  accountInfo: NimiqAccountInfo | null;
  balanceNim: number;
  usdValue: number;
  network: "mainnet" | "testnet";
  isConnected: boolean;
  isInsideNimiqPay: boolean;
  refreshBalance: () => Promise<void>;
  connectMiniApp: () => Promise<string | null>;
  setAddress: (addr: string | null) => void;
  disconnect: () => void;
}

const NimiqWalletContext = createContext<NimiqWalletContextValue>({
  address: null,
  accountInfo: null,
  balanceNim: 0,
  usdValue: 0,
  network: "testnet",
  isConnected: false,
  isInsideNimiqPay: false,
  refreshBalance: async () => {},
  connectMiniApp: async () => null,
  setAddress: () => {},
  disconnect: () => {},
});

export function NimiqWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getActiveWalletAddress() || restoreSavedWallet();
  });

  const [accountInfo, setAccountInfo] = useState<NimiqAccountInfo | null>(null);
  const insideNimiqPay = isRunningInNimiqPay();

  const refreshBalance = useCallback(async (targetAddr?: string | null) => {
    const addr = targetAddr || address;
    if (!addr) {
      setAccountInfo(null);
      return;
    }
    try {
      const info = await fetchNimiqAccountInfo(addr);
      setAccountInfo(info);
    } catch (e) {
      console.warn("[useNimiqWallet] Balance fetch error:", e);
    }
  }, [address]);

  // Auto-connect inside Nimiq Pay Mini App if available
  useEffect(() => {
    let isMounted = true;
    if (insideNimiqPay && !address) {
      connectViaMiniApp()
        .then((detectedAddr) => {
          if (isMounted && detectedAddr) {
            setAddress(detectedAddr);
            void refreshBalance(detectedAddr);
          }
        })
        .catch((err) => {
          console.warn("[useNimiqWallet] Mini App auto-connect error:", err);
        });
    } else if (address) {
      void refreshBalance(address);
    }

    return () => {
      isMounted = false;
    };
  }, [insideNimiqPay, address, refreshBalance]);

  // Periodic balance refresher (every 15s)
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      void refreshBalance(address);
    }, 15000);
    return () => clearInterval(interval);
  }, [address, refreshBalance]);

  const connectMiniApp = useCallback(async () => {
    try {
      const addr = await connectViaMiniApp();
      setAddress(addr);
      void refreshBalance(addr);
      return addr;
    } catch (err) {
      console.warn("[useNimiqWallet] Connect Mini App failed:", err);
      return null;
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    disconnectNimiqWallet();
    setAddress(null);
    setAccountInfo(null);
  }, []);

  const value: NimiqWalletContextValue = {
    address,
    accountInfo,
    balanceNim: accountInfo?.balanceNim ?? 0,
    usdValue: accountInfo?.usdValue ?? 0,
    network: accountInfo?.network ?? "testnet",
    isConnected: Boolean(address),
    isInsideNimiqPay: insideNimiqPay,
    refreshBalance: () => refreshBalance(address),
    connectMiniApp,
    setAddress,
    disconnect,
  };

  return (
    <NimiqWalletContext.Provider value={value}>
      {children}
    </NimiqWalletContext.Provider>
  );
}

export function useNimiqWallet(): NimiqWalletContextValue {
  return useContext(NimiqWalletContext);
}
