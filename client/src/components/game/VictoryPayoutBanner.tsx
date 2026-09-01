import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Trophy, ExternalLink, CheckCircle, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface VictoryPayoutBannerProps {
  matchId: string;
  winnerUserId: number;
  yourUserId: number;
  totalPotNim: number;
}

export function VictoryPayoutBanner({
  matchId,
  winnerUserId,
  yourUserId,
  totalPotNim,
}: VictoryPayoutBannerProps) {
  const isWinner = yourUserId === winnerUserId;
  const settlePayout = trpc.match.settlePayout.useMutation();
  const [settlement, setSettlement] = useState<{
    netPayoutNim: number;
    protocolFeeNim: number;
    payoutTxHash: string;
    explorerUrl: string;
  } | null>(null);

  useEffect(() => {
    if (totalPotNim <= 0) return;
    settlePayout
      .mutateAsync({ matchId, winnerUserId })
      .then(res => setSettlement(res))
      .catch(err => {
        console.error("Payout settlement note:", err);
      });
  }, [matchId, winnerUserId, totalPotNim]);

  if (totalPotNim <= 0) return null;

  return (
    <div
      style={{
        background: isWinner
          ? "linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(39, 174, 96, 0.05))"
          : "rgba(0, 0, 0, 0.2)",
        border: `1px solid ${isWinner ? "#2ecc71" : "rgba(251, 248, 241, 0.15)"}`,
        borderRadius: "8px",
        padding: "20px",
        margin: "16px 0",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <Trophy size={28} color={isWinner ? "#f1c40f" : "#95a5a6"} />
        <div>
          <span
            style={{
              fontSize: "11px",
              color: isWinner ? "#2ecc71" : "rgba(251, 248, 241, 0.6)",
              fontWeight: 600,
            }}
          >
            NIMIQ SMART ESCROW SETTLEMENT
          </span>
          <h3 style={{ margin: 0, fontSize: "18px", color: "var(--paper-bright)" }}>
            {isWinner ? "🎉 You Won the Escrow Pot!" : "Match Concluded"}
          </h3>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          background: "rgba(0, 0, 0, 0.2)",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "12px",
          fontSize: "12px",
        }}
      >
        <div>
          <span style={{ color: "rgba(251, 248, 241, 0.6)", display: "block" }}>
            Total Pot
          </span>
          <strong style={{ color: "var(--paper-bright)", fontSize: "14px" }}>
            {totalPotNim} NIM
          </strong>
        </div>
        <div>
          <span style={{ color: "rgba(251, 248, 241, 0.6)", display: "block" }}>
            Protocol Fee (2%)
          </span>
          <span style={{ color: "rgba(251, 248, 241, 0.8)" }}>
            {settlement ? `${settlement.protocolFeeNim} NIM` : "—"}
          </span>
        </div>
        <div>
          <span style={{ color: "rgba(251, 248, 241, 0.6)", display: "block" }}>
            Winner Payout
          </span>
          <strong
            style={{
              color: isWinner ? "#2ecc71" : "var(--orange)",
              fontSize: "14px",
            }}
          >
            {settlement ? `${settlement.netPayoutNim} NIM` : `${totalPotNim} NIM`}
          </strong>
        </div>
      </div>

      {settlement && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "11px",
            color: "rgba(251, 248, 241, 0.7)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={14} color="#2ecc71" /> Payout Hash:{" "}
            {settlement.payoutTxHash.slice(0, 18)}…
          </span>
          <a
            href={settlement.explorerUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--orange)",
              textDecoration: "none",
            }}
          >
            View on Nimiq Watch <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
}
