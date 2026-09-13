import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Trophy,
  Zap,
  Swords,
  Share2,
  Check,
  X,
  History,
  Gamepad2,
  ShieldCheck,
  Flame,
  Award,
  Shield,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatNim } from "@shared/game/pot-distribution";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export interface MatchVictoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onRematch?: () => void;
  onReturnToLobby?: () => void;
  onInspectBoard?: () => void;

  // Match details
  isWinner?: boolean;
  gameTitle?: string;
  winNarrative?: string;
  blockHeight?: number;

  // Head to Head
  winnerName?: string;
  winnerClan?: string;
  winnerAvatar?: string;
  winnerScore?: string;
  loserName?: string;
  loserClan?: string;
  loserAvatar?: string;

  // Escrow Payout
  grossPotNim?: number;
  netPayoutNim?: number;
  protocolFeeNim?: number;
  txHash?: string;

  // Competitive Progress
  eloGain?: number;
  newElo?: number;
  oldElo?: number;
  eloTier?: string;
  eloProgressPct?: number;
  eloToNextTier?: number;

  // Clan Honor
  honorGain?: number;
  winStreak?: number;
  streakBonusNim?: number;
  clanName?: string;
  clanRank?: string;

  // Performance Matrix
  matchDuration?: string;
  movesCount?: number;
  trapsSet?: number;
  turnSpeed?: string;
  accuracyPercent?: number;

  // Snapshot
  boardSnapshotUrl?: string;
  snapshotCaption?: string;
  rematchStakeNim?: number;
}

const DEFAULT_WINNER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCHzt2nGIlvI261JZ7cwEJvoCoFSxKJQrS2KneRDaLN28nlbfsgLVQukNgaGQgqdVz5BTLLzySWfuux1R6MFbuquY98dSjCUI6HHXndSMApHlJU370T5GlqqyT65fUWwgRH8f35ZvtU4RaefdgUf7tbtu64tHKEta1_tCgiKxXT8VeZlmTI0y-coajd1meBoEft95ptMYDOhl4Kjy4iM0lu_0G-Bg-wgwPSqzRQalanydO95YdyRs6C7A";

const DEFAULT_LOSER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCPMHMNyXJaEAtgarDd6kDOX6AZyo87RvBHYXVUDF1H91c4t8uTJ8c8D7SAj_yMNBvoXkJLc9RuozwhdpvOCtaA6Pp2Uq8HwN0gP31HLJ5OwF84PtV61w7LNoJnqo2Nlqbwqa0A7Y7Exk4ZDZWonAnlwSXL80g4cVDKVZcnqXReaKC_tYarD_D2IGcDd6n-Nn_fo3ejx26pFI1eyp_SYdV5SHH4jKOWk-5W2F7UssDSspOq5HphHMA7hQ";

const DEFAULT_SNAPSHOT_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDPJB_6SW_nHZIm6yUnEZQ0jQk0xPpLxFu7Y-vV8CwMUiQI1NYqNBT56sHK7QS2TQL2AtpfNWVAD78t5SPGemve42HTW2Xnf34N8VWvBtPANF4fUWuDqzPDhrJJ5RL-bLhtxpK6syi7Ox0CjfVbLMGjOkrSfUHz9wqFcZq3H0LxKf2xq_dVfv4cSSiKFJ1u-qVfmR10pC5qEi9kkGdCmq8bnzHpG0-UV5E37PBe4v-ipkfq7tDIMhMuCw";

export function MatchVictoryModal({
  isOpen = true,
  onClose,
  onRematch,
  onReturnToLobby,
  onInspectBoard,

  isWinner = true,
  gameTitle = "Connect 4 Pro Duel · Best of 1",
  winNarrative = "Flawless vertical quadrant lock in Turn 24. Stake pool released!",
  blockHeight = 3982425,

  winnerName = "Valkyrie",
  winnerClan = "[GLDN] Gold Legion",
  winnerAvatar = DEFAULT_WINNER_AVATAR,
  winnerScore = "WINNER (4-2)",

  loserName = "CyberRonin",
  loserClan = "[CYBR] NeoOps",
  loserAvatar = DEFAULT_LOSER_AVATAR,

  grossPotNim = 200,
  netPayoutNim = 190,
  protocolFeeNim = 10,
  txHash = "0x8f3c7b209e14a1c5d91a",

  eloGain = 42,
  newElo = 2182,
  oldElo = 2140,
  eloTier = "Diamond II (Top 3.1%)",
  eloProgressPct = 78,
  eloToNextTier = 18,

  honorGain = 120,
  winStreak = 6,
  streakBonusNim = 15,
  clanName = "Gold Legion",
  clanRank = "Rank #3 Syndicate",

  matchDuration = "3m 42s",
  movesCount = 24,
  trapsSet = 3,
  turnSpeed = "1.4s",
  accuracyPercent = 94,

  boardSnapshotUrl = DEFAULT_SNAPSHOT_IMAGE,
  snapshotCaption = "Diagonal trap executed on row 3-4",
  rematchStakeNim = 100,
}: MatchVictoryModalProps) {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rematchStatus, setRematchStatus] = useState<"idle" | "matching" | "dispatched">("idle");
  const [isCopied, setIsCopied] = useState(false);

  // Victory canvas particle celebration
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const colors = ["#f3b72c", "#ffd78d", "#00d2ff", "#68f5b8", "#ffffff"];
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.5),
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 1.5 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      decay: Math.random() * 0.005 + 0.002,
    }));

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = -10;
          p.alpha = Math.random() * 0.8 + 0.3;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const usdNet = (netPayoutNim * 0.2).toFixed(2);

  const handleShare = () => {
    const text = `NIMIQ ARENA VICTORY!\nMatch: ${gameTitle}\nWinner: ${winnerName} (${winnerScore})\nPrize: +${netPayoutNim} NIM ($${usdNet} USD)\nBlock: #${blockHeight}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Victory Card link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRematchClick = () => {
    if (rematchStatus !== "idle") return;
    setRematchStatus("matching");
    setTimeout(() => {
      setRematchStatus("dispatched");
      toast.success(`Rematch request sent to ${loserName}!`);
      if (onRematch) {
        onRematch();
      }
    }, 1200);
  };

  const handleReturnClick = () => {
    if (onReturnToLobby) {
      onReturnToLobby();
    } else if (onClose) {
      onClose();
    } else {
      setLocation("/");
    }
  };

  const handleInspectClick = () => {
    if (onInspectBoard) {
      onInspectBoard();
    } else {
      toast.info(`Replaying Turn ${movesCount} sequence...`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0d1321]/95 backdrop-blur-md text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] relative shadow-2xl overflow-hidden">
        {/* Dynamic Ambient Victory Aura */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f3b72c]/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-48 -right-12 w-64 h-64 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Interactive Sparkle & Particle Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        <div className="relative z-10 px-4 flex flex-col gap-3 py-3">
          {/* ========================================================================= */}
          {/* TOP MATCH STATUS & PROTOCOL FINALITY STRIP                                */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between bg-[#080e1c]/80 border border-[#242a39] rounded-xl px-3.5 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68f5b8] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#68f5b8] tracking-wider uppercase font-bold">
                  Albatross PoS Finality
                </span>
                <span className="text-xs text-[#d4c5ad] leading-none">{gameTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#191f2e] border border-[#242a39] active:scale-95 transition-transform text-[#a5e7ff] hover:text-[#ffd78d]"
                title="Share Result"
              >
                {isCopied ? <Check size={16} className="text-[#68f5b8]" /> : <Share2 size={16} />}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#191f2e] border border-[#242a39] active:scale-95 transition-transform text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CELEBRATORY VICTORY HERO BANNER                                           */}
          {/* ========================================================================= */}
          <div className="relative flex flex-col items-center justify-center pt-1 pb-0.5 text-center">
            {/* Laurel / Trophy Laurel Icon */}
            <div className="flex items-center justify-center mb-1">
              <div className="w-14 h-14 rounded-full bg-[#242a39]/90 border border-[#f3b72c]/30 flex items-center justify-center shadow-[0_4px_24px_rgba(243,183,44,0.3)]">
                <Trophy size={30} className="text-[#f3b72c] drop-shadow-[0_0_12px_#f3b72c]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#f3b72c]/15 border border-[#f3b72c]/20 mb-1 shadow-sm">
              <Zap size={13} className="text-[#ffd78d]" />
              <span className="text-[10px] font-mono text-[#ffd78d] tracking-widest uppercase font-bold">
                Match Confirmed
              </span>
            </div>

            <h1 className="text-3xl font-black text-[#ffd78d] tracking-tight drop-shadow-[0_2px_12px_rgba(243,183,44,0.4)]">
              {isWinner ? "VICTORY!" : "MATCH COMPLETE"}
            </h1>
            <p className="text-xs text-[#d4c5ad] max-w-[280px] mt-0.5">
              {winNarrative}
            </p>

            {/* Head-to-Head Duel Showcase */}
            <div className="w-full mt-3 grid grid-cols-11 items-center bg-[#151b29] border border-[#242a39] rounded-xl p-2.5 shadow-md">
              {/* Winner (YOU) */}
              <div className="col-span-5 flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    className="w-12 h-12 rounded-xl object-cover shadow-[0_0_12px_rgba(243,183,44,0.35)] border border-[#f3b72c]/40"
                    alt={winnerName}
                    src={winnerAvatar}
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#f3b72c] text-[#412d00] font-black text-[9px] flex items-center justify-center shadow-sm">
                    ✓
                  </span>
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-sm font-bold text-[#dde2f6] leading-tight truncate">
                    {winnerName} <span className="text-[#ffd78d] text-[10px] font-bold">(YOU)</span>
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] font-mono leading-none mt-0.5 truncate">
                    {winnerClan}
                  </span>
                  <span className="text-[10px] text-[#68f5b8] font-mono font-bold mt-1">
                    {winnerScore}
                  </span>
                </div>
              </div>

              {/* VS Pill / Score Divider */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <span className="text-[11px] font-mono text-[#d4c5ad]/70 italic font-bold">
                  VS
                </span>
              </div>

              {/* Opponent (DEFEATED) */}
              <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-[#d4c5ad] leading-tight truncate">
                    {loserName}
                  </span>
                  <span className="text-[10px] text-[#d4c5ad]/70 font-mono leading-none mt-0.5 truncate">
                    {loserClan}
                  </span>
                  <span className="text-[10px] text-[#ffb4ab] font-mono font-bold mt-1">
                    DEFEATED
                  </span>
                </div>
                <div className="relative shrink-0 opacity-70">
                  <img
                    className="w-12 h-12 rounded-xl object-cover grayscale border border-[#2f3544]"
                    alt={loserName}
                    src={loserAvatar}
                  />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-[#2f3544] text-[#d4c5ad] text-[9px] font-bold flex items-center justify-center">
                    ✕
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* INSTANT PAYOUT ESCROW SETTLEMENT HERO CARD                                */}
          {/* ========================================================================= */}
          <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
            {/* Glow strip */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#f3b72c] via-[#00d2ff] to-[#68f5b8]" />

            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#242a39]/70">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#f3b72c] text-[18px]">
                  lock_open
                </span>
                <span className="text-xs font-mono font-bold text-[#ffd78d] tracking-wide uppercase">
                  Instant Escrow Release
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#68f5b8]/15 text-[#68f5b8] font-bold border border-[#68f5b8]/20">
                Block #{blockHeight}
              </span>
            </div>

            {/* Net Payout Figure */}
            <div className="flex flex-col items-center text-center py-1">
              <span className="text-[11px] text-[#d4c5ad]">Total Net Prize Claimed</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-[#ffd78d] tracking-tight drop-shadow-[0_0_12px_rgba(243,183,44,0.4)] font-mono">
                  +{formatNim(netPayoutNim)}
                </span>
                <span className="text-base font-bold text-[#ffdea4] font-mono">NIM</span>
              </div>
              <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-[#242a39] text-[#d4c5ad] text-[10px] font-mono">
                <span>≈ ${usdNet} USD</span>
                <span className="text-[#d4c5ad]/40">·</span>
                <span className="text-[#68f5b8] font-medium">Finalized in 0.84s</span>
              </div>
            </div>

            {/* Settlement Breakdown Subtable */}
            <div className="mt-2.5 bg-[#080e1c]/90 rounded-lg p-2.5 flex flex-col gap-1.5 font-mono text-xs border border-[#242a39]">
              <div className="flex justify-between items-center text-[#d4c5ad]">
                <span className="flex items-center gap-1 text-[11px]">
                  <Award size={13} className="text-[#ffd78d]" /> Gross Match Purse
                </span>
                <span className="text-[#dde2f6] text-[11px] font-bold">
                  {formatNim(grossPotNim)}.00 NIM
                </span>
              </div>
              <div className="flex justify-between items-center text-[#d4c5ad]">
                <span className="flex items-center gap-1 text-[11px]">
                  <Activity size={13} className="text-[#d4c5ad]" /> Protocol Escrow Fee (5%)
                </span>
                <span className="text-[#ffb4ab] text-[11px]">
                  -{formatNim(protocolFeeNim)}.00 NIM
                </span>
              </div>
              <div className="flex justify-between items-center text-[#d4c5ad]">
                <span className="flex items-center gap-1 text-[11px]">
                  <Zap size={13} className="text-[#68f5b8]" /> Relayer Fee
                </span>
                <span className="text-[#68f5b8] text-[10px] font-bold bg-[#68f5b8]/10 px-1.5 py-0.5 rounded">
                  FREE (Arena Relayed)
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#242a39] flex justify-between items-center">
                <span className="text-[#dde2f6] font-semibold flex items-center gap-1 text-[11px]">
                  <ShieldCheck size={14} className="text-[#00d2ff]" /> Dispatched To
                </span>
                <span className="text-[#00d2ff] text-[11px] font-bold">Nimiq Pay Wallet</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COMPETITIVE PROGRESS & CLAN HONOR CARD (DUAL METRICS)                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2">
            {/* ELO Rating Boost */}
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#00d2ff]/15 flex items-center justify-center text-[#00d2ff]">
                  <Award size={15} />
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#68f5b8]/15 text-[#68f5b8] font-bold">
                  +{eloGain} ELO
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-[#dde2f6] font-mono">{newElo}</span>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">from {oldElo}</span>
                </div>
                <span className="text-[10px] text-[#a5e7ff] font-medium mt-0.5 leading-tight">
                  {eloTier}
                </span>
              </div>
              {/* Mini Progress Bar */}
              <div className="w-full bg-[#242a39] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#00d2ff] h-full rounded-full shadow-[0_0_8px_#00d2ff]"
                  style={{ width: `${eloProgressPct}%` }}
                />
              </div>
              <span className="text-[9px] text-[#d4c5ad]/80 font-mono mt-1">
                {eloToNextTier} ELO to Master
              </span>
            </div>

            {/* Clan Honor & Win Streak */}
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#f3b72c]/15 flex items-center justify-center text-[#f3b72c]">
                  <Shield size={15} />
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3b72c]/20 text-[#ffd78d] font-bold">
                  +{honorGain} Honor
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Flame size={14} className="text-[#f3b72c]" />
                  <span className="text-lg font-black text-[#dde2f6] font-mono">
                    {winStreak} Streak!
                  </span>
                </div>
                <span className="text-[10px] text-[#ffd78d] font-medium mt-0.5 leading-tight">
                  +{streakBonusNim} NIM Bonus Paid
                </span>
              </div>
              {/* Clan Rank Status */}
              <div className="mt-2 pt-1 border-t border-[#242a39] flex items-center justify-between text-[9px] font-mono text-[#d4c5ad]">
                <span>{clanName}</span>
                <span className="text-[#68f5b8] font-bold">{clanRank}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MATCH PERFORMANCE STATS MATRIX                                            */}
          {/* ========================================================================= */}
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#dde2f6] flex items-center gap-1.5">
                <Activity size={14} className="text-[#a5e7ff]" />
                Tactical Performance
              </span>
              <span className="text-[10px] font-mono text-[#68f5b8] font-bold">
                Accuracy {accuracyPercent}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col items-center">
                <span className="text-[9px] text-[#d4c5ad]">Duration</span>
                <span className="text-sm font-bold text-[#dde2f6] font-mono mt-0.5">
                  {matchDuration}
                </span>
                <span className="text-[9px] text-[#d4c5ad]/70 font-mono">Blitz Pace</span>
              </div>
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col items-center">
                <span className="text-[9px] text-[#d4c5ad]">Moves</span>
                <span className="text-sm font-bold text-[#dde2f6] font-mono mt-0.5">
                  {movesCount}
                </span>
                <span className="text-[9px] text-[#00d2ff] font-mono">Vertical Lock</span>
              </div>
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col items-center">
                <span className="text-[9px] text-[#d4c5ad]">Traps Set</span>
                <span className="text-sm font-bold text-[#ffd78d] font-mono mt-0.5">
                  {trapsSet}
                </span>
                <span className="text-[9px] text-[#ffd78d]/80 font-mono">Dual Threat</span>
              </div>
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col items-center">
                <span className="text-[9px] text-[#d4c5ad]">Turn Speed</span>
                <span className="text-sm font-bold text-[#68f5b8] font-mono mt-0.5">
                  {turnSpeed}
                </span>
                <span className="text-[9px] text-[#68f5b8]/80 font-mono">Fast Hands</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MATCH VISUAL HIGHLIGHTS / GAME BOARD SNAPSHOT TILE                        */}
          {/* ========================================================================= */}
          <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 shadow-md flex items-center gap-3">
            <img
              className="w-20 h-16 rounded-lg object-cover flex-shrink-0 shadow-[0_0_12px_rgba(0,210,255,0.2)] border border-[#00d2ff]/30"
              alt="Connect Four game finale"
              src={boardSnapshotUrl}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#dde2f6] truncate">
                  Game Finale Snapshot
                </span>
                <span className="text-[10px] font-mono text-[#00d2ff] font-bold">
                  Turn {movesCount}
                </span>
              </div>
              <p className="text-[11px] text-[#d4c5ad] truncate mt-0.5">{snapshotCaption}</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleInspectClick}
                  className="text-[10px] font-mono text-[#ffd78d] flex items-center gap-0.5 active:opacity-75 hover:underline font-bold"
                >
                  <span>Inspect Board</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACTION CONTROLS & PRIMARY CTA FLOW                                        */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-2 pt-1 pb-16">
            {/* Primary Action CTA (Commit Rematch) */}
            <button
              type="button"
              onClick={handleRematchClick}
              disabled={rematchStatus === "matching"}
              className="w-full h-12 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-all disabled:opacity-80"
            >
              {rematchStatus === "matching" ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  <span>Matching Challenger...</span>
                </>
              ) : rematchStatus === "dispatched" ? (
                <>
                  <Check size={18} />
                  <span>Rematch Dispatched!</span>
                </>
              ) : (
                <>
                  <Swords size={18} />
                  <span>Rematch Duel ({rematchStakeNim} NIM)</span>
                </>
              )}
            </button>

            {/* Secondary Row Actions */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://testnet.nimiq.watch/#/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <History size={16} className="text-[#00d2ff]" />
                <span>Tx &amp; Replay</span>
              </a>

              <button
                type="button"
                onClick={handleReturnClick}
                className="h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Gamepad2 size={16} className="text-[#d4c5ad]" />
                <span>Arena Lobby</span>
              </button>
            </div>

            {/* Security / Trust Guarantee Footer Note */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-center">
              <ShieldCheck size={13} className="text-[#68f5b8] shrink-0" />
              <span className="text-[10px] text-[#d4c5ad]/80 leading-tight">
                Non-custodial smart escrow settlement. Assets secured by Nimiq Proof-of-Stake.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
