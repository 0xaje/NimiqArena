import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Check,
  Coins,
  Copy,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";
import { StakeSelector } from "@/components/game/StakeSelector";
import { formatNim } from "@shared/game/pot-distribution";

import { useNimiqWallet } from "@/lib/useNimiqWallet";

export default function Connect4Detail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "connect-four" });
  const { address: walletAddress, balanceNim, isConnected } = useNimiqWallet();
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
  } | null>(null);
  const [isPlayWithFriendOpen, setIsPlayWithFriendOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(50);

  const game = gameQuery.data ?? {
    id: "connect-four",
    slug: "connect-four",
    name: "Connect NIM",
    kind: "connect4",
    status: "active",
    description: "Vertical 7x6 tactical strategy game. Drop discs to connect 4 in a row horizontally, vertically, or diagonally.",
  };
  const user = authQuery.data;

  const copyCode = async () => {
    if (!createdMatch) return;
    await navigator.clipboard?.writeText(createdMatch.joinCode);
    toast("Invite code copied", {
      description: "Share it with a friend or open /join in another window.",
    });
  };

  async function ensureAuthenticated(defaultName: string) {
    if (user) return;
    const savedWallet = walletAddress || localStorage.getItem("nimiq_arena_wallet_address");
    let loginToken: string | null = null;
    if (savedWallet) {
      try {
        const challengeRes = await utils.client.auth.requestChallenge.query();
        const res = await loginWithNimiq.mutateAsync({
          address: savedWallet,
          challenge: challengeRes.challenge,
        });
        loginToken = res?.token || null;
      } catch (e) {
        console.warn("[Connect4Detail] Nimiq auto-login fallback to guest:", e);
      }
    }
    if (!loginToken) {
      toast.info("Signing in…");
      const loginRes = await guestLogin.mutateAsync({ name: defaultName });
      loginToken = loginRes?.token || null;
    }
    if (loginToken) {
      sessionStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
      localStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
    }
    await utils.auth.me.invalidate();
  }

  async function handleStartWageredMatch() {
    try {
      await ensureAuthenticated("Player 1 (Host)");
      toast.info(`Creating ${selectedStake} NIM Wagered Table…`);
      const res = await createWagered.mutateAsync({
        gameSlug: "connect-four",
        stakeNim: selectedStake,
      });
      setIsStakeModalOpen(false);
      navigate(`/matches/${res.id}`);
    } catch (err) {
      toast.error("Failed to create wagered match", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  }

  async function handleStartSoloPractice() {
    try {
      await ensureAuthenticated("Player 1 (Solo)");
      toast.info("Launching Practice Table vs Connect NIM Bot…");
      const match = await createSolo.mutateAsync({ gameSlug: "connect-four" });
      navigate(`/matches/${match.id}`);
    } catch (err) {
      toast.error("Failed to launch solo practice", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  }

  async function createMatch() {
    try {
      await ensureAuthenticated("Player 1 (Host)");
      const match = await createChallenge.mutateAsync({
        gameSlug: "connect-four",
      });
      setCreatedMatch({ id: match.id, joinCode: match.joinCode });
      toast.success("Challenge match created", {
        description: `Match ${match.id} is waiting for a friend.`,
      });
    } catch (error) {
      toast.error("Match could not be created", {
        description:
          error instanceof Error
            ? error.message
            : "The backend did not create a match.",
      });
    }
  }

  return (
    <div className="detail-page">
      <PlayWithFriendModal
        isOpen={isPlayWithFriendOpen}
        onClose={() => setIsPlayWithFriendOpen(false)}
        gameSlug="connect-four"
        gameTitle="Connect NIM"
      />

      {/* Wager Stake Selection Modal */}
      {isStakeModalOpen && (
        <div
          className="quickmatch-modal-overlay"
          onClick={() => setIsStakeModalOpen(false)}
        >
          <div
            className="quickmatch-modal-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "440px" }}
          >
            <div className="quickmatch-modal-header">
              <div className="quickmatch-header-left">
                <Coins className="radar-header-icon" size={20} />
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  SELECT WAGER STAKE
                </span>
              </div>
              <button
                className="quickmatch-close-btn"
                onClick={() => setIsStakeModalOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div
              className="quickmatch-modal-body"
              style={{ textAlign: "center", padding: "20px 24px" }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                Choose Your Entry Stake
              </h2>
              <p
                style={{
                  color: "rgba(251, 248, 241, 0.7)",
                  fontSize: "12px",
                  margin: "0 0 16px",
                }}
              >
                Set a custom NIM or USD dollar stake. Both players deposit matching stakes into table escrow. Winner receives 90% of the total match pot!
              </p>

              <StakeSelector
                stakeNim={selectedStake}
                onChangeStakeNim={setSelectedStake}
                minNim={1}
                maxNim={500000}
              />

              <button
                className="primary-action"
                onClick={handleStartWageredMatch}
                disabled={createWagered.isPending || selectedStake < 1}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  background: "var(--orange)",
                  padding: "14px",
                  fontSize: "14px",
                  marginTop: "16px",
                  cursor: "pointer",
                }}
              >
                <Coins size={16} />{" "}
                {createWagered.isPending
                  ? "Creating Wagered Table…"
                  : `Create ${formatNim(selectedStake)} NIM Match`}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / GAME 002</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isConnected && walletAddress ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 199, 44, 0.12)",
                border: "1px solid rgba(255, 199, 44, 0.3)",
                borderRadius: "20px",
                padding: "3px 10px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                color: "#fbbf24",
                fontWeight: 600,
              }}
              title={`Connected Nimiq Wallet: ${walletAddress}`}
            >
              <Coins size={13} style={{ color: "#eab308" }} />
              <span>{balanceNim.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} NIM</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={{ opacity: 0.85 }}>{walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}</span>
            </div>
          ) : null}
          <span className="detail-state">
            {user ? `PLAYING AS: ${user.name || "PLAYER 1"}` : "GUEST MODE"}
          </span>
        </div>
      </header>
      <main className="detail-main">
        <section className="detail-hero">
          <div className="detail-hero-copy">
            <span className="stamp orange">STRATEGY / TACTICAL</span>
            <p className="eyebrow">GAME DETAIL / REAL RECORD</p>
            <h1>{game?.name ?? "Connect NIM"}</h1>
            <p className="detail-lede">
              {game?.description ??
                "Vertical 7x6 tactical strategy game. Drop discs to connect 4 in a row horizontally, vertically, or diagonally."}
            </p>
            <div
              className="detail-actions"
              style={{ flexWrap: "wrap", gap: "12px" }}
            >
              <button
                className="primary-action"
                onClick={() => setIsStakeModalOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.4)",
                  padding: "14px 24px",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <Coins size={16} /> PLAY WAGER MATCH
              </button>
              <button
                className="secondary-chip"
                onClick={handleStartSoloPractice}
                disabled={createSolo.isPending}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Bot size={16} />
                {createSolo.isPending
                  ? "Starting…"
                  : "Practice"}
              </button>
              <button
                className="secondary-chip"
                onClick={() => setIsPlayWithFriendOpen(true)}
                style={{
                  padding: "12px 18px",
                  background: "rgba(34, 197, 94, 0.15)",
                  borderColor: "rgba(34, 197, 94, 0.35)",
                  color: "#4ade80",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Users size={16} /> Play with Friend
              </button>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Deterministic server-authoritative engine. Every drop and victory
                line is verified.
              </span>
            </div>
          </div>

          <div className="detail-board">
            <img
              src="/images/connect-nim.jpg"
              alt="Connect NIM game table preview"
            />
            <div className="detail-board-wash" />
            <span className="detail-board-label">TACTICAL ARENA / 7x6 GRID</span>
            <strong>
              Connect four.
              <br />
              <em>Claim the pot.</em>
            </strong>
          </div>
        </section>

        <section className="c4-protocol-section">
          <div className="c4-protocol-card">
            <div className="c4-protocol-topline">
              <div className="c4-protocol-tagline">
                <span className="c4-protocol-pulse" />
                <span className="c4-protocol-label">TACTICAL PROTOCOL SPECIFICATIONS</span>
                <span className="c4-protocol-code">[SYS_PROTO_002]</span>
              </div>
              <div className="c4-protocol-status">
                <span className="c4-status-dot-pulse" />
                ACTIVE PROTOCOL
              </div>
            </div>

            <div className="c4-feature-grid">
              <div className="c4-feature-card">
                <div className="c4-feature-header">
                  <div className="c4-feature-icon-wrapper grid-accent">
                    <Gamepad2 size={22} />
                  </div>
                  <span className="c4-feature-badge grid-accent">MATRIX ENGINE</span>
                </div>
                <div className="c4-feature-body">
                  <h4 className="c4-feature-title">7x6 Vertical Grid</h4>
                  <p className="c4-feature-description">
                    Vertical gravity drop physics with horizontal, vertical,
                    and diagonal win detection.
                  </p>
                </div>
                <div className="c4-feature-footer">
                  <span className="c4-metric-label">ARCHITECTURE</span>
                  <span className="c4-metric-value">42-SLOT BITBOARD</span>
                </div>
              </div>

              <div className="c4-feature-card">
                <div className="c4-feature-header">
                  <div className="c4-feature-icon-wrapper escrow-accent">
                    <Coins size={22} />
                  </div>
                  <span className="c4-feature-badge escrow-accent">ON-CHAIN ESCROW</span>
                </div>
                <div className="c4-feature-body">
                  <h4 className="c4-feature-title">Wagered NIM Escrow</h4>
                  <p className="c4-feature-description">
                    Stake 10 to 500 NIM per match. Winner automatically claims
                    90% of the pot on-chain.
                  </p>
                </div>
                <div className="c4-feature-footer">
                  <span className="c4-metric-label">SETTLEMENT</span>
                  <span className="c4-metric-value">90% WINNER PAYOUT</span>
                </div>
              </div>

              <div className="c4-feature-card">
                <div className="c4-feature-header">
                  <div className="c4-feature-icon-wrapper ai-accent">
                    <Zap size={22} />
                  </div>
                  <span className="c4-feature-badge ai-accent">NEURAL HEURISTIC</span>
                </div>
                <div className="c4-feature-body">
                  <h4 className="c4-feature-title">Tactical AI Engine</h4>
                  <p className="c4-feature-description">
                    Practice against an intelligent heuristic bot that detects
                    tactical forks and blocks.
                  </p>
                </div>
                <div className="c4-feature-footer">
                  <span className="c4-metric-label">RESPONSE TIME</span>
                  <span className="c4-metric-value">&lt; 300MS ADAPTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
