import { ArrowLeft, Bot, Coins, Volume2, VolumeX } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { EmoteWheel } from "@/components/game/EmoteWheel";

interface MatchHeaderProps {
  matchId: string;
  isWagered?: boolean;
  totalPotNim?: number;
  isFinished?: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  returnRoute?: string;
}

export function MatchHeader({
  matchId,
  isWagered,
  totalPotNim,
  isFinished,
  isMuted,
  onToggleSound,
  returnRoute = "/games/ludo-league",
}: MatchHeaderProps) {
  return (
    <header className="gameplay-topbar">
      <button
        type="button"
        className="gameplay-back-btn"
        onClick={() => {
          if (isFinished || confirm("Leave table and return to lobby?")) {
            window.location.href = returnRoute;
          }
        }}
      >
        <ArrowLeft size={14} />
        <span>LEAVE TABLE</span>
      </button>

      <div className="gameplay-pot-badge">
        {isWagered && totalPotNim && totalPotNim > 0 ? (
          <>
            <Coins size={15} className="trophy-gold" />
            <span>MATCH POT: {formatNim(totalPotNim)} NIM</span>
          </>
        ) : (
          <>
            <Bot size={15} />
            <span>PRACTICE TABLE (FREE)</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <EmoteWheel matchId={matchId} />
        <button
          type="button"
          className="gameplay-sound-btn"
          onClick={onToggleSound}
          title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </header>
  );
}
