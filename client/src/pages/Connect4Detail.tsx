import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { QuickMatchModal } from "@/components/game/QuickMatchModal";

export default function Connect4Detail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "connect-four" });
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
  } | null>(null);
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(50);

  const game = gameQuery.data;
  const user = authQuery.data;

  const copyCode = async () => {
    if (!createdMatch) return;
    await navigator.clipboard?.writeText(createdMatch.joinCode);
    toast("Invite code copied", {
      description: "Share it with a friend or open /join in another window.",
    });
  };

  async function handleStartWageredMatch() {
    try {
      if (!user) {
        toast.info("Signing in as Player 1…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 1 (Host)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
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
      if (!user) {
        toast.info("Signing in as Player 1…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 1 (Solo)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
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
      if (!user) {
        toast.info("Signing in as Player 1 (Host)…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 1 (Host)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
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

  const handleOpenQuickMatch = async () => {
    if (!user) {
      toast.info("Signing in as Player…");
      const loginRes = await guestLogin.mutateAsync({
        name: "Player 1 (Guest)",
      });
      if (loginRes.token) {
        sessionStorage.setItem(
          "manus-cookie",
          `manus-session=${loginRes.token}`
        );
      }
      await utils.auth.me.invalidate();
    }
    setIsQuickMatchOpen(true);
  };

  return (
    <div className="detail-page">
      <QuickMatchModal
        isOpen={isQuickMatchOpen}
        onClose={() => setIsQuickMatchOpen(false)}
        gameSlug="connect-four"
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
              >
                ✕
              </button>
            </div>
            <div
              className="quickmatch-modal-body"
              style={{ textAlign: "center", padding: "24px" }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                Choose Your Entry Stake
              </h2>
              <p
                style={{
                  color: "rgba(251, 248, 241, 0.7)",
                  fontSize: "13px",
                  margin: "0 0 20px",
                }}
              >
                Both players deposit matching stakes into table escrow. Winner
                receives 90% of the total match pot!
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                  width: "100%",
                  marginBottom: "20px",
                }}
              >
                {[10, 50, 100, 500].map(stake => (
                  <button
                    key={stake}
                    type="button"
                    onClick={() => setSelectedStake(stake)}
                    style={{
                      padding: "16px",
                      background:
                        selectedStake === stake
                          ? "rgba(230, 93, 35, 0.2)"
                          : "rgba(0, 0, 0, 0.25)",
                      border: `2px solid ${selectedStake === stake ? "var(--orange)" : "rgba(251, 248, 241, 0.15)"}`,
                      borderRadius: "8px",
                      color: "var(--paper-bright)",
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color:
                          selectedStake === stake
                            ? "var(--orange)"
                            : "inherit",
                      }}
                    >
                      {stake} NIM
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(251, 248, 241, 0.6)",
                        marginTop: "4px",
                      }}
                    >
                      Pot: {stake * 2} NIM
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="primary-action"
                onClick={handleStartWageredMatch}
                disabled={createWagered.isPending}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  background: "var(--orange)",
                  padding: "14px",
                  fontSize: "14px",
                }}
              >
                <Coins size={16} />{" "}
                {createWagered.isPending
                  ? "Creating Wagered Table…"
                  : `Create ${selectedStake} NIM Match`}
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
        <span className="detail-state">
          {user ? `PLAYING AS: ${user.name || "PLAYER 1"}` : "GUEST MODE"}
        </span>
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
                onClick={handleOpenQuickMatch}
                disabled={!game || game.status !== "active"}
                style={{ background: "var(--orange)" }}
              >
                <Zap size={16} /> Quick Match (Find Opponent)
              </button>
              <button
                className="secondary-chip"
                onClick={() => setIsStakeModalOpen(true)}
                disabled={!game || game.status !== "active"}
                style={{
                  padding: "12px 16px",
                  borderColor: "var(--orange)",
                  color: "var(--orange)",
                }}
              >
                <Coins size={16} /> 💰 Wager NIM Match
              </button>
              <button
                className="secondary-chip"
                onClick={handleStartSoloPractice}
                disabled={
                  createSolo.isPending || !game || game.status !== "active"
                }
                style={{ padding: "12px 16px" }}
              >
                🤖{" "}
                {createSolo.isPending
                  ? "Starting…"
                  : "Solo Practice (vs AI)"}
              </button>
              <button
                className="secondary-chip"
                onClick={createMatch}
                disabled={
                  createChallenge.isPending ||
                  !game ||
                  game.status !== "active"
                }
                style={{ padding: "12px 16px" }}
              >
                <Users size={16} />{" "}
                {createChallenge.isPending
                  ? "Creating match…"
                  : "Challenge a friend"}
              </button>
              <Link className="text-action" href="/join">
                <Gamepad2 size={16} /> Join by code
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Deterministic server-authoritative engine. Every drop and victory
                line is verified.
              </span>
            </div>
          </div>

          <div className="detail-hero-card">
            <div className="card-topline">
              <span className="card-label">AVAILABLE ACTIONS</span>
              <span className="status-indicator">
                <span className="status-dot green"></span>
                ACTIVE PROTOCOL
              </span>
            </div>

            <div className="feature-grid">
              <div className="feature-item">
                <div className="feature-icon">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <h4>7x6 Vertical Grid</h4>
                  <p>
                    Vertical gravity drop physics with horizontal, vertical,
                    and diagonal win detection.
                  </p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Coins size={20} />
                </div>
                <div>
                  <h4>Wagered NIM Escrow</h4>
                  <p>
                    Stake 10 to 500 NIM per match. Winner automatically claims
                    100% of the pot on-chain.
                  </p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Zap size={20} />
                </div>
                <div>
                  <h4>Tactical AI Engine</h4>
                  <p>
                    Practice against an intelligent heuristic bot that detects
                    tactical forks and blocks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
