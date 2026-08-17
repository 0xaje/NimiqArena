import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createPaymentNonce, type PaymentPhase } from "@/lib/payment-state";
import { init } from "@nimiq/mini-app-sdk";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Coins,
  Gamepad2,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type ProviderState = "checking" | "ready" | "browser" | "error";

type GameCard = {
  title: string;
  genre: string;
  status: "FEATURED" | "COMING SOON" | "CONCEPT" | "UNAVAILABLE";
  image: string;
  accent: string;
  description: string;
};

const futureGames: GameCard[] = [
  {
    title: "Arena Blitz",
    genre: "ARCADE / DUEL",
    status: "COMING SOON",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85",
    accent: "blue",
    description: "A future round-based format. No playable build exists yet.",
  },
  {
    title: "Hex Relay",
    genre: "TACTICS / TURN-BASED",
    status: "CONCEPT",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=85",
    accent: "green",
    description:
      "A planning game concept. Rules and implementation are not available yet.",
  },
];

function formatAddress(address: string) {
  return address.length > 14
    ? `${address.slice(0, 7)}…${address.slice(-5)}`
    : address;
}

function providerError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value))
    return null;
  const error = (value as { error?: { message?: unknown } }).error;
  return error && typeof error.message === "string"
    ? error.message
    : "Provider request failed.";
}

export default function Home() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const user = authQuery.data;
  const ludoQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
  const gameCards: GameCard[] = [
    {
      title: ludoQuery.data?.name ?? "Ludo League",
      genre: "STRATEGY / SOCIAL",
      status: ludoQuery.data ? "FEATURED" : "UNAVAILABLE",
      image:
        "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=900&q=85",
      accent: "orange",
      description:
        ludoQuery.data?.description ??
        "The real Ludo game record is unavailable right now.",
    },
    ...futureGames,
  ];
  const nimiqPromise = useRef<ReturnType<typeof init> | null>(null);
  const [providerState, setProviderState] = useState<ProviderState>("checking");
  const [providerMessage, setProviderMessage] = useState(
    "Waiting for Nimiq Pay to initialize the provider…"
  );
  const [address, setAddress] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [clientNonce, setClientNonce] = useState(createPaymentNonce);
  const createIntent = trpc.payment.createIntent.useMutation();
  const markConfirmationPending =
    trpc.payment.markConfirmationPending.useMutation();
  const failIntent = trpc.payment.failIntent.useMutation();
  const submitTransaction = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();

  const seasonQuery = trpc.season.getActive.useQuery();
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: "ludo-league",
  });
  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug: "ludo-league" },
    { enabled: Boolean(user) }
  );

  async function switchPlayer(name: string) {
    try {
      const res = await guestLogin.mutateAsync({ name });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
      }
      await utils.auth.me.invalidate();
      await utils.auth.stats.invalidate();
      await utils.leaderboard.getTop.invalidate();
      toast.success(`Signed in as ${name}`);
    } catch (e) {
      toast.error("Failed to switch player");
    }
  }

  useEffect(() => {
    setLanguage(
      window.nimiqPay?.language || navigator.language?.split("-")[0] || "en"
    );
    const promise = init({ timeout: 10_000 });
    nimiqPromise.current = promise;
    promise
      .then(() => {
        setProviderState("ready");
        setProviderMessage(
          "Nimiq Pay provider ready. Account access still requires your approval."
        );
      })
      .catch((error: unknown) => {
        setProviderState("browser");
        setProviderMessage(
          error instanceof Error
            ? error.message
            : "Open this Mini App inside Nimiq Pay."
        );
      });
  }, []);

  const providerLabel = useMemo(
    () =>
      providerState === "ready"
        ? "PROVIDER READY"
        : providerState === "checking"
          ? "CHECKING PROVIDER"
          : providerState === "error"
            ? "PROVIDER ERROR"
            : "BROWSER PREVIEW",
    [providerState]
  );

  async function connectWallet() {
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Wallet connection is not available in this preview", {
        description:
          "Open the Mini App inside Nimiq Pay to request a real account approval.",
      });
      return;
    }
    try {
      const nimiq = await nimiqPromise.current;
      const result = await nimiq.listAccounts();
      const error = providerError(result);
      if (error) throw new Error(error);
      const accounts = result as string[];
      if (!accounts.length) throw new Error("No Nimiq account was returned.");
      setAddress(accounts[0]);
      toast.success("Nimiq account connected", {
        description: formatAddress(accounts[0]),
      });
    } catch (error) {
      setProviderState("error");
      setProviderMessage(
        error instanceof Error
          ? error.message
          : "The wallet request was not completed."
      );
      toast.error("Wallet request was not completed");
    }
  }

  async function payEntry() {
    if (
      paymentPhase === "creating" ||
      paymentPhase === "confirming" ||
      paymentPhase === "submitted" ||
      paymentPhase === "verifying"
    )
      return;
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Nimiq Pay is required for payment", {
        description:
          "Open Arena inside Nimiq Pay to receive the native confirmation dialog.",
      });
      return;
    }
    let intent: { id: string; recipient: string; valueLuna: number } | null =
      null;
    try {
      setPaymentPhase("creating");
      intent = await createIntent.mutateAsync({ clientNonce });
      await markConfirmationPending.mutateAsync({ id: intent.id });
      setPaymentPhase("confirming");
      const nimiq = await nimiqPromise.current;
      const result = await nimiq.sendBasicTransaction({
        recipient: intent.recipient,
        value: intent.valueLuna,
      });
      const error = providerError(result);
      if (error) throw new Error(error);
      await submitTransaction.mutateAsync({
        id: intent.id,
        transactionHash: result as string,
      });
      setPaymentPhase("verifying");
      toast("Transaction submitted", {
        description:
          "Authoritative server verifier is checking the Nimiq blockchain...",
      });

      const verifyResult = await verifyPayment.mutateAsync({ id: intent.id });
      if (verifyResult.success) {
        setPaymentPhase("verified");
        toast.success("Payment Verified On-Chain!", {
          description: `Transaction confirmed on Nimiq network. Block ${verifyResult.intent.blockNumber ?? "latest"}.`,
        });
      } else {
        setPaymentPhase(verifyResult.intent.status as PaymentPhase);
        toast.error(`Verification Rejected: ${verifyResult.intent.status}`, {
          description:
            verifyResult.errorMessage || "Server rejected transaction.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The Nimiq payment request was not completed.";
      const isExpired = /expired/i.test(message);
      const code = /denied|reject|cancel/i.test(message)
        ? "permission_denied"
        : /invalid|malformed/i.test(message)
          ? "invalid_transaction"
          : "provider_error";
      if (intent) {
        try {
          await failIntent.mutateAsync({ id: intent.id, code });
        } catch {
          /* preserve original provider failure */
        }
      }
      setPaymentPhase(
        isExpired
          ? "expired"
          : code === "permission_denied"
            ? "rejected"
            : "failed"
      );
      setClientNonce(createPaymentNonce());
      toast(
        isExpired
          ? "Payment intent expired"
          : code === "permission_denied"
            ? "Payment was rejected"
            : "Payment was not completed",
        {
          description: isExpired
            ? "A fresh intent will be created on your next attempt."
            : message,
        }
      );
    }
  }

  function unavailable(feature: string) {
    toast(`${feature} is not implemented yet`, {
      description:
        "This control is visible for platform structure only; no simulated action was performed.",
    });
  }

  return (
    <div className="arena-app">
      <aside className={`arena-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup" aria-label="Nimiq Arena">
            <img
              src="/manus-storage/nimiq-arena-mark_d1d871ea.png"
              alt=""
              className="brand-mark"
            />
            <div>
              <span className="brand-overline">NIMIQ</span>
              <span className="brand-name">ARENA</span>
            </div>
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-kicker">THE GAME ROOM / 001</p>
        <nav className="side-nav" aria-label="Primary navigation">
          <a
            className="side-nav-link active"
            href="#featured"
            onClick={() => setMobileMenu(false)}
          >
            Discover <span>01</span>
          </a>
          <a
            className="side-nav-link"
            href="#games"
            onClick={() => setMobileMenu(false)}
          >
            Game library <span>03</span>
          </a>
          <Link
            className="side-nav-link"
            href="/games/ludo-league"
            onClick={() => setMobileMenu(false)}
          >
            Ludo League <span>PLAY</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/join"
            onClick={() => setMobileMenu(false)}
          >
            Join a friend <span>JOIN</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/leaderboard"
            onClick={() => setMobileMenu(false)}
          >
            Leaderboard <span>TOP</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/profile"
            onClick={() => setMobileMenu(false)}
          >
            Player Profile <span>STATS</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-status">
            <span
              className={`status-dot ${providerState === "ready" ? "ready" : ""}`}
            />
            <div>
              <strong>{providerLabel}</strong>
              <span>
                {providerState === "ready"
                  ? "Nimiq Pay detected"
                  : "Awaiting host wallet"}
              </span>
            </div>
          </div>
          <button
            className="language-button"
            onClick={() =>
              toast(`Nimiq Pay language: ${language.toUpperCase()}`)
            }
          >
            <span>Language</span>
            <strong>{language.toUpperCase()}</strong>
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-hidden="true"
        />
      )}

      <main className="arena-main">
        <header className="topbar">
          <button
            className="icon-button mobile-trigger"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-brand">
            <span className="topbar-kicker">NIMIQ ARENA</span>
            <span className="topbar-title">
              A place to play, meet, and compete.
            </span>
          </div>
          <div className="top-actions">
            <button
              className="search-button"
              onClick={() =>
                switchPlayer(
                  user?.name?.includes("1")
                    ? "Player 2 (Guest)"
                    : "Player 1 (Host)"
                )
              }
              title="Switch between Player 1 and Player 2 for two-client testing"
            >
              👤 {user?.name ? user.name : "Sign in as Player 1"}
            </button>
            <button className="wallet-button" onClick={connectWallet}>
              <WalletCards size={16} />{" "}
              {address ? formatAddress(address) : "Connect wallet"}
            </button>
          </div>
        </header>

        <section className="platform-intro" id="featured">
          <div className="intro-copy">
            <div className="stamp-row">
              <span className="stamp orange">SEASON 01</span>
              <span className="stamp">OPENING TABLES</span>
            </div>
            <p className="eyebrow">A NIM-POWERED GAME ROOM</p>
            <h1>
              Find your next
              <br />
              <em>favorite game.</em>
            </h1>
            <p className="hero-dek">
              Nimiq Arena is a growing home for games with real ownership,
              honest competition, and room for more than one kind of player.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" href="/games/ludo-league">
                Play Ludo League <ArrowUpRight size={17} />
              </Link>
              <Link className="text-action" href="/join">
                Join a friend's table <ChevronRight size={16} />
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Live players, balances, and match results appear only when
                verified systems are connected.
              </span>
            </div>
          </div>
          <div className="feature-stage">
            <div className="feature-art">
              <img src={gameCards[0].image} alt="Ludo table preview" />
              <div className="feature-wash" />
              <div className="feature-copy">
                <span className="card-label">01 / FEATURED GAME</span>
                <h2>
                  {ludoQuery.data?.name ?? "Ludo"}
                  <br />
                  <em>League</em>
                </h2>
                <p>Strategy, luck, and the long way around.</p>
                <Link className="stage-button" href="/games/ludo-league">
                  <Gamepad2 size={15} /> View game
                </Link>
              </div>
              <span className="feature-chip">FEATURED / NOT LIVE</span>
            </div>
            <div className="feature-footer">
              <span>
                <Zap size={13} /> FIRST ON THE TABLE
              </span>
              <span>STRATEGY / SOCIAL</span>
            </div>
          </div>
        </section>

        <section className="section-block" id="games">
          <div className="section-topline">
            <div>
              <p className="eyebrow">THE ARENA INDEX</p>
              <h2>
                Pick a room.
                <br />
                <em>Stay for the games.</em>
              </h2>
            </div>
            <button
              className="browse-link"
              onClick={() => unavailable("Full game library")}
            >
              <span>View all games</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="game-grid">
            {gameCards.map((game, index) => (
              <article
                className={`game-card ${game.status === "FEATURED" ? "featured-card" : ""}`}
                key={game.title}
              >
                <div className={`game-card-art ${game.accent}`}>
                  <img src={game.image} alt="" />
                  <div className="game-card-shade" />
                  <span className="game-status">{game.status}</span>
                  <span className="game-index">0{index + 1}</span>
                </div>
                <div className="game-card-body">
                  <div>
                    <span className="card-label">{game.genre}</span>
                    <h3>{game.title}</h3>
                  </div>
                  <button
                    className="round-arrow"
                    onClick={() =>
                      game.status === "FEATURED"
                        ? (window.location.href = "/games/ludo-league")
                        : unavailable(game.title)
                    }
                    aria-label={`Open ${game.title}`}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                  <p>{game.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="arena-rails">
          <div className="rail-card rail-dark">
            <span className="card-label">THE POINT OF THE ARENA</span>
            <h3>
              Play something
              <br />
              <em>worth coming back to.</em>
            </h3>
            <p>
              Games are the beginning. Community, progression, and fair
              competition are the long game.
            </p>
            <button
              className="rail-link"
              onClick={() => unavailable("Arena community")}
            >
              <Sparkles size={14} /> Explore the vision
            </button>
          </div>
          <div className="rail-card">
            <span className="card-label">NIMIQ PAY / LIVE STATUS</span>
            <div className="rail-status">
              <span
                className={`status-dot ${providerState === "ready" ? "ready" : ""}`}
              />
              <strong>{providerLabel}</strong>
            </div>
            <h3>
              {providerState === "ready"
                ? "Your wallet host is ready."
                : "The host wallet is not connected."}
            </h3>
            <p>{providerMessage}</p>
            <button className="rail-link" onClick={connectWallet}>
              <WalletCards size={14} />{" "}
              {address ? "Wallet connected" : "Connect a wallet"}
            </button>
          </div>
        </section>

        <section className="status-strip" id="status">
          <div className="section-marker">
            <span className="marker-number">03</span>
            <span>TRUTH PANEL</span>
          </div>
          <div className="status-card">
            <div className="status-icon">
              <Radio size={18} />
            </div>
            <div>
              <span className="card-label">NIMIQ PAY</span>
              <h2>
                {providerState === "ready"
                  ? "Provider is ready"
                  : "Wallet host not connected"}
              </h2>
              <p>{providerMessage}</p>
            </div>
            <span
              className={`state-chip ${providerState === "ready" ? "good" : "muted"}`}
            >
              {providerLabel}
            </span>
          </div>
          <div className="status-card payment-card">
            <div className="status-icon orange-icon">
              <Coins size={18} />
            </div>
            <div>
              <span className="card-label">NIM ENTRY</span>
              <h2>
                {paymentPhase === "submitted"
                  ? "Awaiting verification"
                  : paymentPhase === "confirming"
                    ? "Confirm in Nimiq Pay"
                    : paymentPhase === "rejected"
                      ? "Payment rejected"
                      : paymentPhase === "failed"
                        ? "Payment failed"
                        : paymentPhase === "expired"
                          ? "Intent expired"
                          : "Pay the entry"}
              </h2>
              <p>
                {paymentPhase === "submitted"
                  ? "Hash received. Arena has not credited anything until the server verifies it."
                  : "The amount and recipient come from a server-created intent."}
              </p>
              <button
                className="pay-entry-button"
                onClick={payEntry}
                disabled={
                  paymentPhase === "creating" ||
                  paymentPhase === "confirming" ||
                  paymentPhase === "submitted"
                }
              >
                {paymentPhase === "creating"
                  ? "Creating intent…"
                  : paymentPhase === "confirming"
                    ? "Waiting for approval…"
                    : paymentPhase === "submitted"
                      ? "Verification pending"
                      : "Pay with Nimiq Pay"}
              </button>
            </div>
            <span
              className={`state-chip ${paymentPhase === "submitted" ? "good" : "muted"}`}
            >
              {paymentPhase === "submitted"
                ? "SUBMITTED"
                : paymentPhase === "confirming"
                  ? "CONFIRMING"
                  : paymentPhase === "expired"
                    ? "EXPIRED"
                    : "NOT SETTLED"}
            </span>
          </div>
          <div className="status-card">
            <div className="status-icon">
              <Trophy size={18} />
            </div>
            <div>
              <span className="card-label">MULTIPLAYER</span>
              <h2>No rooms open</h2>
              <p>
                Real matchmaking and online players are not connected in this
                build.
              </p>
            </div>
            <span className="state-chip muted">NOT LIVE</span>
          </div>
        </section>

        {/* Real Leaderboard Section */}
        <section className="leaderboard-section" id="leaderboard">
          <div className="leaderboard-header">
            <div className="stamp-row">
              <span className="stamp orange">
                {seasonQuery.data?.name ?? "SEASON 01"}
              </span>
              <span className="stamp">
                {seasonQuery.data?.status?.toUpperCase() ?? "ACTIVE"}
              </span>
            </div>
            <p className="eyebrow">AUTHORITATIVE RANKINGS</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
              <h2>Leaderboard</h2>
              <Link href="/leaderboard" style={{ fontFamily: "IBM Plex Mono", fontSize: "11px", color: "var(--orange)", fontWeight: 600 }}>
                Open Full Standings Page →
              </Link>
            </div>
            <p className="section-note">
              Rankings are calculated directly from verified database match
              results using server-authoritative Elo rating. No simulated or
              fake users.
            </p>
          </div>

          <div className="leaderboard-card">
            {leaderboardQuery.isLoading ? (
              <div className="empty-state-box">
                <p>Loading authoritative leaderboard records…</p>
              </div>
            ) : leaderboardQuery.data && leaderboardQuery.data.length > 0 ? (
              <div className="leaderboard-table-container">
                <table className="arena-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Rating</th>
                      <th>Record</th>
                      <th>Win Rate</th>
                      <th>Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardQuery.data.map((entry: any) => (
                      <tr key={entry.userId}>
                        <td>
                          <span
                            className={`rank-badge ${entry.rank <= 3 ? `top-${entry.rank}` : ""}`}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td>
                          <strong>{entry.userName}</strong>
                        </td>
                        <td>
                          <span className="rating-pill">{entry.rating}</span>
                        </td>
                        <td>
                          {entry.wins}W - {entry.losses}L
                        </td>
                        <td>{entry.winRate}%</td>
                        <td>
                          {entry.currentStreak > 0 ? (
                            <span>🔥 {entry.currentStreak}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <Trophy size={28} />
                <p>
                  No competitive matches completed in this season yet.
                  <br />
                  Play a challenge match in <strong>Ludo League</strong> to
                  appear on the leaderboard!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Real Player Profile & Rating History Section */}
        <section className="profile-section" id="profile">
          <div className="profile-header">
            <span className="stamp orange">COMPETITIVE RECORD</span>
            <p className="eyebrow">YOUR ARENA PROFILE</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
              <h2>{user ? user.name || "Player Profile" : "Player Profile"}</h2>
              <Link href="/profile" style={{ fontFamily: "IBM Plex Mono", fontSize: "11px", color: "var(--orange)", fontWeight: 600 }}>
                Open Full Profile Page →
              </Link>
            </div>
            <p className="section-note">
              Real-time competitive metrics, win streaks, and persisted rating
              transaction history.
            </p>
          </div>

          <div className="profile-card">
            {user ? (
              <>
                <div className="stat-card-grid">
                  <div className="stat-card">
                    <span className="stat-label">Elo Rating</span>
                    <span className="stat-value">
                      {statsQuery.data?.rating ?? 1000}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Season Rank</span>
                    <span className="stat-value">
                      {statsQuery.data?.rank ? `#${statsQuery.data.rank}` : "—"}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Win / Loss</span>
                    <span className="stat-value">
                      {statsQuery.data?.wins ?? 0}W /{" "}
                      {statsQuery.data?.losses ?? 0}L
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">
                      {statsQuery.data?.winRate ?? 0}%
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Current Streak</span>
                    <span className="stat-value">
                      🔥 {statsQuery.data?.currentStreak ?? 0}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Matches Played</span>
                    <span className="stat-value">
                      {statsQuery.data?.matchesPlayed ?? 0}
                    </span>
                  </div>
                </div>

                <div className="history-section">
                  <span className="card-label">RATING HISTORY</span>
                  {statsQuery.data?.history &&
                  statsQuery.data.history.length > 0 ? (
                    <div className="leaderboard-table-container">
                      <table className="arena-table">
                        <thead>
                          <tr>
                            <th>Outcome</th>
                            <th>Opponent</th>
                            <th>Change</th>
                            <th>New Rating</th>
                            <th>Match ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsQuery.data.history.map((item: any) => (
                            <tr key={item.id}>
                              <td>
                                <strong>
                                  {item.outcome.replace("_", " ").toUpperCase()}
                                </strong>
                              </td>
                              <td>{item.opponentName}</td>
                              <td>
                                <span
                                  className={
                                    item.ratingChange >= 0
                                      ? "delta-pos"
                                      : "delta-neg"
                                  }
                                >
                                  {item.ratingChange >= 0
                                    ? `+${item.ratingChange}`
                                    : item.ratingChange}
                                </span>
                              </td>
                              <td>
                                <span className="rating-pill">
                                  {item.newRating}
                                </span>
                              </td>
                              <td>
                                <small>{item.matchId}</small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state-box">
                      <p>
                        No rating changes recorded yet. Play a match to build
                        your history!
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state-box">
                <p>
                  Sign in to view your real competitive profile and history.
                </p>
                <div style={{ marginTop: "14px" }}>
                  <button
                    className="primary-action"
                    onClick={() => switchPlayer("Player 1 (Host)")}
                  >
                    Sign in as Player 1
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="arena-footer">
          <div className="footer-mark">
            <img
              src="/manus-storage/nimiq-arena-mark_d1d871ea.png"
              alt=""
              className="footer-brand-mark"
            />
            <Sparkles size={15} />
            <span>THE GAME ROOM IS OPENING</span>
          </div>
          <span>Nimiq Arena / Multi-game platform foundation / 2026</span>
          <button onClick={() => unavailable("Terms and safeguards")}>
            <ShieldCheck size={14} /> Safeguards <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
    </div>
  );
}
