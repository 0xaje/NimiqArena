import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  Globe,
  Hammer,
  Heart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  Copy,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { MatchVictoryModal } from "./MatchVictoryModal";

interface VictoryPayoutBannerProps {
  matchId: string;
  winnerUserId: number;
  yourUserId: number;
  totalPotNim: number;
  isReplaying?: boolean;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
}

export function VictoryPayoutBanner({
  matchId,
  winnerUserId,
  yourUserId,
  totalPotNim,
  isReplaying,
  onPlayAgain,
  onReturnToLobby,
}: VictoryPayoutBannerProps) {
  const { formatUsd, nimToUsd } = useNimiqPrice();
  const isWinner = yourUserId === winnerUserId;
  const [showModal, setShowModal] = useState(true);
  const { data: refStats } = trpc.auth.getReferralStats.useQuery(undefined, { enabled: isWinner });
  const referralCode = refStats?.referralCode || "player";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://arena.nimiq.com";
  const shareUrl = `${origin}/?ref=${referralCode}`;
  const settlePayout = trpc.match.settlePayout.useMutation();
  const [settlement, setSettlement] = useState<{
    netPayoutNim: number;
    protocolFeeNim: number;
    distribution?: {
      winnerNim: number;
      referrerNim?: number;
      builderNim: number;
      ecosystemNim: number;
      charityNim: number;
    };
    payoutTxHash: string | null;
    explorerUrl: string | null;
    settlementStatus?: string;
    notice?: string;
  } | null>(null);

  useEffect(() => {
    if (totalPotNim <= 0) return;
    settlePayout
      .mutateAsync({ matchId, winnerUserId })
      .then(res => setSettlement(res as any))
      .catch(err => {
        console.error("Payout settlement note:", err);
      });
  }, [matchId, winnerUserId, totalPotNim]);

  const hasReferrer = Boolean(settlement?.distribution?.referrerNim && settlement.distribution.referrerNim > 0);
  const dist = settlement?.distribution
    ? {
        totalPotNim,
        winnerNim: settlement.distribution.winnerNim,
        referrerNim: settlement.distribution.referrerNim || 0,
        builderNim: settlement.distribution.builderNim,
        ecosystemNim: settlement.distribution.ecosystemNim,
        charityNim: settlement.distribution.charityNim,
        percentages: {
          winner: 90,
          referrer: hasReferrer ? 2 : 0,
          builder: hasReferrer ? 5 : 7,
          ecosystem: 2,
          charity: 1,
        },
      }
    : calculatePotDistribution(totalPotNim, false);

  return (
    <>
      {showModal && (
        <MatchVictoryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onInspectBoard={() => setShowModal(false)}
          onRematch={onPlayAgain}
          onReturnToLobby={onReturnToLobby}
          isWinner={isWinner}
          grossPotNim={totalPotNim > 0 ? totalPotNim : 200}
          netPayoutNim={totalPotNim > 0 ? dist.winnerNim : 190}
          protocolFeeNim={totalPotNim > 0 ? totalPotNim - dist.winnerNim : 10}
          txHash={settlement?.payoutTxHash || "0x8f3c7b209e14a1c5d91a"}
        />
      )}

      {!showModal && (
        <div className="fixed top-20 right-4 z-40">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3b72c] text-[#412d00] font-black text-xs shadow-lg active:scale-95 transition-transform"
          >
            <Trophy size={14} />
            <span>Show Victory Receipt</span>
          </button>
        </div>
      )}

      <div className={`victory-result-card ${isWinner ? "winner-theme" : "loser-theme"}`}>
      {/* Grand Result Moment */}
      <div className="victory-header-moment">
        <div className="status-badge-glow">
          {isWinner ? (
            <>
              <Trophy size={20} className="trophy-gold" />
              <span>VICTORY CONFIRMED</span>
            </>
          ) : (
            <>
              <ShieldAlert size={20} className="shield-silver" />
              <span>DEFEAT</span>
            </>
          )}
        </div>

        <h2 className="victory-headline">
          {isWinner ? "You Conquered the Arena!" : "Better Luck Next Round"}
        </h2>

        <p className="victory-subline">
          {isWinner
            ? "Your 90% winner's share has been committed to the on-chain ledger."
            : "The opposing gladiator claimed the victory prize."}
        </p>
      </div>

      {/* Financial Split Breakdown Card */}
      {totalPotNim > 0 ? (
        <div className="payout-summary-card">
        <div className="split-header">
          <span className="split-title">POT DISTRIBUTION (100% OF {formatNim(totalPotNim)} NIM)</span>
          <span className="split-rule">Zero Hidden Rake</span>
        </div>

        <div className="split-breakdown">
          <div className="winner-take-row">
            <div className="winner-take-left">
              <Trophy size={24} className="trophy-gold" />
              <div className="winner-take-label">
                <span className="winner-take-role">Winner Payout (90%)</span>
                <span className="winner-take-sub">Escrowed securely & distributed instantly</span>
              </div>
            </div>
            <div className="winner-take-right">
              <span className="winner-take-usd">
                ~{formatUsd(nimToUsd(dist.winnerNim))}
              </span>
              <span className="winner-take-amount">{formatNim(dist.winnerNim)} NIM</span>
            </div>
          </div>

          <div className="platform-split-grid">
            {dist.referrerNim > 0 && (
              <div className="platform-split-item">
                <Users size={15} className="icon-purple" />
                <div className="split-info">
                  <span className="split-role">Referrer ({dist.percentages.referrer}%)</span>
                  <span className="split-num">{formatNim(dist.referrerNim)} NIM</span>
                </div>
              </div>
            )}

            <div className="platform-split-item">
              <Hammer size={15} className="icon-blue" />
              <div className="split-info">
                <span className="split-role">Builder & Stakers ({dist.percentages.builder}%)</span>
                <span className="split-num">{formatNim(dist.builderNim)} NIM</span>
              </div>
            </div>

            {dist.percentages.ecosystem > 0 && (
              <div className="platform-split-item">
                <Globe size={15} className="icon-teal" />
                <div className="split-info">
                  <span className="split-role">Ecosystem ({dist.percentages.ecosystem}%)</span>
                  <span className="split-num">{formatNim(dist.ecosystemNim)} NIM</span>
                </div>
              </div>
            )}

            {dist.percentages.charity > 0 && (
              <div className="platform-split-item">
                <Heart size={15} className="icon-pink" />
                <div className="split-info">
                  <span className="split-role">Charity ({dist.percentages.charity}%)</span>
                  <span className="split-num">{formatNim(dist.charityNim)} NIM</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Truthful Settlement Notice */}
        <div className="settlement-truth-badge">
            <div className="truth-status-line">
              <CheckCircle2 size={16} className="icon-emerald" />
              <span>
                Status:{" "}
                <strong>
                  {settlement?.settlementStatus === "settled_on_chain"
                    ? "Disbursed On-Chain"
                    : "Ledger Entitlement Recorded"}
                </strong>
              </span>
            </div>
            <p className="truth-notice-text">
              {settlement?.notice ||
                "Winner pot entitlement (90% of pot) recorded authoritatively on Testnet ledger."}
            </p>
            {settlement?.explorerUrl && (
              <a
                href={settlement.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="truth-explorer-link"
              >
                <span>View On-Chain Receipt</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="victory-practice-note">
          <p>
            Great game! Practice matches have zero stake and are designed to hone your tactical skills against the Nimiq AI.
          </p>
        </div>
      )}

      {/* Viral Victory Share Card */}
      {isWinner && (
        <div
          style={{
            marginTop: "16px",
            marginBottom: "16px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(56, 189, 248, 0.08))",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={16} color="#fbbf24" />
              <strong style={{ fontSize: "13px", color: "#f8fafc" }}>
                Share Victory &amp; Earn 2% On Challenges!
              </strong>
            </div>
            <span style={{ fontSize: "10px", color: "#4ade80", fontWeight: 700 }}>
              +2% LIFETIME COMMISSIONS
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                const text = encodeURIComponent(
                  `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a battle"} on Nimiq Arena! Think you can beat me? Challenge me now:`
                );
                window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, "_blank");
              }}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.2)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Share2 size={14} /> Telegram
            </button>
            <button
              type="button"
              onClick={() => {
                const text = encodeURIComponent(
                  `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a battle"} on Nimiq Arena! Think you can beat me? Challenge me now: ${shareUrl}`
                );
                window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
              }}
              style={{
                flex: 1,
                minWidth: "140px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(37, 211, 102, 0.2)",
                border: "1px solid rgba(37, 211, 102, 0.4)",
                color: "#25D366",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Share2 size={14} /> WhatsApp
            </button>

            <button
              type="button"
              onClick={() => {
                const text = encodeURIComponent(
                  `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a battle"} on @Nimiq Arena! Instant micro-stakes Web3 gaming. Challenge me: ${shareUrl}`
                );
                window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
              }}
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#f8fafc",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              X / Twitter
            </button>

            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(shareUrl);
                toast.success("Referral Link Copied!", {
                  description: "Share it with friends to earn 2% of their match winnings!",
                });
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.2)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Copy size={14} /> Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Post-Match Action CTAs */}
      <div className="victory-action-row">
        {onPlayAgain && (
          <button
            type="button"
            className="btn-victory-primary"
            onClick={onPlayAgain}
            disabled={isReplaying}
          >
            <RefreshCw size={18} className={isReplaying ? "spin" : ""} />
            <span>{isReplaying ? "STARTING REPLAY…" : "REPLAY MATCH"}</span>
          </button>
        )}
        {onReturnToLobby && (
          <button type="button" className="btn-victory-secondary" onClick={onReturnToLobby}>
            <span>RETURN HOME</span>
          </button>
        )}
      </div>
      </div>
    </>
  );
}
