import React, { useEffect, useState } from "react";
import {
  Trophy,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Eye,
  Share2,
  Copy,
  ExternalLink,
  ArrowRight,
  Gamepad2,
  Swords,
  Coins,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
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
  p2Name = "Opponent",
  turnCount = 1,
}: VictoryPayoutBannerProps) {
  const { formatUsd, nimToUsd } = useNimiqPrice();
  
  const isDraw = winnerUserId === 0;
  const isWinner = !isDraw && yourUserId === winnerUserId;
  const isDefeat = !isDraw && !isWinner;
  const isFreeMatch = totalPotNim <= 0;

  const { data: refStats } = trpc.auth.getReferralStats.useQuery(undefined, { enabled: isWinner });
  const referralCode = refStats?.referralCode || "player";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://arena.nimiq.com";
  const shareUrl = `${origin}/?ref=${referralCode}`;
  const settlePayout = trpc.match.settlePayout.useMutation();

  const [settlement, setSettlement] = useState<{
    netPayoutNim: number;
    protocolFeeNim: number;
    payoutTxHash: string | null;
    explorerUrl: string | null;
    settlementStatus?: string;
    isDraw?: boolean;
    notice?: string;
  } | null>(null);

  useEffect(() => {
    if (totalPotNim <= 0) return;
    settlePayout
      .mutateAsync({ matchId, winnerUserId: winnerUserId || 0 })
      .then((res: any) => setSettlement(res))
      .catch((err) => {
        console.error("Payout settlement note:", err);
      });
  }, [matchId, winnerUserId, totalPotNim]);

  const displayGameTitle =
    gameTitle || (gameSlug === "connect-four" ? "Connect 4 NIM" : "Ludo Blitz");

  const stakePerPlayerNim = totalPotNim > 0 ? totalPotNim / 2 : 0;
  const winnerNetNim = settlement?.netPayoutNim ?? totalPotNim * 0.9;
  const refundNetNim = stakePerPlayerNim;

  return (
    <div className="fixed inset-0 z-50 bg-[#080e1c]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onReturnToLobby} />

      {/* Main Elevated Card */}
      <div
        className={`w-full max-w-md bg-[#151b29] border rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.9)] p-5 sm:p-6 flex flex-col relative z-10 my-auto overflow-hidden animate-in zoom-in-95 duration-300 ${
          isWinner
            ? "border-[#f3b72c]/40 shadow-[0_0_40px_rgba(243,183,44,0.18)]"
            : isDraw
            ? "border-[#68f5b8]/40 shadow-[0_0_40px_rgba(104,245,184,0.15)]"
            : "border-[#2f3544]"
        }`}
      >
        {/* Top Radial Glow Accent */}
        <div
          className={`absolute -top-24 inset-x-0 h-44 rounded-full blur-3xl pointer-events-none ${
            isWinner
              ? "bg-[#f3b72c]/20"
              : isDraw
              ? "bg-[#68f5b8]/15"
              : "bg-[#00d2ff]/10"
          }`}
        />

        {/* 1. HERO TROPHY / BADGE */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shadow-lg transition-transform hover:scale-105 ${
              isWinner
                ? "bg-gradient-to-br from-[#f3b72c] to-[#d97706] text-[#412d00] shadow-[0_0_24px_rgba(243,183,44,0.4)] ring-4 ring-[#f3b72c]/30"
                : isDraw
                ? "bg-gradient-to-br from-[#68f5b8] to-[#10b981] text-[#042f1f] shadow-[0_0_24px_rgba(104,245,184,0.35)] ring-4 ring-[#68f5b8]/30"
                : "bg-gradient-to-br from-[#242a39] to-[#191f2e] text-[#94a3b8] ring-2 ring-[#2f3544]"
            }`}
          >
            {isWinner ? (
              <Trophy size={42} className="animate-bounce" />
            ) : isDraw ? (
              <Scale size={40} />
            ) : (
              <ShieldAlert size={40} />
            )}
          </div>

          {/* Outcome Status Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase mb-2 ${
              isWinner
                ? "bg-[#f3b72c]/15 text-[#ffd78d] border border-[#f3b72c]/40"
                : isDraw
                ? "bg-[#68f5b8]/15 text-[#68f5b8] border border-[#68f5b8]/40"
                : "bg-[#242a39] text-[#94a3b8] border border-[#2f3544]"
            }`}
          >
            {isWinner ? (
              <>
                <Sparkles size={14} className="text-[#f3b72c]" />
                <span>VICTORY CONFIRMED</span>
              </>
            ) : isDraw ? (
              <>
                <CheckCircle2 size={14} className="text-[#68f5b8]" />
                <span>MATCH DRAW • STAKES REFUNDED</span>
              </>
            ) : (
              <>
                <ShieldAlert size={14} className="text-[#94a3b8]" />
                <span>MATCH DEFEAT</span>
              </>
            )}
          </div>

          <h2 className="text-2xl font-black text-[#dde2f6] tracking-tight">
            {isWinner
              ? "You Won the Arena!"
              : isDraw
              ? "Stalemate — 100% Refund"
              : "Defeat this Round"}
          </h2>

          <p className="text-xs text-[#d4c5ad] mt-1 max-w-[320px] leading-relaxed">
            {isWinner
              ? isFreeMatch
                ? "Tactical mastery! You defeated your opponent in this free duel."
                : "Your 90% prize pool entitlement is locked and credited to your wallet."
              : isDraw
              ? "The board filled with no 4-in-a-row. Both players received 100% of their deposit back."
              : isFreeMatch
              ? "Good fight! Free matches sharpen your strategy for competitive tables."
              : "Your opponent claimed the prize pool this round. Ready for a rematch?"}
          </p>
        </div>

        {/* 2. PAYOUT HIGHLIGHT BOX */}
        <div
          className={`mt-4 p-4 rounded-2xl border flex items-center justify-between font-mono relative z-10 ${
            isWinner
              ? "bg-[#080e1c] border-[#f3b72c]/40 shadow-inner"
              : isDraw
              ? "bg-[#080e1c] border-[#68f5b8]/30 shadow-inner"
              : "bg-[#080e1c] border-[#242a39]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isWinner
                  ? "bg-[#f3b72c]/15 text-[#f3b72c]"
                  : isDraw
                  ? "bg-[#68f5b8]/15 text-[#68f5b8]"
                  : "bg-[#242a39] text-[#94a3b8]"
              }`}
            >
              <Coins size={22} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase tracking-wider text-[#d4c5ad]">
                {isWinner
                  ? "Net Winner Prize"
                  : isDraw
                  ? "Returned to Wallet"
                  : "Match Wager Pool"}
              </span>
              <span className="text-xs text-[#94a3b8]">
                {isFreeMatch
                  ? "Free Practice Duel"
                  : isWinner
                  ? `≈ ${formatUsd(nimToUsd(winnerNetNim))} USD`
                  : isDraw
                  ? `100% Stake Returned`
                  : `${formatNim(totalPotNim)} NIM total pot`}
              </span>
            </div>
          </div>

          <div className="flex flex-col text-right">
            <span
              className={`text-xl font-black ${
                isWinner
                  ? "text-[#ffd78d]"
                  : isDraw
                  ? "text-[#68f5b8]"
                  : "text-[#dde2f6]"
              }`}
            >
              {isFreeMatch
                ? "0 NIM"
                : isWinner
                ? `+${formatNim(winnerNetNim)} NIM`
                : isDraw
                ? `${formatNim(refundNetNim)} NIM`
                : `${formatNim(stakePerPlayerNim)} NIM`}
            </span>
            <span className="text-[10px] font-bold text-[#f3b72c] uppercase tracking-wider">
              {isFreeMatch
                ? "PRACTICE"
                : isWinner
                ? "90% WINNER TAKE"
                : isDraw
                ? "FULL REFUND"
                : "COMPLETED"}
            </span>
          </div>
        </div>

        {/* 3. MATCH STATS STRIP */}
        <div className="mt-3 p-3 rounded-xl bg-[#080e1c]/60 border border-[#242a39] flex items-center justify-between text-xs font-mono relative z-10">
          <div className="flex items-center gap-2 text-left">
            <Gamepad2 size={15} className="text-[#f3b72c]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-[#94a3b8]">Game</span>
              <span className="text-xs font-bold text-[#dde2f6]">{displayGameTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-left">
            <Swords size={15} className="text-[#00d2ff]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-[#94a3b8]">Matchup</span>
              <span className="text-xs font-bold text-[#dde2f6]">vs {p2Name}</span>
            </div>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[9px] uppercase text-[#94a3b8]">Duration</span>
            <span className="text-xs font-bold text-[#ffd78d]">Turn {turnCount}</span>
          </div>
        </div>

        {/* 4. VIRAL VICTORY SHARE (Winner only) */}
        {isWinner && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#f3b72c]/10 via-[#00d2ff]/10 to-transparent border border-[#f3b72c]/30 flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#f3b72c]" />
                <span className="text-xs font-bold text-[#dde2f6]">
                  Share Victory &amp; Earn 2% On Challenges
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#68f5b8]">
                +2% COMMISSIONS
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `⚔️ I just won ${
                      totalPotNim > 0 ? formatNim(winnerNetNim) + " NIM" : "a match"
                    } on Nimiq Arena! Think you can beat me? Challenge me now:`
                  );
                  window.open(
                    `https://t.me/share/url?url=${encodeURIComponent(
                      shareUrl
                    )}&text=${text}`,
                    "_blank"
                  );
                }}
                className="flex-1 py-1.5 rounded-lg bg-[#00d2ff]/15 border border-[#00d2ff]/30 hover:bg-[#00d2ff]/25 text-[#00d2ff] text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 size={12} /> Telegram
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent(
                    `⚔️ I just won ${
                      totalPotNim > 0 ? formatNim(winnerNetNim) + " NIM" : "a match"
                    } on @Nimiq Arena! Non-custodial Web3 gaming arcade. Challenge me: ${shareUrl}`
                  );
                  window.open(
                    `https://twitter.com/intent/tweet?text=${text}`,
                    "_blank"
                  );
                }}
                className="flex-1 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 text-white text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                X / Twitter
              </button>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(shareUrl);
                  toast.success("Referral Link Copied!");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#f3b72c]/15 border border-[#f3b72c]/30 hover:bg-[#f3b72c]/25 text-[#ffd78d] text-[11px] font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="Copy Invite Link"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        )}

        {/* 5. ACTION BUTTONS */}
        <div className="mt-4 flex flex-col gap-2 relative z-10">
          {/* Direct Replay Button (Solves dispute & lets players review exact moves) */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `/matches/${matchId}/replay`;
            }}
            className="w-full h-11 rounded-xl bg-[#191f2e] border border-[#00d2ff]/40 hover:border-[#00d2ff] text-[#00d2ff] hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.15)] active:scale-95 transition-all cursor-pointer"
          >
            <Eye size={16} />
            <span>WATCH MOVE-BY-MOVE REPLAY</span>
          </button>

          <div className="flex gap-2">
            {onPlayAgain && (
              <button
                type="button"
                onClick={onPlayAgain}
                disabled={isReplaying}
                className="flex-1 h-12 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(243,183,44,0.3)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={16} className={isReplaying ? "animate-spin" : ""} />
                <span>{isReplaying ? "STARTING…" : "PLAY AGAIN"}</span>
              </button>
            )}

            {onReturnToLobby && (
              <button
                type="button"
                onClick={onReturnToLobby}
                className="flex-1 h-12 rounded-xl bg-[#151b29] border border-[#2f3544] hover:bg-[#191f2e] text-[#dde2f6] font-mono text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>RETURN HOME</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
