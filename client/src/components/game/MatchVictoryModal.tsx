import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Trophy,
  Zap,
  Swords,
  Share2,
  Check,
  X,
  History,
  Gamepad2,
  Flame,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatNim } from "@shared/game/pot-distribution";

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

export function MatchVictoryModal({
  isOpen = true,
  onClose,
  onRematch,
  onReturnToLobby,
  onInspectBoard,

  isWinner = true,
  gameTitle = "Arena Match",
  winNarrative = "Victory confirmed! Great game.",
  blockHeight = 3982425,

  winnerName = "Player 1",
  winnerAvatar = DEFAULT_WINNER_AVATAR,
  winnerScore = "WINNER",

  loserName = "Player 2",
  loserAvatar = DEFAULT_LOSER_AVATAR,

  grossPotNim = 0,
  netPayoutNim = 0,
  protocolFeeNim = 0,
  txHash,

  eloGain = 15,
  newElo = 1515,
  oldElo = 1500,
  eloTier = "Silver I",

  winStreak = 1,
  matchDuration = "2m 15s",
  movesCount = 18,
  rematchStakeNim = 0,
}: MatchVictoryModalProps) {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rematchStatus, setRematchStatus] = useState<"idle" | "matching" | "dispatched">("idle");
  const [isCopied, setIsCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Victory canvas particle celebration
  useEffect(() => {
    if (!isOpen || !isWinner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const colors = ["#f3b72c", "#ffd78d", "#00d2ff", "#68f5b8", "#ffffff"];
    const particles = Array.from({ length: 40 }, () => ({
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
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const usdNet = (netPayoutNim * 0.0004).toFixed(2);

  const handleShare = () => {
    const text = `NIMIQ ARENA ${isWinner ? "VICTORY" : "MATCH"}!\n${gameTitle} • ${winnerName} vs ${loserName}\nPrize: +${netPayoutNim} NIM`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Match link copied to clipboard!");
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
    }, 1000);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0d1321]/95 backdrop-blur-md text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] relative shadow-2xl overflow-hidden justify-between p-4">
        {/* Dynamic Ambient Victory Aura */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#f3b72c]/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-48 -right-12 w-64 h-64 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Interactive Sparkle Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* TOP HEADER */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]" />
            <span className="text-xs font-mono font-bold text-[#dde2f6] tracking-wide uppercase">
              {gameTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#191f2e] border border-[#242a39] active:scale-95 transition-transform text-[#a5e7ff] hover:text-[#ffd78d]"
              title="Share Result"
            >
              {isCopied ? <Check size={16} className="text-[#68f5b8]" /> : <Share2 size={16} />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#191f2e] border border-[#242a39] active:scale-95 transition-transform text-[#d4c5ad] hover:text-[#dde2f6]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* MAIN CELEBRATION CARD */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto py-4">
          {/* Trophy Emblem */}
          <div className="w-20 h-20 rounded-2xl bg-[#191f2e] border border-[#f3b72c]/40 flex items-center justify-center shadow-[0_8px_32px_rgba(243,183,44,0.3)] mb-3">
            <Trophy size={42} className="text-[#f3b72c] drop-shadow-[0_0_16px_#f3b72c]" />
          </div>

          <h1 className="text-3xl font-black text-[#ffd78d] tracking-tight drop-shadow-[0_2px_12px_rgba(243,183,44,0.4)]">
            {isWinner ? "VICTORY!" : "MATCH OVER"}
          </h1>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-[280px]">
            {winNarrative}
          </p>

          {/* Prize Amount Callout */}
          <div className="w-full mt-4 p-4 rounded-2xl bg-[#151b29] border border-[#242a39] shadow-lg flex flex-col items-center">
            <span className="text-[11px] text-[#94a3b8] font-medium uppercase font-mono tracking-wider">
              {grossPotNim > 0 ? "Prize Won" : "Match Result"}
            </span>
            {grossPotNim > 0 ? (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#ffd78d] font-mono tracking-tight">
                  +{formatNim(netPayoutNim)}
                </span>
                <span className="text-base font-bold text-[#ffd78d] font-mono">NIM</span>
              </div>
            ) : (
              <span className="text-2xl font-black text-[#68f5b8] font-mono mt-1">
                Free Practice
              </span>
            )}

            {/* Quick Rating & Streak Badges */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#242a39] w-full justify-center">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#191f2e] text-xs font-mono font-bold text-[#68f5b8]">
                <Award size={13} />
                <span>+{eloGain} Rating ({newElo})</span>
              </div>
              {winStreak > 1 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3b72c]/15 text-xs font-mono font-bold text-[#ffd78d]">
                  <Flame size={13} />
                  <span>{winStreak} Streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Head-to-Head 1v1 Pill */}
          <div className="w-full mt-3 grid grid-cols-11 items-center bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-md">
            {/* Winner */}
            <div className="col-span-5 flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  className="w-10 h-10 rounded-xl object-cover border border-[#f3b72c]/50"
                  alt={winnerName}
                  src={winnerAvatar}
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#f3b72c] text-[#412d00] font-black text-[8px] flex items-center justify-center">
                  ✓
                </span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-[#dde2f6] truncate">
                  {winnerName}
                </span>
                <span className="text-[10px] text-[#68f5b8] font-mono font-bold">
                  {winnerScore}
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="col-span-1 text-center font-mono text-[10px] text-[#94a3b8] font-bold">
              VS
            </div>

            {/* Loser */}
            <div className="col-span-5 flex items-center justify-end gap-2.5 text-right min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#94a3b8] truncate">
                  {loserName}
                </span>
                <span className="text-[10px] text-[#ffb4ab] font-mono font-bold">
                  DEFEATED
                </span>
              </div>
              <div className="relative shrink-0 opacity-60">
                <img
                  className="w-10 h-10 rounded-xl object-cover grayscale border border-[#2f3544]"
                  alt={loserName}
                  src={loserAvatar}
                />
              </div>
            </div>
          </div>

          {/* Collapsible Match Details Toggle */}
          <div className="w-full mt-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-1 text-[11px] text-[#94a3b8] hover:text-[#dde2f6] font-mono py-1 mx-auto"
            >
              <span>{showDetails ? "Hide Match Details" : "View Match Details"}</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-[#080e1c] border border-[#242a39] text-left text-xs font-mono space-y-1.5 animate-in fade-in duration-200">
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Duration</span>
                  <span className="text-[#dde2f6] font-bold">{matchDuration}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>Moves Played</span>
                  <span className="text-[#dde2f6] font-bold">{movesCount}</span>
                </div>
                {grossPotNim > 0 && (
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Total Pot</span>
                    <span className="text-[#ffd78d] font-bold">{formatNim(grossPotNim)} NIM</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS (Thumb Zone) */}
        <div className="relative z-10 flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleRematchClick}
            disabled={rematchStatus === "matching"}
            className="w-full h-13 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-all disabled:opacity-80 cursor-pointer"
          >
            {rematchStatus === "matching" ? (
              <>
                <Sparkles size={18} className="animate-spin" />
                <span>Queuing Match...</span>
              </>
            ) : rematchStatus === "dispatched" ? (
              <>
                <Check size={18} />
                <span>Rematch Sent!</span>
              </>
            ) : (
              <>
                <Swords size={18} />
                <span>PLAY AGAIN</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReturnClick}
            className="w-full h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Gamepad2 size={16} className="text-[#94a3b8]" />
            <span>RETURN TO LOBBY</span>
          </button>
        </div>
      </div>
    </div>
  );
}
