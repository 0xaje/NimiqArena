import React from "react";
import { soundEngine } from "@/lib/audio";

export interface LudoDiceProps {
  value: number | null;
  diceValues?: [number, number] | null;
  remainingDice?: number[];
  selectedDie?: number | null;
  onSelectDie?: (die: number | null) => void;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  playerSeat: number;
  size?: "sm" | "md" | "lg";
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  diceValues,
  remainingDice,
  selectedDie,
  onSelectDie,
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

  // Determine availability of die1 and die2 from remainingDice
  const { d1Available, d2Available } = React.useMemo(() => {
    if (!remainingDice || remainingDice.length === 0) {
      return { d1Available: true, d2Available: true };
    }
    if (remainingDice.length === 2) {
      return { d1Available: true, d2Available: true };
    }
    // Only 1 die remaining
    const rem = remainingDice[0];
    if (val1 === val2) {
      return { d1Available: true, d2Available: false };
    }
    return {
      d1Available: val1 === rem,
      d2Available: val2 === rem,
    };
  }, [remainingDice, val1, val2]);

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

  const handleDieClick = (dieVal: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dieVal || canRoll || isRolling || !onSelectDie) return;
    onSelectDie(selectedDie === dieVal ? null : dieVal);
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
        title={canRoll ? "Tap to roll the two dice" : "Waiting for move"}
      >
        <div className="dual-dice-pair">
          <div
            className={`ludo-dice-cube dice-one p${playerSeat}-dice ${
              isRolling ? "is-rolling tumble-left" : ""
            } ${!d1Available ? "die-used" : ""} ${selectedDie === val1 ? "die-selected" : ""}`}
            onClick={e => d1Available && handleDieClick(val1, e)}
            style={{
              opacity: d1Available ? 1 : 0.35,
              filter: d1Available ? "none" : "grayscale(0.8)",
              transform: selectedDie === val1 ? "scale(1.1)" : undefined,
              boxShadow: selectedDie === val1 ? "0 0 12px #22c55e" : undefined,
            }}
          >
            {renderPips(val1)}
          </div>
          <div
            className={`ludo-dice-cube dice-two p${playerSeat}-dice ${
              isRolling ? "is-rolling tumble-right" : ""
            } ${!d2Available ? "die-used" : ""} ${selectedDie === val2 ? "die-selected" : ""}`}
            onClick={e => d2Available && handleDieClick(val2, e)}
            style={{
              opacity: d2Available ? 1 : 0.35,
              filter: d2Available ? "none" : "grayscale(0.8)",
              transform: selectedDie === val2 ? "scale(1.1)" : undefined,
              boxShadow: selectedDie === val2 ? "0 0 12px #22c55e" : undefined,
            }}
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
            {remainingDice && remainingDice.length === 1 ? (
              `1 die left: [${remainingDice[0]}]`
            ) : val1 === 6 && val2 === 6 ? (
              "🌟 Double 6! Take out 2 pawns!"
            ) : val1 === val2 ? (
              `Double ${val1} (Bonus Turn)`
            ) : (
              `${val1} & ${val2}`
            )}
          </span>
        </div>
      )}
    </div>
  );
};

