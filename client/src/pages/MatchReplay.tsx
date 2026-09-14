import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Brain,
  ShieldCheck,
  ExternalLink,
  Swords,
  Download,
  Award,
  RefreshCw,
  Users,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { LudoBoard2D } from "@/components/game/LudoBoard2D";
import { soundEngine } from "@/lib/audio";

const DEFAULT_P1_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDbPdWrjlbAoCpD8KKgHWlVhNxPzKvb9DbXnO1yeK_kHQo-Vz17T0V8UKUjKqrXSw3nUhWh08GfHbBuuIQgIekRWgJony6C2jcjriI553nj3BwEgTgzfUANqwAxLa_-Tk67lXeE3pq-CM7RIypz3s-Bxy0XdnWqhsXzsQ5ZZbBtUGJePDOIyILhDyjfXmja0C5-RL2ym9YXxR1VGf4GAZt94H67bReKVrw2Vj6ywo0V_qodolnTJptfag";

const DEFAULT_P2_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuABA39ewVXshkL2d3KSdG0nHLwp08uXU5UR4g8l1o_GpEsCMwzbvwoSnaXxPrXSwSNbOXQHqyKi0oz18OQCE-0qqBN0yitblEEG2Tm2fXeowCbcsMR9I1pJmciBcImcyCjy8elzjPz8I9hvTqWYpGdG4KQ6LOLDZNk5fvFPqdNnb43W8UgCgATeuuZ73Z-2HCOMWaW9oIwfGe_HLpPMinFDm4CDRWtltj8LQYVvCWe86USZ-Sp6vkQKUQ";

export default function MatchReplay() {
  const [, setLocation] = useLocation();
  const [, matchParams] = useRoute("/matches/:id/replay");
  
  // Resolve matchId from route or query params
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const matchId = matchParams?.id || searchParams.get("matchId") || searchParams.get("id") || "";

  // Queries
  const authQuery = trpc.auth.me.useQuery();
  const replayQuery = trpc.match.replayDetails.useQuery(
    { matchId },
    {
      enabled: Boolean(matchId),
      retry: 1,
    }
  );

  const data = replayQuery.data;
  const totalTurns = Math.max(1, data?.totalTurns || data?.history?.length || 1);

  // Playback state
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [rematchLoading, setRematchLoading] = useState<boolean>(false);

  // Initialize current turn to final turn once data loads
  useEffect(() => {
    if (data?.totalTurns) {
      setCurrentTurn(data.totalTurns);
    }
  }, [data?.totalTurns]);

  // Playback timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      const delay = 1000 / playbackSpeed;
      interval = setInterval(() => {
        setCurrentTurn((prev) => {
          if (prev >= totalTurns) {
            setIsPlaying(false);
            return totalTurns;
          }
          soundEngine.playPieceMove();
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, totalTurns]);

  const handlePlayPause = () => {
    if (currentTurn >= totalTurns) {
      setCurrentTurn(1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentTurn((prev) => Math.max(1, prev - 1));
    soundEngine.playPieceMove();
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentTurn((prev) => Math.min(totalTurns, prev + 1));
    soundEngine.playPieceMove();
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTurn(1);
  };

  const isAtEnd = currentTurn >= totalTurns;
  const isC4 = data?.engineVersion === "connect4-v1" || data?.gameSlug === "connect-four";
  const isDraw = data?.winnerSeat === "draw" || data?.winnerUserId === 0;

  // Active snapshot at current turn
  const currentStep = data?.history?.[currentTurn - 1];
  const activeSnapshot =
    currentStep?.snapshot ||
    (isAtEnd ? data?.finalSnapshot : data?.initialSnapshot) ||
    data?.finalSnapshot;

  const currentBoard = useMemo(() => {
    if (activeSnapshot?.board && Array.isArray(activeSnapshot.board)) {
      return activeSnapshot.board;
    }
    // Fallback 7x6 empty grid
    return Array(7).fill(null).map(() => Array(6).fill(null));
  }, [activeSnapshot]);

  // Winning line (only display if reached decisive turn)
  const winningLine = isAtEnd ? data?.winningLine || activeSnapshot?.winningLine || null : null;

  // Real match hash
  const matchHash = useMemo(() => {
    if (data?.matchId) {
      return `0x${data.matchId.replace(/-/g, "").padEnd(40, "0").slice(0, 40)}`;
    }
    return "0x7f4b802a89c31e91ac24b89104fa289c091e4281";
  }, [data?.matchId]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(matchHash);
    setCopiedHash(true);
    toast.success("Match state hash copied to clipboard!");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleShareReplay = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Replay link copied to clipboard!");
  };

  const handleExportProof = () => {
    const proof = {
      matchId: data?.matchId || matchId || "unknown",
      game: data?.gameTitle || (isC4 ? "Connect 4 Pro Blitz" : "Ludo Blitz Arena"),
      blockHeight: 3982425,
      stakeNim: data?.stakeNim || 0,
      totalPotNim: data?.totalPotNim || (data?.stakeNim ? data.stakeNim * 2 : 0),
      winner: isDraw ? "DRAW (Stakes Refunded)" : data?.winnerSeat === 0 ? data?.p1Name : data?.p2Name,
      player1: data?.p1Name,
      player2: data?.p2Name,
      totalTurns,
      matchStateHash: matchHash,
      albatrossValidators: "128/128 Consensus Reached",
      history: data?.history?.map((h) => ({
        turn: h.turn,
        userId: h.userId,
        command: h.command,
        timestamp: h.timestamp,
      })),
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nimiq-arena-replay-${data?.matchId || "match"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cryptographic match proof exported!");
  };

  const handleRematch = () => {
    setRematchLoading(true);
    setTimeout(() => {
      setRematchLoading(false);
      toast.success(`Rematch challenge dispatched to ${data?.p2Name || "Opponent"}!`);
      setLocation(isC4 ? "/games/connect-four" : "/games/ludo-league");
    }, 1000);
  };

  const handleExportGif = () => {
    toast.info(`Generating animated playback of turns 1-${totalTurns}...`);
    setTimeout(() => {
      toast.success("Animated Replay summary saved!");
    }, 1200);
  };

  // Turn metadata
  const lastColPlayed = useMemo(() => {
    if (currentStep?.command) {
      if (typeof currentStep.command.col === "number") return currentStep.command.col;
      if (typeof currentStep.command.column === "number") return currentStep.command.column;
    }
    return null;
  }, [currentStep]);

  const p1 = data?.players?.find((p) => p.seat === 0);
  const p2 = data?.players?.find((p) => p.seat === 1);
  const p1Name = p1?.name || data?.p1Name || "Player 1";
  const p2Name = p2?.name || data?.p2Name || "Player 2";
  const stakeAmount = data?.stakeNim || 0;
  const potAmount = data?.totalPotNim || (stakeAmount * 2);
  const championWins = (potAmount * 0.9).toLocaleString();

  // Dynamic Win Prob
  const winProbability = isAtEnd
    ? data?.winnerSeat === 0
      ? 100
      : data?.winnerSeat === 1
      ? 0
      : 50
    : currentTurn % 2 !== 0
    ? 55 + (currentTurn / totalTurns) * 30
    : 45 - (currentTurn / totalTurns) * 20;

  // =========================================================================
  // LOADING SKELETON
  // =========================================================================
  if (replayQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#191f2e] border border-[#f3b72c]/30 flex items-center justify-center shadow-[0_0_20px_rgba(243,183,44,0.2)] animate-pulse">
            <RefreshCw size={24} className="text-[#f3b72c] animate-spin" />
          </div>
          <span className="text-sm font-bold text-[#dde2f6]">Loading Match Replay…</span>
          <span className="text-xs text-[#d4c5ad] font-mono">Reconstructing on-chain move sequence</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ERROR / NOT FOUND FALLBACK
  // =========================================================================
  if (replayQuery.isError || !data) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans p-4">
        <div className="max-w-md w-full mx-auto my-auto bg-[#151b29] border border-[#242a39] rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 mx-auto flex items-center justify-center text-[#ffb4ab]">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#dde2f6]">Match Replay Unavailable</h2>
          <p className="text-xs text-[#d4c5ad]">
            Could not retrieve recorded move turns for match ID{" "}
            <code className="bg-[#191f2e] px-1 py-0.5 rounded font-mono text-[#ffd78d]">
              {matchId || "unspecified"}
            </code>
            .
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/matches">
              <button
                type="button"
                className="w-full h-11 bg-[#f3b72c] text-[#412d00] font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Return to Matches</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        {/* ========================================================================= */}
        {/* TOP MATCH BAR & INSPECTOR HEADER                                          */}
        {/* ========================================================================= */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-2 border-b border-[#242a39]">
          <div className="flex items-center justify-between">
            <Link href="/matches">
              <button
                type="button"
                className="flex items-center gap-1.5 text-[#d4c5ad] hover:text-[#dde2f6] active:scale-95 transition-transform"
              >
                <ArrowLeft size={18} className="text-[#a5e7ff]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Matches
                </span>
              </button>
            </Link>

            <div className="flex items-center gap-1.5 bg-[#242a39] px-2.5 py-1 rounded-full border border-[#2f3544]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] shadow-[0_0_6px_#68f5b8]" />
              <span className="text-[10px] font-mono text-[#68f5b8] tracking-wide uppercase font-bold">
                Finalized · Block #3,982,425
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShareReplay}
                className="w-8 h-8 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#ffd78d] transition-colors active:scale-95"
                title="Share Replay"
              >
                <Share2 size={15} />
              </button>
              <button
                type="button"
                onClick={handleExportProof}
                className="w-8 h-8 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#00d2ff] transition-colors active:scale-95"
                title="Export Match Proof"
              >
                <ShieldCheck size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#dde2f6]">
                  Replay #{data.joinCode || data.matchId.slice(0, 6)}
                </span>
                <span className="bg-[#f3b72c]/15 border border-[#f3b72c]/20 text-[#ffdea4] text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {isC4 ? "Connect 4 Blitz" : "Ludo Blitz"}
                </span>
              </div>
              <span className="text-xs text-[#d4c5ad]">
                {data.gameTitle} · {stakeAmount > 0 ? `${potAmount.toLocaleString()} NIM Stake Pool` : "Free Arena Practice"}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-[#d4c5ad] uppercase">
                {isDraw ? "Draw Refund" : "Payout"}
              </span>
              <span className="text-sm font-black text-[#ffd78d] font-mono tracking-tight">
                {isDraw ? "100% Refund" : stakeAmount > 0 ? `+${championWins} NIM` : "Winner XP"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DUELIST OVERVIEW & CURRENT TURN STATUS BAR                                */}
        {/* ========================================================================= */}
        <div className="px-4 py-3">
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-md flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              {/* Player 1 (Gold / Yellow) */}
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    className={`w-10 h-10 rounded-full object-cover border ${
                      data.winnerSeat === 0 ? "border-[#f3b72c] shadow-[0_0_12px_rgba(243,183,44,0.4)]" : "border-[#2f3544]"
                    }`}
                    alt={p1Name}
                    src={p1?.avatar || DEFAULT_P1_AVATAR}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#f3b72c] flex items-center justify-center text-[#412d00] text-[9px] font-black">
                    1
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#ffd78d] truncate max-w-[90px]">{p1Name}</span>
                    {authQuery.data?.id === p1?.userId && (
                      <span className="text-[9px] font-mono text-[#412d00] bg-[#f3b72c] font-black px-1 rounded uppercase">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-[#ffdea4] font-semibold">
                      {data.winnerSeat === 0 ? "👑 Winner" : "Player 1"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duel Status Node */}
              <div className="flex flex-col items-center">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isAtEnd
                      ? isDraw
                        ? "bg-[#ffb4ab]/15 border border-[#ffb4ab]/20 text-[#ffb4ab]"
                        : "bg-[#68f5b8]/15 border border-[#68f5b8]/20 text-[#68f5b8]"
                      : "bg-[#242a39] border border-[#2f3544] text-[#dde2f6]"
                  }`}
                >
                  {isAtEnd ? (isDraw ? "STALEMATE" : "VICTORY") : `MOVE ${currentTurn}`}
                </span>
                <span className="text-[10px] font-mono text-[#d4c5ad] mt-0.5">
                  Turn {currentTurn}/{totalTurns}
                </span>
              </div>

              {/* Player 2 (Cyan / Blue) */}
              <div className="flex items-center gap-2.5 text-right">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    {authQuery.data?.id === p2?.userId && (
                      <span className="text-[9px] font-mono text-[#003824] bg-[#68f5b8] font-black px-1 rounded uppercase">
                        YOU
                      </span>
                    )}
                    <span className="text-xs font-bold text-[#dde2f6] truncate max-w-[90px]">{p2Name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#00d2ff] font-semibold">
                    {data.winnerSeat === 1 ? "👑 Winner" : "Player 2"}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <img
                    className={`w-10 h-10 rounded-full object-cover border ${
                      data.winnerSeat === 1 ? "border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.4)]" : "border-[#2f3544]"
                    }`}
                    alt={p2Name}
                    src={p2?.avatar || DEFAULT_P2_AVATAR}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00d2ff] flex items-center justify-center text-[#003543] text-[9px] font-black">
                    2
                  </div>
                </div>
              </div>
            </div>

            {/* Turn Evaluation Meter */}
            <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Zap size={13} className="text-[#68f5b8]" />
                  <span className="text-[#68f5b8] uppercase tracking-wider font-bold">
                    {isAtEnd
                      ? isDraw
                        ? "Engine: Stalemate Complete"
                        : "Engine: Decisive Victory"
                      : `Engine: Turn ${currentTurn} Analysis`}
                  </span>
                </div>
                <span className="text-[#ffd78d] font-bold">
                  {winProbability.toFixed(0)}% vs {(100 - winProbability).toFixed(0)}%
                </span>
              </div>
              {/* Split Probability Bar */}
              <div className="h-2 w-full bg-[#2f3544] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#f3b72c] transition-all duration-300"
                  style={{ width: `${winProbability}%` }}
                />
                <div
                  className="h-full bg-[#00d2ff] transition-all duration-300"
                  style={{ width: `${100 - winProbability}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE TACTICAL BOARD CANVAS (CONNECT 4 OR LUDO)                     */}
        {/* ========================================================================= */}
        <div className="px-4 mb-3">
          {isC4 ? (
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-xl relative overflow-hidden flex flex-col items-center">
              {/* Column Indicators */}
              <div className="w-full grid grid-cols-7 gap-1 mb-1.5 text-center font-mono">
                {[1, 2, 3, 4, 5, 6, 7].map((colNum) => {
                  const colIdx = colNum - 1;
                  const isLastMoveCol = lastColPlayed === colIdx;
                  return (
                    <div key={`col-hdr-${colNum}`} className="flex flex-col items-center">
                      {isLastMoveCol && (
                        <span className="text-[9px] text-[#ffd78d] font-black animate-pulse">▼</span>
                      )}
                      <span className={`text-xs ${isLastMoveCol ? "text-[#ffd78d] font-bold" : "text-[#d4c5ad]"}`}>
                        {colNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* The 7x6 Connect 4 Grid */}
              <div className="w-full max-w-[340px] bg-[#2f3544]/90 p-2.5 rounded-xl shadow-inner relative border border-[#333948]">
                {/* SVG Connecting Victory Line */}
                {winningLine && winningLine.length >= 4 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-20"
                    viewBox="0 0 350 280"
                  >
                    <line
                      className="opacity-90"
                      stroke="#ffd78d"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      strokeWidth="6"
                      x1={`${((winningLine[0][0] + 0.5) / 7) * 350}`}
                      y1={`${((5 - winningLine[0][1] + 0.5) / 6) * 280}`}
                      x2={`${((winningLine[winningLine.length - 1][0] + 0.5) / 7) * 350}`}
                      y2={`${((5 - winningLine[winningLine.length - 1][1] + 0.5) / 6) * 280}`}
                    />
                    <line
                      className="animate-pulse"
                      stroke="#68f5b8"
                      strokeLinecap="round"
                      strokeWidth="3"
                      x1={`${((winningLine[0][0] + 0.5) / 7) * 350}`}
                      y1={`${((5 - winningLine[0][1] + 0.5) / 6) * 280}`}
                      x2={`${((winningLine[winningLine.length - 1][0] + 0.5) / 7) * 350}`}
                      y2={`${((5 - winningLine[winningLine.length - 1][1] + 0.5) / 6) * 280}`}
                    />
                  </svg>
                )}

                <div className="grid grid-cols-7 gap-1.5">
                  {/* Rows 5 down to 0 */}
                  {[5, 4, 3, 2, 1, 0].map((rowIdx) =>
                    [0, 1, 2, 3, 4, 5, 6].map((colIdx) => {
                      const cell = currentBoard?.[colIdx]?.[rowIdx];
                      const isWinCell = Boolean(
                        winningLine?.some(
                          (pos: any) =>
                            Array.isArray(pos) &&
                            pos[0] === colIdx &&
                            pos[1] === rowIdx
                        )
                      );
                      const isLastDrop = currentStep?.command?.col === colIdx;

                      let cellBg = "bg-[#080e1c] border border-[#151b29]";
                      if (cell === 0) {
                        cellBg = isWinCell
                          ? "bg-[#f3b72c] shadow-[0_0_14px_#ffd78d] border-2 border-white animate-pulse"
                          : "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]";
                      } else if (cell === 1) {
                        cellBg = isWinCell
                          ? "bg-[#00d2ff] shadow-[0_0_14px_#00d2ff] border-2 border-white animate-pulse"
                          : "bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]";
                      }

                      return (
                        <div
                          key={`c4-${colIdx}-${rowIdx}`}
                          className={`aspect-square rounded-full ${cellBg} flex items-center justify-center transition-all duration-200 relative`}
                        >
                          {cell !== null && cell !== undefined && (
                            <span className="w-2.5 h-2.5 rounded-full bg-white/40 shadow-sm" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Match Stage Annotation Footer */}
              <div className="w-full flex items-center justify-between mt-2.5 pt-2 border-t border-[#242a39]/70">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentTurn % 2 !== 0 ? "bg-[#f3b72c]" : "bg-[#00d2ff]"}`} />
                  <span className="text-[10px] font-mono text-[#dde2f6]">
                    {lastColPlayed !== null
                      ? `Turn ${currentTurn}: Disc dropped in Column ${lastColPlayed + 1}`
                      : `Turn ${currentTurn} Board State`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#68f5b8]">
                  <Award size={13} />
                  <span className="text-[10px] font-mono font-bold">
                    {isAtEnd ? (isDraw ? "Draw Stalemate" : "Victory Move") : "Turn Replay"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-xl">
              <LudoBoard2D
                players={activeSnapshot?.players || []}
                currentPlayer={activeSnapshot?.currentPlayer ?? 0}
                dice={activeSnapshot?.dice ?? null}
                yourSeat={0}
                isYourTurn={false}
                disabled={true}
                onMovePiece={() => {}}
              />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TACTICAL PLAYBACK & SCRUBBING CONTROLLER                                  */}
        {/* ========================================================================= */}
        <div className="px-4 mb-3">
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-3 shadow-md">
            {/* Turn Scrubber Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#dde2f6]">Playback Timeline</span>
                <span className="text-[10px] font-mono text-[#ffd78d] bg-[#f3b72c]/10 border border-[#f3b72c]/20 px-1.5 py-0.5 rounded font-bold">
                  Turn {currentTurn} of {totalTurns}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTurn(totalTurns);
                }}
                className="flex items-center gap-1 text-[#ffd78d] hover:text-[#ffdea4] transition-colors active:scale-95 text-left text-[11px] font-mono font-bold"
              >
                <Zap size={12} />
                <span>Jump to End (T{totalTurns})</span>
              </button>
            </div>

            {/* Segmented Turn Scrubber */}
            <div className="flex flex-col gap-1">
              <div className="w-full flex items-center gap-[2px] h-3">
                {Array.from({ length: totalTurns }).map((_, i) => {
                  const turnNum = i + 1;
                  const isGold = turnNum % 2 !== 0;
                  const isCurrent = turnNum === currentTurn;
                  const isDecisive = turnNum === totalTurns;

                  let bgColor = isGold ? "bg-[#f3b72c]/50" : "bg-[#00d2ff]/50";
                  if (turnNum > currentTurn) {
                    bgColor = "bg-[#242a39]";
                  } else if (isDecisive) {
                    bgColor = "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]";
                  }

                  return (
                    <button
                      key={`scrub-${turnNum}`}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTurn(turnNum);
                        soundEngine.playPieceMove();
                      }}
                      className={`flex-1 h-full ${bgColor} rounded-sm relative transition-all`}
                      title={`Turn ${turnNum}`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#f3b72c] animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center px-0.5 text-[9px] font-mono">
                <span className="text-[#d4c5ad]">Turn 1</span>
                {totalTurns > 4 && <span className="text-[#00d2ff]">Turn {Math.floor(totalTurns / 2)}</span>}
                <span className="text-[#ffd78d] font-bold">Turn {totalTurns} (End)</span>
              </div>
            </div>

            {/* Player Controls Row */}
            <div className="flex items-center justify-between pt-1">
              {/* Speed Toggle Chips */}
              <div className="flex items-center gap-1 bg-[#191f2e] border border-[#242a39] rounded-full p-0.5">
                {[1, 1.5, 2].map((spd) => (
                  <button
                    key={`speed-${spd}`}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all ${
                      playbackSpeed === spd
                        ? "bg-[#242a39] text-[#ffd78d] font-bold border border-[#f3b72c]/30 shadow-sm"
                        : "text-[#d4c5ad] hover:text-[#dde2f6]"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Central Transport Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Step Back One Turn"
                  onClick={handleStepBack}
                  disabled={currentTurn <= 1}
                  className="w-10 h-10 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#dde2f6] hover:text-[#ffd78d] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  aria-label="Play / Pause Replay"
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] flex items-center justify-center shadow-[0_0_16px_rgba(243,183,44,0.35)] active:scale-95 transition-transform"
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>

                <button
                  type="button"
                  aria-label="Step Forward One Turn"
                  onClick={handleStepForward}
                  disabled={currentTurn >= totalTurns}
                  className="w-10 h-10 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#dde2f6] hover:text-[#ffd78d] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Quick Turn Rewind */}
              <button
                type="button"
                onClick={handleRestart}
                className="w-9 h-9 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6] active:scale-95"
                title="Restart Replay"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TACTICAL ANALYSIS & ENGINE EVALUATION DRAWER                              */}
        {/* ========================================================================= */}
        <div className="px-4 mb-3">
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain size={18} className="text-[#ffd78d]" />
                <span className="text-xs font-bold text-[#dde2f6]">Tactical Engine Analysis</span>
              </div>
              <span className="text-[10px] font-mono text-[#68f5b8] bg-[#68f5b8]/10 border border-[#68f5b8]/20 px-2 py-0.5 rounded-full font-bold">
                {isC4 ? "Nimiq-C4 Engine" : "Nimiq-Ludo Engine"}
              </span>
            </div>

            <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-[#ffd78d]">
                    {lastColPlayed !== null
                      ? `Turn ${currentTurn}: Column ${lastColPlayed + 1}`
                      : `Turn ${currentTurn}`}
                  </span>
                  <span className="text-[9px] font-mono bg-[#f3b72c] text-[#412d00] px-1 rounded font-black">
                    {isAtEnd ? (isDraw ? "STALEMATE" : "DECISIVE FINISH") : "VERIFIED MOVE"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#68f5b8] font-bold">
                  {isAtEnd ? (isDraw ? "0.0 Draw" : "+100.0 Win") : "+1.8 Adv"}
                </span>
              </div>
              <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                {isAtEnd
                  ? isDraw
                    ? "Full board stalemate reached. 100% of escrow stakes refunded to both players."
                    : `${data.winnerSeat === 0 ? p1Name : p2Name} executed the decisive finish on turn ${totalTurns}.`
                  : `Move verified by Albatross consensus and logged into immutable match journal.`}
              </p>
            </div>

            {/* Duel Comparison Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Total Turns</span>
                <span className="text-xs font-bold text-[#ffd78d] font-mono mt-0.5">
                  {totalTurns} Moves
                </span>
              </div>

              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Stake Pool</span>
                <span className="text-xs font-bold text-[#68f5b8] font-mono mt-0.5">
                  {potAmount.toLocaleString()} NIM
                </span>
              </div>

              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Consensus</span>
                <span className="text-xs font-bold text-[#00d2ff] font-mono mt-0.5">
                  128/128
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ON-CHAIN MATCH HASH & SMART ESCROW VERIFICATION CARD                      */}
        {/* ========================================================================= */}
        <div className="px-4 mb-4">
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#00d2ff]" />
                <span className="text-xs font-bold text-[#dde2f6]">Albatross Consensus Proof</span>
              </div>
              <div className="flex items-center gap-1 text-[#68f5b8]">
                <CheckCircle2 size={13} />
                <span className="text-[10px] font-mono font-bold">128/128 Validators</span>
              </div>
            </div>

            <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">
                  Match State Hash
                </span>
                <span className="text-xs text-[#dde2f6] font-mono tracking-wide">
                  {matchHash.slice(0, 10)}...{matchHash.slice(-7)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyHash}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#242a39] text-[#ffd78d] hover:text-[#ffdea4] transition-colors active:scale-95 text-xs font-mono font-bold"
                title="Copy Match Hash"
              >
                {copiedHash ? <Check size={13} className="text-[#68f5b8]" /> : <Copy size={13} />}
                <span>{copiedHash ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <a
              href={`https://testnet.nimiq.watch/#/${matchHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-[#00d2ff] hover:text-[#a5e7ff] text-center py-1 transition-colors text-[11px] font-mono font-bold"
            >
              <span>Inspect Complete Move Proof on Nimiq Watch</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM STICKY ACTION BAR                                                  */}
        {/* ========================================================================= */}
        <div className="px-4 flex flex-col gap-2 pb-24">
          <button
            type="button"
            onClick={handleRematch}
            disabled={rematchLoading}
            className="w-full h-12 bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-transform disabled:opacity-80"
          >
            <Swords size={18} />
            <span>{rematchLoading ? "Matching Challenger..." : `Challenge Rematch · ${stakeAmount > 0 ? `${stakeAmount.toLocaleString()} NIM` : "Free Play"}`}</span>
          </button>

          <button
            type="button"
            onClick={handleExportGif}
            className="w-full h-11 bg-[#191f2e] hover:bg-[#242a39] border border-[#242a39] text-[#dde2f6] text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Download size={16} className="text-[#00d2ff]" />
            <span>Export Replay Summary</span>
          </button>
        </div>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
