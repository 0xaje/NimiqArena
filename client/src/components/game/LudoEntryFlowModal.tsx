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

interface LudoEntryFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStake?: number;
}

const PRESET_STAKES = [50, 100, 500, 1_000, 10_000];

export function LudoEntryFlowModal({
  isOpen,
  onClose,
  defaultStake = 100,
}: LudoEntryFlowModalProps) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();

  const [activeTab, setActiveTab] = useState<"wager" | "practice">("wager");
  const [selectedStake, setSelectedStake] = useState<number>(defaultStake);
  const [customStakeInput, setCustomStakeInput] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"friend" | "private">("private");
  const [friendUsername, setFriendUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentStake = isCustom
    ? Math.max(1, parseInt(customStakeInput, 10) || 1)
    : selectedStake;

  const totalPot = currentStake * 2;
  const dist = calculatePotDistribution(totalPot);

  const ensureAuthenticated = async () => {
    if (!authQuery.data) {
      toast.info("Signing in as Guest Player…");
      const res = await guestLogin.mutateAsync({ name: "Player 1" });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
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
      navigate(`/matches/${match.id}`);
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
      toast.info(`Setting up Table (${formatNim(currentStake)} NIM Stake)…`);

      const res = await createWagered.mutateAsync({
        gameSlug: "ludo-league",
        stakeNim: currentStake,
      });

      onClose();
      navigate(`/matches/${res.id}`);
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
            <span>PRACTICE WITH BOT (FREE)</span>
          </button>
        </div>

        {activeTab === "practice" ? (
          /* Practice Tab Content */
          <div className="ludo-flow-practice-body">
            <div className="practice-hero-card">
              <div className="practice-icon-halo">
                <Bot size={44} />
              </div>
              <h3>Free Practice Table</h3>
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
              {isSubmitting ? "ENTERING ARENA…" : "PLAY PRACTICE MATCH NOW"}
            </button>
          </div>
        ) : (
          /* Competitive Wagered Content */
          <div className="ludo-flow-wager-body">
            {/* Step 1: Stake Selection */}
            <div className="ludo-step-section">
              <div className="ludo-step-label">
                <span className="step-num">1</span>
                <span>CHOOSE YOUR STAKE</span>
              </div>

              <div className="stake-preset-grid">
                {PRESET_STAKES.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    className={`stake-pill ${!isCustom && selectedStake === amount ? "active" : ""}`}
                    onClick={() => {
                      setSelectedStake(amount);
                      setIsCustom(false);
                    }}
                  >
                    <span className="stake-val">{formatNim(amount)}</span>
                    <span className="stake-sym">NIM</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`stake-pill custom ${isCustom ? "active" : ""}`}
                  onClick={() => setIsCustom(true)}
                >
                  <span className="stake-val">CUSTOM</span>
                </button>
              </div>

              {isCustom && (
                <div className="custom-stake-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="Enter custom NIM stake (e.g. 2500)"
                    value={customStakeInput}
                    onChange={e => setCustomStakeInput(e.target.value)}
                    className="custom-stake-field"
                  />
                  <span className="custom-nim-suffix">NIM</span>
                </div>
              )}
            </div>

            {/* Transparent Pot & Distribution Summary */}
            <div className="ludo-summary-card">
              <div className="summary-stakes-row">
                <div className="stake-breakdown-col">
                  <span className="sub-caption">YOUR STAKE</span>
                  <span className="sub-amount">{formatNim(currentStake)} NIM</span>
                </div>
                <span className="stake-vs-plus">+</span>
                <div className="stake-breakdown-col">
                  <span className="sub-caption">OPPONENT STAKE</span>
                  <span className="sub-amount">{formatNim(currentStake)} NIM</span>
                </div>
                <span className="stake-vs-equals">=</span>
                <div className="stake-breakdown-col highlight">
                  <span className="sub-caption">TOTAL MATCH POT</span>
                  <span className="sub-amount pot">{formatNim(totalPot)} NIM</span>
                </div>
              </div>

              <div className="summary-payout-banner">
                <div className="winner-take-badge">
                  <Trophy size={18} className="trophy-gold" />
                  <span>
                    WINNER RECEIVES <strong>{formatNim(dist.winnerNim)} NIM</strong> (90%)
                  </span>
                </div>
              </div>

              <div className="summary-distribution-details">
                <span className="dist-header">MATCH DISTRIBUTION (100% OF POT)</span>
                <div className="dist-row">
                  <div className="dist-item">
                    <Trophy size={14} className="trophy-gold" />
                    <span className="dist-name">Winner:</span>
                    <span className="dist-val">{formatNim(dist.winnerNim)} NIM (90%)</span>
                  </div>
                  <div className="dist-item">
                    <Hammer size={14} className="icon-blue" />
                    <span className="dist-name">Builder:</span>
                    <span className="dist-val">{formatNim(dist.builderNim)} NIM (5%)</span>
                  </div>
                  <div className="dist-item">
                    <Globe size={14} className="icon-teal" />
                    <span className="dist-name">Ecosystem:</span>
                    <span className="dist-val">{formatNim(dist.ecosystemNim)} NIM (3%)</span>
                  </div>
                  <div className="dist-item">
                    <Heart size={14} className="icon-pink" />
                    <span className="dist-name">Charity:</span>
                    <span className="dist-val">{formatNim(dist.charityNim)} NIM (2%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Choose How to Play */}
            <div className="ludo-step-section">
              <div className="ludo-step-label">
                <span className="step-num">2</span>
                <span>CHOOSE HOW TO PLAY</span>
              </div>

              <div className="mode-selection-row">
                <button
                  type="button"
                  className={`mode-card ${selectedMode === "private" ? "active" : ""}`}
                  onClick={() => setSelectedMode("private")}
                >
                  <div className="mode-card-icon">
                    <Coins size={24} />
                  </div>
                  <div className="mode-card-info">
                    <h4>Private Table Code</h4>
                    <p>Generate a match code to send to any friend or rival.</p>
                  </div>
                </button>

                <button
                  type="button"
                  className={`mode-card ${selectedMode === "friend" ? "active" : ""}`}
                  onClick={() => setSelectedMode("friend")}
                >
                  <div className="mode-card-icon">
                    <Users size={24} />
                  </div>
                  <div className="mode-card-info">
                    <h4>Play with a Friend Online</h4>
                    <p>Invite an active player directly by name or username.</p>
                  </div>
                </button>
              </div>

              {selectedMode === "friend" && (
                <div className="friend-invite-input-row">
                  <input
                    type="text"
                    placeholder="Friend's username or player tag…"
                    value={friendUsername}
                    onChange={e => setFriendUsername(e.target.value)}
                    className="friend-input-field"
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
                ? "CREATING TABLE…"
                : `CONFIRM & CREATE TABLE (${formatNim(currentStake)} NIM)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
