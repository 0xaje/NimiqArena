import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gem,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";

interface PatronLeader {
  rank: number;
  userId?: number;
  userName: string;
  stakedNim: number;
  tier: "Diamond Whale" | "Gold Patron" | "Silver Patron" | "Bronze Patron";
  tierColor: string;
  tierIcon: string;
  apy: number;
  perks: string;
  isCurrentUser?: boolean;
}

const BASE_PATRONS: Omit<PatronLeader, "rank">[] = [
  {
    userName: "NimiqWhale_01",
    stakedNim: 250_000,
    tier: "Diamond Whale",
    tierColor: "#38bdf8",
    tierIcon: "💎",
    apy: 8.0,
    perks: "First-Look Beta Access • Zero Table Fees • Diamond Spotlight",
  },
  {
    userName: "CryptoGladiator",
    stakedNim: 125_000,
    tier: "Diamond Whale",
    tierColor: "#38bdf8",
    tierIcon: "💎",
    apy: 8.0,
    perks: "VIP Invitational Pass • Diamond Badge • 8.0% APY",
  },
  {
    userName: "NIM_HODLer",
    stakedNim: 50_000,
    tier: "Gold Patron",
    tierColor: "#fbbf24",
    tierIcon: "🥇",
    apy: 7.0,
    perks: "Free Tournament Passes • Gold Halo • 7.0% APY",
  },
  {
    userName: "AlbatrossValidator",
    stakedNim: 35_000,
    tier: "Gold Patron",
    tierColor: "#fbbf24",
    tierIcon: "🥇",
    apy: 7.0,
    perks: "Gold Badge in Matches • Priority Alpha • 7.0% APY",
  },
  {
    userName: "ArenaChampion",
    stakedNim: 15_000,
    tier: "Silver Patron",
    tierColor: "#cbd5e1",
    tierIcon: "🥈",
    apy: 6.5,
    perks: "Match Fee Discount • Silver Badge • 6.5% APY",
  },
  {
    userName: "LudoTactician",
    stakedNim: 8_000,
    tier: "Silver Patron",
    tierColor: "#cbd5e1",
    tierIcon: "🥈",
    apy: 6.5,
    perks: "Silver Halo • 6.5% APY • Monthly Dividend",
  },
  {
    userName: "ConnectKing",
    stakedNim: 2_500,
    tier: "Bronze Patron",
    tierColor: "#f97316",
    tierIcon: "🥉",
    apy: 6.0,
    perks: "Verified Patron Badge • 6.0% APY",
  },
  {
    userName: "GenesisPlayer",
    stakedNim: 1_000,
    tier: "Bronze Patron",
    tierColor: "#f97316",
    tierIcon: "🥉",
    apy: 6.0,
    perks: "Verified Patron Badge • 6.0% APY",
  },
];

export default function Leaderboard() {
  const [activeTrack, setActiveTrack] = useState<"gladiators" | "patrons">("gladiators");
  const [selectedGame, setSelectedGame] = useState("ludo-league");
  const seasonQuery = trpc.season.getActive.useQuery();
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: selectedGame,
    limit: 50,
  });
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { nimToUsd, formatUsd } = useNimiqPrice();

  const season = seasonQuery.data;
  const standings = leaderboardQuery.data ?? [];
  const topThree = standings.slice(0, 3);
  const userStanding = user ? standings.find(s => s.userId === user.id) : null;

  // User's active stake from vault
  const [userStake, setUserStake] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nimiq_arena_patron_stake");
      if (saved) setUserStake(Number(saved) || 0);
    }
  }, []);

  // Construct Patrons list including current user if staked
  const patronsList: PatronLeader[] = (() => {
    let list = [...BASE_PATRONS];
    if (user && userStake > 0) {
      const userTier =
        userStake >= 100_000
          ? { tier: "Diamond Whale" as const, tierColor: "#38bdf8", tierIcon: "💎", apy: 8.0, perks: "VIP First-Look Access" }
          : userStake >= 25_000
            ? { tier: "Gold Patron" as const, tierColor: "#fbbf24", tierIcon: "🥇", apy: 7.0, perks: "Free Monthly Passes" }
            : userStake >= 5_000
              ? { tier: "Silver Patron" as const, tierColor: "#cbd5e1", tierIcon: "🥈", apy: 6.5, perks: "Match Fee Discount" }
              : { tier: "Bronze Patron" as const, tierColor: "#f97316", tierIcon: "🥉", apy: 6.0, perks: "Verified Patron Badge" };

      list.push({
        userName: user.name || "You (Player)",
        stakedNim: userStake,
        userId: user.id,
        isCurrentUser: true,
        ...userTier,
      });
    }

    // Sort descending by staked NIM
    list.sort((a, b) => b.stakedNim - a.stakedNim);
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  })();

  const topThreePatrons = patronsList.slice(0, 3);

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / LEADERBOARD</span>
        <span className="detail-state">
          {season ? `${season.name.toUpperCase()} (ACTIVE)` : "SEASON 1"}
        </span>
      </header>

      <main className="detail-main leaderboard-main">
        {/* Hero Section */}
        <section className="leaderboard-hero">
          <div className="leaderboard-hero-content">
            <div className="stamp-row">
              <span className="stamp orange">OFFICIAL STANDINGS</span>
              <span className="stamp">{activeTrack === "gladiators" ? "AUTHORITATIVE ELO" : "HIGH-ROLLER PATRONS"}</span>
              <span className="stamp green">
                {season ? season.name : "Season 1: Genesis"}
              </span>
            </div>
            <h1>Arena Leaderboard</h1>
            <p className="detail-lede">
              {activeTrack === "gladiators"
                ? "Official player rankings calculated authoritatively from completed, verified Arena matches. Ratings use competitive Elo (K=32) with seasonal tracking."
                : "Arena Patrons stake their NIM in the Vault, earning monthly revenue share dividends (~6.0% - 8.0% APY) from the 8% Builder fee and native PoS rewards, while holding VIP priority across tournaments and beta games."}
            </p>

            {/* Dual-Track Switcher */}
            <div
              style={{
                display: "flex",
                width: "100%",
                maxWidth: "460px",
                gap: "6px",
                marginTop: "16px",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "4px",
                borderRadius: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTrack("gladiators")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: activeTrack === "gladiators" ? "var(--orange)" : "transparent",
                  color: activeTrack === "gladiators" ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
                  fontWeight: 700,
                  fontSize: "12px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Trophy size={14} /> GLADIATORS
              </button>
              <button
                type="button"
                onClick={() => setActiveTrack("patrons")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: activeTrack === "patrons" ? "1px solid rgba(251, 191, 36, 0.6)" : "1px solid transparent",
                  cursor: "pointer",
                  background: activeTrack === "patrons" ? "rgba(245, 158, 11, 0.25)" : "transparent",
                  color: activeTrack === "patrons" ? "#fbbf24" : "rgba(255, 255, 255, 0.65)",
                  fontWeight: 700,
                  fontSize: "12px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <Gem size={14} /> PATRONS
              </button>
            </div>
          </div>

          {activeTrack === "gladiators" && (
            <div className="leaderboard-controls">
              <div className="game-selector">
                <button
                  className={`tab-btn ${selectedGame === "ludo-league" ? "active" : ""}`}
                  onClick={() => setSelectedGame("ludo-league")}
                >
                  Ludo League
                </button>
                <button
                  className={`tab-btn ${selectedGame === "connect-four" ? "active" : ""}`}
                  onClick={() => setSelectedGame("connect-four")}
                >
                  Connect NIM
                </button>
              </div>
              <button
                className="refresh-btn"
                onClick={() => {
                  leaderboardQuery.refetch();
                  toast.success("Leaderboard refreshed");
                }}
                disabled={leaderboardQuery.isFetching}
              >
                <RefreshCw
                  size={14}
                  className={leaderboardQuery.isFetching ? "animate-spin" : ""}
                />
                {leaderboardQuery.isFetching ? "Updating…" : "Refresh"}
              </button>
            </div>
          )}
        </section>

        {/* TRACK 1: GLADIATORS (COMPETITIVE ELO) */}
        {activeTrack === "gladiators" && (
          <>
            {/* Podium for Top 3 */}
            {topThree.length > 0 && (
              <section className="podium-section">
                <div className="podium-grid">
                  {/* Rank 2 - Silver */}
                  {topThree[1] ? (
                    <div className="podium-card silver">
                      <div className="podium-medal">
                        <Medal size={28} />
                        <span className="podium-rank">2</span>
                      </div>
                      <div className="podium-avatar">
                        {(topThree[1].userName || "Player")[0].toUpperCase()}
                      </div>
                      <h3 className="podium-name">{topThree[1].userName || "Player"}</h3>
                      <div className="podium-rating">
                        <strong>{topThree[1].rating}</strong>
                        <span>ELO</span>
                      </div>
                      <div className="podium-stats">
                        <span>{topThree[1].wins}W / {topThree[1].losses}L</span>
                        <span>{topThree[1].winRate}% WR</span>
                      </div>
                    </div>
                  ) : (
                    <div className="podium-card silver empty">
                      <div className="podium-rank">2</div>
                      <p>Spot Open</p>
                    </div>
                  )}

                  {/* Rank 1 - Gold */}
                  {topThree[0] && (
                    <div className="podium-card gold">
                      <div className="podium-crown">
                        <Crown size={32} />
                      </div>
                      <div className="podium-medal">
                        <Medal size={32} />
                        <span className="podium-rank">1</span>
                      </div>
                      <div className="podium-avatar champ">
                        {(topThree[0].userName || "Player")[0].toUpperCase()}
                      </div>
                      <h3 className="podium-name">{topThree[0].userName || "Player"}</h3>
                      <div className="podium-rating">
                        <strong>{topThree[0].rating}</strong>
                        <span>ELO</span>
                      </div>
                      <div className="podium-stats">
                        <span>{topThree[0].wins}W / {topThree[0].losses}L</span>
                        <span>{topThree[0].winRate}% WR</span>
                      </div>
                      {topThree[0].currentStreak > 1 && (
                        <div className="podium-streak">
                          <Flame size={12} /> {topThree[0].currentStreak} Win Streak
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rank 3 - Bronze */}
                  {topThree[2] ? (
                    <div className="podium-card bronze">
                      <div className="podium-medal">
                        <Medal size={28} />
                        <span className="podium-rank">3</span>
                      </div>
                      <div className="podium-avatar">
                        {(topThree[2].userName || "Player")[0].toUpperCase()}
                      </div>
                      <h3 className="podium-name">{topThree[2].userName || "Player"}</h3>
                      <div className="podium-rating">
                        <strong>{topThree[2].rating}</strong>
                        <span>ELO</span>
                      </div>
                      <div className="podium-stats">
                        <span>{topThree[2].wins}W / {topThree[2].losses}L</span>
                        <span>{topThree[2].winRate}% WR</span>
                      </div>
                    </div>
                  ) : (
                    <div className="podium-card bronze empty">
                      <div className="podium-rank">3</div>
                      <p>Spot Open</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Full Gladiators Table */}
            <section className="standings-section">
              <div className="standings-header">
                <h2>Season Standings</h2>
                <span className="standings-count">{standings.length} Players Ranked</span>
              </div>

              {standings.length === 0 ? (
                <div className="empty-standings">
                  <Trophy size={48} />
                  <h3>No Matches Settled Yet</h3>
                  <p>
                    Complete your first authoritative Arena match to establish official season rankings!
                  </p>
                  <Link href={`/games/${selectedGame}`} className="primary-action">
                    Play Now
                  </Link>
                </div>
              ) : (
                <>
                  <div className="standings-table-wrap desktop-only">
                    <table className="standings-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player</th>
                          <th>Rating</th>
                          <th>Record (W-L)</th>
                          <th>Win Rate</th>
                          <th>Current Streak</th>
                          <th>Best Streak</th>
                          <th>Matches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map(player => {
                          const isCurrentUser = user && user.id === player.userId;
                          return (
                            <tr
                              key={player.userId}
                              className={isCurrentUser ? "current-user-row" : ""}
                            >
                              <td className="rank-cell">
                                <span
                                  className={`rank-badge ${
                                    player.rank === 1
                                      ? "gold"
                                      : player.rank === 2
                                        ? "silver"
                                        : player.rank === 3
                                          ? "bronze"
                                          : ""
                                  }`}
                                >
                                  #{player.rank}
                                </span>
                              </td>
                              <td className="player-cell">
                                <div className="player-meta">
                                  <span className="avatar-mini">
                                    {(player.userName || "P")[0].toUpperCase()}
                                  </span>
                                  <strong>
                                    {player.userName || `Player ${player.userId}`}
                                    {isCurrentUser && (
                                      <span className="you-pill">YOU</span>
                                    )}
                                  </strong>
                                </div>
                              </td>
                              <td className="rating-cell">
                                <strong>{player.rating}</strong>
                              </td>
                              <td className="record-cell">
                                <span className="wins">{player.wins}W</span>
                                <span className="sep">-</span>
                                <span className="losses">{player.losses}L</span>
                              </td>
                              <td className="wr-cell">
                                <div className="wr-bar-wrap">
                                  <div
                                    className="wr-bar"
                                    style={{ width: `${player.winRate}%` }}
                                  />
                                </div>
                                <span>{player.winRate}%</span>
                              </td>
                              <td className="streak-cell">
                                {player.currentStreak > 0 ? (
                                  <span className="streak-badge fire">
                                    <Flame size={12} /> {player.currentStreak}W
                                  </span>
                                ) : (
                                  <span className="streak-badge">-</span>
                                )}
                              </td>
                              <td className="streak-cell">{player.bestStreak}W</td>
                              <td className="matches-cell">{player.matchesPlayed}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Standings Card List */}
                  <div className="standings-mobile-cards mobile-only">
                    {standings.map(player => {
                      const isCurrentUser = user && user.id === player.userId;
                      return (
                        <div
                          key={player.userId}
                          className={`leaderboard-mobile-card ${isCurrentUser ? "current-user-card" : ""}`}
                        >
                          <div
                            className={`player-rank-chip ${
                              player.rank === 1
                                ? "gold"
                                : player.rank === 2
                                  ? "silver"
                                  : player.rank === 3
                                    ? "bronze"
                                    : ""
                            }`}
                          >
                            #{player.rank}
                          </div>

                          <div className="player-info">
                            <div className="player-header-row">
                              <span className="avatar-mini" style={{ width: 22, height: 22, fontSize: 11 }}>
                                {(player.userName || "P")[0].toUpperCase()}
                              </span>
                              <span className="player-name">
                                {player.userName || `Player ${player.userId}`}
                              </span>
                              {isCurrentUser && <span className="you-pill">YOU</span>}
                            </div>
                            <div className="player-stats-sub">
                              <span>{player.wins}W - {player.losses}L</span>
                              <span>•</span>
                              <span>{player.winRate}% WR</span>
                              {player.currentStreak > 1 && (
                                <>
                                  <span>•</span>
                                  <span className="streak-chip">
                                    <Flame size={10} /> {player.currentStreak}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="player-score-col">
                            <span className="elo-badge">{player.rating} ELO</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* TRACK 2: ARENA PATRONS (STAKERS & VIPS) */}
        {activeTrack === "patrons" && (
          <>
            {/* Patrons Podium */}
            <section className="podium-section">
              <div className="podium-grid">
                {/* Rank 2 - Silver/Gold */}
                {topThreePatrons[1] && (
                  <div className="podium-card silver">
                    <div className="podium-medal">
                      <Medal size={28} />
                      <span className="podium-rank">2</span>
                    </div>
                    <div className="podium-avatar">
                      {topThreePatrons[1].userName[0].toUpperCase()}
                    </div>
                    <h3 className="podium-name">
                      {topThreePatrons[1].userName}
                    </h3>
                    <div className="podium-rating">
                      <strong style={{ color: topThreePatrons[1].tierColor }}>
                        {formatNim(topThreePatrons[1].stakedNim)}
                      </strong>
                      <span>NIM STAKED</span>
                    </div>
                    <div className="podium-stats">
                      <span>{topThreePatrons[1].tierIcon} {topThreePatrons[1].tier}</span>
                      <span>{topThreePatrons[1].apy}% APY</span>
                    </div>
                  </div>
                )}

                {/* Rank 1 - Diamond Whale */}
                {topThreePatrons[0] && (
                  <div className="podium-card gold">
                    <div className="podium-crown">
                      <Crown size={32} />
                    </div>
                    <div className="podium-medal">
                      <Medal size={32} />
                      <span className="podium-rank">1</span>
                    </div>
                    <div className="podium-avatar champ">
                      {topThreePatrons[0].userName[0].toUpperCase()}
                    </div>
                    <h3 className="podium-name">
                      {topThreePatrons[0].userName}
                    </h3>
                    <div className="podium-rating">
                      <strong style={{ color: "#38bdf8" }}>
                        {formatNim(topThreePatrons[0].stakedNim)}
                      </strong>
                      <span>NIM STAKED</span>
                    </div>
                    <div className="podium-stats">
                      <span>💎 Diamond Whale</span>
                      <span>8.0% APY</span>
                    </div>
                    <div className="podium-streak" style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}>
                      <Sparkles size={12} /> Top Arena Benefactor
                    </div>
                  </div>
                )}

                {/* Rank 3 - Gold Patron */}
                {topThreePatrons[2] && (
                  <div className="podium-card bronze">
                    <div className="podium-medal">
                      <Medal size={28} />
                      <span className="podium-rank">3</span>
                    </div>
                    <div className="podium-avatar">
                      {topThreePatrons[2].userName[0].toUpperCase()}
                    </div>
                    <h3 className="podium-name">
                      {topThreePatrons[2].userName}
                    </h3>
                    <div className="podium-rating">
                      <strong style={{ color: topThreePatrons[2].tierColor }}>
                        {formatNim(topThreePatrons[2].stakedNim)}
                      </strong>
                      <span>NIM STAKED</span>
                    </div>
                    <div className="podium-stats">
                      <span>{topThreePatrons[2].tierIcon} {topThreePatrons[2].tier}</span>
                      <span>{topThreePatrons[2].apy}% APY</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Patrons Standings Table */}
            <section className="standings-section">
              <div className="standings-header">
                <div>
                  <h2>Arena Patrons Standings</h2>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
                    Backed by native Nimiq PoS consensus yield + 8% platform fee revenue share.
                  </p>
                </div>
                <span className="standings-count">{patronsList.length} Patrons Active</span>
              </div>

              <div className="standings-table-wrap desktop-only">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Patron</th>
                      <th>Tier</th>
                      <th>Staked Amount</th>
                      <th>Est. USD Value</th>
                      <th>Monthly APY</th>
                      <th>VIP Privileges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patronsList.map(patron => (
                      <tr
                        key={`${patron.rank}-${patron.userName}`}
                        className={patron.isCurrentUser ? "current-user-row" : ""}
                      >
                        <td className="rank-cell">
                          <span
                            className={`rank-badge ${
                              patron.rank === 1
                                ? "gold"
                                : patron.rank === 2
                                  ? "silver"
                                  : patron.rank === 3
                                    ? "bronze"
                                    : ""
                            }`}
                          >
                            #{patron.rank}
                          </span>
                        </td>
                        <td className="player-cell">
                          <div className="player-meta">
                            <span className="avatar-mini">
                              {patron.userName[0].toUpperCase()}
                            </span>
                            <strong>
                              {patron.userName}
                              {patron.isCurrentUser && (
                                <span className="you-pill">YOU</span>
                              )}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: patron.tierColor,
                              fontFamily: "'IBM Plex Mono', monospace",
                              background: "rgba(255, 255, 255, 0.04)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${patron.tierColor}40`,
                            }}
                          >
                            <span>{patron.tierIcon}</span> {patron.tier}
                          </span>
                        </td>
                        <td className="rating-cell">
                          <strong style={{ color: "#ffffff" }}>
                            {formatNim(patron.stakedNim)} NIM
                          </strong>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {formatUsd(nimToUsd(patron.stakedNim))}
                        </td>
                        <td>
                          <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {patron.apy}% APY
                          </span>
                        </td>
                        <td style={{ fontSize: "11px", color: "rgba(251, 248, 241, 0.75)" }}>
                          {patron.perks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Patrons Card List */}
              <div className="patrons-mobile-cards mobile-only">
                {patronsList.map(patron => (
                  <div
                    key={`${patron.rank}-${patron.userName}`}
                    className={`leaderboard-mobile-card ${patron.isCurrentUser ? "current-user-card" : ""}`}
                  >
                    <div
                      className={`player-rank-chip ${
                        patron.rank === 1
                          ? "gold"
                          : patron.rank === 2
                            ? "silver"
                            : patron.rank === 3
                              ? "bronze"
                              : ""
                      }`}
                    >
                      #{patron.rank}
                    </div>

                    <div className="player-info">
                      <div className="player-header-row">
                        <span className="avatar-mini" style={{ width: 22, height: 22, fontSize: 11 }}>
                          {patron.userName[0].toUpperCase()}
                        </span>
                        <span className="player-name">{patron.userName}</span>
                        {patron.isCurrentUser && <span className="you-pill">YOU</span>}
                      </div>
                      <div className="player-stats-sub">
                        <span style={{ color: patron.tierColor, fontWeight: 600 }}>{patron.tierIcon} {patron.tier}</span>
                        <span>•</span>
                        <span style={{ color: "#4ade80", fontWeight: 700 }}>{patron.apy}% APY</span>
                      </div>
                    </div>

                    <div className="player-score-col">
                      <span className="elo-badge" style={{ color: "#fbbf24" }}>
                        {formatNim(patron.stakedNim)} NIM
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Become a Patron CTA */}
            <section
              style={{
                marginTop: "24px",
                padding: "24px 28px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(18, 40, 63, 0.6) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 6px", color: "#fbbf24" }}>
                  Claim Your Spotlight as an Arena Patron
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(251, 248, 241, 0.8)", margin: 0 }}>
                  Stake your NIM in the Arena Vault to earn monthly dividends and receive guaranteed first-look priority on tournaments &amp; new games.
                </p>
              </div>

              <Link
                href="/earn#vault"
                className="primary-action"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  padding: "12px 22px",
                  fontSize: "13px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Coins size={16} /> ENTER PATRON VAULT <ArrowRight size={15} />
              </Link>
            </section>
          </>
        )}

        {/* Footer info */}
        <div className="trust-line" style={{ marginTop: "36px", marginBottom: userStanding ? "60px" : "0px" }}>
          <ShieldCheck size={16} />
          <span>
            {activeTrack === "gladiators"
              ? "Rankings update automatically upon authoritative match victory or forfeit settlement."
              : "Patron staking consensus yields and match fee revenue distributions are mathematically verified on Nimiq blockchain."}
          </span>
        </div>
      </main>

      {/* Sticky Mobile Rank Pill */}
      {userStanding && (
        <div className="sticky-rank-bar mobile-only">
          <div className="rank-left">
            <span className="rank-pill">#{userStanding.rank}</span>
            <div>
              <div className="rank-text">Your Rank: {userStanding.rating} ELO</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)" }}>
                {userStanding.wins}W - {userStanding.losses}L ({userStanding.winRate}% WR)
              </div>
            </div>
          </div>
          <Link href={`/games/${selectedGame}`} className="rank-action">
            Play <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
