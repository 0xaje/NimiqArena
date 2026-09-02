import React, { useState } from "react";
import { Star, Trophy, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Bot } from "lucide-react";
import { soundEngine } from "@/lib/audio";

interface Piece {
  position: number;
}

interface Player {
  pieces: Piece[];
}

interface LudoBoard2DProps {
  players: [Player, Player];
  currentPlayer: number;
  dice: number | null;
  yourSeat: number;
  isYourTurn: boolean;
  onMovePiece: (pieceIndex: number) => void;
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
      {/* Facet 1 (Top Left) */}
      <polygon points="50,6 50,52 10,29" fill="#FFC72C" />
      {/* Facet 2 (Top Right) */}
      <polygon points="50,6 90,29 50,52" fill="#FFA300" />
      {/* Facet 3 (Bottom Right) */}
      <polygon points="50,52 90,29 90,75 50,98" fill="#EC9918" />
      {/* Facet 4 (Bottom Left) */}
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
  { row: 8, col: 13 }, // 26 - YELLOW / GOLD Start (Safe)
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

// The 8 Classic Ludo Star / Safe Track Indices
const CLASSIC_STAR_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 4 Colored Home Columns (5 steps into center)
const ALL_HOME_COLUMNS = {
  // Red (Player 0) Home Stretch
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  // Green Home Stretch
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  // Yellow / Gold (Player 1 / AI) Home Stretch
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  // Blue Home Stretch
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

// 4 Yard Nest Slot Positions (Row, Col on 15x15 grid)
const YARD_NEST_POSITIONS = {
  red: [
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
  ],
  green: [
    { row: 2, col: 11 },
    { row: 2, col: 12 },
    { row: 3, col: 11 },
    { row: 3, col: 12 },
  ],
  yellow: [
    { row: 11, col: 11 },
    { row: 11, col: 12 },
    { row: 12, col: 11 },
    { row: 12, col: 12 },
  ],
  blue: [
    { row: 11, col: 2 },
    { row: 11, col: 3 },
    { row: 12, col: 2 },
    { row: 12, col: 3 },
  ],
};

export const LudoBoard2D: React.FC<LudoBoard2DProps> = ({
  players,
  currentPlayer,
  dice,
  yourSeat,
  isYourTurn,
  onMovePiece,
  disabled = false,
  isBotMatch = true,
}) => {
  const [hoveredPiece, setHoveredPiece] = useState<{
    player: number;
    pieceIndex: number;
  } | null>(null);

  const handlePieceMove = (pieceIndex: number) => {
    soundEngine.playPieceMove();
    onMovePiece(pieceIndex);
  };

  const canMovePiece = (playerSeat: number, piece: Piece): boolean => {
    if (disabled || !isYourTurn || yourSeat !== playerSeat || dice === null) {
      return false;
    }
    if (piece.position === -1) {
      return dice === 6;
    }
    if (piece.position >= 57) {
      return false;
    }
    return piece.position + dice <= 57;
  };

  const getTargetTrackIndex = (
    playerSeat: number,
    currentPos: number,
    diceVal: number
  ): { type: "track" | "home" | "goal"; index: number } | null => {
    if (currentPos === -1) {
      if (diceVal !== 6) return null;
      return { type: "track", index: playerSeat === 0 ? 0 : 26 };
    }
    const nextPos = currentPos + diceVal;
    if (nextPos > 57) return null;
    if (nextPos === 57) return { type: "goal", index: 57 };
    if (nextPos >= 52) {
      return { type: "home", index: nextPos - 52 };
    }
    const globalTrack = ((playerSeat === 0 ? 0 : 26) + nextPos) % 52;
    return { type: "track", index: globalTrack };
  };

  let previewTarget: { type: "track" | "home" | "goal"; index: number } | null = null;
  if (hoveredPiece && dice !== null && hoveredPiece.player === yourSeat) {
    const piece = players[hoveredPiece.player]?.pieces[hoveredPiece.pieceIndex];
    if (piece && canMovePiece(hoveredPiece.player, piece)) {
      previewTarget = getTargetTrackIndex(hoveredPiece.player, piece.position, dice);
    }
  }

  // Count finished pieces in Goal
  const p0Finished = players[0]?.pieces.filter(p => p.position === 57).length ?? 0;
  const p1Finished = players[1]?.pieces.filter(p => p.position === 57).length ?? 0;

  return (
    <div className="ludo-standard-board-wrapper">
      <div className="ludo-standard-board-frame">
        <div className="ludo-standard-grid">
          {/* ========================================================
              1. TOP-LEFT YARD: CLASSIC RED (Player 0 / Human)
             ======================================================== */}
          <div className="classic-yard red-yard" style={{ gridRow: "1 / span 6", gridColumn: "1 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge">
                <span className="yard-badge-dot red-dot" />
                <span className="yard-label">PLAYER 1</span>
              </div>
              <div className="yard-pockets-grid">
                {YARD_NEST_POSITIONS.red.map((_, idx) => {
                  const piece = players[0]?.pieces[idx];
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && canMovePiece(0, piece);

                  return (
                    <div key={`red-pocket-${idx}`} className="yard-pocket red-pocket">
                      {inBase && (
                        <button
                          type="button"
                          className={`ludo-3d-pawn pawn-red ${isMovable ? "pawn-movable-glow" : ""}`}
                          disabled={!isMovable}
                          onClick={() => handlePieceMove(idx)}
                          onMouseEnter={() => setHoveredPiece({ player: 0, pieceIndex: idx })}
                          onMouseLeave={() => setHoveredPiece(null)}
                          title={`Player 1 Piece #${idx + 1} (In Yard)`}
                        >
                          <span className="pawn-head" />
                          <span className="pawn-ring" />
                          <span className="pawn-body" />
                          <span className="pawn-number">{idx + 1}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              2. TOP-RIGHT YARD: CLASSIC GREEN
             ======================================================== */}
          <div className="classic-yard green-yard" style={{ gridRow: "1 / span 6", gridColumn: "10 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge">
                <span className="yard-badge-dot green-dot" />
                <span className="yard-label">GREEN YARD</span>
              </div>
              <div className="yard-pockets-grid">
                {YARD_NEST_POSITIONS.green.map((_, idx) => (
                  <div key={`green-pocket-${idx}`} className="yard-pocket green-pocket">
                    <div className="pawn-placeholder green-ph" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================
              3. BOTTOM-LEFT YARD: CLASSIC BLUE
             ======================================================== */}
          <div className="classic-yard blue-yard" style={{ gridRow: "10 / span 6", gridColumn: "1 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge">
                <span className="yard-badge-dot blue-dot" />
                <span className="yard-label">BLUE YARD</span>
              </div>
              <div className="yard-pockets-grid">
                {YARD_NEST_POSITIONS.blue.map((_, idx) => (
                  <div key={`blue-pocket-${idx}`} className="yard-pocket blue-pocket">
                    <div className="pawn-placeholder blue-ph" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================
              4. BOTTOM-RIGHT YARD: GOLD / NIMIQ AI (Player 1 / AI)
             ======================================================== */}
          <div className="classic-yard yellow-yard" style={{ gridRow: "10 / span 6", gridColumn: "10 / span 6" }}>
            <div className="yard-plate">
              <div className="yard-badge gold-badge">
                {isBotMatch ? (
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
                {YARD_NEST_POSITIONS.yellow.map((_, idx) => {
                  const piece = players[1]?.pieces[idx];
                  const inBase = piece?.position === -1;
                  const isMovable = inBase && canMovePiece(1, piece);

                  return (
                    <div key={`yellow-pocket-${idx}`} className="yard-pocket yellow-pocket">
                      {inBase && (
                        <button
                          type="button"
                          className={`ludo-3d-pawn pawn-yellow ${isMovable ? "pawn-movable-glow" : ""}`}
                          disabled={!isMovable}
                          onClick={() => handlePieceMove(idx)}
                          onMouseEnter={() => setHoveredPiece({ player: 1, pieceIndex: idx })}
                          onMouseLeave={() => setHoveredPiece(null)}
                          title={`${isBotMatch ? "Nimiq AI" : "Player 2"} Piece #${idx + 1} (In Yard)`}
                        >
                          <span className="pawn-head" />
                          <span className="pawn-ring" />
                          <span className="pawn-body" />
                          <span className="pawn-number">{idx + 1}</span>
                        </button>
                      )}
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

            // Find all pieces currently stationed on this track square
            const piecesOnCell: Array<{
              player: number;
              pieceIndex: number;
              piece: Piece;
            }> = [];

            players.forEach((player, pIdx) => {
              player.pieces.forEach((piece, pieceIdx) => {
                if (piece.position >= 0 && piece.position < 52) {
                  const globalPos = ((pIdx === 0 ? 0 : 26) + piece.position) % 52;
                  if (globalPos === trackIdx) {
                    piecesOnCell.push({ player: pIdx, pieceIndex: pieceIdx, piece });
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
                {/* Start Arrow Indicators */}
                {isRedStart && <ArrowRight size={14} className="start-arrow" />}
                {isGreenStart && <ArrowDown size={14} className="start-arrow" />}
                {isYellowStart && <ArrowLeft size={14} className="start-arrow" />}
                {isBlueStart && <ArrowUp size={14} className="start-arrow" />}

                {/* Star / Safe Icon */}
                {isStar && !isRedStart && !isGreenStart && !isYellowStart && !isBlueStart && (
                  <Star size={13} className="safe-star-icon" />
                )}

                {/* Stack of Pieces on this cell */}
                <div className="cell-pawns-stack">
                  {piecesOnCell.map(({ player, pieceIndex, piece }) => {
                    const isMovable = canMovePiece(player, piece);
                    return (
                      <button
                        key={`${player}-${pieceIndex}`}
                        type="button"
                        className={`ludo-3d-pawn ${player === 0 ? "pawn-red" : "pawn-yellow"} ${
                          isMovable ? "pawn-movable-glow" : ""
                        }`}
                        disabled={!isMovable}
                        onClick={() => handlePieceMove(pieceIndex)}
                        onMouseEnter={() => setHoveredPiece({ player, pieceIndex })}
                        onMouseLeave={() => setHoveredPiece(null)}
                        title={`P${player + 1} Piece #${pieceIndex + 1}`}
                      >
                        <span className="pawn-head" />
                        <span className="pawn-ring" />
                        <span className="pawn-body" />
                        <span className="pawn-number">{pieceIndex + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ========================================================
              6. THE 4 COLORED HOME RUNS (5 cells each leading to center)
             ======================================================== */}
          {/* Red Home Stretch (Player 0) */}
          {ALL_HOME_COLUMNS.red.map((coord, idx) => {
            const stepPos = 52 + idx;
            const isTargeted = previewTarget?.type === "home" && hoveredPiece?.player === 0 && previewTarget.index === idx;
            const pieces = players[0]?.pieces
              .map((piece, pieceIndex) => ({ piece, pieceIndex }))
              .filter(({ piece }) => piece.position === stepPos);

            return (
              <div
                key={`home-red-${idx}`}
                className={`classic-track-cell home-stretch-red ${isTargeted ? "cell-target-highlight" : ""}`}
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(0, piece);
                    return (
                      <button
                        key={pieceIndex}
                        type="button"
                        className={`ludo-3d-pawn pawn-red ${isMovable ? "pawn-movable-glow" : ""}`}
                        disabled={!isMovable}
                        onClick={() => handlePieceMove(pieceIndex)}
                        onMouseEnter={() => setHoveredPiece({ player: 0, pieceIndex })}
                        onMouseLeave={() => setHoveredPiece(null)}
                      >
                        <span className="pawn-head" />
                        <span className="pawn-ring" />
                        <span className="pawn-body" />
                        <span className="pawn-number">{pieceIndex + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Green Home Stretch */}
          {ALL_HOME_COLUMNS.green.map((coord, idx) => (
            <div
              key={`home-green-${idx}`}
              className="classic-track-cell home-stretch-green"
              style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
            />
          ))}

          {/* Yellow / Gold Home Stretch (Player 1 / AI) */}
          {ALL_HOME_COLUMNS.yellow.map((coord, idx) => {
            const stepPos = 52 + idx;
            const isTargeted = previewTarget?.type === "home" && hoveredPiece?.player === 1 && previewTarget.index === idx;
            const pieces = players[1]?.pieces
              .map((piece, pieceIndex) => ({ piece, pieceIndex }))
              .filter(({ piece }) => piece.position === stepPos);

            return (
              <div
                key={`home-yellow-${idx}`}
                className={`classic-track-cell home-stretch-yellow ${isTargeted ? "cell-target-highlight" : ""}`}
                style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
              >
                <div className="cell-pawns-stack">
                  {pieces.map(({ piece, pieceIndex }) => {
                    const isMovable = canMovePiece(1, piece);
                    return (
                      <button
                        key={pieceIndex}
                        type="button"
                        className={`ludo-3d-pawn pawn-yellow ${isMovable ? "pawn-movable-glow" : ""}`}
                        disabled={!isMovable}
                        onClick={() => handlePieceMove(pieceIndex)}
                        onMouseEnter={() => setHoveredPiece({ player: 1, pieceIndex })}
                        onMouseLeave={() => setHoveredPiece(null)}
                      >
                        <span className="pawn-head" />
                        <span className="pawn-ring" />
                        <span className="pawn-body" />
                        <span className="pawn-number">{pieceIndex + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Blue Home Stretch */}
          {ALL_HOME_COLUMNS.blue.map((coord, idx) => (
            <div
              key={`home-blue-${idx}`}
              className="classic-track-cell home-stretch-blue"
              style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
            />
          ))}

          {/* ========================================================
              7. CENTER HOME TRIANGLE (3x3 Center: Rows 7..9, Cols 7..9)
             ======================================================== */}
          <div
            className={`classic-center-goal ${previewTarget?.type === "goal" ? "goal-targeted" : ""}`}
            style={{ gridRow: "7 / span 3", gridColumn: "7 / span 3" }}
          >
            {/* 4 Colored Triangles */}
            <div className="center-tri tri-red">
              <span className="tri-score">{p0Finished}/4</span>
            </div>
            <div className="center-tri tri-green" />
            <div className="center-tri tri-yellow">
              <span className="tri-score">{p1Finished}/4</span>
            </div>
            <div className="center-tri tri-blue" />

            {/* Center Golden Nimiq Medallion */}
            <div className="center-medallion">
              <NimiqHexLogo size={32} />
              <span className="center-medallion-text">NIMIQ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
