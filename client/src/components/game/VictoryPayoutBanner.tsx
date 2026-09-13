import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
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
  Gamepad2,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";

export interface VictoryPayoutBannerProps {
  matchId: string;
  winnerUserId: number;
  yourUserId: number;
  totalPotNim: number;
  isReplaying?: boolean;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
  gameSlug?: string;
  gameTitle?: string;
  p1Name?: string;
  p2Name?: string;
  turnCount?: number;
}

export function VictoryPayoutBanner({
  matchId,
  winnerUserId,
  yourUserId,
  totalPotNim,
  isReplaying,
  onPlayAgain,
  onReturnToLobby,
  gameSlug,
  gameTitle,
  p1Name = "Player 1",
  p2Name = "Nimiq AI",
  turnCount = 1,
}: VictoryPayoutBannerProps) {
  const { formatUsd, nimToUsd } = useNimiqPrice();
  const isWinner = yourUserId === winnerUserId;
  const isFreeMatch = totalPotNim <= 0;

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

  const displayGameTitle = gameTitle || (gameSlug === "connect-four" ? "Connect 4 NIM" : "Ludo Blitz");

  return (
    <div className="fixed inset-0 z-50 bg-[#080e1c]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className={`victory-result-card w-full max-w-lg ${isWinner ? "winner-theme" : "loser-theme"} my-auto animate-in fade-in zoom-in-95 duration-200`}>
        {/* Grand Result Moment */}
        <div className="victory-header-moment">
          <div className="trophy-ring">
            {isWinner ? (
              <Trophy size={42} className="trophy-gold" />
            ) : (
              <ShieldAlert size={42} className="shield-silver" />
            )}
          </div>

          <div className="status-badge-glow">
            {isWinner ? (
              <>
                <Sparkles size={16} className="text-[#f3b72c]" />
                <span>VICTORY CONFIRMED</span>
              </>
            ) : (
              <>
                <ShieldAlert size={16} className="text-[#94a3b8]" />
                <span>DEFEAT</span>
              </>
            )}
          </div>

          <h2 className="victory-main-title mt-2">
            {isWinner ? "You Conquered the Arena!" : "Better Luck Next Round"}
          </h2>

          <p className="victory-subline mt-1">
            {isWinner
              ? isFreeMatch
                ? "Great match! You outplayed the opponent in this practice duel."
                : "Your 90% winner's share has been committed to the on-chain ledger."
              : isFreeMatch
              ? "Good effort! Practice matches are free to play and sharpen your tactics."
              : "The opposing player claimed the match prize pool."}
          </p>
        </div>

        {/* Real Matchup Details Card */}
        <div className="p-3 rounded-xl bg-[#080e1c]/80 border border-[#242a39] mb-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} className="text-[#f3b72c]" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-[#94a3b8] uppercase">Game &amp; Table</span>
              <span className="text-xs font-bold text-[#dde2f6]">{displayGameTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Swords size={16} className="text-[#00d2ff]" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[#94a3b8] uppercase">Opponent</span>
              <span className="text-xs font-bold text-[#dde2f6]">vs {p2Name}</span>
            </div>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] text-[#94a3b8] uppercase">Rounds</span>
            <span className="text-xs font-bold text-[#ffd78d]">Turn {turnCount}</span>
          </div>
        </div>

        {/* Financial Split Breakdown Card or Free Practice Banner */}
        {!isFreeMatch ? (
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
                    <span className="winner-take-sub">Escrowed securely &amp; distributed instantly</span>
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
                    <span className="split-role">Builder &amp; Stakers ({dist.percentages.builder}%)</span>
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
          <div className="p-3.5 rounded-xl bg-[#080e1c] border border-[#2f3544] mb-3 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center shrink-0 text-[#10b981]">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#dde2f6] font-mono">
                  FREE PRACTICE ARENA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10b981]/20 text-[#10b981] font-mono">
                  0 NIM STAKE
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">
                Practice matches have zero wagered funds. This match outcome is recorded directly in your player stats!
              </p>
            </div>
          </div>
        )}

        {/* Viral Victory Share Card */}
        {isWinner && (
          <div
            style={{
              marginTop: "12px",
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(56, 189, 248, 0.08))",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={15} color="#fbbf24" />
                <strong style={{ fontSize: "12px", color: "#f8fafc" }}>
                  Share Victory &amp; Earn 2% On Challenges!
                </strong>
              </div>
              <span style={{ fontSize: "10px", color: "#4ade80", fontWeight: 700, fontFamily: "monospace" }}>
                +2% COMMISSIONS
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a match"} on Nimiq Arena! Think you can beat me? Challenge me now:`
                  );
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, "_blank");
                }}
                style={{
                  flex: 1,
                  minWidth: "100px",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.2)",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  color: "#38bdf8",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <Share2 size={13} /> Telegram
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a match"} on Nimiq Arena! Think you can beat me? Challenge me now: ${shareUrl}`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                }}
                style={{
                  flex: 1,
                  minWidth: "100px",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  background: "rgba(37, 211, 102, 0.2)",
                  border: "1px solid rgba(37, 211, 102, 0.4)",
                  color: "#25D366",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <Share2 size={13} /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `⚔️ I just won ${totalPotNim > 0 ? formatNim(dist.winnerNim) + " NIM" : "a match"} on @Nimiq Arena! Non-custodial Web3 gaming arcade. Challenge me: ${shareUrl}`
                  );
                  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
                }}
                style={{
                  flex: 1,
                  minWidth: "90px",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#f8fafc",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
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
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.2)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fbbf24",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <Copy size={13} /> Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Post-Match Action CTAs */}
        <div className="victory-action-row mt-2">
          {onPlayAgain && (
            <button
              type="button"
              className="btn-victory-primary"
              onClick={onPlayAgain}
              disabled={isReplaying}
            >
              <RefreshCw size={17} className={isReplaying ? "spin" : ""} />
              <span>{isReplaying ? "STARTING REPLAY…" : "PLAY AGAIN"}</span>
            </button>
          )}
          {onReturnToLobby && (
            <button type="button" className="btn-victory-secondary" onClick={onReturnToLobby}>
              <span>RETURN HOME</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
