import React, { useState } from "react";
import {
  X,
  Wallet,
  Globe,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Copy,
  LogOut,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  connectViaNimiqHub,
  connectViaMiniApp,
  disconnectNimiqWallet,
  formatNimiqAddress,
  isRunningInNimiqPay,
  NIMIQ_MAINNET_HUB_URL,
  NIMIQ_TESTNET_HUB_URL,
  type WalletConnectionMode,
} from "@/lib/nimiq-wallet";
import { toast } from "sonner";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedAddress: string | null;
  connectionMode: WalletConnectionMode;
  onConnected: (address: string, mode: WalletConnectionMode) => void;
  onDisconnected: () => void;
}

export function WalletConnectModal({
  isOpen,
  onClose,
  connectedAddress,
  connectionMode,
  onConnected,
  onDisconnected,
}: WalletConnectModalProps) {
  const [isConnectingHub, setIsConnectingHub] = useState(false);
  const [useTestnet, setUseTestnet] = useState(false);

  if (!isOpen) return null;

  const inApp = isRunningInNimiqPay();

  const handleConnectHub = async (targetEndpoint?: string) => {
    setIsConnectingHub(true);
    const endpoint = targetEndpoint || (useTestnet ? NIMIQ_TESTNET_HUB_URL : NIMIQ_MAINNET_HUB_URL);
    try {
      toast.info("Opening Official Nimiq Hub…", {
        description: "Please log in or select your account in the official Nimiq popup.",
      });
      const res = await connectViaNimiqHub(endpoint);
      onConnected(res.address, "hub");
      toast.success("Nimiq Wallet Connected", {
        description: res.address,
      });
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Connection was cancelled or closed.";
      toast.error("Nimiq Wallet Connection Cancelled", {
        description: msg,
      });
    } finally {
      setIsConnectingHub(false);
    }
  };

  const handleConnectMiniApp = async () => {
    try {
      const addr = await connectViaMiniApp();
      onConnected(addr, "mini-app");
      toast.success("Connected via Nimiq Pay", {
        description: addr,
      });
      onClose();
    } catch (err: any) {
      toast.error("Nimiq Pay Connection Failed", {
        description: err?.message || "Failed to read Nimiq Pay account.",
      });
    }
  };

  const handleDisconnect = () => {
    disconnectNimiqWallet();
    onDisconnected();
    toast.info("Wallet Disconnected");
  };

  const cleanAddress = connectedAddress ? connectedAddress.replace(/\s+/g, "") : "";

  return (
    <div
      className="quickmatch-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="quickmatch-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#161b22",
          border: "1px solid rgba(236, 153, 24, 0.3)",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px",
            borderBottom: "1px solid #21262d",
            backgroundColor: "#0d1117",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "rgba(236, 153, 24, 0.15)",
                border: "1px solid rgba(236, 153, 24, 0.35)",
                display: "grid",
                placeItems: "center",
                color: "#EC9918",
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#f0f6fc" }}>
                Official Nimiq Wallet
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#8b949e" }}>
                {inApp ? "Nimiq Pay Mobile Host" : "Nimiq Hub Web Connection"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8b949e",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {connectedAddress ? (
            /* Active Connected Wallet View */
            <div
              style={{
                backgroundColor: "rgba(46, 160, 67, 0.08)",
                border: "1px solid rgba(46, 160, 67, 0.35)",
                borderRadius: "14px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#3fb950",
                  }}
                >
                  <CheckCircle2 size={16} /> Wallet Connected
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    backgroundColor: "#21262d",
                    color: "#EC9918",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {connectionMode === "mini-app" ? "Nimiq Pay" : "Nimiq Hub"}
                </span>
              </div>

              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#f0f6fc",
                  wordBreak: "break-all",
                  backgroundColor: "#0d1117",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #30363d",
                  lineHeight: "1.4",
                }}
              >
                {formatNimiqAddress(connectedAddress)}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cleanAddress);
                    toast.success("Nimiq address copied to clipboard");
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#c9d1d9",
                    backgroundColor: "#21262d",
                    border: "1px solid #30363d",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <Copy size={14} /> Copy
                </button>
                <a
                  href={`https://nimiq.watch/account/${cleanAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#EC9918",
                    backgroundColor: "rgba(236, 153, 24, 0.1)",
                    border: "1px solid rgba(236, 153, 24, 0.3)",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  Explorer <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#f85149",
                    backgroundColor: "rgba(248, 81, 73, 0.1)",
                    border: "1px solid rgba(248, 81, 73, 0.3)",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* Connect Wallet Options */
            <>
              {inApp ? (
                /* Mode 1: Running in Nimiq Pay */
                <button
                  type="button"
                  onClick={handleConnectMiniApp}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px",
                    backgroundColor: "rgba(236, 153, 24, 0.1)",
                    border: "1px solid #EC9918",
                    borderRadius: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#f0f6fc",
                    width: "100%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        backgroundColor: "#EC9918",
                        color: "#000",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#EC9918" }}>
                        Connect with Nimiq Pay
                      </div>
                      <div style={{ fontSize: "12px", color: "#8b949e" }}>
                        Import active account from Nimiq Pay mobile app
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                /* Mode 2: Standard Browser -> Official Nimiq Hub */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => handleConnectHub()}
                    disabled={isConnectingHub}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px",
                      backgroundColor: "rgba(236, 153, 24, 0.12)",
                      border: "1px solid rgba(236, 153, 24, 0.45)",
                      borderRadius: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#f0f6fc",
                      width: "100%",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          backgroundColor: "#EC9918",
                          color: "#000",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: "18px",
                        }}
                      >
                        {isConnectingHub ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : (
                          <Globe size={24} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "#EC9918" }}>
                          Connect with Official Nimiq Hub
                        </div>
                        <div style={{ fontSize: "12px", color: "#8b949e" }}>
                          {isConnectingHub
                            ? "Connecting to official Nimiq popup…"
                            : `Opens ${useTestnet ? "hub.nimiq-testnet.com" : "hub.nimiq.com"} to log in or create account`}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={18} color="#EC9918" />
                  </button>

                  {/* Network selection toggle (Subtle) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "#0d1117",
                      borderRadius: "8px",
                      border: "1px solid #21262d",
                      fontSize: "12px",
                      color: "#8b949e",
                    }}
                  >
                    <span>Target Network:</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setUseTestnet(false)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: !useTestnet ? "#EC9918" : "#21262d",
                          color: !useTestnet ? "#000" : "#8b949e",
                        }}
                      >
                        Mainnet (hub.nimiq.com)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseTestnet(true)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: useTestnet ? "#EC9918" : "#21262d",
                          color: useTestnet ? "#000" : "#8b949e",
                        }}
                      >
                        Testnet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Link to Official Nimiq Web Wallet */}
              <div
                style={{
                  backgroundColor: "#0d1117",
                  border: "1px solid #21262d",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={18} color="#EC9918" />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f0f6fc" }}>
                      Don't have a Nimiq account?
                    </div>
                    <div style={{ fontSize: "11px", color: "#8b949e" }}>
                      Create and manage your wallet on the official Nimiq portal
                    </div>
                  </div>
                </div>
                <a
                  href="https://wallet.nimiq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#EC9918",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(236, 153, 24, 0.1)",
                    border: "1px solid rgba(236, 153, 24, 0.25)",
                  }}
                >
                  wallet.nimiq.com <ExternalLink size={12} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
