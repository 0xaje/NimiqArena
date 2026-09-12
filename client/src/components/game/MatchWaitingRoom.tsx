import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { soundEngine } from "@/lib/audio";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";

interface MatchWaitingRoomProps {
  matchId: string;
  joinCode: string;
  hostName: string;
  guestName?: string | null;
  stakeNim?: number | null;
  totalPotNim?: number | null;
  totalFundedNim?: number | null;
  fundingProgress?: string;
  hostCommittedNim?: number | null;
  guestCommittedNim?: number | null;
  hostFundingStatus?: string;
  guestFundingStatus?: string;
  escrowError?: string | null;
  isHost: boolean;
  onLeave: () => void;
  onDepositPrompt?: () => void;
  isDepositNeeded?: boolean;
  isWagered?: boolean;
  allVerified?: boolean;
  isStarting?: boolean;
  onStartMatch?: () => void;
}

export function MatchWaitingRoom({
  matchId,
  joinCode,
  hostName,
  guestName,
  stakeNim = 0,
  totalPotNim = 0,
  totalFundedNim = 0,
  fundingProgress = "NOT_FUNDED",
  hostCommittedNim = 0,
  guestCommittedNim = 0,
  hostFundingStatus = "NOT_FUNDED",
  guestFundingStatus = "NOT_FUNDED",
  escrowError = null,
  isHost,
  onLeave,
  onDepositPrompt,
  isDepositNeeded = false,
  isWagered = false,
  allVerified = true,
  isStarting = false,
  onStartMatch,
}: MatchWaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [showDistDetails, setShowDistDetails] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const isReadyToStart = Boolean(guestName && (!isWagered || allVerified));

  // Auto-launch countdown when opponent has joined and ready to play
  useEffect(() => {
    if (isReadyToStart && !isStarting) {
      soundEngine.playBonusTurn();
      setAutoCountdown(2);
      const interval = setInterval(() => {
        setAutoCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onStartMatch?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setAutoCountdown(null);
    }
  }, [isReadyToStart, isStarting, onStartMatch]);
  const addBot = trpc.match.addBotToMatch.useMutation({
    onSuccess: () => {
      toast.success("Arena AI Bot Joined!", {
        description: "Launching live game now…",
      });
      utils.match.state.invalidate({ id: matchId });
    },
    onError: err => {
      toast.error("Could not add bot", { description: err.message });
    },
  });

  const effectivePot = totalPotNim || (stakeNim ? stakeNim * 2 : 0);
  const dist = calculatePotDistribution(effectivePot);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${joinCode}`
    : `/join?code=${joinCode}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success("Match code copied!", {
        description: `Code: ${joinCode}. Share with your opponent to enter.`,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy code");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="waiting-room-container">
      {/* Top Bar */}
      <div className="waiting-room-topbar">
        <button type="button" className="waiting-back-btn" onClick={onLeave}>
          <ArrowLeft size={18} />
          <span>LEAVE TABLE</span>
        </button>
        <div className="waiting-match-badge">
          <span className="live-dot" />
          <span>MATCH LOBBY</span>
        </div>
      </div>

      {/* Escrow Error Notice Banner (Never silently convert error to 0) */}
      {isWagered && escrowError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#fca5a5",
            fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, color: "#ef4444" }} />
          <div>
            <strong>Escrow Verification Notice:</strong> {escrowError}. Your funds remain safe on Nimiq Testnet.
          </div>
        </div>
      )}

      {/* Hero VS Arena */}
      <div className="waiting-versus-arena">
        {/* Player A Card */}
        <div className="waiting-player-card player-red">
          <div className="waiting-avatar-ring">
            <div className="waiting-avatar red-avatar">
              <span>{hostName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="seat-color-badge red">RED</span>
          </div>
          <h3 className="waiting-player-name">{hostName}</h3>
          <span className="waiting-status-tag ready">
            <CheckCircle2 size={13} />
            <span>TABLE HOST</span>
          </span>
          {stakeNim && stakeNim > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", marginTop: "4px" }}>
              <span className="waiting-stake-tag">
                Stake: {formatNim(stakeNim)} NIM
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background:
                    hostFundingStatus === "FUNDED"
                      ? "rgba(34, 197, 94, 0.2)"
                      : hostFundingStatus === "VERIFYING"
                      ? "rgba(234, 179, 8, 0.2)"
                      : "rgba(255, 255, 255, 0.08)",
                  color:
                    hostFundingStatus === "FUNDED"
                      ? "#4ade80"
                      : hostFundingStatus === "VERIFYING"
                      ? "#facc15"
                      : "rgba(251, 248, 241, 0.7)",
                  border: `1px solid ${
                    hostFundingStatus === "FUNDED"
                      ? "rgba(74, 222, 128, 0.35)"
                      : hostFundingStatus === "VERIFYING"
                      ? "rgba(250, 204, 21, 0.35)"
                      : "rgba(251, 248, 241, 0.15)"
                  }`,
                }}
              >
                {hostFundingStatus === "FUNDED"
                  ? `✓ Committed: ${formatNim(hostCommittedNim || stakeNim)} NIM`
                  : hostFundingStatus === "VERIFYING"
                  ? "Verifying on chain…"
                  : `Committed: 0 NIM`}
              </span>
            </div>
          ) : null}
        </div>

        {/* Center VS Element */}
        <div className="waiting-center-vs">
          <div className="vs-circle">
            <span>VS</span>
          </div>
          <div className="vs-pot-display">
            <span className="vs-pot-label">
              {isWagered ? "TABLE ESCROW POT" : "MATCH POT"}
            </span>
            <span className="vs-pot-amount">
              {effectivePot > 0 ? `${formatNim(effectivePot)} NIM` : "FREE PLAY"}
            </span>
            {isWagered && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: "6px",
                  fontSize: "10.5px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background:
                    allVerified
                      ? "rgba(34, 197, 94, 0.2)"
                      : (totalFundedNim || 0) > 0
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(255, 255, 255, 0.06)",
                  color:
                    allVerified
                      ? "#4ade80"
                      : (totalFundedNim || 0) > 0
                      ? "#fbbf24"
                      : "rgba(251, 248, 241, 0.6)",
                  border: `1px solid ${
                    allVerified
                      ? "rgba(74, 222, 128, 0.35)"
                      : (totalFundedNim || 0) > 0
                      ? "rgba(245, 158, 11, 0.35)"
                      : "rgba(251, 248, 241, 0.1)"
                  }`,
                }}
              >
                {allVerified
                  ? `FUNDED (${formatNim(effectivePot)} NIM IN ESCROW)`
                  : (totalFundedNim || 0) > 0
                  ? `PARTIALLY FUNDED (${formatNim(totalFundedNim || 0)} / ${formatNim(effectivePot)} NIM)`
                  : "PENDING DEPOSITS (0 NIM IN ESCROW)"}
              </span>
            )}
          </div>
        </div>

        {/* Player B Card */}
        <div className="waiting-player-card player-yellow">
          <div className="waiting-avatar-ring">
            <div className="waiting-avatar yellow-avatar">
              {guestName ? (
                <span>{guestName.charAt(0).toUpperCase()}</span>
              ) : (
                <Users size={24} className="icon-muted" />
              )}
            </div>
            <span className="seat-color-badge yellow">YELLOW</span>
          </div>
          <h3 className="waiting-player-name">
            {guestName || "Waiting for Challenger…"}
          </h3>
          <span
            className={`waiting-status-tag ${guestName ? "ready" : "waiting"}`}
          >
            {guestName ? (
              <>
                <CheckCircle2 size={13} />
                <span>CHALLENGER JOINED</span>
              </>
            ) : (
              <>
                <Clock size={13} className="spin-slow" />
                <span>INVITING OPPONENT</span>
              </>
            )}
          </span>
          {stakeNim && stakeNim > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", marginTop: "4px" }}>
              <span className="waiting-stake-tag">
                Stake: {formatNim(stakeNim)} NIM
              </span>
              {guestName && (
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background:
                      guestFundingStatus === "FUNDED"
                        ? "rgba(34, 197, 94, 0.2)"
                        : guestFundingStatus === "VERIFYING"
                        ? "rgba(234, 179, 8, 0.2)"
                        : "rgba(255, 255, 255, 0.08)",
                    color:
                      guestFundingStatus === "FUNDED"
                        ? "#4ade80"
                        : guestFundingStatus === "VERIFYING"
                        ? "#facc15"
                        : "rgba(251, 248, 241, 0.7)",
                    border: `1px solid ${
                      guestFundingStatus === "FUNDED"
                        ? "rgba(74, 222, 128, 0.35)"
                        : guestFundingStatus === "VERIFYING"
                        ? "rgba(250, 204, 21, 0.35)"
                        : "rgba(251, 248, 241, 0.15)"
                    }`,
                  }}
                >
                  {guestFundingStatus === "FUNDED"
                    ? `✓ Committed: ${formatNim(guestCommittedNim || stakeNim)} NIM`
                    : guestFundingStatus === "VERIFYING"
                    ? "Verifying on chain…"
                    : `Committed: 0 NIM`}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Match Code & Invitation Actions */}
      <div className="waiting-actions-card">
        <div className="waiting-code-block">
          <span className="code-label">TABLE CHALLENGE CODE</span>
          <div className="code-row">
            <span className="code-digits">{joinCode}</span>
            <button
              type="button"
              className="code-copy-btn"
              onClick={copyCode}
              title="Copy code"
            >
              <Copy size={16} />
              <span>{copied ? "COPIED!" : "COPY CODE"}</span>
            </button>
          </div>
        </div>

        <div className="waiting-share-row">
          <button type="button" className="share-link-btn" onClick={copyLink}>
            <ExternalLink size={16} />
            <span>Copy Direct Invite Link</span>
          </button>
        </div>

        {isHost && !guestName && (
          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                window.open(
                  `${origin}/join?code=${joinCode}&autoJoin=true`,
                  "_blank",
                  "width=520,height=840,menubar=no,status=no,toolbar=no"
                );
                toast.success("Player 2 Window Opened!", {
                  description: "Opened opponent test window in separate session.",
                });
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Open a second window as Player 2 to test dual-player gameplay immediately"
            >
              <Users size={16} />
              <span>Open Player 2 Window (Judge Dual-Play)</span>
            </button>
          </div>
        )}

        {isHost && !guestName && (
          <div className="waiting-bot-cta">
            <button
              type="button"
              className="start-with-bot-btn"
              onClick={() => addBot.mutate({ matchId })}
              disabled={addBot.isPending}
            >
              <Bot size={18} />
              <span>
                {addBot.isPending
                  ? "LAUNCHING LIVE GAME…"
                  : "PLAY WITH ARENA BOT (INSTANT START)"}
              </span>
            </button>
            <span className="waiting-bot-subtext">
              Don't want to wait? Start playing immediately against the Nimiq AI!
            </span>
          </div>
        )}

        {/* 1. If wager match and current player needs deposit */}
        {isWagered && isDepositNeeded && onDepositPrompt && (
          <div className="waiting-deposit-alert">
            <ShieldCheck size={18} className="icon-gold" />
            <div className="deposit-alert-text">
              <strong>Deposit Verification Required</strong>
              <p>Lock your {formatNim(stakeNim || 0)} NIM stake into table escrow to ready up.</p>
            </div>
            <button
              type="button"
              className="deposit-action-btn"
              onClick={onDepositPrompt}
            >
              Verify Stake
            </button>
          </div>
        )}

        {/* 2. If wager match, current player deposited, but waiting for opponent to deposit */}
        {isWagered && !isDepositNeeded && !allVerified && guestName && (
          <div
            className="waiting-deposit-alert"
            style={{
              background: "rgba(236, 153, 24, 0.12)",
              border: "1px solid rgba(236, 153, 24, 0.35)",
            }}
          >
            <Clock size={18} className="icon-gold" />
            <div className="deposit-alert-text">
              <strong style={{ color: "#EC9918" }}>Your Stake is Locked in Escrow</strong>
              <p>Waiting for {guestName || "opponent"} to verify their {formatNim(stakeNim || 0)} NIM stake…</p>
            </div>
          </div>
        )}

        {/* 3. Ready to start: Both players connected and escrow verified (or free match) */}
        {isReadyToStart && (
          <div
            className="waiting-bot-cta"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(236, 153, 24, 0.12))",
              border: "1px solid rgba(74, 222, 128, 0.35)",
              padding: "16px",
              borderRadius: "14px",
            }}
          >
            <button
              type="button"
              className="start-with-bot-btn"
              disabled={isStarting}
              onClick={() => {
                onStartMatch?.();
              }}
              style={{
                background: isStarting
                  ? "rgba(34, 197, 94, 0.6)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#ffffff",
                boxShadow: "0 6px 22px rgba(34, 197, 94, 0.45)",
                fontWeight: 800,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isStarting ? "not-allowed" : "pointer",
              }}
            >
              {isStarting ? (
                <RefreshCw size={20} className="spin" />
              ) : (
                <Gamepad2 size={20} />
              )}
              <span>
                {isStarting
                  ? "LAUNCHING LIVE GAME TABLE…"
                  : autoCountdown !== null && autoCountdown > 0
                  ? `LAUNCHING TABLE (${autoCountdown}s)… TAP TO ENTER NOW`
                  : "ENTER LIVE GAME TABLE NOW"}
              </span>
            </button>
            <span className="waiting-bot-subtext" style={{ color: "rgba(255, 255, 255, 0.85)" }}>
              {isWagered
                ? "Both stakes locked in escrow! Table is ready to play."
                : "Opponent connected! Entering match table automatically."}
            </span>
          </div>
        )}
      </div>

      {/* Secondary Transparent Pot Breakdown */}
      {effectivePot > 0 && (
        <div className="waiting-distribution-card">
          <button
            type="button"
            className="dist-toggle-header"
            onClick={() => setShowDistDetails(prev => !prev)}
          >
            <div className="dist-summary-line">
              <Trophy size={16} className="trophy-gold" />
              <span>
                Winner Takes <strong>{formatNim(dist.winnerNim)} NIM</strong> (90%)
              </span>
            </div>
            <span className="dist-toggle-hint">
              {showDistDetails ? "Hide Breakdown ▲" : "View 100% Pot Split ▼"}
            </span>
          </button>

          {showDistDetails && (
            <div className="dist-expanded-grid">
              <div className="dist-expanded-item">
                <span className="role">Winner ({dist.percentages.winner}%)</span>
                <span className="val">{formatNim(dist.winnerNim)} NIM</span>
              </div>
              {dist.referrerNim > 0 && (
                <div className="dist-expanded-item">
                  <span className="role">Referrer ({dist.percentages.referrer}%)</span>
                  <span className="val">{formatNim(dist.referrerNim)} NIM</span>
                </div>
              )}
              <div className="dist-expanded-item">
                <span className="role">Builder Pool ({dist.percentages.builder}%)</span>
                <span className="val">{formatNim(dist.builderNim)} NIM</span>
              </div>
              {dist.percentages.ecosystem > 0 && (
                <div className="dist-expanded-item">
                  <span className="role">Ecosystem ({dist.percentages.ecosystem}%)</span>
                  <span className="val">{formatNim(dist.ecosystemNim)} NIM</span>
                </div>
              )}
              {dist.percentages.charity > 0 && (
                <div className="dist-expanded-item">
                  <span className="role">Charity ({dist.percentages.charity}%)</span>
                  <span className="val">{formatNim(dist.charityNim)} NIM</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
