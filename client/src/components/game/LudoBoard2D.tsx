import React, { useEffect, useRef, useState } from "react";
import { Star, Trophy, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import { soundEngine } from "@/lib/audio";
import { getPieceGlobalStart } from "@shared/game/ludo-engine";

import { LudoDice } from "./LudoDice";

interface Piece {
  position: number;
}

interface Player {
  pieces: Piece[];
}

export interface LudoBoard2DProps {
  players: [Player, Player] | Player[];
  currentPlayer: number;
  dice: number | null;
  diceValues?: [number, number] | null;
  remainingDice?: number[];
  yourSeat: number;
  isYourTurn: boolean;
  onMovePiece: (pieceIndex: number, dieValue?: number) => void;
  onRoll?: () => void;
  canRoll?: boolean;
  isRolling?: boolean;
  disabled?: boolean;
  isBotMatch?: boolean;
}

// Official Nimiq 3D Faceted Hexagon Emblem
export function NimiqHexLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
    >
      <polygon points="50,6 50,52 10,29" fill="#FFC72C" />
      <polygon points="50,6 90,29 50,52" fill="#FFA300" />
      <polygon points="50,52 90,29 90,75 50,98" fill="#EC9918" />
      <polygon points="50,52 50,98 10,75 10,29" fill="#D97706" />
    </svg>
  );
}

// 52-Cell Perimeter Track Mapping (row, col) on standard 15x15 Ludo grid
const TRACK_COORDINATES: Array<{ row: number; col: number }> = [
  // 0 to 4: Left Arm Top Row (Going Right)
  { row: 6, col: 1 },  // 0  - RED Start (Safe)
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  // 5 to 10: Top Arm Left Col (Going Up)
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8  - Star Safe
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10
  // 11 to 12: Top Arm Top Edge
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12
  // 13 to 17: Top Arm Right Col (Going Down)
  { row: 1, col: 8 },  // 13 - GREEN Start (Safe)
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17
  // 18 to 23: Right Arm Top Row (Going Right)
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21 - Star Safe
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // 24 to 25: Right Arm Right Edge
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  // 26 to 30: Right Arm Bottom Row (Going Left)
  { row: 8, col: 13 }, // 26 - YELLOW Start (Safe)
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30
  // 31 to 36: Bottom Arm Right Col (Going Down)
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34 - Star Safe
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // 37 to 38: Bottom Arm Bottom Edge
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  // 39 to 43: Bottom Arm Left Col (Going Up)
  { row: 13, col: 6 }, // 39 - BLUE Start (Safe)
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43
  // 44 to 49: Left Arm Bottom Row (Going Left)
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47 - Star Safe
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49
  // 50 to 51: Left Arm Left Edge
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51
];

// Classic Ludo Star / Safe Track Indices
const CLASSIC_STAR_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 4 Colored Home Columns
const ALL_HOME_COLUMNS: Record<string, Array<{ row: number; col: number }>> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

// Helper: gets color, start, and home column name for a piece
function getPieceInfo(
  playerSeat: number,
  pieceIndex: number,
  hasEightPieces: boolean
): { color: "red" | "green" | "yellow" | "blue"; start: number; homeKey: string } {
  if (!hasEightPieces) {
    if (playerSeat === 0) return { color: "red", start: 0, homeKey: "red" };
    return { color: "yellow", start: 26, homeKey: "yellow" };
  }
  // 2-player double (2 yards each):
  if (playerSeat === 0) {
    return pieceIndex < 4
      ? { color: "red", start: 0, homeKey: "red" }
      : { color: "yellow", start: 26, homeKey: "yellow" };
  } else {
    return pieceIndex < 4
      ? { color: "green", start: 13, homeKey: "green" }
      : { color: "blue", start: 39, homeKey: "blue" };
  }
}

interface ActiveSteppingState {
  player: number;
  pieceIndex: number;
  currentProgress: number;
  targetProgress: number;
  stepNum: number;
  totalSteps: number;
}

export const LudoBoard2D: React.FC<LudoBoard2DProps> = ({
  players,
  currentPlayer,
  dice,
  diceValues,
  remainingDice,
  yourSeat,
  isYourTurn,
  onMovePiece,
  onRoll,
  canRoll,
  isRolling,
  disabled = false,
  isBotMatch = true,
}) => {
  const [selectedDie, setSelectedDie] = useState<number | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<{
    player: number;
    pieceIndex: number;
  } | null>(null);

  // Stepping piece animation state ("1, 2, 3, 4, 5" count-up)
  const [steppingPiece, setSteppingPiece] = useState<ActiveSteppingState | null>(null);
  const prevPositionsRef = useRef<Record<string, number>>({});
  const animationTimerRef = useRef<number | null>(null);

  const hasEightPieces = Boolean(players[0]?.pieces && players[0].pieces.length >= 8);

  // Watch for piece movement to trigger tile-by-tile stepping animation
  useEffect(() => {
    players.forEach((player, pIdx) => {
      player.pieces.forEach((piece, pieceIdx) => {
        const key = `${pIdx}-${pieceIdx}`;
        const prevPos = prevPositionsRef.current[key];
        const currentPos = piece.position;

        // Animate piece when advancing on track
        if (prevPos !== undefined && currentPos > prevPos && prevPos >= 0) {
          const totalSteps = currentPos - prevPos;
          let currentStep = 1;

          if (animationTimerRef.current !== null) {
            window.clearInterval(animationTimerRef.current);
          }

          setSteppingPiece({
            player: pIdx,
            pieceIndex: pieceIdx,
            currentProgress: prevPos + 1,
            targetProgress: currentPos,
            stepNum: 1,
            totalSteps,
          });
          soundEngine.playStepTick(1);

          animationTimerRef.current = window.setInterval(() => {
            currentStep++;
            if (currentStep <= totalSteps) {
              setSteppingPiece(prev =>
                prev
                  ? {
                      ...prev,
                      currentProgress: prevPos + currentStep,
                      stepNum: currentStep,
                    }
                  : null
              );
              soundEngine.playStepTick(currentStep);
            } else {
              if (animationTimerRef.current !== null) {
                window.clearInterval(animationTimerRef.current);
                animationTimerRef.current = null;
              }
              setSteppingPiece(null);
            }
          }, 160);
        }

        prevPositionsRef.current[key] = currentPos;
      });
    });

    return () => {
      if (animationTimerRef.current !== null) {
        window.clearInterval(animationTimerRef.current);
      }
    };
  }, [players]);

  const dicePool = React.useMemo(() => {
    if (remainingDice && remainingDice.length > 0) return remainingDice;
    if (diceValues && diceValues.length === 2) return diceValues;
    if (dice !== null) return [dice];
    return [];
  }, [remainingDice, diceValues, dice]);

  const handlePieceMove = (pieceIndex: number) => {
    soundEngine.playPieceMove();
    const piece = players[yourSeat]?.pieces[pieceIndex];
    if (!piece) {
      onMovePiece(pieceIndex);
      return;
    }

    if (piece.position === -1) {
      // Exiting yard requires 6
      onMovePiece(pieceIndex, 6);
      return;
    }

    // On track: filter valid dice from pool
    const validDice = dicePool.filter(d => piece.position + d <= 57);
    if (validDice.length === 0) return;

    // Use selectedDie if legal for this pawn, otherwise use first valid die
    const dieToUse = selectedDie && validDice.includes(selectedDie)
      ? selectedDie
      : validDice[0];

    onMovePiece(pieceIndex, dieToUse);
  };

  const hasSixFace = Boolean(dicePool.includes(6));

  const canMovePiece = (playerSeat: number, piece: Piece): boolean => {
    if (disabled || !isYourTurn || yourSeat !== playerSeat || dice === null || dicePool.length === 0) {
      return false;
    }
    if (piece.position === -1) {
      // STRICT 6-TO-EXIT: A piece can ONLY leave the yard if at least one die physically shows 6!
      return hasSixFace;
    }
    if (piece.position >= 57) {
      return false;
    }
    return dicePool.some(d => piece.position + d <= 57);
  };

  const getTargetTrackIndex = (
    playerSeat: number,
    pieceIndex: number,
    currentPos: number,
    diceVal: number
  ): { type: "track" | "home" | "goal"; index: number } | null => {
    const { start } = getPieceInfo(playerSeat, pieceIndex, hasEightPieces);
    if (currentPos === -1) {
      if (!hasSixFace) return null;
      if (diceValues && diceValues.length === 2) {
        const otherDie = diceValues[0] === 6 ? diceValues[1] : diceValues[0];
        const initialPos = otherDie === 6 ? 0 : otherDie;
        return { type: "track", index: (start + initialPos) % 52 };
      }
      return { type: "track", index: start };
    }
    const nextPos = currentPos + diceVal;
    if (nextPos > 57) {
      if (diceValues && diceValues.length === 2) {
        const [d1, d2] = diceValues;
        if (currentPos + d1 <= 57) {
          const p = currentPos + d1;
          if (p === 57) return { type: "goal", index: 57 };
          if (p >= 52) return { type: "home", index: p - 52 };
          return { type: "track", index: (start + p) % 52 };
        }
        if (currentPos + d2 <= 57) {
          const p = currentPos + d2;
          if (p === 57) return { type: "goal", index: 57 };
          if (p >= 52) return { type: "home", index: p - 52 };
          return { type: "track", index: (start + p) % 52 };
        }
      }
      return null;
    }
    if (nextPos === 57) return { type: "goal", index: 57 };
    if (nextPos >= 52) {
      return { type: "home", index: nextPos - 52 };
    }
    const globalTrack = (start + nextPos) % 52;
    return { type: "track", index: globalTrack };
  };

  let previewTarget: { type: "track" | "home" | "goal"; index: number } | null = null;
  if (hoveredPiece && dice !== null && hoveredPiece.player === yourSeat) {
    const piece = players[hoveredPiece.player]?.pieces[hoveredPiece.pieceIndex];
    if (piece && canMovePiece(hoveredPiece.player, piece)) {
      previewTarget = getTargetTrackIndex(
        hoveredPiece.player,
        hoveredPiece.pieceIndex,
        piece.position,
        dice
      );
    }
  }

  // Count finished pieces
  const p0Finished = players[0]?.pieces.filter(p => p.position === 57).length ?? 0;
  const p1Finished = players[1]?.pieces.filter(p => p.position === 57).length ?? 0;
  const targetGoal = hasEightPieces ? 4 : 4;

  // Helper to render pawn button with step counter if actively animating
  const renderPawn = (
    pIdx: number,
    pieceIdx: number,
    isMovable: boolean,
    colorClass: string,
    isStepping = false,
    stepNum = 0
  ) => (
    <button
      key={`${pIdx}-${pieceIdx}`}
      type="button"
      className={`ludo-3d-pawn pawn-${colorClass} ${isMovable ? "pawn-movable-glow" : ""} ${
        isStepping ? "pawn-stepping-active" : ""
      }`}
      disabled={!isMovable}
      onClick={() => handlePieceMove(pieceIdx)}
      onMouseEnter={() => setHoveredPiece({ player: pIdx, pieceIndex: pieceIdx })}
      onMouseLeave={() => setHoveredPiece(null)}
      title={`Piece #${pieceIdx + 1}`}
    >
      <span className="pawn-head" />
      <span className="pawn-ring" />
      <span className="pawn-body" />
      <span className="pawn-number">{(pieceIdx % 4) + 1}</span>
      {isStepping && (
        <span className="step-counter-badge">+{stepNum}</span>
      )}
    </button>
  );

  return (
    <div className="ludo-standard-board-wrapper">
      <div className="ludo-standard-board-frame">
        <div className="ludo-standard-grid">
          {/* ========================================================
              1. TOP-LEFT YARD: RED (Player 0 / You)
             ======================================================== */}
          <div className="classic-yard red-yard" style={{ gridRow: "1 / span 6", gridColumn: "1 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge">
                <span className="yard-badge-dot red-dot" />
                <span className="yard-label">
                  {yourSeat === 0 ? "PLAYER 1 (YOU)" : "PLAYER 1"}
                </span>
              </div>
              <div className="yard-pockets-grid">
                {[0, 1, 2, 3].map(slotIdx => {
                  const pieceIdx = slotIdx;
                  const piece = players[0]?.pieces[pieceIdx];
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && canMovePiece(0, piece);

                  return (
                    <div key={`red-pocket-${slotIdx}`} className="yard-pocket red-pocket">
                      {inBase && renderPawn(0, pieceIdx, isMovable, "red")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              2. TOP-RIGHT YARD: GREEN (Player 1 / AI Yard A)
             ======================================================== */}
          <div className="classic-yard green-yard" style={{ gridRow: "1 / span 6", gridColumn: "10 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge green-badge">
                <span className="yard-badge-dot green-dot" />
                <span className="yard-label">
                  {isBotMatch ? "NIMIQ AI (GREEN)" : "PLAYER 2 (GREEN)"}
                </span>
              </div>
              <div className="yard-pockets-grid">
                {[0, 1, 2, 3].map(slotIdx => {
                  // In 2p_double, green is Player 1's pieces 0..3
                  const pieceIdx = slotIdx;
                  const piece = hasEightPieces ? players[1]?.pieces[pieceIdx] : null;
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && piece && canMovePiece(1, piece);

                  return (
                    <div key={`green-pocket-${slotIdx}`} className="yard-pocket green-pocket">
                      {inBase && renderPawn(1, pieceIdx, Boolean(isMovable), "green")}
                      {!hasEightPieces && <div className="pawn-placeholder green-ph" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              3. BOTTOM-LEFT YARD: BLUE (Player 1 / AI Yard B)
             ======================================================== */}
          <div className="classic-yard blue-yard" style={{ gridRow: "10 / span 6", gridColumn: "1 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge blue-badge">
                <span className="yard-badge-dot blue-dot" />
                <span className="yard-label">
                  {isBotMatch ? "NIMIQ AI (BLUE)" : "PLAYER 2 (BLUE)"}
                </span>
              </div>
              <div className="yard-pockets-grid">
                {[0, 1, 2, 3].map(slotIdx => {
                  // In 2p_double, blue is Player 1's pieces 4..7
                  const pieceIdx = hasEightPieces ? 4 + slotIdx : slotIdx;
                  const piece = hasEightPieces ? players[1]?.pieces[pieceIdx] : null;
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && piece && canMovePiece(1, piece);

                  return (
                    <div key={`blue-pocket-${slotIdx}`} className="yard-pocket blue-pocket">
                      {inBase && renderPawn(1, pieceIdx, Boolean(isMovable), "blue")}
                      {!hasEightPieces && <div className="pawn-placeholder blue-ph" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              4. BOTTOM-RIGHT YARD: YELLOW / GOLD
                 (Player 0's Yard B in 2p_double, or Player 1 in classic)
             ======================================================== */}
          <div className="classic-yard yellow-yard" style={{ gridRow: "10 / span 6", gridColumn: "10 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge gold-badge">
                {hasEightPieces ? (
                  <>
                    <span className="yard-badge-dot yellow-dot" />
                    <span className="yard-label">
                      {yourSeat === 0 ? "PLAYER 1 (GOLD)" : "PLAYER 1"}
                    </span>
                  </>
                ) : isBotMatch ? (
                  <>
                    <NimiqHexLogo size={18} />
                    <span className="yard-label nimiq-label">NIMIQ AI BOT</span>
                  </>
                ) : (
                  <>
                    <span className="yard-badge-dot yellow-dot" />
                    <span className="yard-label">PLAYER 2</span>
                  </>
                )}
              </div>
              <div className="yard-pockets-grid">
                {[0, 1, 2, 3].map(slotIdx => {
                  // In 2p_double, yellow is Player 0's pieces 4..7!
                  // In 2p_single, yellow is Player 1's pieces 0..3!
                  const targetPlayer = hasEightPieces ? 0 : 1;
                  const pieceIdx = hasEightPieces ? 4 + slotIdx : slotIdx;
                  const piece = players[targetPlayer]?.pieces[pieceIdx];
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && piece && canMovePiece(targetPlayer, piece);

                  return (
                    <div key={`yellow-pocket-${slotIdx}`} className="yard-pocket yellow-pocket">
                      {inBase && renderPawn(targetPlayer, pieceIdx, Boolean(isMovable), "yellow")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              5. 52-CELL PERIMETER TRACK CELLS
             ======================================================== */}
          {TRACK_COORDINATES.map((coord, trackIdx) => {
            const isStar = CLASSIC_STAR_INDICES.has(trackIdx);
            const isRedStart = trackIdx === 0;
            const isGreenStart = trackIdx === 13;
            const isYellowStart = trackIdx === 26;
            const isBlueStart = trackIdx === 39;
            const isTargeted = previewTarget?.type === "track" && previewTarget.index === trackIdx;

            // Collect pieces stationed on this cell
            const piecesOnCell: Array<{
              player: number;
              pieceIndex: number;
              piece: Piece;
              isStepping: boolean;
              stepNum: number;
              color: "red" | "green" | "yellow" | "blue";
            }> = [];

            players.forEach((player, pIdx) => {
              player.pieces.forEach((piece, pieceIdx) => {
                const { color, start } = getPieceInfo(pIdx, pieceIdx, hasEightPieces);
                const isThisPieceStepping =
                  steppingPiece?.player === pIdx && steppingPiece.pieceIndex === pieceIdx;

                // Determine effective progress (animated step vs final stored position)
                const effectivePos = isThisPieceStepping
                  ? steppingPiece.currentProgress
                  : piece.position;

                if (effectivePos >= 0 && effectivePos < 52) {
                  const globalPos = (start + effectivePos) % 52;
                  if (globalPos === trackIdx) {
                    piecesOnCell.push({
                      player: pIdx,
                      pieceIndex: pieceIdx,
                      piece,
                      isStepping: isThisPieceStepping,
                      stepNum: steppingPiece?.stepNum ?? 0,
                      color,
                    });
                  }
                }
              });
            });

            return (
              <div
                key={`track-${trackIdx}`}
                className={`classic-track-cell ${
                  isRedStart ? "cell-start-red" : ""
                } ${isGreenStart ? "cell-start-green" : ""} ${
                  isYellowStart ? "cell-start-yellow" : ""
                } ${isBlueStart ? "cell-start-blue" : ""} ${
                  isStar && !isRedStart && !isGreenStart && !isYellowStart && !isBlueStart ? "cell-star" : ""
                } ${isTargeted ? "cell-target-highlight" : ""}`}
                style={{
                  gridRow: coord.row + 1,
                  gridColumn: coord.col + 1,
                }}
              >
                {/* Directional Exit Arrows */}
                {isRedStart && <ArrowRight size={14} className="start-arrow" />}
                {isGreenStart && <ArrowDown size={14} className="start-arrow" />}
                {isYellowStart && <ArrowLeft size={14} className="start-arrow" />}
                {isBlueStart && <ArrowUp size={14} className="start-arrow" />}

                {/* Star Icon */}
                {isStar && !isRedStart && !isGreenStart && !isYellowStart && !isBlueStart && (
                  <Star size={13} className="safe-star-icon" />
                )}

                {/* Pawns on Track Cell */}
                <div className="cell-pawns-stack">
                  {piecesOnCell.map(({ player, pieceIndex, piece, isStepping, stepNum, color }) => {
                    const isMovable = canMovePiece(player, piece);
                    return renderPawn(
                      player,
                      pieceIndex,
                      isMovable,
                      color,
                      isStepping,
                      stepNum
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ========================================================
              6. THE 4 COLORED HOME STRETCH COLUMNS
             ======================================================== */}
          {/* Red Home Stretch */}
          {ALL_HOME_COLUMNS.red.map((coord, idx) => {
            const stepPos = 52 + idx;
            const isTargeted = previewTarget?.type === "home" && previewTarget.index === idx;

            // Find Red pieces on this home cell
            const pieces = players[0]?.pieces
              .map((piece, pieceIndex) => ({ piece, pieceIndex }))
              .filter(({ pieceIndex, piece }) => {
                const info = getPieceInfo(0, pieceIndex, hasEightPieces);
                return info.color === "red" && piece.position === stepPos;
              });

            return (
              <div
                key={`home-red-${idx}`}
                className={`classic-track-cell home-stretch-red ${isTargeted ? "cell-target-highlight" : ""}`}
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(0, piece);
                    return renderPawn(0, pieceIndex, isMovable, "red");
                  })}
                </div>
              </div>
            );
          })}

          {/* Green Home Stretch */}
          {ALL_HOME_COLUMNS.green.map((coord, idx) => {
            const stepPos = 52 + idx;
            const pieces = hasEightPieces
              ? players[1]?.pieces
                  .map((piece, pieceIndex) => ({ piece, pieceIndex }))
                  .filter(({ pieceIndex, piece }) => {
                    const info = getPieceInfo(1, pieceIndex, hasEightPieces);
                    return info.color === "green" && piece.position === stepPos;
                  })
              : [];

            return (
              <div
                key={`home-green-${idx}`}
                className="classic-track-cell home-stretch-green"
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(1, piece);
                    return renderPawn(1, pieceIndex, isMovable, "green");
                  })}
                </div>
              </div>
            );
          })}

          {/* Yellow Home Stretch */}
          {ALL_HOME_COLUMNS.yellow.map((coord, idx) => {
            const stepPos = 52 + idx;
            const targetPlayer = hasEightPieces ? 0 : 1;
            const isTargeted =
              previewTarget?.type === "home" &&
              hoveredPiece?.player === targetPlayer &&
              previewTarget.index === idx;

            const pieces = players[targetPlayer]?.pieces
              .map((piece, pieceIndex) => ({ piece, pieceIndex }))
              .filter(({ pieceIndex, piece }) => {
                const info = getPieceInfo(targetPlayer, pieceIndex, hasEightPieces);
                return info.color === "yellow" && piece.position === stepPos;
              });

            return (
              <div
                key={`home-yellow-${idx}`}
                className={`classic-track-cell home-stretch-yellow ${isTargeted ? "cell-target-highlight" : ""}`}
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(targetPlayer, piece);
                    return renderPawn(targetPlayer, pieceIndex, isMovable, "yellow");
                  })}
                </div>
              </div>
            );
          })}

          {/* Blue Home Stretch */}
          {ALL_HOME_COLUMNS.blue.map((coord, idx) => {
            const stepPos = 52 + idx;
            const pieces = hasEightPieces
              ? players[1]?.pieces
                  .map((piece, pieceIndex) => ({ piece, pieceIndex }))
                  .filter(({ pieceIndex, piece }) => {
                    const info = getPieceInfo(1, pieceIndex, hasEightPieces);
                    return info.color === "blue" && piece.position === stepPos;
                  })
              : [];

            return (
              <div
                key={`home-blue-${idx}`}
                className="classic-track-cell home-stretch-blue"
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(1, piece);
                    return renderPawn(1, pieceIndex, isMovable, "blue");
                  })}
                </div>
              </div>
            );
          })}

          {/* ========================================================
              7. CENTER HOME TRIANGLE (3x3 Center: Rows 7..9, Cols 7..9)
             ======================================================== */}
          <div
            className={`classic-center-goal ${previewTarget?.type === "goal" ? "goal-targeted" : ""}`}
            style={{ gridRow: "7 / span 3", gridColumn: "7 / span 3" }}
          >
            {/* 4 Colored Triangles */}
            <div className="center-tri tri-red">
              <span className="tri-score">{p0Finished}/{targetGoal}</span>
            </div>
            <div className="center-tri tri-green" />
            <div className="center-tri tri-yellow">
              <span className="tri-score">{p1Finished}/{targetGoal}</span>
            </div>
            <div className="center-tri tri-blue" />

            {/* Center Dual-Dice Arena (in the normal middle of the board) */}
            <div className="center-dice-arena">
              <LudoDice
                value={dice}
                diceValues={diceValues}
                remainingDice={remainingDice}
                selectedDie={selectedDie}
                onSelectDie={setSelectedDie}
                isRolling={Boolean(isRolling)}
                canRoll={Boolean(canRoll)}
                onRoll={onRoll ?? (() => {})}
                playerSeat={currentPlayer}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
