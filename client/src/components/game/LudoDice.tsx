import React from "react";
import { soundEngine } from "@/lib/audio";

export interface LudoDiceProps {
  value: number | null;
  diceValues?: [number, number] | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerSeat: number;
  size?: "sm" | "md" | "lg";
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  diceValues,
  isRolling,
  canRoll,
  onRoll,
  playerSeat,
  size = "md",
}) => {
  const handleRollClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRoll || isRolling) return;
    soundEngine.playDiceRoll();
    onRoll();
  };

  // Derive individual die values: [die1, die2]
  const [val1, val2] = React.useMemo<[number | null, number | null]>(() => {
    if (
      diceValues &&
      diceValues.length === 2 &&
      diceValues[0] !== null &&
      diceValues[1] !== null
    ) {
      return [diceValues[0], diceValues[1]];
    }
    if (value !== null && value > 0) {
      if (value <= 6) {
        // Natural distribution for single-roll fallback: e.g. 5 -> [3, 2], 3 -> [2, 1], 6 -> [4, 2]
        if (value === 6) return [4, 2];
        if (value === 5) return [3, 2];
        if (value === 4) return [3, 1];
        if (value === 3) return [2, 1];
        if (value === 2) return [1, 1];
        return [1, 0];
      }
      const d1 = Math.min(6, Math.max(1, Math.ceil(value / 2)));
      const d2 = Math.min(6, Math.max(1, value - d1));
      return [d1, d2];
    }
    return [null, null];
  }, [value, diceValues]);

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
    <div
      className={`ludo-dice-container dice-size-${size} ${
        canRoll ? "can-roll-pulse" : ""
      }`}
    >
      <button
        type="button"
        className={`dual-dice-button p${playerSeat}-dice-btn ${
          canRoll ? "active-roll-btn" : ""
        }`}
        disabled={!canRoll || isRolling}
        onClick={handleRollClick}
        title={canRoll ? "Tap to roll the two dice" : "Waiting for turn"}
      >
        <div className="dual-dice-pair">
          <div
            className={`ludo-dice-cube dice-one p${playerSeat}-dice ${
              isRolling ? "is-rolling tumble-left" : ""
            }`}
          >
            {renderPips(val1)}
          </div>
          <div
            className={`ludo-dice-cube dice-two p${playerSeat}-dice ${
              isRolling ? "is-rolling tumble-right" : ""
            }`}
          >
            {renderPips(val2)}
          </div>
        </div>
      </button>

      {canRoll && !value && (
        <div className="dice-roll-hint">
          <span>TAP TO ROLL</span>
        </div>
      )}

      {value !== null && val1 !== null && val2 !== null && (
        <div className="dual-dice-badge">
          <span>
            {val1 === 6 || val2 === 6
              ? val1 === val2
                ? "Double 6! Exit base!"
                : `${val1} & ${val2} (6 Exit!)`
              : val1 === val2
                ? `Double ${val1} (Bonus Turn)`
                : `${val1} & ${val2}`}
          </span>
        </div>
      )}
    </div>
  );
};

