import React, { useState } from "react";
import {
  CONNECT4_COLS,
  CONNECT4_ROWS,
  getLowestEmptyRow,
  type Connect4Cell,
  type Connect4PlayerId,
} from "@/../../shared/game/connect4-engine";
import { Sparkles, Trophy } from "lucide-react";

interface Connect4Board2DProps {
  board: Connect4Cell[][]; // board[col][row] where row 0 is bottom, row 5 is top
  currentPlayer: Connect4PlayerId;
  winner: Connect4PlayerId | "draw" | null;
  winningLine: [number, number][] | null;
  yourSeat: number;
  isYourTurn: boolean;
  onDropDisc: (column: number) => void;
  disabled?: boolean;
}

export function Connect4Board2D({
  board,
  currentPlayer,
  winner,
  winningLine,
  yourSeat,
  isYourTurn,
  onDropDisc,
  disabled = false,
}: Connect4Board2DProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const isWinningCell = (col: number, row: number) => {
    if (!winningLine) return false;
    return winningLine.some(([c, r]) => c === col && r === row);
  };

  const handleColumnClick = (col: number) => {
    if (disabled || !isYourTurn || winner !== null) return;
    const lowestRow = getLowestEmptyRow(board, col);
    if (lowestRow !== -1) {
      onDropDisc(col);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "580px",
        margin: "0 auto",
      }}
    >
      {/* Column Hover Trigger Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${CONNECT4_COLS}, 1fr)`,
          width: "100%",
          gap: "8px",
          height: "44px",
          marginBottom: "8px",
        }}
      >
        {Array.from({ length: CONNECT4_COLS }).map((_, col) => {
          const isFull = getLowestEmptyRow(board, col) === -1;
          const isHovered = hoveredCol === col;
          const canDrop = isYourTurn && !isFull && winner === null && !disabled;

          return (
            <button
              key={`drop-btn-${col}`}
              type="button"
              onClick={() => handleColumnClick(col)}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
              disabled={!canDrop}
              style={{
                background:
                  isHovered && canDrop
                    ? yourSeat === 0
                      ? "rgba(230, 93, 35, 0.3)"
                      : "rgba(52, 152, 219, 0.3)"
                    : "transparent",
                border: "1px dashed",
                borderColor:
                  isHovered && canDrop
                    ? yourSeat === 0
                      ? "var(--orange)"
                      : "#3498db"
                    : "transparent",
                borderRadius: "8px",
                cursor: canDrop ? "pointer" : "default",
                display: "grid",
                placeItems: "center",
                transition: "all 0.15s ease",
              }}
            >
              {isHovered && canDrop && (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background:
                      yourSeat === 0
                        ? "radial-gradient(circle at 35% 35%, #ff8a50 0%, #e65d23 100%)"
                        : "radial-gradient(circle at 35% 35%, #5dade2 0%, #2980b9 100%)",
                    boxShadow: "0 0 12px rgba(230, 93, 35, 0.6)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 7x6 Luxury Arcade Vertical Grid Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${CONNECT4_COLS}, 1fr)`,
          gap: "8px",
          width: "100%",
          padding: "16px",
          background: "linear-gradient(180deg, #102438 0%, #0a1724 100%)",
          border: "3px solid #1a3854",
          borderRadius: "16px",
          boxShadow:
            "0 18px 36px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.1)",
        }}
      >
        {Array.from({ length: CONNECT4_COLS }).map((_, col) => (
          <div
            key={`col-${col}`}
            onClick={() => handleColumnClick(col)}
            onMouseEnter={() => setHoveredCol(col)}
            onMouseLeave={() => setHoveredCol(null)}
            style={{
              display: "flex",
              flexDirection: "column-reverse", // row 0 at bottom, row 5 at top
              gap: "8px",
              cursor:
                isYourTurn &&
                getLowestEmptyRow(board, col) !== -1 &&
                winner === null &&
                !disabled
                  ? "pointer"
                  : "default",
            }}
          >
            {Array.from({ length: CONNECT4_ROWS }).map((_, row) => {
              const cellValue = board[col][row];
              const isWinning = isWinningCell(col, row);

              return (
                <div
                  key={`cell-${col}-${row}`}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: "50%",
                    background:
                      cellValue === null
                        ? "radial-gradient(circle, #060e17 0%, #03080e 100%)"
                        : cellValue === 0
                          ? "radial-gradient(circle at 35% 35%, #ff8a50 0%, #e65d23 100%)"
                          : "radial-gradient(circle at 35% 35%, #5dade2 0%, #2980b9 100%)",
                    border: isWinning
                      ? "3px solid #f1c40f"
                      : cellValue !== null
                        ? "2px solid rgba(255, 255, 255, 0.2)"
                        : "2px solid rgba(0, 0, 0, 0.8)",
                    boxShadow: isWinning
                      ? "0 0 20px #f1c40f, 0 0 40px rgba(241, 196, 15, 0.6)"
                      : cellValue === 0
                        ? "0 4px 10px rgba(230, 93, 35, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)"
                        : cellValue === 1
                          ? "0 4px 10px rgba(41, 128, 185, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)"
                          : "inset 0 3px 6px rgba(0, 0, 0, 0.8)",
                    display: "grid",
                    placeItems: "center",
                    transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: isWinning ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {isWinning && (
                    <Sparkles size={16} color="#f1c40f" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend & Seat Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "16px",
          padding: "10px 16px",
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: "8px",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "var(--orange)",
            }}
          />
          <span>
            PLAYER 1 (GOLD) {yourSeat === 0 ? "— YOU" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#3498db",
            }}
          />
          <span>
            PLAYER 2 (BLUE) {yourSeat === 1 ? "— YOU" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
