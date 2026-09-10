import { useState } from "react";
import { ArrowLeft, Bot, Coins, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { EmoteWheel } from "@/components/game/EmoteWheel";
import { ProvablyFairModal } from "@/components/game/ProvablyFairModal";

import { useNimiqWallet } from "@/lib/useNimiqWallet";

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
  const { address, balanceNim, isConnected } = useNimiqWallet();

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

        {isConnected && address ? (
          <div
            className="gameplay-wallet-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 199, 44, 0.12)",
              border: "1px solid rgba(255, 199, 44, 0.3)",
              borderRadius: "20px",
              padding: "4px 10px",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "12px",
              color: "#fbbf24",
              fontWeight: 600,
            }}
            title={`Connected Nimiq Wallet: ${address}`}
          >
            <Coins size={13} style={{ color: "#eab308" }} />
            <span>{balanceNim.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} NIM</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ opacity: 0.85 }}>{address.slice(0, 4)}…{address.slice(-4)}</span>
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
