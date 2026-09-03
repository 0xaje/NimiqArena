import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";

interface MatchWaitingRoomProps {
  matchId: string;
  joinCode: string;
  hostName: string;
  guestName?: string | null;
  stakeNim?: number | null;
  totalPotNim?: number | null;
  isHost: boolean;
  onLeave: () => void;
  onDepositPrompt?: () => void;
  isDepositNeeded?: boolean;
}

export function MatchWaitingRoom({
  matchId,
  joinCode,
  hostName,
  guestName,
  stakeNim = 0,
  totalPotNim = 0,
  isHost,
  onLeave,
  onDepositPrompt,
  isDepositNeeded = false,
}: MatchWaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [showDistDetails, setShowDistDetails] = useState(false);

  const utils = trpc.useUtils();
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
            <span className="waiting-stake-tag">
              Stake: {formatNim(stakeNim)} NIM
            </span>
          ) : null}
        </div>

        {/* Center VS Element */}
        <div className="waiting-center-vs">
          <div className="vs-circle">
            <span>VS</span>
          </div>
          <div className="vs-pot-display">
            <span className="vs-pot-label">MATCH POT</span>
            <span className="vs-pot-amount">
              {effectivePot > 0 ? `${formatNim(effectivePot)} NIM` : "FREE PLAY"}
            </span>
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
            <span className="waiting-stake-tag">
              Stake: {formatNim(stakeNim)} NIM
            </span>
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

        {isDepositNeeded && onDepositPrompt && (
          <div className="waiting-deposit-alert">
            <ShieldCheck size={18} className="icon-gold" />
            <div className="deposit-alert-text">
              <strong>Deposit Verification Required</strong>
              <p>Lock your {formatNim(stakeNim || 0)} NIM stake into escrow to ready up.</p>
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
                <span className="role">🏆 Winner (90%)</span>
                <span className="val">{formatNim(dist.winnerNim)} NIM</span>
              </div>
              <div className="dist-expanded-item">
                <span className="role">👷 Builder (5%)</span>
                <span className="val">{formatNim(dist.builderNim)} NIM</span>
              </div>
              <div className="dist-expanded-item">
                <span className="role">🌐 Nimiq Ecosystem (3%)</span>
                <span className="val">{formatNim(dist.ecosystemNim)} NIM</span>
              </div>
              <div className="dist-expanded-item">
                <span className="role">❤️ Charity (2%)</span>
                <span className="val">{formatNim(dist.charityNim)} NIM</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
