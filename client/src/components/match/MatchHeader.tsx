import { useState } from "react";
import { ArrowLeft, Bot, Coins, Music, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { soundEngine } from "@/lib/audio";
import { ProvablyFairModal } from "@/components/game/ProvablyFairModal";

interface MatchHeaderProps {
  matchId: string;
  isWagered?: boolean;
  totalPotNim?: number;
  isFinished?: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
  returnRoute?: string;
  stateVersion?: number;
  dice?: number[] | null;
}

export function MatchHeader({
  matchId,
  isWagered,
  totalPotNim,
  isFinished,
  isMuted,
  onToggleSound,
  returnRoute = "/games/ludo-league",
  stateVersion = 0,
  dice = null,
}: MatchHeaderProps) {
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.getMusicEnabled());

  const handleToggleMusic = () => {
    const next = soundEngine.toggleAmbientMusic();
    setIsMusicOn(next);
  };

  return (
    <>
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

        {isWagered && totalPotNim && totalPotNim > 0 ? (
          <div className="gameplay-pot-badge">
            <Coins size={15} className="trophy-gold" />
            <span>MATCH POT: {formatNim(totalPotNim)} NIM</span>
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="gameplay-sound-btn"
            onClick={() => setShowProvablyFair(true)}
            title="Provably Fair Cryptographic Audit"
            style={{ color: "#eab308" }}
          >
            <ShieldCheck size={16} />
          </button>
          <button
            type="button"
            className="gameplay-sound-btn"
            onClick={handleToggleMusic}
            title={isMusicOn ? "Turn ambient music off" : "Turn ambient music on"}
            style={{ color: isMusicOn ? "#4ade80" : "rgba(255,255,255,0.4)" }}
          >
            <Music size={15} />
          </button>
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

      <ProvablyFairModal
        isOpen={showProvablyFair}
        onClose={() => setShowProvablyFair(false)}
        matchId={matchId}
        stateVersion={stateVersion}
        dice={dice}
      />
    </>
  );
}
