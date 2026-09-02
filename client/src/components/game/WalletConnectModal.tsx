import React, { useState } from "react";
import {
  X,
  Wallet,
  Globe,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  LogOut,
  Droplets,
  ArrowRight,
} from "lucide-react";
import {
  connectViaNimiqHub,
  connectViaMiniApp,
  connectViaManualAddress,
  disconnectNimiqWallet,
  isValidNimiqAddress,
  formatNimiqAddress,
  isRunningInNimiqPay,
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
  onOpenFaucet?: () => void;
}

export function WalletConnectModal({
  isOpen,
  onClose,
  connectedAddress,
  connectionMode,
  onConnected,
  onDisconnected,
  onOpenFaucet,
}: WalletConnectModalProps) {
  const [manualInput, setManualInput] = useState("");
  const [isConnectingHub, setIsConnectingHub] = useState(false);
  const [isConnectingMiniApp, setIsConnectingMiniApp] = useState(false);
  const [inputError, setInputError] = useState("");

  if (!isOpen) return null;

  const inApp = isRunningInNimiqPay();

  const handleConnectHub = async () => {
    setIsConnectingHub(true);
    try {
      toast.info("Opening Nimiq Hub…", {
        description: "Please select an account in the popup window.",
      });
      const res = await connectViaNimiqHub();
      onConnected(res.address, "hub");
      toast.success("Wallet Connected with Nimiq Hub", {
        description: res.address,
      });
      onClose();
    } catch (err: any) {
      toast.error("Nimiq Hub Connection Cancelled", {
        description: err.message || "No account was selected.",
      });
    } finally {
      setIsConnectingHub(false);
    }
  };

  const handleConnectMiniApp = async () => {
    setIsConnectingMiniApp(true);
    try {
      const addr = await connectViaMiniApp();
      onConnected(addr, "mini-app");
      toast.success("Connected via Nimiq Pay", {
        description: addr,
      });
      onClose();
    } catch (err: any) {
      toast.error("Nimiq Pay Connection Failed", {
        description: err.message || "Failed to read Nimiq Pay account.",
      });
    } finally {
      setIsConnectingMiniApp(false);
    }
  };

  const handleConnectManual = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");
    if (!manualInput.trim()) {
      setInputError("Please enter a Nimiq address.");
      return;
    }
    if (!isValidNimiqAddress(manualInput)) {
      setInputError("Invalid address format. Nimiq addresses start with 'NQ' followed by 34 characters.");
      return;
    }
    try {
      const formatted = connectViaManualAddress(manualInput);
      onConnected(formatted, "manual");
      toast.success("Address Connected", {
        description: formatted,
      });
      setManualInput("");
      onClose();
    } catch (err: any) {
      setInputError(err.message || "Invalid address.");
    }
  };

  const handleDisconnect = () => {
    disconnectNimiqWallet();
    onDisconnected();
    toast.info("Wallet Disconnected");
  };

  return (
    <div
      className="quickmatch-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
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
          maxWidth: "480px",
          backgroundColor: "#161b22",
          border: "1px solid rgba(236, 153, 24, 0.25)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid #21262d",
            backgroundColor: "#0d1117",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(236, 153, 24, 0.12)",
                border: "1px solid rgba(236, 153, 24, 0.3)",
                display: "grid",
                placeItems: "center",
                color: "#EC9918",
              }}
            >
              <Wallet size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f0f6fc" }}>
                Connect Nimiq Wallet
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#8b949e" }}>
                {inApp ? "Nimiq Pay Mini App Environment" : "Global Web Browser Connection"}
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
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* If already connected */}
          {connectedAddress ? (
            <div
              style={{
                backgroundColor: "rgba(46, 160, 67, 0.08)",
                border: "1px solid rgba(46, 160, 67, 0.3)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#3fb950",
                  }}
                >
                  <CheckCircle2 size={15} /> Active Wallet
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    backgroundColor: "#21262d",
                    color: "#c9d1d9",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  {connectionMode === "mini-app" ? "Nimiq Pay" : connectionMode === "hub" ? "Nimiq Hub" : "Manual"}
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
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #30363d",
                }}
              >
                {connectedAddress}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(connectedAddress);
                    toast.success("Address copied to clipboard");
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#c9d1d9",
                    backgroundColor: "#21262d",
                    border: "1px solid #30363d",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <Copy size={13} /> Copy Address
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#f85149",
                    backgroundColor: "rgba(248, 81, 73, 0.1)",
                    border: "1px solid rgba(248, 81, 73, 0.3)",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={13} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Option A: Inside Nimiq Pay */}
              {inApp ? (
                <button
                  type="button"
                  onClick={handleConnectMiniApp}
                  disabled={isConnectingMiniApp}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px",
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#f0f6fc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(236, 153, 24, 0.15)",
                        color: "#EC9918",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>Nimiq Pay App</div>
                      <div style={{ fontSize: "12px", color: "#8b949e" }}>
                        Connect your active Nimiq Pay mobile wallet
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} color="#8b949e" />
                </button>
              ) : (
                /* Option B: Standard Web Browser -> Nimiq Hub */
                <button
                  type="button"
                  onClick={handleConnectHub}
                  disabled={isConnectingHub}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px",
                    backgroundColor: "rgba(236, 153, 24, 0.08)",
                    border: "1px solid rgba(236, 153, 24, 0.35)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#f0f6fc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        backgroundColor: "#EC9918",
                        color: "#000",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Globe size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#EC9918" }}>
                        Nimiq Hub (Official Web Wallet)
                      </div>
                      <div style={{ fontSize: "12px", color: "#8b949e" }}>
                        {isConnectingHub ? "Opening Nimiq Hub popup…" : "Connect via hub.nimiq-testnet.com"}
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={18} color="#EC9918" />
                </button>
              )}

              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#484f58",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  margin: "4px 0",
                }}
              >
                <div style={{ flex: 1, height: "1px", backgroundColor: "#21262d" }} />
                <span>Or Enter Address for Local Testing</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "#21262d" }} />
              </div>

              {/* Option C: Manual Address Input for Localhost */}
              <form onSubmit={handleConnectManual} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#c9d1d9",
                      marginBottom: "6px",
                    }}
                  >
                    Paste Nimiq Address
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setInputError("");
                    }}
                    placeholder="NQ07 0000 0000 0000 0000 0000 0000 0000"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#0d1117",
                      border: inputError ? "1px solid #f85149" : "1px solid #30363d",
                      color: "#f0f6fc",
                      fontSize: "13px",
                      fontFamily: "IBM Plex Mono, monospace",
                      boxSizing: "border-box",
                    }}
                  />
                  {inputError && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#f85149",
                        fontSize: "11px",
                        marginTop: "4px",
                      }}
                    >
                      <AlertCircle size={13} /> {inputError}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#21262d",
                    border: "1px solid #30363d",
                    color: "#f0f6fc",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Connect Address
                </button>
              </form>
            </>
          )}

          {/* Testnet Faucet Banner */}
          {onOpenFaucet && (
            <div
              style={{
                backgroundColor: "#0d1117",
                border: "1px dashed #30363d",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Droplets size={16} color="#EC9918" />
                <span style={{ fontSize: "12px", color: "#c9d1d9" }}>Need free testnet NIM for matches?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFaucet();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EC9918",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Open Faucet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
