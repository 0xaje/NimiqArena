import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

const PLAYER_1_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDbPdWrjlbAoCpD8KKgHWlVhNxPzKvb9DbXnO1yeK_kHQo-Vz17T0V8UKUjKqrXSw3nUhWh08GfHbBuuIQgIekRWgJony6C2jcjriI553nj3BwEgTgzfUANqwAxLa_-Tk67lXeE3pq-CM7RIypz3s-Bxy0XdnWqhsXzsQ5ZZbBtUGJePDOIyILhDyjfXmja0C5-RL2ym9YXxR1VGf4GAZt94H67bReKVrw2Vj6ywo0V_qodolnTJptfag";

const PLAYER_2_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuABA39ewVXshkL2d3KSdG0nHLwp08uXU5UR4g8l1o_GpEsCMwzbvwoSnaXxPrXSwSNbOXQHqyKi0oz18OQCE-0qqBN0yitblEEG2Tm2fXeowCbcsMR9I1pJmciBcImcyCjy8elzjPz8I9hvTqWYpGdG4KQ6LOLDZNk5fvFPqdNnb43W8UgCgATeuuZ73Z-2HCOMWaW9oIwfGe_HLpPMinFDm4CDRWtltj8LQYVvCWe86USZ-Sp6vkQKUQ";

export default function MatchReplay() {
  const [, setLocation] = useLocation();

  // Playback state
  const [currentTurn, setCurrentTurn] = useState<number>(24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [rematchLoading, setRematchLoading] = useState<boolean>(false);

  const matchStateHash = "0x7f4b802a89c31e91ac24b89104fa289c091e4281";

  // Playback timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      const delay = 1000 / playbackSpeed;
      interval = setInterval(() => {
        setCurrentTurn((prev) => {
          if (prev >= 24) {
            setIsPlaying(false);
            return 24;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentTurn >= 24) {
      setCurrentTurn(1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentTurn((prev) => Math.max(1, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentTurn((prev) => Math.min(24, prev + 1));
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTurn(1);
  };

  const handleJumpToBlunder = () => {
    setIsPlaying(false);
    setCurrentTurn(23);
    toast.error("Turn 23: Opponent Critical Blunder (missed column block on Col 2)");
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(matchStateHash);
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
      matchId: "replay-8492",
      game: "Connect 4 Pro Blitz",
      blockHeight: 3982425,
      winner: "Valkyrie (GLDN)",
      opponent: "CyberRonin (CYBR)",
      totalTurns: 24,
      decisiveMove: "Col 4 Drop (Vertical 4-in-a-row)",
      albatrossValidators: "128/128 Consensus Reached",
      matchStateHash,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `connect4-proof-replay-8492.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cryptographic match proof exported!");
  };

  const handleRematch = () => {
    setRematchLoading(true);
    setTimeout(() => {
      setRematchLoading(false);
      toast.success("Rematch challenge dispatched to CyberRonin!");
      setLocation("/games/connect-four");
    }, 1200);
  };

  const handleExportGif = () => {
    toast.info("Generating animated GIF of turns 1-24...");
    setTimeout(() => {
      toast.success("Animated Replay GIF saved to device storage!");
    }, 1500);
  };

  // Evaluation values based on current turn
  const isAtBlunder = currentTurn === 23;
  const isAtEnd = currentTurn >= 24;
  const isAtTrap = currentTurn >= 18 && currentTurn < 23;

  const winProbability = isAtEnd
    ? 99.8
    : isAtBlunder
    ? 96.5
    : isAtTrap
    ? 78.0
    : 52.0;

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
                <span className="text-base font-black text-[#dde2f6]">Replay #8492</span>
                <span className="bg-[#f3b72c]/15 border border-[#f3b72c]/20 text-[#ffdea4] text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Blitz Duel
                </span>
              </div>
              <span className="text-xs text-[#d4c5ad]">Connect 4 Pro · 200 NIM Stake Pool</span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-[#d4c5ad] uppercase">Payout</span>
              <span className="text-sm font-black text-[#ffd78d] font-mono tracking-tight">
                +196 NIM
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
              {/* Player 1 (You) */}
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    className="w-10 h-10 rounded-full object-cover shadow-[0_0_10px_rgba(243,183,44,0.3)] border border-[#f3b72c]"
                    alt="Valkyrie"
                    src={PLAYER_1_AVATAR}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#f3b72c] flex items-center justify-center text-[#412d00] text-[9px] font-black">
                    1
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#ffd78d]">Valkyrie</span>
                    <span className="text-[9px] font-mono text-[#412d00] bg-[#f3b72c] font-black px-1 rounded uppercase">
                      YOU
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-[#d4c5ad]">[GLDN]</span>
                    <span className="text-[10px] font-mono text-[#ffdea4] font-semibold">
                      ELO 2,182
                    </span>
                  </div>
                </div>
              </div>

              {/* Duel Status Node */}
              <div className="flex flex-col items-center">
                <span className="bg-[#68f5b8]/15 border border-[#68f5b8]/20 text-[#68f5b8] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {isAtEnd ? "VICTORY" : `MOVE ${currentTurn}`}
                </span>
                <span className="text-[10px] font-mono text-[#d4c5ad] mt-0.5">
                  Turn {currentTurn}/24
                </span>
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex items-center gap-2.5 text-right">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-[#00d2ff] bg-[#00d2ff]/15 px-1 rounded uppercase font-bold">
                      [CYBR]
                    </span>
                    <span className="text-xs font-bold text-[#dde2f6]">CyberRonin</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#d4c5ad]">ELO 2,145</span>
                </div>
                <div className="relative shrink-0">
                  <img
                    className="w-10 h-10 rounded-full object-cover shadow-[0_0_10px_rgba(0,210,255,0.25)] border border-[#00d2ff]"
                    alt="CyberRonin"
                    src={PLAYER_2_AVATAR}
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
                      ? "Engine Eval: +Mate in 1"
                      : isAtBlunder
                      ? "Engine Eval: Critical Blunder"
                      : "Engine Eval: +1.8 Advantage"}
                  </span>
                </div>
                <span className="text-[#ffd78d] font-bold">
                  Win Prob: {winProbability.toFixed(1)}% (Gold)
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
        {/* INTERACTIVE TACTICAL BOARD CANVAS (7x6 GRID)                              */}
        {/* ========================================================================= */}
        <div className="px-4 mb-3">
          <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 shadow-xl relative overflow-hidden flex flex-col items-center">
            {/* Ambient Glow Behind Winning Column 4 */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#f3b72c]/10 via-transparent to-transparent pointer-events-none" />

            {/* Column Indicators & Move Annotation Bar */}
            <div className="w-full grid grid-cols-7 gap-1 mb-1.5 text-center font-mono">
              <span className="text-xs text-[#d4c5ad]">1</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-[#ffb4ab] font-bold">?</span>
                <span className="text-xs text-[#d4c5ad]">2</span>
              </div>
              <span className="text-xs text-[#d4c5ad]">3</span>
              {/* Column 4 (Winning Move on Turn 24) */}
              <div className="flex flex-col items-center relative">
                <div className="absolute -top-2 px-1 py-0.5 bg-[#f3b72c] text-[#412d00] rounded text-[9px] font-black shadow-md animate-pulse">
                  !! WIN
                </div>
                <span className="text-xs text-[#ffd78d] font-bold mt-2.5">4</span>
              </div>
              <span className="text-xs text-[#d4c5ad]">5</span>
              <span className="text-xs text-[#d4c5ad]">6</span>
              <span className="text-xs text-[#d4c5ad]">7</span>
            </div>

            {/* The 7x6 Connect 4 Grid */}
            <div className="w-full max-w-[340px] bg-[#2f3544]/90 p-2.5 rounded-xl shadow-inner relative border border-[#333948]">
              {/* SVG Connecting Victory Line across Column 4 Rows 1 to 4 */}
              {isAtEnd && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    className="opacity-90"
                    stroke="#ffd78d"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeWidth="4"
                    x1="50%"
                    x2="50%"
                    y1="36%"
                    y2="88%"
                  />
                  <line
                    className="animate-pulse"
                    stroke="#68f5b8"
                    strokeLinecap="round"
                    strokeWidth="2"
                    x1="50%"
                    x2="50%"
                    y1="36%"
                    y2="88%"
                  />
                </svg>
              )}

              <div className="grid grid-cols-7 gap-1.5">
                {/* Row 6 (Top) - Empty */}
                {[...Array(7)].map((_, i) => (
                  <div
                    key={`r6-${i}`}
                    className="aspect-square rounded-full bg-[#080e1c] flex items-center justify-center border border-[#151b29]"
                  />
                ))}

                {/* Row 5 - Empty */}
                {[...Array(7)].map((_, i) => (
                  <div
                    key={`r5-${i}`}
                    className="aspect-square rounded-full bg-[#080e1c] flex items-center justify-center border border-[#151b29]"
                  />
                ))}

                {/* Row 4 */}
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                {/* Col 4 Row 4 - Winning Gold Chip #4 (Move 24) */}
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_12px_#ffd78d] flex items-center justify-center relative">
                  <span className="w-3 h-3 rounded-full bg-white/50" />
                  {isAtEnd && (
                    <div className="absolute -inset-1 rounded-full bg-[#f3b72c]/40 animate-ping" />
                  )}
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />

                {/* Row 3 */}
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                {/* Col 4 Row 3 - Winning Gold Chip #3 */}
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_12px_#ffd78d] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />

                {/* Row 2 */}
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                {/* Col 2 Row 2 - Opponent Blunder token */}
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#ffb4ab] border border-[#ffb4ab] flex items-center justify-center">
                  <span className="text-[10px] text-[#ffb4ab] font-bold font-mono">✕</span>
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                {/* Col 4 Row 2 - Winning Gold Chip #2 */}
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_12px_#ffd78d] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#080e1c] border border-[#151b29]" />

                {/* Row 1 (Bottom) */}
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                {/* Col 4 Row 1 - Winning Gold Chip #1 */}
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_12px_#ffd78d] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <div className="aspect-square rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <div className="aspect-square rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                </div>
              </div>
            </div>

            {/* Match Stage Annotation Footer */}
            <div className="w-full flex items-center justify-between mt-2.5 pt-2 border-t border-[#242a39]/70">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f3b72c]" />
                <span className="text-[10px] font-mono text-[#dde2f6]">
                  Col 4: Vertical Lock Completed
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#68f5b8]">
                <Award size={13} />
                <span className="text-[10px] font-mono font-bold">Decisive Finish</span>
              </div>
            </div>
          </div>
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
                  03:42
                </span>
              </div>
              <button
                type="button"
                onClick={handleJumpToBlunder}
                className="flex items-center gap-1 text-[#ffd78d] hover:text-[#ffdea4] transition-colors active:scale-95 text-left text-[11px] font-mono font-bold"
              >
                <Zap size={12} />
                <span>Jump to Blunder (T23)</span>
              </button>
            </div>

            {/* Segmented Turn Scrubber (24 Turns) */}
            <div className="flex flex-col gap-1">
              <div className="w-full flex items-center gap-[2px] h-3">
                {[...Array(24)].map((_, i) => {
                  const turnNum = i + 1;
                  const isGold = turnNum % 2 !== 0;
                  const isCurrent = turnNum === currentTurn;
                  const isTurn18 = turnNum === 18;
                  const isTurn23 = turnNum === 23;
                  const isTurn24 = turnNum === 24;

                  let bgColor = isGold ? "bg-[#f3b72c]/50" : "bg-[#00d2ff]/50";
                  if (turnNum > currentTurn) {
                    bgColor = "bg-[#242a39]";
                  } else if (isTurn23) {
                    bgColor = "bg-[#ffb4ab] shadow-[0_0_6px_#ffb4ab]";
                  } else if (isTurn24) {
                    bgColor = "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]";
                  } else if (isTurn18) {
                    bgColor = "bg-[#00d2ff]/90";
                  }

                  return (
                    <button
                      key={`scrub-${turnNum}`}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTurn(turnNum);
                      }}
                      className={`flex-1 h-full ${bgColor} rounded-sm relative transition-all`}
                      title={`Turn ${turnNum}`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#f3b72c] animate-ping" />
                      )}
                      {isTurn18 && !isCurrent && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                      )}
                      {isTurn23 && !isCurrent && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#ffb4ab]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center px-0.5 text-[9px] font-mono">
                <span className="text-[#d4c5ad]">Turn 1</span>
                <span className="text-[#00d2ff]">T18 Trap</span>
                <span className="text-[#ffb4ab] font-bold">T23 Blunder</span>
                <span className="text-[#ffd78d] font-bold">T24 Mate</span>
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
                  className="w-10 h-10 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#dde2f6] hover:text-[#ffd78d] active:scale-95 transition-transform"
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
                  disabled={currentTurn >= 24}
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
                <span className="text-xs font-bold text-[#dde2f6]">Tactical Engine Depth 18</span>
              </div>
              <span className="text-[10px] font-mono text-[#68f5b8] bg-[#68f5b8]/10 border border-[#68f5b8]/20 px-2 py-0.5 rounded-full font-bold">
                Stockfish-C4 v4.2
              </span>
            </div>

            <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-[#ffd78d]">
                    Move {currentTurn}: {isAtEnd ? "Col 4 (Drop)" : `Col ${((currentTurn % 7) + 1)}`}
                  </span>
                  <span className="text-[9px] font-mono bg-[#f3b72c] text-[#412d00] px-1 rounded font-black">
                    {isAtEnd ? "BEST MOVE #1" : "IN PROGRESS"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#68f5b8] font-bold">
                  {isAtEnd ? "+100.0 Mate" : isAtBlunder ? "-Blunder" : "+1.8 Adv"}
                </span>
              </div>
              <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                Valkyrie seized CyberRonin's Turn 23 blunder (missed column block on Col 2) by executing a decisive 4-token vertical column lockout. Inescapable mate sequence.
              </p>
            </div>

            {/* Duel Comparison Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Accuracy</span>
                <div className="flex items-center justify-center gap-1 mt-0.5 font-mono">
                  <span className="text-xs font-bold text-[#ffd78d]">94.2%</span>
                  <span className="text-[10px] text-[#d4c5ad]">vs</span>
                  <span className="text-xs font-bold text-[#00d2ff]">81.5%</span>
                </div>
              </div>

              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Blunders</span>
                <div className="flex items-center justify-center gap-1 mt-0.5 font-mono">
                  <span className="text-xs font-bold text-[#68f5b8]">0</span>
                  <span className="text-[10px] text-[#d4c5ad]">vs</span>
                  <span className="text-xs font-bold text-[#ffb4ab]">1</span>
                </div>
              </div>

              <div className="bg-[#191f2e] border border-[#242a39] rounded-lg p-2 flex flex-col">
                <span className="text-[9px] font-mono text-[#d4c5ad] uppercase">Avg Time</span>
                <div className="flex items-center justify-center gap-1 mt-0.5 font-mono">
                  <span className="text-xs font-bold text-[#ffd78d]">1.4s</span>
                  <span className="text-[10px] text-[#d4c5ad]">vs</span>
                  <span className="text-xs font-bold text-[#00d2ff]">2.1s</span>
                </div>
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
                  {matchStateHash.slice(0, 10)}...{matchStateHash.slice(-7)}
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
              href={`https://testnet.nimiq.watch/#/${matchStateHash}`}
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
            <span>{rematchLoading ? "Matching Challenger..." : "Challenge Rematch · 100 NIM"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportGif}
            className="w-full h-11 bg-[#191f2e] hover:bg-[#242a39] border border-[#242a39] text-[#dde2f6] text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Download size={16} className="text-[#00d2ff]" />
            <span>Export Animated Replay GIF</span>
          </button>
        </div>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
