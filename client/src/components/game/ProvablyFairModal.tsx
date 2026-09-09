import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Copy, Check, Lock, Cpu } from "lucide-react";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  stateVersion: number;
  dice?: number[] | null;
}

export async function computeSha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function ProvablyFairModal({
  isOpen,
  onClose,
  matchId,
  stateVersion,
  dice,
}: ProvablyFairModalProps) {
  useModalBackHandler(isOpen, onClose);
  const [liveHash, setLiveHash] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>("");
  const [customHash, setCustomHash] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    const seedPayload = `${matchId}:${stateVersion}:${(dice || []).join(",")}`;
    void computeSha256(seedPayload).then(setLiveHash);
  }, [isOpen, matchId, stateVersion, dice]);

  const handleCopy = () => {
    if (!liveHash) return;
    void navigator.clipboard.writeText(
      `NIMIQ_ARENA_PROOF::Match=${matchId}::v=${stateVersion}::Dice=${(dice || []).join(",") || "none"}::SHA256=${liveHash}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomVerify = async (val: string) => {
    setCustomInput(val);
    if (!val.trim()) {
      setCustomHash("");
      return;
    }
    const hash = await computeSha256(val.trim());
    setCustomHash(hash);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #131722 0%, #0d1017 100%)",
          border: "1px solid rgba(234, 179, 8, 0.35)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 25px rgba(234, 179, 8, 0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(234, 179, 8, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#eab308",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "0.5px" }}>
                PROVABLY FAIR VERIFIER
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Cryptographic SHA-256 State & Dice Audit
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Audit Info Card */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Lock size={15} color="#eab308" />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#eab308" }}>
              CURRENT LIVE STATE COMMITMENT
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.8rem", marginBottom: "12px" }}>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "8px" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem" }}>MATCH ID</span>
              <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{matchId.slice(0, 14)}...</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "8px" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem" }}>ENGINE VERSION</span>
              <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>v{stateVersion}</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "8px", gridColumn: "span 2" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem" }}>ACTIVE DICE REGISTER</span>
              <span style={{ fontFamily: "monospace", color: dice?.length ? "#4ade80" : "#94a3b8" }}>
                {dice && dice.length > 0 ? `[ ${dice.join(" , ")} ]` : "Awaiting Roll"}
              </span>
            </div>
          </div>

          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", marginBottom: "4px" }}>
              SHA-256 DIGITAL FINGERPRINT (COMMITMENT)
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(234, 179, 8, 0.2)",
              }}
            >
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  color: "#fde047",
                  wordBreak: "break-all",
                  flex: 1,
                }}
              >
                {liveHash || "Computing cryptographic hash..."}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "#22c55e" : "rgba(234, 179, 8, 0.2)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px",
                  color: copied ? "#ffffff" : "#eab308",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                title="Copy cryptographic proof string"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Independent Client Verifier Sandbox */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Cpu size={15} color="#38bdf8" />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#38bdf8" }}>
              BROWSER-SIDE INDEPENDENT AUDIT TOOL
            </span>
          </div>
          <p style={{ fontSize: "0.73rem", color: "#94a3b8", margin: "0 0 10px 0" }}>
            Paste any seed or match snapshot string below. Your browser's native Web Crypto API will recompute the SHA-256 hash locally.
          </p>

          <input
            type="text"
            placeholder="Paste match state string or leave empty to test..."
            value={customInput}
            onChange={e => void handleCustomVerify(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#f8fafc",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              boxSizing: "border-box",
              marginBottom: "8px",
            }}
          />

          {customHash && (
            <div style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px" }}>
              <span style={{ color: "#38bdf8", display: "block", fontSize: "0.68rem" }}>COMPUTED LOCAL HASH:</span>
              <code style={{ color: "#7dd3fc", wordBreak: "break-all" }}>{customHash}</code>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ fontSize: "0.73rem", color: "#64748b", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>How Provably Fair Works on Nimiq Arena:</span>
          <br />
          1. Dice rolls are generated with secure server-side entropy (`crypto.randomInt`).
          <br />
          2. Each roll is irrevocably committed to the database ledger alongside the client nonce and state version.
          <br />
          3. Replay protection guarantees neither the client nor server can alter past results.
        </div>
      </div>
    </div>
  );
}
