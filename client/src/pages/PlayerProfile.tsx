import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Medal,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
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
import {
  AVATAR_PRESETS,
  IdentityRegistrationModal,
} from "@/components/profile/IdentityRegistrationModal";

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
      ? { name: "Grandmaster", color: "#e67e22", Icon: Crown }
      : rating >= 1200
        ? { name: "Diamond", color: "#9b59b6", Icon: Gem }
        : rating >= 1100
          ? { name: "Gold", color: "#f1c40f", Icon: Medal }
          : rating >= 1000
            ? { name: "Challenger", color: "#3498db", Icon: Swords }
            : { name: "Contender", color: "#95a5a6", Icon: Shield };

  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const claimRewardMutation = trpc.auth.claimWelcomeReward.useMutation();
  const referralStatsQuery = trpc.auth.getReferralStats.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const avatarPreset = AVATAR_PRESETS.find((p) => p.id === (user as any)?.avatar);
  const isCustomAvatar = (user as any)?.avatar && (user as any)?.avatar.startsWith("http");

  async function handleClaimWelcome() {
    try {
      const res = await claimRewardMutation.mutateAsync();
      await utils.auth.me.invalidate();
      await utils.auth.getReferralStats.invalidate();
      toast.success("Welcome Gift Claimed!", {
        description: res.message || "+1,000 Arena Points added to your balance!",
      });
    } catch (err) {
      toast.error("Claim failed", {
        description: err instanceof Error ? err.message : "Try again later",
      });
    }
  }

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
            <div
              className="profile-avatar"
              style={{
                background: avatarPreset ? avatarPreset.bg : "linear-gradient(135deg, #EC9918 0%, #d4820a 100%)",
                border: "2px solid #EC9918",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                overflow: "hidden",
              }}
            >
              {isCustomAvatar ? (
                <img
                  src={(user as any).avatar}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : avatarPreset ? (
                <span>{avatarPreset.icon}</span>
              ) : (
                <span>{user ? (user.name || "P")[0].toUpperCase() : "?"}</span>
              )}
            </div>
            <div className="profile-titles">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div className="profile-tier-badge" style={{ borderColor: tier.color, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <tier.Icon size={14} color={tier.color} />
                  <strong>{tier.name.toUpperCase()}</strong>
                </div>
                {user?.address && (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(236, 153, 24, 0.12)",
                      border: "1px solid rgba(236, 153, 24, 0.3)",
                      color: "#EC9918",
                      fontFamily: "monospace",
                    }}
                  >
                    {user.address.slice(0, 10)}...{user.address.slice(-6)}
                  </span>
                )}
              </div>
              <h1 style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                {user?.name || "Guest Player"}
                <button
                  onClick={() => setIsIdentityModalOpen(true)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#EC9918",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Sparkles size={12} /> Edit Identity
                </button>
              </h1>
              <p className="profile-sub">
                {user?.referralCode ? `Referral Handle: @${user.referralCode}` : "Web3 Player Identity"}
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

        {/* Dedicated Welcome Claim & Rewards Section */}
        <section
          style={{
            margin: "20px 0",
            padding: "20px 24px",
            borderRadius: "16px",
            backgroundColor: "#16191f",
            border: "1px solid rgba(236, 153, 24, 0.35)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(236, 153, 24, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                backgroundColor: "rgba(236, 153, 24, 0.15)",
                border: "1px solid rgba(236, 153, 24, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Gift size={24} color="#EC9918" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    color: "#EC9918",
                  }}
                >
                  WELCOME REWARD
                </span>
                {(user as any)?.welcomeClaimed && (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      fontWeight: 700,
                    }}
                  >
                    ✓ CLAIMED
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "4px 0 2px" }}>
                {(user as any)?.welcomeClaimed
                  ? "1,000 Points Welcome Gift Active"
                  : "Claim Your 1,000 Welcome Arena Points"}
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
                {(user as any)?.welcomeClaimed
                  ? `Your points balance is ${(user as any)?.points ?? 1000} pts (~$${(((user as any)?.points ?? 1000) / 100).toFixed(2)} USD).`
                  : "Join the arena, register your identity, and claim your welcome bonus instantly."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!(user as any)?.welcomeClaimed ? (
              <button
                onClick={handleClaimWelcome}
                disabled={claimRewardMutation.isPending}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  backgroundColor: "#EC9918",
                  border: "none",
                  color: "#111",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(236, 153, 24, 0.4)",
                  transition: "transform 0.15s ease",
                }}
              >
                <Gift size={16} />
                {claimRewardMutation.isPending ? "Claiming…" : "Claim +1,000 Points"}
              </button>
            ) : (
              <div
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#EC9918",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={14} /> {(user as any)?.points ?? 1000} Arena Points Active
                </span>
              </div>
            )}
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

      <IdentityRegistrationModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentName={user?.name}
        currentAvatar={(user as any)?.avatar}
        walletAddress={user?.address}
      />
    </div>
  );
}
