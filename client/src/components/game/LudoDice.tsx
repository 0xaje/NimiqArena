import React from "react";
import { soundEngine } from "@/lib/audio";

interface LudoDiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerSeat: number;
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling,
  canRoll,
  onRoll,
  playerSeat,
}) => {
  const handleRollClick = () => {
    soundEngine.playDiceRoll();
    onRoll();
  };
  const renderPips = (val: number | null) => {
    if (!val) {
      return (
        <div className="dice-empty-face">
          <span className="dice-symbol">🎲</span>
        </div>
      );
    }

    const pipPattern: Record<number, string[]> = {
      1: ["center"],
      2: ["top-left", "bottom-right"],
      3: ["top-left", "center", "bottom-right"],
      4: ["top-left", "top-right", "bottom-left", "bottom-right"],
      5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
      6: [
        "top-left",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-right",
      ],
    };

    const activePips = pipPattern[val] || ["center"];

    return (
      <div className={`dice-face dice-val-${val}`}>
        {activePips.map((pos, idx) => (
          <span key={idx} className={`pip pip-${pos} p${playerSeat}-pip`} />
        ))}
      </div>
    );
  };

  return (
    <div className={`ludo-dice-container ${canRoll ? "can-roll-pulse" : ""}`}>
      <button
        type="button"
        className={`ludo-dice-cube p${playerSeat}-dice ${isRolling ? "is-rolling" : ""} ${
          canRoll ? "active-roll-btn" : ""
        }`}
        disabled={!canRoll || isRolling}
        onClick={handleRollClick}
        title={canRoll ? "Click to roll the server dice" : "Waiting for turn"}
      >
        {renderPips(value)}
      </button>
      {canRoll && !value && (
        <div className="dice-roll-hint">
          <span>Click to Roll</span>
        </div>
      )}
    </div>
  );
};
