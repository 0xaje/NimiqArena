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
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";

export default function LudoDetail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
  } | null>(null);
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isEntryFlowOpen, setIsEntryFlowOpen] = useState(false);
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
        gameSlug="ludo-league"
      />

      <LudoEntryFlowModal
        isOpen={isEntryFlowOpen || isStakeModalOpen}
        onClose={() => {
          setIsEntryFlowOpen(false);
          setIsStakeModalOpen(false);
        }}
      />

      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / GAME 001</span>
        <span className="detail-state">
          {user ? `PLAYING AS: ${user.name || "PLAYER 1"}` : "GUEST MODE"}
        </span>
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
                disabled={!game || game.status !== "active"}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.4)",
                  padding: "14px 24px",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Gamepad2 size={18} /> PLAY LUDO LEAGUE
              </button>
              <button
                className="secondary-chip"
                onClick={handleStartSoloPractice}
                disabled={createSolo.isPending || !game || game.status !== "active"}
                style={{ padding: "12px 18px" }}
              >
                🤖 {createSolo.isPending ? "Starting…" : "Free Practice (vs AI)"}
              </button>
              <button
                className="secondary-chip"
                onClick={handleOpenQuickMatch}
                disabled={!game || game.status !== "active"}
                style={{ padding: "12px 18px" }}
              >
                <Zap size={16} /> Quick Match
              </button>
              <Link className="text-action" href="/join" style={{ padding: "12px 16px" }}>
                <Coins size={16} /> Enter Match Code
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Quick Match automatically matches you with an online opponent of similar Elo rating.
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

        <section className="detail-grid">
          <article className="detail-panel">
            <span className="card-label">MATCH CREATION</span>
            <h2>Start a private table.</h2>
            <p>
              Challenge Friend creates the match on the backend and returns a
              unique match ID and invite code. Joining a friend, turn execution,
              and reconnection are separate dependencies and remain unavailable
              until implemented.
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
