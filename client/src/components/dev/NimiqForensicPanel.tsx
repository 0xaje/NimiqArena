import { useState, useEffect, useCallback } from "react";
import {
  runFullNimiqForensicTest,
  formatEvidenceTable,
  recordNimiqBoundary,
} from "@/lib/nimiq-diagnostics";
import type { NimiqForensicReport } from "@shared/nimiq-diagnostics-types";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  Shield,
  Layers,
} from "lucide-react";

export function NimiqForensicPanel() {
  const { address, balanceNim, balanceStatus, syncNimiqPayAccount, isInsideNimiqPay } = useNimiqWallet();
  const [report, setReport] = useState<NimiqForensicReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Auto-display in mobile Nimiq Pay or when debug flag is in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const hasDebugFlag = urlParams.has("debug") || urlParams.has("diag") || urlParams.get("dev") === "1";
    const insideApp = isInsideNimiqPay || Boolean((window as any).nimiq || (window as any).nimiqPay);

    // Show floating button automatically if inside Nimiq Pay or with query flag or dev mode
    setIsVisible(hasDebugFlag || insideApp || process.env.NODE_ENV === "development");
  }, [isInsideNimiqPay]);

  const executeAudit = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await runFullNimiqForensicTest({
        currentFrontendAddress: address,
        currentFrontendBalanceNim: balanceNim,
        currentBalanceStatus: balanceStatus,
      });
      setReport(res);
    } catch (err) {
      console.error("[ForensicPanel] Audit error:", err);
    } finally {
      setIsRunning(false);
    }
  }, [address, balanceNim, balanceStatus]);

  // Initial audit run on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void executeAudit();
    }, 1500);
    return () => clearTimeout(timer);
  }, [executeAudit]);

  const handleCopyReport = () => {
    if (!report) return;
    const markdown = formatEvidenceTable(report);
    navigator.clipboard.writeText(markdown);
    toast.success("Forensic Evidence Table copied to clipboard!");
  };

  const handleManualSync = async () => {
    setIsRunning(true);
    try {
      await syncNimiqPayAccount(5000);
      await executeAudit();
      toast.success("Synced with Nimiq Pay!");
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Nimiq Forensic Diagnostics"
      style={{
        position: "fixed",
        bottom: isExpanded ? "12px" : "16px",
        right: "12px",
        zIndex: 99999,
        maxWidth: isExpanded ? "420px" : "180px",
        width: isExpanded ? "calc(100vw - 24px)" : "auto",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "12px",
      }}
    >
      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true);
            void executeAudit();
          }}
          style={{
            background: "#0d1117",
            border: "1px solid #e5a000",
            color: "#e5a000",
            padding: "6px 12px",
            borderRadius: "9999px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontWeight: 700,
            letterSpacing: "0.5px",
          }}
        >
          <Activity size={14} className={isRunning ? "spin" : ""} />
          <span>🔬 NIMIQ DIAG</span>
          {report?.rpcStatus === "RPC_POSITIVE_BALANCE" ? (
            <span style={{ color: "#2ecc71" }}>●</span>
          ) : report?.rpcStatus === "RPC_ZERO_BALANCE" ? (
            <span style={{ color: "#f1c40f" }}>●</span>
          ) : (
            <span style={{ color: "#e74c3c" }}>●</span>
          )}
        </button>
      ) : (
        <div
          style={{
            background: "#0b0f19",
            border: "1px solid rgba(229, 160, 0, 0.4)",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.85)",
            color: "#e2e8f0",
            overflow: "hidden",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(229, 160, 0, 0.1)",
              borderBottom: "1px solid rgba(229, 160, 0, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Terminal size={15} style={{ color: "#e5a000" }} />
              <strong style={{ color: "#f8fafc", fontSize: "12px", letterSpacing: "1px" }}>
                NIMIQ FORENSIC DIAGNOSTICS
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={handleCopyReport}
                title="Copy formatted evidence report to clipboard"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#f8fafc",
                  borderRadius: "4px",
                  padding: "3px 6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                }}
              >
                <Copy size={11} /> Copy
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "2px",
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "12px 14px", overflowY: "auto", flex: 1 }}>
            {/* Build & SDK Meta */}
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                padding: "8px 10px",
                borderRadius: "6px",
                marginBottom: "10px",
                fontSize: "11px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Arena Build:</span>
                <strong style={{ color: "#38bdf8" }}>{report?.buildCommit}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                <span style={{ color: "#94a3b8" }}>SDK Version:</span>
                <span style={{ color: "#f8fafc" }}>@{report?.sdkVersion}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                <span style={{ color: "#94a3b8" }}>Host Webview:</span>
                <span style={{ color: report?.windowNimiqPresent ? "#2ecc71" : "#e74c3c" }}>
                  {report?.windowNimiqPresent ? "window.nimiq INJECTED" : "NO window.nimiq"}
                </span>
              </div>
            </div>

            {/* Pipeline Rows */}
            <div style={{ display: "grid", gap: "8px", fontSize: "11px" }}>
              {/* Provider */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8" }}>Provider:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      report?.providerStatus === "CONNECTED"
                        ? "#2ecc71"
                        : report?.providerStatus === "TIMED_OUT"
                        ? "#f59e0b"
                        : "#e74c3c",
                  }}
                >
                  {report?.providerStatus}
                </span>
              </div>

              {/* Connected Address */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Connected Address:</span>
                  <span style={{ color: "#94a3b8" }}>Len: {report?.connectedAddressLength || 0}</span>
                </div>
                <div
                  style={{
                    color: report?.connectedAddress ? "#e5a000" : "#e74c3c",
                    wordBreak: "break-all",
                    fontWeight: 600,
                    marginTop: "2px",
                    background: "rgba(0,0,0,0.25)",
                    padding: "4px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {report?.connectedAddress || "NONE (listAccounts returned empty or failed)"}
                </div>
              </div>

              {/* Network & Consensus */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Network:</span>
                <strong style={{ color: "#f8fafc" }}>{report?.networkConfigured} (5)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Consensus:</span>
                <span style={{ color: report?.consensusEstablished ? "#2ecc71" : "#e74c3c" }}>
                  {report?.consensusEstablished ? "ESTABLISHED" : "NOT SYNCED"} (Block #{report?.blockNumber ?? "N/A"})
                </span>
              </div>

              {/* RPC Status */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>TestAlbatross RPC:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        report?.rpcStatus === "RPC_POSITIVE_BALANCE"
                          ? "#2ecc71"
                          : report?.rpcStatus === "RPC_ZERO_BALANCE"
                          ? "#f1c40f"
                          : "#e74c3c",
                    }}
                  >
                    {report?.rpcStatus}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginTop: "2px" }}>
                  <span>Host: {report?.rpcHost}</span>
                  <span>{report?.rpcLatencyMs ? `${report.rpcLatencyMs} ms` : "timeout"}</span>
                </div>
                {report?.rpcError && (
                  <div style={{ color: "#f87171", marginTop: "2px" }}>Error: {report.rpcError}</div>
                )}
              </div>

              {/* Balances Comparison */}
              <div
                style={{
                  background: "rgba(229, 160, 0, 0.06)",
                  border: "1px solid rgba(229, 160, 0, 0.2)",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  marginTop: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>RPC Raw Balance:</span>
                  <strong style={{ color: "#f8fafc" }}>
                    {report?.rpcRawBalanceLuna !== null ? `${report?.rpcRawBalanceLuna} Luna` : "N/A"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ color: "#94a3b8" }}>RPC Converted:</span>
                  <strong style={{ color: "#2ecc71", fontSize: "13px" }}>
                    {report?.rpcConvertedBalanceNim !== null ? `${report?.rpcConvertedBalanceNim} NIM` : "N/A"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ color: "#94a3b8" }}>Frontend State:</span>
                  <strong style={{ color: "#38bdf8", fontSize: "13px" }}>
                    {report?.frontendStateBalanceNim !== null ? `${report?.frontendStateBalanceNim} NIM` : "0 NIM"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ color: "#94a3b8" }}>Balance UI Component:</span>
                  <span
                    style={{
                      color: report?.balanceComponentState === "RENDERED" ? "#2ecc71" : "#e74c3c",
                      fontWeight: 700,
                    }}
                  >
                    {report?.balanceComponentState}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Trail Toggle */}
            <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px" }}>
              <button
                onClick={() => setShowLogs(!showLogs)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  padding: 0,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <span>Boundary Audit Trail ({report?.auditLogs?.length || 0})</span>
                {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showLogs && (
                <div
                  style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    background: "#050810",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px",
                    padding: "6px",
                    marginTop: "6px",
                    fontSize: "10px",
                    color: "#cbd5e1",
                    display: "grid",
                    gap: "4px",
                  }}
                >
                  {report?.auditLogs?.map((log, i) => (
                    <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "2px" }}>
                      <span style={{ color: "#e5a000" }}>[{log.step}]</span> {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: "8px 14px",
              background: "rgba(0,0,0,0.4)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={executeAudit}
              disabled={isRunning}
              style={{
                flex: 1,
                background: "rgba(229, 160, 0, 0.15)",
                border: "1px solid #e5a000",
                color: "#e5a000",
                padding: "6px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "11px",
              }}
            >
              <RotateCw size={12} className={isRunning ? "spin" : ""} />
              Re-Audit
            </button>
            <button
              onClick={handleManualSync}
              disabled={isRunning}
              style={{
                flex: 1,
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid #38bdf8",
                color: "#38bdf8",
                padding: "6px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontSize: "11px",
              }}
            >
              <Shield size={12} />
              Sync Pay
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
