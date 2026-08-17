import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Coins,
  Flame,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PlayerProfile() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const user = authQuery.data;

  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug: "ludo-league" },
    { enabled: Boolean(user) }
  );
  const seasonQuery = trpc.season.getActive.useQuery();

  const [guestName, setGuestName] = useState("");
  const stats = statsQuery.data;
  const season = seasonQuery.data;
  const history = stats?.history ?? [];

  async function handleSwitchPlayer(name: string) {
    if (!name.trim()) return;
    try {
      const res = await guestLogin.mutateAsync({ name: name.trim() });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
      }
      await utils.auth.me.invalidate();
      await utils.auth.stats.invalidate();
      await utils.leaderboard.getTop.invalidate();
      toast.success(`Switched active player to ${name.trim()}`);
      setGuestName("");
    } catch (e) {
      toast.error("Failed to switch player");
    }
  }

  // Tier calculation based on Elo
  const rating = stats?.rating ?? 1000;
  const tier =
    rating >= 1400
      ? { name: "Grandmaster", color: "#e67e22", icon: "👑" }
      : rating >= 1200
        ? { name: "Diamond", color: "#9b59b6", icon: "💎" }
        : rating >= 1100
          ? { name: "Gold", color: "#f1c40f", icon: "🥇" }
          : rating >= 1000
            ? { name: "Challenger", color: "#3498db", icon: "⚔️" }
            : { name: "Contender", color: "#95a5a6", icon: "🛡️" };

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / PLAYER PROFILE</span>
        <span className="detail-state">
          {user ? `SIGNED IN: ${user.name || "GUEST"}` : "GUEST MODE"}
        </span>
      </header>

      <main className="detail-main profile-main">
        {/* Profile Card Header */}
        <section className="profile-hero-card">
          <div className="profile-identity">
            <div className="profile-avatar">
              {user ? (user.name || "P")[0].toUpperCase() : "?"}
            </div>
            <div className="profile-titles">
              <div className="profile-tier-badge" style={{ borderColor: tier.color }}>
                <span>{tier.icon}</span>
                <strong>{tier.name.toUpperCase()}</strong>
              </div>
              <h1>{user?.name || "Guest Player"}</h1>
              <p className="profile-sub">
                {user?.email || `OpenID: ${user?.openId || "Not signed in"}`}
              </p>
            </div>
          </div>

          <div className="profile-hero-actions">
            <div className="quick-switch">
              <input
                type="text"
                placeholder="Switch Player Name…"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSwitchPlayer(guestName);
                }}
              />
              <button
                className="switch-btn"
                onClick={() => handleSwitchPlayer(guestName)}
                disabled={!guestName.trim() || guestLogin.isPending}
              >
                Switch
              </button>
            </div>
            <div className="quick-players">
              <button
                className="pill-btn"
                onClick={() => handleSwitchPlayer("Alice")}
              >
                Alice
              </button>
              <button
                className="pill-btn"
                onClick={() => handleSwitchPlayer("Bob")}
              >
                Bob
              </button>
              <button
                className="pill-btn"
                onClick={() => handleSwitchPlayer("Champion Charlie")}
              >
                Charlie
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="profile-stats-grid">
          {/* Elo Rating Card */}
          <div className="stat-card elo-card">
            <span className="stat-label">CURRENT ELO RATING</span>
            <div className="stat-value-large">
              <strong>{stats?.rating ?? 1000}</strong>
              <span>ELO</span>
            </div>
            <p className="stat-sub">
              Season Rank: <strong>{stats?.rank ? `#${stats.rank}` : "Unranked"}</strong>
            </p>
          </div>

          {/* Win Rate Card */}
          <div className="stat-card">
            <span className="stat-label">WIN RATE & RECORD</span>
            <div className="stat-value-large">
              <strong>{stats?.winRate ?? 0}%</strong>
              <span className="record-inline">
                ({stats?.wins ?? 0}W - {stats?.losses ?? 0}L)
              </span>
            </div>
            <div className="stat-meter">
              <div
                className="stat-meter-fill"
                style={{ width: `${stats?.winRate ?? 0}%` }}
              />
            </div>
          </div>

          {/* Streak Card */}
          <div className="stat-card">
            <span className="stat-label">WIN STREAK</span>
            <div className="stat-value-large">
              <strong>{stats?.currentStreak ?? 0}</strong>
              <span>ACTIVE</span>
            </div>
            <p className="stat-sub">
              Best All-Time: <strong>{stats?.bestStreak ?? 0} Wins</strong>
            </p>
          </div>

          {/* Matches Played */}
          <div className="stat-card">
            <span className="stat-label">TOTAL MATCHES</span>
            <div className="stat-value-large">
              <strong>{stats?.matchesPlayed ?? 0}</strong>
              <span>PLAYED</span>
            </div>
            <p className="stat-sub">
              Active Season: <strong>{season?.name ?? "Season 1"}</strong>
            </p>
          </div>
        </section>

        {/* Rating History Section */}
        <section className="history-section">
          <div className="history-header">
            <div>
              <h2>Authoritative Rating History</h2>
              <p>
                Immutable match-by-match rating adjustments verified on the backend.
              </p>
            </div>
            <Link href="/leaderboard" className="view-leaderboard-link">
              <Trophy size={14} /> View Leaderboard <ChevronRight size={14} />
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <Swords size={40} />
              <h3>No Match History Yet</h3>
              <p>
                Play your first competitive Ludo match to record rating deltas and climb the standings!
              </p>
              <div className="history-actions">
                <Link href="/games/ludo-league" className="primary-action">
                  <Gamepad2 size={16} /> Challenge a Friend
                </Link>
                <Link href="/join" className="text-action">
                  <Users size={16} /> Join a Table
                </Link>
              </div>
            </div>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Match ID</th>
                    <th>Previous Rating</th>
                    <th>Change</th>
                    <th>New Rating</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id}>
                      <td className="outcome-cell">
                        <span
                          className={`outcome-badge ${
                            tx.outcome === "win"
                              ? "win"
                              : tx.outcome === "loss"
                                ? "loss"
                                : "abandoned"
                          }`}
                        >
                          {tx.outcome.toUpperCase()}
                        </span>
                      </td>
                      <td className="match-id-cell">
                        <Link href={`/matches/${tx.matchId}`} className="match-link">
                          {tx.matchId}
                        </Link>
                      </td>
                      <td className="rating-num">{tx.previousRating}</td>
                      <td
                        className={`delta-cell ${
                          tx.ratingChange > 0
                            ? "positive"
                            : tx.ratingChange < 0
                              ? "negative"
                              : "zero"
                        }`}
                      >
                        {tx.ratingChange > 0 ? `+${tx.ratingChange}` : tx.ratingChange}
                      </td>
                      <td className="rating-num bold">{tx.newRating}</td>
                      <td className="date-cell">
                        {new Date(tx.createdAt).toLocaleDateString()} at{" "}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer trust line */}
        <div className="trust-line">
          <ShieldCheck size={16} />
          <span>
            Ratings are server-authoritative and mathematically protected against client manipulation.
          </span>
        </div>
      </main>
    </div>
  );
}
