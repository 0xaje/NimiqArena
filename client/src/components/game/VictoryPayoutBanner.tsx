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
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";

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
          builder: 8,
          ecosystem: hasReferrer ? 0 : 1,
          charity: hasReferrer ? 0 : 1,
        },
      }
    : calculatePotDistribution(totalPotNim);

  return (
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
  );
}
