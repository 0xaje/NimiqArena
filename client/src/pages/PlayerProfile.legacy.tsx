import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Medal,
  RotateCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
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
import { ReferralCard } from "@/components/referral/ReferralCard";
import { useNimiqWallet } from "@/lib/useNimiqWallet";

export default function PlayerProfile() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const {
    address: walletAddress,
    balanceNim,
    balanceStatus,
    networkName,
    syncNimiqPayAccount,
    isLoadingBalance,
  } = useNimiqWallet();

  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug: "ludo-league" },
    { enabled: Boolean(user) }
  );
  const seasonQuery = trpc.season.getActive.useQuery();

  const stats = statsQuery.data;
  const season = seasonQuery.data;
  const history = stats?.history ?? [];

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

  const handleSyncWallet = async () => {
    try {
      const res = await syncNimiqPayAccount(4000);
      if (res) {
        toast.success("Nimiq Pay wallet synced!", { description: res });
      } else {
        toast.info("No Nimiq Pay host active or already synced.");
      }
    } catch {
      toast.error("Failed to sync wallet.");
    }
  };

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

      <main className="detail-main profile-main" style={{ maxWidth: "760px", margin: "0 auto", paddingBottom: "48px" }}>
        {/* Prestigious Profile Header Card */}
        <section
          style={{
            background: "var(--paper-bright)",
            border: "1px solid var(--rule)",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Avatar with Tier Halo */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: avatarPreset ? avatarPreset.bg : "linear-gradient(135deg, #EC9918 0%, #d4820a 100%)",
                border: `3px solid ${tier.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: `0 0 16px ${tier.color}40`,
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
                <span style={{ color: "#fff", fontWeight: 800 }}>{user ? (user.name || "P")[0].toUpperCase() : "?"}</span>
              )}
            </div>

            {/* Player Details & Tier */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    border: `1px solid ${tier.color}`,
                    color: tier.color,
                    fontSize: "11px",
                    fontWeight: 800,
                    fontFamily: "'IBM Plex Mono', monospace",
                    background: `${tier.color}15`,
                  }}
                >
                  <tier.Icon size={12} color={tier.color} />
                  <span>{tier.name.toUpperCase()}</span>
                </div>
                {user?.referralCode && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    @{user.referralCode}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "var(--ink)" }}>
                  {user?.name || "Player 1"}
                </h1>
                <button
                  onClick={() => setIsIdentityModalOpen(true)}
                  style={{
                    background: "rgba(236, 153, 24, 0.12)",
                    border: "1px solid rgba(236, 153, 24, 0.35)",
                    borderRadius: "6px",
                    color: "#EC9918",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Sparkles size={11} /> Edit Identity
                </button>
              </div>
            </div>
          </div>

          {/* Connected Wallet Capsule */}
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--rule)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Wallet size={14} color="#EC9918" />
              <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                {walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : (user?.address ? `${user.address.slice(0, 4)}…${user.address.slice(-4)}` : "No Wallet Linked")}
              </span>
              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>
                [{networkName.replace("Albatross", "")}]
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "#EC9918" }}>
                {balanceStatus === "unavailable"
                  ? "N/A"
                  : balanceStatus === "loading"
                    ? "…"
                    : balanceNim.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                NIM
              </span>
              <button
                type="button"
                onClick={handleSyncWallet}
                disabled={isLoadingBalance}
                title="Sync Nimiq Pay"
                style={{
                  background: "none",
                  border: "1px solid var(--rule)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "10px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  color: "var(--muted)",
                }}
              >
                <RotateCw size={10} className={isLoadingBalance ? "spin" : ""} /> Sync
              </button>
            </div>
          </div>
        </section>

        {/* 2. Interactive Mobile Stats Grid (2x2) */}
        <section className="profile-stats-mobile">
          <div className="profile-stat-tile">
            <span className="tile-label">CURRENT RATING</span>
            <div className="tile-value" style={{ color: tier.color }}>
              {stats?.rating ?? 1000} <span style={{ fontSize: "12px", fontWeight: 600 }}>ELO</span>
            </div>
            <span className="tile-sub">
              Season: {stats?.rank ? `#${stats.rank}` : "Unranked"}
            </span>
          </div>

          <div className="profile-stat-tile">
            <span className="tile-label">WIN RATE &amp; RECORD</span>
            <div className="tile-value" style={{ color: "#10b981" }}>
              {stats?.winRate ?? 0}%
            </div>
            <span className="tile-sub">
              {stats?.wins ?? 0}W - {stats?.losses ?? 0}L
            </span>
          </div>

          <div className="profile-stat-tile">
            <span className="tile-label">WIN STREAK</span>
            <div className="tile-value" style={{ color: "#f97316", display: "flex", alignItems: "center", gap: "4px" }}>
              <Flame size={18} /> {stats?.currentStreak ?? 0}
            </div>
            <span className="tile-sub">
              Best All-Time: {stats?.bestStreak ?? 0} Wins
            </span>
          </div>

          <div className="profile-stat-tile">
            <span className="tile-label">TOTAL MATCHES</span>
            <div className="tile-value">
              {stats?.matchesPlayed ?? 0}
            </div>
            <span className="tile-sub">
              {season?.name ?? "Season 1: Genesis"}
            </span>
          </div>
        </section>

        {/* 3. Proactive Game Launcher */}
        <section style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
            Quick Challenge
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Link
              href="/games/ludo-league"
              style={{
                textDecoration: "none",
                background: "var(--paper-bright)",
                border: "1px solid var(--rule)",
                borderRadius: "12px",
                padding: "14px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(242, 106, 61, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--orange)",
                  flexShrink: 0,
                }}
              >
                <Gamepad2 size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Ludo League
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>2-4 Players</span>
              </div>
            </Link>

            <Link
              href="/games/connect-four"
              style={{
                textDecoration: "none",
                background: "var(--paper-bright)",
                border: "1px solid var(--rule)",
                borderRadius: "12px",
                padding: "14px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(236, 153, 24, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#EC9918",
                  flexShrink: 0,
                }}
              >
                <Zap size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "13px", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Connect NIM
                </strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>1v1 Tactical</span>
              </div>
            </Link>
          </div>
        </section>

        {/* 4. Welcome Bonus Banner (if not claimed) */}
        {!(user as any)?.welcomeClaimed && (
          <section
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "#16191f",
              border: "1px solid rgba(236, 153, 24, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Gift size={24} color="#EC9918" />
              <div>
                <strong style={{ color: "#fff", fontSize: "14px", display: "block" }}>Claim 1,000 Welcome Points</strong>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>Unlock tournament access &amp; rewards</span>
              </div>
            </div>
            <button
              onClick={handleClaimWelcome}
              disabled={claimRewardMutation.isPending}
              style={{
                background: "#EC9918",
                color: "#111",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {claimRewardMutation.isPending ? "Claiming…" : "Claim Now"}
            </button>
          </section>
        )}

        {/* 5. Viral Referral & Earnings Section */}
        <section style={{ marginBottom: "20px" }}>
          <ReferralCard />
        </section>

        {/* 6. Rating & Match History Section */}
        <section className="history-section" style={{ marginTop: "24px" }}>
          <div className="history-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h2 style={{ fontSize: "16px", margin: 0, color: "var(--ink)" }}>Match History</h2>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                Verified on-chain match adjustments
              </p>
            </div>
            <Link href="/leaderboard" className="view-leaderboard-link" style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Trophy size={13} /> Standings <ChevronRight size={13} />
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="empty-history" style={{ padding: "32px 16px", textAlign: "center", background: "var(--paper-bright)", borderRadius: "14px", border: "1px solid var(--rule)" }}>
              <Swords size={32} color="var(--muted)" style={{ marginBottom: "8px" }} />
              <h3 style={{ fontSize: "15px", margin: "0 0 4px" }}>No Matches Played Yet</h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 16px" }}>
                Play a competitive match to establish your Elo rating and record on-chain matches.
              </p>
              <Link href="/games/ludo-league" className="primary-action" style={{ fontSize: "13px", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Gamepad2 size={15} /> Play First Match
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="history-table-wrap desktop-only">
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
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile History Cards */}
              <div className="history-mobile-cards mobile-only">
                {history.map((tx) => (
                  <div key={tx.id} className="history-mobile-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className={`outcome-badge ${
                          tx.outcome === "win" ? "win" : tx.outcome === "loss" ? "loss" : "abandoned"
                        }`}
                        style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px" }}
                      >
                        {tx.outcome.toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>
                          Match {tx.matchId.slice(0, 8)}…
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "14px",
                          fontFamily: "'IBM Plex Mono', monospace",
                          color: tx.ratingChange > 0 ? "#10b981" : tx.ratingChange < 0 ? "#ef4444" : "var(--ink)",
                        }}
                      >
                        {tx.ratingChange > 0 ? `+${tx.ratingChange}` : tx.ratingChange} ELO
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                        New: {tx.newRating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Footer trust */}
        <div className="trust-line" style={{ marginTop: "28px", justifyContent: "center" }}>
          <ShieldCheck size={15} />
          <span>Ratings and tournament records are server-authoritative and protected on Nimiq blockchain.</span>
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
