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
      {canRoll ? (
        <button
          type="button"
          className={`dual-dice-button p${playerSeat}-dice-btn active-roll-btn`}
          disabled={isRolling}
          onClick={handleRollClick}
          title="Tap to roll the two dice"
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
      ) : (
        <div className="dual-dice-button p${playerSeat}-dice-btn interactive-dice-btn">
          <div className="dual-dice-pair">
            <div
              className={`ludo-dice-cube dice-one p${playerSeat}-dice ${
                !d1Available ? "die-used" : "die-clickable"
              } ${selectedDie === val1 ? "die-selected" : ""}`}
              onClick={e => d1Available && handleDieClick(val1, e)}
              title={d1Available ? `Click to use ${val1} for your next move` : "Die already played"}
              style={{
                opacity: d1Available ? 1 : 0.35,
                filter: d1Available ? "none" : "grayscale(0.8)",
                cursor: d1Available ? "pointer" : "default",
                transform: selectedDie === val1 ? "scale(1.12)" : undefined,
                boxShadow: selectedDie === val1 ? "0 0 16px #22c55e, inset 0 0 8px #22c55e" : undefined,
                borderColor: selectedDie === val1 ? "#22c55e" : undefined,
              }}
            >
              {renderPips(val1)}
            </div>
            <div
              className={`ludo-dice-cube dice-two p${playerSeat}-dice ${
                !d2Available ? "die-used" : "die-clickable"
              } ${selectedDie === val2 ? "die-selected" : ""}`}
              onClick={e => d2Available && handleDieClick(val2, e)}
              title={d2Available ? `Click to use ${val2} for your next move` : "Die already played"}
              style={{
                opacity: d2Available ? 1 : 0.35,
                filter: d2Available ? "none" : "grayscale(0.8)",
                cursor: d2Available ? "pointer" : "default",
                transform: selectedDie === val2 ? "scale(1.12)" : undefined,
                boxShadow: selectedDie === val2 ? "0 0 16px #22c55e, inset 0 0 8px #22c55e" : undefined,
                borderColor: selectedDie === val2 ? "#22c55e" : undefined,
              }}
            >
              {renderPips(val2)}
            </div>
          </div>
        </div>
      )}

      {canRoll && !value && (
        <div className="dice-roll-hint">
          <span>TAP TO ROLL</span>
        </div>
      )}

      {/* Die Choice Pills: Let user pick whether to count die 1 or die 2 first */}
      {!canRoll && value !== null && val1 !== null && val2 !== null && (
        <div className="dice-choice-pills">
          {d1Available && d2Available && val1 !== val2 ? (
            <>
              <button
                type="button"
                className={`dice-choice-pill ${selectedDie === val1 ? "active-choice" : ""}`}
                onClick={e => {
                  e.stopPropagation();
                  onSelectDie?.(selectedDie === val1 ? null : val1);
                }}
              >
                {selectedDie === val1 ? `✓ Using ${val1} First` : `Count ${val1} First`}
              </button>
              <button
                type="button"
                className={`dice-choice-pill ${selectedDie === val2 ? "active-choice" : ""}`}
                onClick={e => {
                  e.stopPropagation();
                  onSelectDie?.(selectedDie === val2 ? null : val2);
                }}
              >
                {selectedDie === val2 ? `✓ Using ${val2} First` : `Count ${val2} First`}
              </button>
            </>
          ) : remainingDice && remainingDice.length === 1 ? (
            <span className="dice-choice-single">
              👉 Next die: <strong>{remainingDice[0]}</strong>
            </span>
          ) : val1 === val2 && d1Available && d2Available ? (
            <span className="dice-choice-single">
              🌟 Double {val1}: Play both {val1}s (Bonus Roll Awaits!)
            </span>
          ) : null}
        </div>
      )}

      {value !== null && val1 !== null && val2 !== null && (
        <div className="dual-dice-badge">
          <span>
            {remainingDice && remainingDice.length === 1 ? (
              `1 move remaining: [${remainingDice[0]}]`
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

