import { useState } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  Coins,
  Copy,
  ExternalLink,
  Gamepad2,
  Heart,
  Globe,
  Hammer,
  ShieldCheck,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { calculatePotDistribution, formatNim } from "@shared/game/pot-distribution";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import { StakeSelector } from "@/components/game/StakeSelector";

interface LudoEntryFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStake?: number;
}

export function LudoEntryFlowModal({
  isOpen,
  onClose,
  defaultStake = 100,
}: LudoEntryFlowModalProps) {
  useModalBackHandler(isOpen, onClose);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();

  const [activeTab, setActiveTab] = useState<"wager" | "practice">("wager");
  const [selectedStake, setSelectedStake] = useState<number>(defaultStake);
  const [selectedMode, setSelectedMode] = useState<"bot" | "private" | "friend">("bot");
  const [friendUsername, setFriendUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentStake = selectedStake;
  const totalPot = currentStake * 2;
  const dist = calculatePotDistribution(totalPot);

  const ensureAuthenticated = async () => {
    if (!authQuery.data) {
      toast.info("Signing in as Guest Player…");
      const res = await guestLogin.mutateAsync({ name: "Player 1" });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
        localStorage.setItem("manus-cookie", `manus-session=${res.token}`);
      }
      await utils.auth.me.invalidate();
    }
  };

  const handleStartPractice = async () => {
    try {
      setIsSubmitting(true);
      await ensureAuthenticated();
      toast.info("Entering Practice Arena vs Nimiq AI…");
      const match = await createSolo.mutateAsync({ gameSlug: "ludo-league" });
      onClose();
      window.location.href = `/matches/${match.id}`;
    } catch (err) {
      toast.error("Failed to start practice match", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCompetitiveMatch = async () => {
    try {
      setIsSubmitting(true);
      await ensureAuthenticated();

      if (selectedMode === "bot") {
        toast.info("Entering Arena Table vs Nimiq AI Bot…");
        const match = await createSolo.mutateAsync({ gameSlug: "ludo-league" });
        onClose();
        window.location.href = `/matches/${match.id}`;
        return;
      }

      toast.info(`Setting up Table (${formatNim(currentStake)} NIM Stake)…`);

      const res = await createWagered.mutateAsync({
        gameSlug: "ludo-league",
        stakeNim: currentStake,
      });

      onClose();
      window.location.href = `/matches/${res.id}`;
    } catch (err) {
      toast.error("Failed to create competitive match", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ludo-flow-overlay" onClick={onClose}>
      <div
        className="ludo-flow-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="ludo-flow-header">
          <div className="ludo-flow-title-group">
            <span className="ludo-flow-badge">NIMIQ ARENA</span>
            <h2>LUDO LEAGUE</h2>
          </div>
          <button
            type="button"
            className="ludo-flow-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="ludo-flow-tabs">
          <button
            type="button"
            className={`ludo-flow-tab ${activeTab === "wager" ? "active" : ""}`}
            onClick={() => setActiveTab("wager")}
          >
            <Coins size={18} />
            <span>COMPETITIVE MATCH</span>
          </button>
          <button
            type="button"
            className={`ludo-flow-tab ${activeTab === "practice" ? "active" : ""}`}
            onClick={() => setActiveTab("practice")}
          >
            <Bot size={18} />
            <span>PRACTICE (FREE)</span>
          </button>
        </div>

        {activeTab === "practice" ? (
          /* Practice Tab Content */
          <div className="ludo-flow-practice-body">
            <div className="practice-hero-card">
              <div className="practice-icon-halo">
                <Bot size={44} />
              </div>
              <h3>Practice Table</h3>
              <p>
                Warm up your tactics against the authoritative Nimiq Ludo AI.
                Instant play, no NIM stake, zero risk, full classic 2-dice rules.
              </p>
              <div className="practice-features">
                <div className="practice-feat-item">
                  <ShieldCheck size={16} />
                  <span>Server-authoritative rolls</span>
                </div>
                <div className="practice-feat-item">
                  <Zap size={16} />
                  <span>Instant 300ms bot moves</span>
                </div>
                <div className="practice-feat-item">
                  <Gamepad2 size={16} />
                  <span>Full 2-dice rules (6 to exit)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="ludo-flow-primary-btn"
              onClick={handleStartPractice}
              disabled={isSubmitting}
            >
              {isSubmitting ? "ENTERING ARENA…" : "START PRACTICE"}
            </button>
          </div>
        ) : (
          /* Competitive Wagered Content */
          <div className="ludo-flow-wager-body">
            {/* Step 1: Stake Selection */}
            <div className="ludo-step-section" style={{ marginBottom: "12px" }}>
              <div className="ludo-step-label" style={{ marginBottom: "8px" }}>
                <span className="step-num">1</span>
                <span>ENTRY STAKE</span>
              </div>

              <StakeSelector
                stakeNim={selectedStake}
                onChangeStakeNim={setSelectedStake}
                minNim={1}
                maxNim={500000}
                hideSummary={true}
                hidePresets={true}
              />
            </div>

            {/* Compact Pot Summary */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(245, 158, 11, 0.22)",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <div>
                <span style={{ color: "rgba(251, 248, 241, 0.5)", fontSize: "10px", display: "block" }}>
                  MATCH POT (2X)
                </span>
                <strong style={{ color: "#ffffff", fontSize: "14px" }}>
                  {formatNim(totalPot)} NIM
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "rgba(251, 248, 241, 0.5)", fontSize: "10px", display: "block" }}>
                  WINNER TAKES (90%)
                </span>
                <strong style={{ color: "#4ade80", fontSize: "14px" }}>
                  {formatNim(dist.winnerNim)} NIM
                </strong>
              </div>
            </div>

            {/* Step 2: Choose Opponent Type */}
            <div className="ludo-step-section" style={{ marginBottom: "16px" }}>
              <div className="ludo-step-label" style={{ marginBottom: "8px" }}>
                <span className="step-num">2</span>
                <span>OPPONENT</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "6px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMode("bot")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    padding: "10px 6px",
                    borderRadius: "10px",
                    border: `1px solid ${selectedMode === "bot" ? "#f59e0b" : "rgba(251, 248, 241, 0.12)"}`,
                    background: selectedMode === "bot" ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    color: selectedMode === "bot" ? "#fbbf24" : "rgba(251, 248, 241, 0.75)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Bot size={18} />
                  <span>AI Bot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("private")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    padding: "10px 6px",
                    borderRadius: "10px",
                    border: `1px solid ${selectedMode === "private" ? "#f59e0b" : "rgba(251, 248, 241, 0.12)"}`,
                    background: selectedMode === "private" ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    color: selectedMode === "private" ? "#fbbf24" : "rgba(251, 248, 241, 0.75)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Coins size={18} />
                  <span>Room Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("friend")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    padding: "10px 6px",
                    borderRadius: "10px",
                    border: `1px solid ${selectedMode === "friend" ? "#f59e0b" : "rgba(251, 248, 241, 0.12)"}`,
                    background: selectedMode === "friend" ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    color: selectedMode === "friend" ? "#fbbf24" : "rgba(251, 248, 241, 0.75)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Users size={18} />
                  <span>Invite</span>
                </button>
              </div>

              {selectedMode === "friend" && (
                <div style={{ marginTop: "8px" }}>
                  <input
                    type="text"
                    placeholder="Friend's username or player tag…"
                    value={friendUsername}
                    onChange={e => setFriendUsername(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirmation CTA */}
            <button
              type="button"
              className="ludo-flow-primary-btn"
              onClick={handleCreateCompetitiveMatch}
              disabled={isSubmitting || currentStake <= 0}
            >
              {isSubmitting
                ? "LAUNCHING ARENA TABLE…"
                : selectedMode === "bot"
                  ? "PLAY VS ARENA BOT (INSTANT)"
                  : `CREATE TABLE (${formatNim(currentStake)} NIM)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
