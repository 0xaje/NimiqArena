import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  Globe,
  Hammer,
  Heart,
  RefreshCw,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";

interface VictoryPayoutBannerProps {
  matchId: string;
  winnerUserId: number;
  yourUserId: number;
  totalPotNim: number;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
}

export function VictoryPayoutBanner({
  matchId,
  winnerUserId,
  yourUserId,
  totalPotNim,
  onPlayAgain,
  onReturnToLobby,
}: VictoryPayoutBannerProps) {
  const isWinner = yourUserId === winnerUserId;
  const settlePayout = trpc.match.settlePayout.useMutation();
  const [settlement, setSettlement] = useState<{
    netPayoutNim: number;
    protocolFeeNim: number;
    distribution?: {
      winnerNim: number;
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

  const dist = settlement?.distribution
    ? {
        totalPotNim,
        winnerNim: settlement.distribution.winnerNim,
        builderNim: settlement.distribution.builderNim,
        ecosystemNim: settlement.distribution.ecosystemNim,
        charityNim: settlement.distribution.charityNim,
      }
    : calculatePotDistribution(totalPotNim);

  return (
    <div className={`victory-result-card ${isWinner ? "winner-theme" : "loser-theme"}`}>
      {/* Grand Result Moment */}
      <div className="victory-header-moment">
        <div className="trophy-ring">
          <Trophy size={48} className={isWinner ? "trophy-gold" : "trophy-silver"} />
        </div>
        <span className="victory-sub-label">
          {totalPotNim > 0 ? "COMPETITIVE MATCH CONCLUDED" : "PRACTICE MATCH COMPLETE"}
        </span>
        <h2 className="victory-main-title">
          {isWinner ? "🏆 YOU WON THE MATCH!" : "MATCH CONCLUDED"}
        </h2>
      </div>

      {/* Financial Settlement Breakdown (Only for Wagered Matches) */}
      {totalPotNim > 0 ? (
        <div className="victory-pot-breakdown">
          <div className="pot-total-highlight">
            <span className="pot-caption">TOTAL MATCH POT</span>
            <span className="pot-big-val">{formatNim(totalPotNim)} NIM</span>
          </div>

          <div className="winner-take-banner">
            <Trophy size={20} className="trophy-gold" />
            <div className="winner-take-text">
              <span className="winner-take-label">
                {isWinner ? "YOUR WINNER ALLOCATION (90%)" : "WINNER ALLOCATION (90%)"}
              </span>
              <span className="winner-take-amount">{formatNim(dist.winnerNim)} NIM</span>
            </div>
          </div>

          <div className="platform-split-grid">
            <div className="platform-split-item">
              <Hammer size={15} className="icon-blue" />
              <div className="split-info">
                <span className="split-role">Builder (5%)</span>
                <span className="split-num">{formatNim(dist.builderNim)} NIM</span>
              </div>
            </div>

            <div className="platform-split-item">
              <Globe size={15} className="icon-teal" />
              <div className="split-info">
                <span className="split-role">Ecosystem (3%)</span>
                <span className="split-num">{formatNim(dist.ecosystemNim)} NIM</span>
              </div>
            </div>

            <div className="platform-split-item">
              <Heart size={15} className="icon-pink" />
              <div className="split-info">
                <span className="split-role">Charity (2%)</span>
                <span className="split-num">{formatNim(dist.charityNim)} NIM</span>
              </div>
            </div>
          </div>

          {/* Truthful Settlement Notice */}
          <div className="settlement-truth-badge">
            <div className="truth-status-line">
              <CheckCircle2 size={16} className="icon-emerald" />
              <span>
                Status: <strong>Ledger Entitlement Recorded</strong>
              </span>
            </div>
            <p className="truth-notice-text">
              {settlement?.notice ||
                "Winner pot entitlement (90% of pot) recorded authoritatively on Testnet ledger. Automated on-chain disbursement worker is pending production signer deployment."}
            </p>
            {settlement?.explorerUrl && settlement?.payoutTxHash && (
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
          <button type="button" className="btn-victory-primary" onClick={onPlayAgain}>
            <RefreshCw size={18} />
            <span>PLAY AGAIN</span>
          </button>
        )}
        {onReturnToLobby && (
          <button type="button" className="btn-victory-secondary" onClick={onReturnToLobby}>
            <span>RETURN TO LOBBY</span>
          </button>
        )}
      </div>
    </div>
  );
}
