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
  Trophy,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { ActiveTablesDirectory } from "@/components/game/ActiveTablesDirectory";
import { TournamentCupModal } from "@/components/tournament/TournamentCupModal";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";

import { useNimiqWallet } from "@/lib/useNimiqWallet";

export default function LudoDetail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
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
  const [isEntryFlowOpen, setIsEntryFlowOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [selectedStake, setSelectedStake] = useState(50);

  const game = gameQuery.data ?? {
    id: "ludo-league",
    slug: "ludo-league",
    name: "Ludo League",
    kind: "ludo",
    status: "active",
    description: "Classic 2-player authoritative board game",
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
        console.warn("[LudoDetail] Nimiq auto-login fallback to guest:", e);
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
        gameSlug: "ludo-league",
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
      toast.info("Launching Practice Table vs Arena Bot…");
      const match = await createSolo.mutateAsync({ gameSlug: "ludo-league" });
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
        gameSlug: "ludo-league",
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
        gameSlug="ludo-league"
        gameTitle="Ludo League"
      />

      <LudoEntryFlowModal
        isOpen={isEntryFlowOpen || isStakeModalOpen}
        onClose={() => {
          setIsEntryFlowOpen(false);
          setIsStakeModalOpen(false);
        }}
      />
      <TournamentCupModal
        isOpen={isTournamentOpen}
        onClose={() => setIsTournamentOpen(false)}
      />

      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / GAME 001</span>
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
            <span className="stamp orange">STRATEGY / SOCIAL</span>
            <p className="eyebrow">GAME DETAIL / REAL RECORD</p>
            <h1>{game?.name ?? "Ludo League"}</h1>
            <p className="detail-lede">
              {game?.description ??
                "A server-authoritative Ludo game for real Arena matches."}
            </p>
            <div className="detail-actions" style={{ flexWrap: "wrap", gap: "12px" }}>
              <button
                className="primary-action"
                onClick={() => setIsEntryFlowOpen(true)}
                disabled={createSolo.isPending}
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
                <Gamepad2 size={18} /> PLAY LUDO LEAGUE
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
              <button
                className="secondary-chip"
                onClick={handleStartSoloPractice}
                disabled={createSolo.isPending}
                style={{
                  padding: "12px 18px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Bot size={16} /> {createSolo.isPending ? "Starting…" : "Practice"}
              </button>
              <button
                className="secondary-chip"
                onClick={() => setIsTournamentOpen(true)}
                style={{
                  padding: "12px 18px",
                  background: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  color: "#fbbf24",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Trophy size={16} /> 8-Player Cup
              </button>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Provably fair multiplayer matches on Nimiq PoS with on-chain escrow & instant replay.
              </span>
            </div>
          </div>
          <div className="detail-board">
            <img
              src="https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=1200&q=85"
              alt="Ludo game table preview"
            />
            <div className="detail-board-wash" />
            <span className="detail-board-label">LOBBY / WAITING ROOM</span>
            <strong>
              One table.
              <br />
              <em>Two real players.</em>
            </strong>
          </div>
        </section>

        {/* Live Active Tables Radar */}
        <div style={{ marginBottom: "32px" }}>
          <ActiveTablesDirectory />
        </div>

        <section className="detail-grid">
          <article className="detail-panel">
            <span className="card-label">MATCH CREATION</span>
            <h2>Start a private table.</h2>
            <p>
              Challenge Friend creates a private match on the server and generates a
              unique invite code. Send the code to your friend to join the table in real-time.
            </p>
            {createdMatch ? (
              <div className="match-created">
                <div>
                  <span className="card-label">REAL MATCH ID</span>
                  <strong>{createdMatch.id}</strong>
                </div>
                <div>
                  <span className="card-label">INVITE CODE</span>
                  <strong>{createdMatch.joinCode}</strong>
                </div>
                <button className="copy-code" onClick={copyCode}>
                  <Copy size={15} /> Copy code
                </button>
                <button
                  className="open-match"
                  onClick={() => navigate(`/matches/${createdMatch.id}`)}
                >
                  Open room <ArrowUpRight size={14} />
                </button>
              </div>
            ) : (
              <div className="availability-note">
                <LockKeyhole size={15} />
                <span>
                  Authentication is required before a match can be created.
                </span>
              </div>
            )}
          </article>
          <article className="detail-panel detail-panel-dark">
            <span className="card-label">WHAT IS REAL HERE</span>
            <ul className="detail-list">
              <li>
                <Check size={14} /> Game record comes from the database.
              </li>
              <li>
                <Check size={14} /> Match ID and code come from the backend.
              </li>
              <li>
                <Check size={14} /> Initial engine snapshot is persisted.
              </li>
              <li>
                <span className="unavailable-dot" /> Opponent, turns, and
                results are not live yet.
              </li>
            </ul>
          </article>
        </section>

        <section className="detail-specs">
          <div>
            <span className="card-label">ENGINE</span>
            <strong>ludo-v1</strong>
            <p>Deterministic shared rules module.</p>
          </div>
          <div>
            <span className="card-label">PLAYERS</span>
            <strong>2 planned</strong>
            <p>Match currently waits for a real join.</p>
          </div>
          <div>
            <span className="card-label">ENTRY / NIM</span>
            <strong>Not settled</strong>
            <p>Payment remains separate from match creation.</p>
          </div>
          <div>
            <span className="card-label">SAFETY</span>
            <strong>Server first</strong>
            <p>Client never owns authoritative state.</p>
          </div>
        </section>
      </main>
      <footer className="detail-footer">
        <span>
          <WalletCards size={14} /> Nimiq Pay status is still determined by the
          host app.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
