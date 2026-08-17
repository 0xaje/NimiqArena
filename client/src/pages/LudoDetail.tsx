import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Gamepad2,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function LudoDetail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
  const createChallenge = trpc.match.createChallenge.useMutation();
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
  } | null>(null);

  const game = gameQuery.data;
  const user = authQuery.data;

  const copyCode = async () => {
    if (!createdMatch) return;
    await navigator.clipboard?.writeText(createdMatch.joinCode);
    toast("Invite code copied", {
      description: "Share it with a friend or open /join in another window.",
    });
  };

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

  return (
    <div className="detail-page">
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
            <div className="detail-actions">
              <button
                className="primary-action"
                onClick={createMatch}
                disabled={
                  createChallenge.isPending || !game || game.status !== "active"
                }
              >
                <Users size={16} />{" "}
                {createChallenge.isPending
                  ? "Creating match…"
                  : "Challenge a friend"}
              </button>
              <Link className="text-action" href="/join">
                <Gamepad2 size={16} /> Join a friend's table
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Challenge Friend creates a real waiting match. It does not
                create an opponent or a game result.
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
