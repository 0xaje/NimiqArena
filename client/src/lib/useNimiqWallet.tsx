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
  syncNimiqPayAccount: (timeoutMs?: number) => Promise<string | null>;
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
  syncNimiqPayAccount: async () => null,
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
  const [insideNimiqPay, setInsideNimiqPay] = useState<boolean>(() => isRunningInNimiqPay());

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

  const syncNimiqPayAccount = useCallback(async (timeoutMs = 4000) => {
    setIsLoadingBalance(true);
    try {
      const detected = await getNimiqPayActiveAccount(timeoutMs);
      if (detected) {
        setInsideNimiqPay(true);
        setAddressState(detected);
        await refreshBalance(detected);
        return detected;
      }
    } catch (e) {
      console.warn("[useNimiqWallet] syncNimiqPayAccount failed:", e);
    } finally {
      setIsLoadingBalance(false);
    }
    return null;
  }, [refreshBalance]);

  // Initial mount:
  // Query Nimiq Pay host container immediately and poll for up to 4000ms for async bridge injection.
  // Overwrites any stale localStorage address with the real active Nimiq Pay account.
  useEffect(() => {
    let isMounted = true;

    getNimiqPayActiveAccount(4000)
      .then((detectedAddr) => {
        if (!isMounted) return;
        if (detectedAddr) {
          setInsideNimiqPay(true);
          setAddressState(detectedAddr);
          void refreshBalance(detectedAddr);
        } else if (isRunningInNimiqPay()) {
          setInsideNimiqPay(true);
        }
      })
      .catch((err) => {
        console.warn("[useNimiqWallet] Nimiq Pay auto-detection:", err);
      });

    // Also refresh existing address while bridge detection is underway
    if (address) {
      void refreshBalance(address);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Re-sync on window focus & visibility change (essential when switching between apps on mobile)
  useEffect(() => {
    const handleSync = () => {
      getNimiqPayActiveAccount(1500).then((detected) => {
        if (detected) {
          setInsideNimiqPay(true);
          if (detected !== address) {
            setAddressState(detected);
          }
          void refreshBalance(detected);
        } else if (address) {
          void refreshBalance(address);
        }
      }).catch(() => {
        if (address) void refreshBalance(address);
      });
    };

    window.addEventListener("focus", handleSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [address, refreshBalance]);

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
    syncNimiqPayAccount,
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
