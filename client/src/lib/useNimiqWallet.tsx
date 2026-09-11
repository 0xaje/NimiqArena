import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import React from "react";
import {
  getActiveWalletAddress,
  restoreSavedWallet,
  connectViaMiniApp,
  getNimiqPayActiveAccount,
  disconnectNimiqWallet,
  isRunningInNimiqPay,
  fetchNimiqAccountInfo,
  type NimiqAccountInfo,
  type BalanceStatus,
  getSavedNimiqNetwork,
  setSavedNimiqNetwork,
} from "./nimiq-wallet";
import { trpc } from "@/lib/trpc";
import { getNimiqNetworkConfig, type NimiqNetworkConfig } from "@shared/nimiq-network";

interface NimiqWalletContextValue {
  address: string | null;
  accountInfo: NimiqAccountInfo | null;
  balanceNim: number;
  balanceStatus: BalanceStatus;
  isLoadingBalance: boolean;
  usdValue: number;
  network: "mainnet" | "testnet";
  networkName: string;
  configuredNetwork: NimiqNetworkConfig;
  setNetwork: (net: "mainnet" | "testnet") => void;
  isConnected: boolean;
  isInsideNimiqPay: boolean;
  isNetworkMismatch: boolean;
  refreshBalance: () => Promise<void>;
  connectMiniApp: () => Promise<string | null>;
  setAddress: (addr: string | null) => void;
  disconnect: () => void;
}

const defaultNetworkConfig = getNimiqNetworkConfig(5);

const NimiqWalletContext = createContext<NimiqWalletContextValue>({
  address: null,
  accountInfo: null,
  balanceNim: 0,
  balanceStatus: "unavailable",
  isLoadingBalance: false,
  usdValue: 0,
  network: "testnet",
  networkName: "TestAlbatross",
  configuredNetwork: defaultNetworkConfig,
  setNetwork: () => {},
  isConnected: false,
  isInsideNimiqPay: false,
  isNetworkMismatch: false,
  refreshBalance: async () => {},
  connectMiniApp: async () => null,
  setAddress: () => {},
  disconnect: () => {},
});

export function NimiqWalletProvider({ children }: { children: ReactNode }) {
  const serverConfigQuery = trpc.system.nimiqNetworkConfig.useQuery(undefined, {
    staleTime: 60_000,
  });

  const configuredNetwork = getNimiqNetworkConfig(serverConfigQuery.data?.networkId ?? 5);

  const [address, setAddressState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getActiveWalletAddress() || restoreSavedWallet();
  });

  const [network, setNetworkState] = useState<"testnet" | "mainnet">(() => {
    return configuredNetwork.id;
  });

  // Sync network state with authoritative server configuration
  useEffect(() => {
    if (serverConfigQuery.data?.networkId) {
      const serverNet = serverConfigQuery.data.networkId === 42 ? "mainnet" : "testnet";
      setNetworkState(serverNet);
      setSavedNimiqNetwork(serverNet);
    }
  }, [serverConfigQuery.data?.networkId]);

  const setNetwork = useCallback((net: "testnet" | "mainnet") => {
    setNetworkState(net);
    setSavedNimiqNetwork(net);
  }, []);

  const [accountInfo, setAccountInfo] = useState<NimiqAccountInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const insideNimiqPay = isRunningInNimiqPay();

  const refreshBalance = useCallback(async (targetAddr?: string | null, targetNet?: "testnet" | "mainnet") => {
    const addr = targetAddr || address;
    if (!addr) {
      setAccountInfo(null);
      return;
    }
    const activeNet = targetNet || network;
    setIsLoadingBalance(true);
    try {
      const info = await fetchNimiqAccountInfo(addr, activeNet);
      setAccountInfo(info);
    } catch (e) {
      console.warn("[useNimiqWallet] Balance fetch error:", e);
      setAccountInfo(prev => prev ? { ...prev, status: "unavailable" } : null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, network]);

  // Active Nimiq Pay synchronization:
  // Whenever running inside Nimiq Pay, query the host container to resolve the real active account.
  // This overwrites any stale address previously persisted in localStorage.
  useEffect(() => {
    let isMounted = true;
    if (insideNimiqPay) {
      getNimiqPayActiveAccount()
        .then((detectedAddr) => {
          if (isMounted && detectedAddr) {
            if (detectedAddr !== address) {
              console.log(`[useNimiqWallet] Active Nimiq Pay account synced: ${detectedAddr} (replaced: ${address})`);
              setAddressState(detectedAddr);
            }
            void refreshBalance(detectedAddr);
          }
        })
        .catch((err) => {
          console.warn("[useNimiqWallet] Failed to sync Nimiq Pay active account:", err);
        });
    } else if (address) {
      void refreshBalance(address);
    }

    return () => {
      isMounted = false;
    };
  }, [insideNimiqPay, address, refreshBalance]);

  // Re-sync on window focus in case account was switched in Nimiq Pay
  useEffect(() => {
    const handleFocus = () => {
      if (insideNimiqPay) {
        getNimiqPayActiveAccount().then((detected) => {
          if (detected && detected !== address) {
            setAddressState(detected);
            void refreshBalance(detected);
          } else if (address) {
            void refreshBalance(address);
          }
        }).catch(() => {});
      } else if (address) {
        void refreshBalance(address);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [insideNimiqPay, address, refreshBalance]);

  // Periodic balance refresher (every 20s)
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      void refreshBalance(address);
    }, 20000);
    return () => clearInterval(interval);
  }, [address, refreshBalance]);

  const connectMiniApp = useCallback(async () => {
    try {
      const addr = await connectViaMiniApp();
      setAddressState(addr);
      void refreshBalance(addr);
      return addr;
    } catch (err) {
      console.warn("[useNimiqWallet] Connect Mini App failed:", err);
      return null;
    }
  }, [refreshBalance]);

  const setAddress = useCallback((addr: string | null) => {
    setAddressState(addr);
    if (addr) void refreshBalance(addr);
    else setAccountInfo(null);
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    disconnectNimiqWallet();
    setAddressState(null);
    setAccountInfo(null);
  }, []);

  const balanceStatus: BalanceStatus = isLoadingBalance
    ? "loading"
    : (accountInfo?.status ?? (address ? "unavailable" : "zero"));

  // Detect network mismatch (e.g. account has 0 on testnet but active on mainnet, or Nimiq Pay running in different network)
  const isNetworkMismatch = accountInfo?.status === "wrong_network";

  const value: NimiqWalletContextValue = {
    address,
    accountInfo,
    balanceNim: accountInfo?.balanceNim ?? 0,
    balanceStatus,
    isLoadingBalance,
    usdValue: accountInfo?.usdValue ?? 0,
    network,
    networkName: configuredNetwork.name,
    configuredNetwork,
    setNetwork,
    isConnected: Boolean(address),
    isInsideNimiqPay: insideNimiqPay,
    isNetworkMismatch,
    refreshBalance: () => refreshBalance(address, network),
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
