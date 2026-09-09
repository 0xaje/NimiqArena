import { Clock, Target } from "lucide-react";

interface BattlePlayersStripProps {
  p1Name: string;
  p2Name: string;
  activeSeat: number;
  turnSecondsLeft: number;
  isBotMatch: boolean;
  gameKind?: "ludo" | "connect4";
  p1Score?: number;
  p2Score?: number;
  totalTarget?: number;
}

export function BattlePlayersStrip({
  p1Name,
  p2Name,
  activeSeat,
  turnSecondsLeft,
  isBotMatch,
  gameKind = "ludo",
  p1Score,
  p2Score,
  totalTarget,
}: BattlePlayersStripProps) {
  const isC4 = gameKind === "connect4";

  return (
    <section className="battle-players-strip">
      <div className={`battle-player-pill ${activeSeat === 0 ? "active" : ""}`}>
        <div className="battle-avatar-wrapper">
          <div className="battle-avatar red-avatar">
            <span>{p1Name.charAt(0).toUpperCase()}</span>
          </div>
          {activeSeat === 0 && <div className="active-turn-ring" />}
        </div>
        <div className="battle-player-meta">
          <span className="battle-player-name">{p1Name}</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span className="battle-turn-label">
              {activeSeat === 0
                ? isC4
                  ? "DROPPING DISC..."
                  : "ROLLING..."
                : "WAITING"}
            </span>
            {p1Score !== undefined && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.15)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Target size={11} /> {p1Score}/{totalTarget ?? 8}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="center-timer-badge">
        <span
          style={{
            font: "800 11px 'IBM Plex Mono', monospace",
            color: turnSecondsLeft <= 8 ? "#ef4444" : "#fbbf24",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Clock size={12} /> {turnSecondsLeft}s
        </span>
      </div>

      <div className={`battle-player-pill ${activeSeat === 1 ? "active" : ""}`}>
        <div className="battle-player-meta" style={{ textAlign: "right" }}>
          <span className="battle-player-name">{p2Name}</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
            {p2Score !== undefined && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.15)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <Target size={11} /> {p2Score}/{totalTarget ?? 8}
              </span>
            )}
            <span className="battle-turn-label">
              {activeSeat === 1
                ? isBotMatch
                  ? "AI EVALUATING..."
                  : isC4
                    ? "DROPPING DISC..."
                    : "ROLLING..."
                : "WAITING"}
            </span>
          </div>
        </div>
        <div className="battle-avatar-wrapper">
          <div className="battle-avatar yellow-avatar">
            <span>{p2Name.charAt(0).toUpperCase()}</span>
          </div>
          {activeSeat === 1 && <div className="active-turn-ring" />}
        </div>
      </div>
    </section>
  );
}
