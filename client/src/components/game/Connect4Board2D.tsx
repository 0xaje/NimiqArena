import React, { useState, useMemo } from "react";
import {
  CONNECT4_COLS,
  CONNECT4_ROWS,
  getLowestEmptyRow,
  checkConnect4Victory,
  type Connect4Cell,
  type Connect4PlayerId,
} from "@/../../shared/game/connect4-engine";
import {
  ArrowDown,
  ChevronsDown,
  Sparkles,
  ShieldCheck,
  Hexagon,
  Disc,
  Flame,
  Coins,
  Crosshair,
} from "lucide-react";
import { soundEngine } from "@/lib/audio";

interface Connect4Board2DProps {
  board: Connect4Cell[][]; // board[col][row] where row 0 is bottom, row 5 is top
  currentPlayer: Connect4PlayerId;
  winner: Connect4PlayerId | "draw" | null;
  winningLine: [number, number][] | null;
  yourSeat: number;
  isYourTurn: boolean;
  onDropDisc: (column: number) => void;
  disabled?: boolean;
  onSendEmote?: (text: string) => void;
  secondsLeft?: number;
}

export const Connect4Board2D = React.memo(function Connect4Board2D({
  board,
  currentPlayer,
  winner,
  winningLine,
  yourSeat,
  isYourTurn,
  onDropDisc,
  disabled = false,
  onSendEmote,
  secondsLeft = 24,
}: Connect4Board2DProps) {
  // Default selected column is column 3 (zero-indexed = column 4)
  const [selectedCol, setSelectedCol] = useState<number>(3);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const isWinningCell = (col: number, row: number) => {
    if (!winningLine) return false;
    return winningLine.some(([c, r]) => c === col && r === row);
  };

  const handleSelectColumn = (col: number) => {
    setSelectedCol(col);
  };

  const handleDrop = (colToDrop?: number) => {
    const col = colToDrop !== undefined ? colToDrop : selectedCol;
    if (disabled || !isYourTurn || winner !== null) return;
    const lowestRow = getLowestEmptyRow(board, col);
    if (lowestRow !== -1) {
      soundEngine.playChipDrop();
      onDropDisc(col);
    }
  };

  const activeCol = hoveredCol !== null ? hoveredCol : selectedCol;
  const isSelectedColFull = getLowestEmptyRow(board, activeCol) === -1;
  const canDropInActiveCol =
    isYourTurn && !isSelectedColFull && winner === null && !disabled;

  // Authoritative real-time threat analysis
  const { winCol, threatCol } = useMemo(() => {
    if (!board || board.length !== CONNECT4_COLS || winner !== null) {
      return { winCol: null, threatCol: null };
    }

    const mySeat = (yourSeat === 0 || yourSeat === 1 ? yourSeat : 0) as Connect4PlayerId;
    const oppSeat = (1 - mySeat) as Connect4PlayerId;

    let detectedWinCol: number | null = null;
    let detectedThreatCol: number | null = null;

    // Clone board shallowly for fast simulation
    const testBoard = board.map((col) => [...col]);

    for (let c = 0; c < CONNECT4_COLS; c++) {
      const r = getLowestEmptyRow(testBoard, c);
      if (r !== -1) {
        // Test my win
        testBoard[c][r] = mySeat;
        if (checkConnect4Victory(testBoard, c, r)) {
          detectedWinCol = c + 1;
        }
        // Test opponent win
        testBoard[c][r] = oppSeat;
        if (checkConnect4Victory(testBoard, c, r)) {
          detectedThreatCol = c + 1;
        }
        testBoard[c][r] = null;
      }
    }

    return { winCol: detectedWinCol, threatCol: detectedThreatCol };
  }, [board, yourSeat, winner]);

  // Timer ring calculation (30s baseline)
  const strokeOffset = Math.max(0, 88 - (88 * Math.min(30, secondsLeft)) / 30);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* ARENA GRID CONTAINER (Connect 4 Board Hero) */}
      <section className="relative w-full max-w-[390px] p-3 rounded-2xl bg-[#080e1c] border border-[#242a39] shadow-2xl overflow-hidden">
        {/* Ambient Holographic Glow Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00d2ff]/10 via-transparent to-[#f3b72c]/10 pointer-events-none" />

        {/* Aesthetic Arena Header Plate */}
        <div className="relative z-10 flex items-center justify-between pb-2 mb-1 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c] shadow-[0_0_6px_#f3b72c]" />
            <span className="text-[10px] text-[#ffd78d] font-bold uppercase tracking-wider font-mono">
              Tactical Matrix 7×6
            </span>
          </div>
          <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
            <ShieldCheck size={13} className="text-[#68f5b8]" />
            State: Deterministic
          </span>
        </div>

        {/* 7 Drop Triggers (Column Droppers) */}
        <div className="relative z-10 grid grid-cols-7 gap-1.5 mb-2.5">
          {Array.from({ length: CONNECT4_COLS }).map((_, col) => {
            const isFull = getLowestEmptyRow(board, col) === -1;
            const isTargeted = activeCol === col;
            const canDropThis = isYourTurn && !isFull && winner === null && !disabled;

            return (
              <button
                key={`drop-trigger-${col}`}
                type="button"
                onClick={() => {
                  handleSelectColumn(col);
                  if (canDropThis && isTargeted) {
                    handleDrop(col);
                  }
                }}
                onMouseEnter={() => setHoveredCol(col)}
                onMouseLeave={() => setHoveredCol(null)}
                disabled={isFull || disabled || winner !== null}
                className={`drop-col-btn h-9 rounded-lg flex flex-col items-center justify-center transition-all ${
                  isTargeted && canDropThis
                    ? "bg-[#f3b72c] text-[#412d00] shadow-[0_0_14px_rgba(243,183,44,0.6)] scale-105 transform"
                    : isFull
                    ? "bg-[#151b29] text-[#4f4534] opacity-50 cursor-not-allowed border border-[#242a39]"
                    : "bg-[#242a39] text-[#d4c5ad] hover:bg-[#2f3544] border border-[#2f3544] active:scale-95"
                }`}
                title={`Column ${col + 1}${isFull ? " (Full)" : ""}`}
              >
                <ArrowDown
                  size={14}
                  className={isTargeted && canDropThis ? "animate-bounce font-bold" : ""}
                />
                <span className="text-[10px] font-mono leading-none mt-0.5 font-bold">
                  {col + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* PHYSICAL CONNECT 4 VERTICAL GRID BOARD */}
        <div className="relative p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-2xl overflow-hidden">
          {/* Neon Laser Filter Definitions & Laser Guide Vector SVG if winning line is present */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
              <filter id="neon-laser-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>

          {winningLine && winningLine.length >= 4 && (
            <div className="absolute z-30 pointer-events-none inset-0 flex items-center justify-center p-2.5">
              <svg className="w-full h-full" fill="none" viewBox="0 0 350 280">
                {/* Background Outer Glow Beam */}
                <line
                  x1={`${((winningLine[0][0] + 0.5) / 7) * 350}`}
                  y1={`${((5 - winningLine[0][1] + 0.5) / 6) * 280}`}
                  x2={`${((winningLine[winningLine.length - 1][0] + 0.5) / 7) * 350}`}
                  y2={`${((5 - winningLine[winningLine.length - 1][1] + 0.5) / 6) * 280}`}
                  stroke="#f3b72c"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.6"
                  filter="url(#neon-laser-glow)"
                />
                {/* Pulsing Core Laser Beam */}
                <line
                  x1={`${((winningLine[0][0] + 0.5) / 7) * 350}`}
                  y1={`${((5 - winningLine[0][1] + 0.5) / 6) * 280}`}
                  x2={`${((winningLine[winningLine.length - 1][0] + 0.5) / 7) * 350}`}
                  y2={`${((5 - winningLine[winningLine.length - 1][1] + 0.5) / 6) * 280}`}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </svg>
            </div>
          )}

          {/* 7 columns x 6 rows Matrix Grid (rendered rows from top 5 down to 0) */}
          <div className="grid grid-cols-7 gap-1.5 relative z-10">
            {Array.from({ length: CONNECT4_ROWS }).map((_, rowRev) => {
              const row = 5 - rowRev; // row 5 at top, row 0 at bottom
              return Array.from({ length: CONNECT4_COLS }).map((_, col) => {
                const cellValue = board[col]?.[row] ?? null;
                const isWinning = isWinningCell(col, row);
                const isLowestEmpty =
                  cellValue === null && getLowestEmptyRow(board, col) === row;
                const isTargetHover = isLowestEmpty && activeCol === col && isYourTurn;
                const isColActive = activeCol === col && isYourTurn && winner === null;

                return (
                  <div
                    key={`c4-${col}-${row}`}
                    onClick={() => {
                      handleSelectColumn(col);
                      if (isYourTurn && !disabled && winner === null && yourSeat !== -1) {
                        handleDrop(col);
                      }
                    }}
                    className={`aspect-square rounded-full flex items-center justify-center transition-all relative ${
                      yourSeat === -1 ? "cursor-default" : "cursor-pointer"
                    } ${
                      cellValue === null
                        ? `bg-[#080e1c] shadow-inner border border-black/40 ${
                            isColActive ? "bg-[#0b1426] ring-1 ring-[#f3b72c]/30" : ""
                          }`
                        : cellValue === 0
                        ? "bg-[radial-gradient(circle_at_35%_30%,#fff08a_0%,#f3b72c_55%,#92400e_100%)] text-[#412d00] shadow-[0_0_14px_rgba(243,183,44,0.95),inset_0_2px_4px_rgba(255,255,255,0.6)] transform scale-95 border border-amber-200/50"
                        : "bg-[radial-gradient(circle_at_35%_30%,#a5f3fc_0%,#00d2ff_55%,#0369a1_100%)] text-[#003543] shadow-[0_0_14px_rgba(0,210,255,0.85),inset_0_2px_4px_rgba(255,255,255,0.6)] transform scale-95 border border-cyan-200/50"
                    } ${
                      isWinning
                        ? "ring-4 ring-[#ffd78d] scale-105 shadow-[0_0_24px_#f3b72c] z-20 animate-pulse"
                        : ""
                    }`}
                  >
                    {isWinning ? (
                      <Sparkles size={18} className="text-[#412d00] animate-spin font-black" />
                    ) : cellValue === 0 ? (
                      <Hexagon size={16} className="fill-current drop-shadow" />
                    ) : cellValue === 1 ? (
                      <Disc size={16} className="fill-current drop-shadow" />
                    ) : isTargetHover ? (
                      <div className="relative flex items-center justify-center">
                        <span className="w-4 h-4 rounded-full bg-[#f3b72c]/40 animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
                      </div>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#242a39]/70" />
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* Micro Board Artwork Reference Preview Pill */}
        <div className="relative mt-2 pt-1 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#68f5b8]" />
            <span className="text-[10px] text-[#d4c5ad] font-mono">
              Arena Engine v4.2 • Ranked Match
            </span>
          </div>
          <span className="text-[10px] text-[#f3b72c] font-mono font-bold flex items-center gap-1">
            <Flame size={12} className="text-[#f3b72c]" /> Active Duel
          </span>
        </div>
      </section>

      {/* DYNAMIC ACTION & TURN HUD (Thumb Zone) */}
      <section className="w-full max-w-[390px] mt-2.5 flex flex-col gap-2.5">
        {/* YOUR TURN URGENCY BANNER */}
        <div className="p-3 rounded-xl bg-[#242a39] border border-[#2f3544] shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Turn Urgency Timer Ring */}
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="none" r="14" stroke="#151b29" strokeWidth="3" />
                <circle
                  className="transition-all duration-1000"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="14"
                  stroke={secondsLeft <= 4 ? "#ffb4ab" : "#f3b72c"}
                  strokeDasharray="88"
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-xs font-mono font-bold leading-none ${
                    secondsLeft <= 4 ? "text-[#ffb4ab]" : "text-[#f3b72c]"
                  }`}
                >
                  {secondsLeft}
                </span>
                <span className="text-[8px] text-[#d4c5ad] font-mono leading-none mt-0.5">
                  SEC
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[#ffd78d]">
                  {isYourTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </span>
                {isYourTurn && (
                  <span className="w-2 h-2 rounded-full bg-[#f3b72c] animate-pulse" />
                )}
              </div>
              <span className="text-xs text-[#d4c5ad] leading-tight">
                Align 4 tokens in any direction to win
              </span>
            </div>
          </div>

          {/* Quick column threat hint */}
          <div className="px-2 py-1 rounded-lg bg-[#080e1c] border border-[#151b29] text-right shrink-0">
            {threatCol ? (
              <span className="text-[10px] text-[#00d2ff] font-mono block font-semibold">
                Threat Col {threatCol}
              </span>
            ) : (
              <span className="text-[10px] text-[#d4c5ad] font-mono block font-semibold">
                Board Balanced
              </span>
            )}
            {winCol ? (
              <span className="text-[10px] text-[#68f5b8] font-mono font-semibold">
                Drop Col {winCol} Win
              </span>
            ) : (
              <span className="text-[10px] text-[#ffd78d] font-mono font-semibold">
                Drop Col {activeCol + 1}
              </span>
            )}
          </div>
        </div>

        {/* PRIMARY ACTION COMMIT BUTTON */}
        <button
          onClick={() => handleDrop()}
          disabled={!canDropInActiveCol}
          className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(243,183,44,0.35)] ${
            canDropInActiveCol
              ? "bg-[#f3b72c] text-[#412d00] hover:bg-[#ffdea4] cursor-pointer"
              : isSelectedColFull
              ? "bg-[#191f2e] text-[#d4c5ad] border border-[#2f3544] cursor-not-allowed opacity-60"
              : "bg-[#191f2e] text-[#d4c5ad] border border-[#2f3544] cursor-not-allowed opacity-70"
          }`}
        >
          <Coins size={18} className="fill-current text-[#412d00]" />
          <span>
            {isSelectedColFull
              ? `COLUMN ${activeCol + 1} IS FULL`
              : isYourTurn
              ? `DROP TOKEN IN COLUMN ${activeCol + 1}`
              : "WAITING FOR OPPONENT…"}
          </span>
          <ChevronsDown size={18} />
        </button>

        {/* QUICK TAUNT / EMOTE BAR */}
        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-[#151b29] border border-[#242a39]">
          <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono pl-1">
            Taunts:
          </span>
          <div className="flex items-center gap-1.5">
            {["GG", "🔥", "Nice Move", "🤔"].map((taunt) => (
              <button
                key={taunt}
                onClick={() => onSendEmote?.(taunt)}
                className="px-2.5 py-1 rounded-lg bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39] active:scale-95 text-xs font-mono text-[#dde2f6] transition-transform"
              >
                {taunt}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});
