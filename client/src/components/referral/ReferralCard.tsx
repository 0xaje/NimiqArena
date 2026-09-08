import React, { useState } from "react";
import { Copy, Check, Users, Coins, Gift, Share2, Sparkles, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { toast } from "sonner";

export function ReferralCard() {
  const { data: stats, isLoading } = trpc.auth.getReferralStats.useQuery();
  const [copied, setCopied] = useState(false);

  const referralCode = stats?.referralCode || "player";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://arena.nimiq.com";
  const shareUrl = `${origin}/?ref=${referralCode}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Referral Link Copied!", {
      description: "Share it with friends to earn 5% of their match winnings + 500 Points!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(
      `⚔️ Battle me on Nimiq Arena! Instant micro-stakes Ludo & Connect NIM on the Nimiq blockchain. Claim 1,000 welcome points:`
    );
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    window.open(tgUrl, "_blank");
  };

  const points = stats?.points ?? 1000;
  const estimatedDollarValue = (points / 100).toFixed(2);
  const earningsNim = stats?.referralEarningsNim ?? 0;
  const totalReferred = stats?.totalReferred ?? 0;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #151d2f 0%, #0d1220 100%)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        borderRadius: "18px",
        padding: "22px",
        color: "#f8fafc",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbbf24",
            }}
          >
            <Gift size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
              INVITE & EARN (5% COMMISSION)
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Earn 5% of all match winnings from friends you invite
            </span>
          </div>
        </div>

        <span
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            color: "#4ade80",
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "20px",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          🎁 500 PTS / REFERRAL
        </span>
      </div>

      {/* Stats Counters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block" }}>
            FRIENDS REFERRED
          </span>
          <strong style={{ fontSize: "1.3rem", color: "#f8fafc" }}>
            {totalReferred}
          </strong>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "#fbbf24", display: "block" }}>
            COMMISSION EARNED
          </span>
          <strong style={{ fontSize: "1.3rem", color: "#fbbf24" }}>
            {formatNim(earningsNim)} NIM
          </strong>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "#38bdf8", display: "block" }}>
            ARENA POINTS
          </span>
          <strong style={{ fontSize: "1.3rem", color: "#38bdf8" }}>
            {points.toLocaleString()}
          </strong>
          <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>
            ≈ ${estimatedDollarValue} USD benchmark
          </span>
        </div>
      </div>

      {/* Shareable Link Box */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#94a3b8",
            marginBottom: "6px",
          }}
        >
          YOUR UNIQUE REFERRAL LINK
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            padding: "6px 8px 6px 14px",
          }}
        >
          <code
            style={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              color: "#fde047",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {shareUrl}
          </code>

          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#22c55e" : "rgba(245, 158, 11, 0.2)",
              color: copied ? "#ffffff" : "#fbbf24",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "COPIED" : "COPY"}
          </button>

          <button
            onClick={handleTelegramShare}
            style={{
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Share via Telegram"
          >
            <Share2 size={14} /> SHARE
          </button>
        </div>
      </div>
    </div>
  );
}
