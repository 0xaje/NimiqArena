import { useState, useEffect } from "react";
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
  Sparkles,
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
  gameSlug?: "ludo-league" | "connect-four";
}

export function LudoEntryFlowModal({
  isOpen,
  onClose,
  defaultStake = 100,
  gameSlug = "ludo-league",
}: LudoEntryFlowModalProps) {
  useModalBackHandler(isOpen, onClose);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createHouseWagered = trpc.match.createHouseWageredMatch.useMutation();

  const [activeTab, setActiveTab] = useState<"wager" | "practice">("wager");
  const [selectedStake, setSelectedStake] = useState<number>(defaultStake);
  const [selectedMode, setSelectedMode] = useState<"private" | "friend" | "bot">("private");
  const [friendUsername, setFriendUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultStake) {
      setSelectedStake(defaultStake);
    }
  }, [defaultStake, isOpen]);

  if (!isOpen) return null;

  const isC4 = gameSlug === "connect-four";
  const gameTitle = isC4 ? "CONNECT 4 NIM" : "LUDO LEAGUE";
  const currentGameSlug = isC4 ? "connect-four" : "ludo-league";

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
      toast.info(`Entering Practice Arena vs Nimiq AI…`);
      const match = await createSolo.mutateAsync({ gameSlug: currentGameSlug });
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
        toast.info(`Creating ${formatNim(currentStake)} NIM Wagered Table vs Arena Bot (House Matched)…`);
        const res = await createHouseWagered.mutateAsync({
          gameSlug: currentGameSlug,
          stakeNim: currentStake,
        });
        onClose();
        window.location.href = `/matches/${res.id}`;
        return;
      }

      toast.info(`Setting up Table (${formatNim(currentStake)} NIM Stake)…`);

      const res = await createWagered.mutateAsync({
        gameSlug: currentGameSlug,
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
            <h2>{gameTitle}</h2>
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
                maxNim={10000000}
                hideSummary={true}
                hidePresets={false}
              />
            </div>

            {/* Compact Pot Summary */}
            <div
              style={{
                background: "#191f2e",
                border: "1px solid #2f3544",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <div>
                <span style={{ color: "#d4c5ad", fontSize: "10px", display: "block", fontWeight: 600 }}>
                  MATCH POT (2X)
                </span>
                <strong style={{ color: "#dde2f6", fontSize: "14px" }}>
                  {formatNim(totalPot)} NIM
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#d4c5ad", fontSize: "10px", display: "block", fontWeight: 600 }}>
                  WINNER TAKES (90%)
                </span>
                <strong style={{ color: "#68f5b8", fontSize: "14px" }}>
                  +{formatNim(dist.winnerNim)} NIM
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
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMode("private")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px 6px",
                    borderRadius: "12px",
                    border: `1px solid ${selectedMode === "private" ? "#f3b72c" : "#2f3544"}`,
                    background: selectedMode === "private" ? "rgba(243, 183, 44, 0.15)" : "#191f2e",
                    color: selectedMode === "private" ? "#ffd78d" : "#d4c5ad",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Coins size={18} className={selectedMode === "private" ? "text-[#f3b72c]" : "text-[#d4c5ad]"} />
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
                    gap: "6px",
                    padding: "12px 6px",
                    borderRadius: "12px",
                    border: `1px solid ${selectedMode === "friend" ? "#f3b72c" : "#2f3544"}`,
                    background: selectedMode === "friend" ? "rgba(243, 183, 44, 0.15)" : "#191f2e",
                    color: selectedMode === "friend" ? "#ffd78d" : "#d4c5ad",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Users size={18} className={selectedMode === "friend" ? "text-[#f3b72c]" : "text-[#d4c5ad]"} />
                  <span>Invite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode("bot")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px 6px",
                    borderRadius: "12px",
                    border: `1px solid ${selectedMode === "bot" ? "#f3b72c" : "#2f3544"}`,
                    background: selectedMode === "bot" ? "rgba(243, 183, 44, 0.15)" : "#191f2e",
                    color: selectedMode === "bot" ? "#ffd78d" : "#d4c5ad",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <Bot size={18} className={selectedMode === "bot" ? "text-[#f3b72c]" : "text-[#d4c5ad]"} />
                  <span>AI Bot</span>
                </button>
              </div>

              {selectedMode === "bot" && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    background: "rgba(243, 183, 44, 0.1)",
                    border: "1px solid rgba(243, 183, 44, 0.3)",
                    borderRadius: "10px",
                    fontSize: "11px",
                    color: "#ffdea4",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Sparkles size={16} className="text-[#f3b72c] shrink-0" />
                  <span>
                    <strong>Instant House Match:</strong> Platform bankroll matches your {formatNim(currentStake)} NIM stake! Beat the AI to win the on-chain pot.
                  </span>
                </div>
              )}

              {selectedMode === "friend" && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="text"
                    placeholder="Friend's username or player tag…"
                    value={friendUsername}
                    onChange={e => setFriendUsername(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#080e1c",
                      border: "1px solid #2f3544",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      color: "#dde2f6",
                      fontSize: "12px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      boxSizing: "border-box",
                      outline: "none",
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
