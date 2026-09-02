import React, { useState } from "react";
import { Shield, Sparkles, Trophy } from "lucide-react";
import { LUDO_SAFE_SQUARES } from "@shared/game/ludo-engine";
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
}

// 52-Cell Perimeter Track Mapping (row, col) on 15x15 grid
const TRACK_COORDINATES: Array<{ row: number; col: number }> = [
  // Index 0 to 4 (Left Arm Top Row, going Right)
  { row: 6, col: 1 }, // 0 - Safe / P0 Start
  { row: 6, col: 2 }, // 1
  { row: 6, col: 3 }, // 2
  { row: 6, col: 4 }, // 3
  { row: 6, col: 5 }, // 4
  // Index 5 to 10 (Top Arm Left Col, going Up)
  { row: 5, col: 6 }, // 5
  { row: 4, col: 6 }, // 6
  { row: 3, col: 6 }, // 7
  { row: 2, col: 6 }, // 8
  { row: 1, col: 6 }, // 9
  { row: 0, col: 6 }, // 10
  // Index 11 to 12 (Top Arm Top Edge)
  { row: 0, col: 7 }, // 11
  { row: 0, col: 8 }, // 12
  // Index 13 to 17 (Top Arm Right Col, going Down)
  { row: 1, col: 8 }, // 13 - Safe Star
  { row: 2, col: 8 }, // 14
  { row: 3, col: 8 }, // 15
  { row: 4, col: 8 }, // 16
  { row: 5, col: 8 }, // 17
  // Index 18 to 23 (Right Arm Top Row, going Right)
  { row: 6, col: 9 }, // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // Index 24 to 25 (Right Arm Right Edge)
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  // Index 26 to 30 (Right Arm Bottom Row, going Left)
  { row: 8, col: 13 }, // 26 - Safe / P1 Start
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 }, // 30
  // Index 31 to 36 (Bottom Arm Right Col, going Down)
  { row: 9, col: 8 }, // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // Index 37 to 38 (Bottom Arm Bottom Edge)
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  // Index 39 to 43 (Bottom Arm Left Col, going Up)
  { row: 13, col: 6 }, // 39 - Safe Star
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 }, // 43
  // Index 44 to 49 (Left Arm Bottom Row, going Left)
  { row: 8, col: 5 }, // 44
  { row: 8, col: 4 }, // 45
  { row: 8, col: 3 }, // 46
  { row: 8, col: 2 }, // 47
  { row: 8, col: 1 }, // 48
  { row: 8, col: 0 }, // 49
  // Index 50 to 51 (Left Arm Left Edge)
  { row: 7, col: 0 }, // 50
  { row: 6, col: 0 }, // 51
];

// Home Column Steps (Progress 52..56)
const HOME_COLUMNS: Record<number, Array<{ row: number; col: number }>> = {
  0: [
    { row: 7, col: 1 }, // 52
    { row: 7, col: 2 }, // 53
    { row: 7, col: 3 }, // 54
    { row: 7, col: 4 }, // 55
    { row: 7, col: 5 }, // 56
  ],
  1: [
    { row: 7, col: 13 }, // 52
    { row: 7, col: 12 }, // 53
    { row: 7, col: 11 }, // 54
    { row: 7, col: 10 }, // 55
    { row: 7, col: 9 }, // 56
  ],
};

// Base Nests
const BASE_NESTS: Record<number, Array<{ row: number; col: number }>> = {
  0: [
    { row: 1, col: 1 },
    { row: 1, col: 4 },
    { row: 4, col: 1 },
    { row: 4, col: 4 },
  ],
  1: [
    { row: 10, col: 10 },
    { row: 10, col: 13 },
    { row: 13, col: 10 },
    { row: 13, col: 13 },
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
    const globalTrack = ( (playerSeat === 0 ? 0 : 26) + nextPos ) % 52;
    return { type: "track", index: globalTrack };
  };

  // Identify targeted cell when hovering over a movable piece
  let previewTarget: { type: "track" | "home" | "goal"; index: number } | null =
    null;
  if (hoveredPiece && dice !== null && hoveredPiece.player === yourSeat) {
    const piece = players[hoveredPiece.player]?.pieces[hoveredPiece.pieceIndex];
    if (piece && canMovePiece(hoveredPiece.player, piece)) {
      previewTarget = getTargetTrackIndex(hoveredPiece.player, piece.position, dice);
    }
  }

  return (
    <div className="ludo-board-2d-wrapper">
      <div className="ludo-board-2d-grid">
        {/* 1. Base 0 (Top-Left, Player 0) */}
        <div className="board-quadrant base-0">
          <div className="base-inner">
            <div className="base-header">
              <span className="base-tag">PLAYER 1 (AMBER)</span>
            </div>
            <div className="base-nests">
              {BASE_NESTS[0].map((coord, idx) => {
                const piece = players[0]?.pieces[idx];
                const isInBase = piece?.position === -1;
                const isMovable = isInBase && canMovePiece(0, piece);

                return (
                  <div
                    key={idx}
                    className="base-nest-slot"
                    style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
                  >
                    {isInBase && (
                      <button
                        type="button"
                        className={`board-piece-token p0 ${
                          isMovable ? "movable-pulse" : ""
                        }`}
                        disabled={!isMovable}
                        onClick={() => handlePieceMove(idx)}
                        onMouseEnter={() =>
                          setHoveredPiece({ player: 0, pieceIndex: idx })
                        }
                        onMouseLeave={() => setHoveredPiece(null)}
                        title={`P1 Piece #${idx + 1} (In Base)`}
                      >
                        <span>{idx + 1}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Base Neutral Top-Right */}
        <div className="board-quadrant base-neutral-top">
          <div className="base-inner neutral-inner">
            <Sparkles size={24} className="neutral-icon" />
            <span className="neutral-tag">NIMIQ ARENA</span>
          </div>
        </div>

        {/* 3. Base Neutral Bottom-Left */}
        <div className="board-quadrant base-neutral-bottom">
          <div className="base-inner neutral-inner">
            <Sparkles size={24} className="neutral-icon" />
            <span className="neutral-tag">COURTLINE V2</span>
          </div>
        </div>

        {/* 4. Base 1 (Bottom-Right, Player 1) */}
        <div className="board-quadrant base-1">
          <div className="base-inner">
            <div className="base-header">
              <span className="base-tag">PLAYER 2 (INDIGO)</span>
            </div>
            <div className="base-nests">
              {BASE_NESTS[1].map((coord, idx) => {
                const piece = players[1]?.pieces[idx];
                const isInBase = piece?.position === -1;
                const isMovable = isInBase && canMovePiece(1, piece);

                return (
                  <div
                    key={idx}
                    className="base-nest-slot"
                    style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
                  >
                    {isInBase && (
                      <button
                        type="button"
                        className={`board-piece-token p1 ${
                          isMovable ? "movable-pulse" : ""
                        }`}
                        disabled={!isMovable}
                        onClick={() => handlePieceMove(idx)}
                        onMouseEnter={() =>
                          setHoveredPiece({ player: 1, pieceIndex: idx })
                        }
                        onMouseLeave={() => setHoveredPiece(null)}
                        title={`P2 Piece #${idx + 1} (In Base)`}
                      >
                        <span>{idx + 1}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Center Home Goal Triangle (Rows 7..9, Cols 7..9) */}
        <div
          className={`board-center-goal ${
            previewTarget?.type === "goal" ? "target-highlight" : ""
          }`}
          style={{ gridRow: "7 / span 3", gridColumn: "7 / span 3" }}
        >
          <div className="goal-triangle goal-p0">
            <Trophy size={16} />
            <span className="goal-score">
              {players[0]?.pieces.filter(p => p.position === 57).length}/4
            </span>
          </div>
          <div className="goal-triangle goal-p1">
            <Trophy size={16} />
            <span className="goal-score">
              {players[1]?.pieces.filter(p => p.position === 57).length}/4
            </span>
          </div>
        </div>

        {/* 6. Perimeter Track Cells (52 squares) */}
        {TRACK_COORDINATES.map((coord, trackIdx) => {
          const isSafe = LUDO_SAFE_SQUARES.has(trackIdx);
          const isP0Start = trackIdx === 0;
          const isP1Start = trackIdx === 26;
          const isTargeted =
            previewTarget?.type === "track" && previewTarget.index === trackIdx;

          // Find pieces currently on this track square
          const piecesOnCell: Array<{
            player: number;
            pieceIndex: number;
            piece: Piece;
          }> = [];

          players.forEach((player, pIdx) => {
            player.pieces.forEach((piece, pieceIdx) => {
              if (piece.position >= 0 && piece.position < 52) {
                const globalPos =
                  ((pIdx === 0 ? 0 : 26) + piece.position) % 52;
                if (globalPos === trackIdx) {
                  piecesOnCell.push({ player: pIdx, pieceIndex: pieceIdx, piece });
                }
              }
            });
          });

          return (
            <div
              key={trackIdx}
              className={`track-cell-2d ${isSafe ? "safe-track-cell" : ""} ${
                isP0Start ? "p0-start-cell" : ""
              } ${isP1Start ? "p1-start-cell" : ""} ${
                isTargeted ? "target-preview-cell" : ""
              }`}
              style={{
                gridRow: coord.row + 1,
                gridColumn: coord.col + 1,
              }}
            >
              {isSafe && <Shield size={10} className="safe-badge-icon" />}
              {piecesOnCell.map(({ player, pieceIndex, piece }) => {
                const isMovable = canMovePiece(player, piece);
                return (
                  <button
                    key={`${player}-${pieceIndex}`}
                    type="button"
                    className={`board-piece-token p${player} ${
                      isMovable ? "movable-pulse" : ""
                    }`}
                    disabled={!isMovable}
                    onClick={() => handlePieceMove(pieceIndex)}
                    onMouseEnter={() =>
                      setHoveredPiece({ player, pieceIndex })
                    }
                    onMouseLeave={() => setHoveredPiece(null)}
                    title={`P${player + 1} Piece #${pieceIndex + 1}`}
                  >
                    <span>{pieceIndex + 1}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* 7. Home Columns for Player 0 (5 cells) */}
        {HOME_COLUMNS[0].map((coord, stepIdx) => {
          const stepPos = 52 + stepIdx;
          const isTargeted =
            previewTarget?.type === "home" &&
            hoveredPiece?.player === 0 &&
            previewTarget.index === stepIdx;

          const piecesOnCell = players[0]?.pieces
            .map((piece, pieceIndex) => ({ piece, pieceIndex }))
            .filter(({ piece }) => piece.position === stepPos);

          return (
            <div
              key={`home-p0-${stepIdx}`}
              className={`home-stretch-cell p0-home ${
                isTargeted ? "target-preview-cell" : ""
              }`}
              style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
            >
              {piecesOnCell.map(({ piece, pieceIndex }) => {
                const isMovable = canMovePiece(0, piece);
                return (
                  <button
                    key={pieceIndex}
                    type="button"
                    className={`board-piece-token p0 ${
                      isMovable ? "movable-pulse" : ""
                    }`}
                    disabled={!isMovable}
                    onClick={() => handlePieceMove(pieceIndex)}
                    onMouseEnter={() =>
                      setHoveredPiece({ player: 0, pieceIndex })
                    }
                    onMouseLeave={() => setHoveredPiece(null)}
                    title={`P1 Home Run #${pieceIndex + 1}`}
                  >
                    <span>{pieceIndex + 1}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* 8. Home Columns for Player 1 (5 cells) */}
        {HOME_COLUMNS[1].map((coord, stepIdx) => {
          const stepPos = 52 + stepIdx;
          const isTargeted =
            previewTarget?.type === "home" &&
            hoveredPiece?.player === 1 &&
            previewTarget.index === stepIdx;

          const piecesOnCell = players[1]?.pieces
            .map((piece, pieceIndex) => ({ piece, pieceIndex }))
            .filter(({ piece }) => piece.position === stepPos);

          return (
            <div
              key={`home-p1-${stepIdx}`}
              className={`home-stretch-cell p1-home ${
                isTargeted ? "target-preview-cell" : ""
              }`}
              style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
            >
              {piecesOnCell.map(({ piece, pieceIndex }) => {
                const isMovable = canMovePiece(1, piece);
                return (
                  <button
                    key={pieceIndex}
                    type="button"
                    className={`board-piece-token p1 ${
                      isMovable ? "movable-pulse" : ""
                    }`}
                    disabled={!isMovable}
                    onClick={() => handlePieceMove(pieceIndex)}
                    onMouseEnter={() =>
                      setHoveredPiece({ player: 1, pieceIndex })
                    }
                    onMouseLeave={() => setHoveredPiece(null)}
                    title={`P2 Home Run #${pieceIndex + 1}`}
                  >
                    <span>{pieceIndex + 1}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
