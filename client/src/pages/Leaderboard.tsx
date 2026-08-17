import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Crown,
  Flame,
  Medal,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Leaderboard() {
  const [selectedGame, setSelectedGame] = useState("ludo-league");
  const seasonQuery = trpc.season.getActive.useQuery();
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: selectedGame,
    limit: 50,
  });
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const season = seasonQuery.data;
  const standings = leaderboardQuery.data ?? [];
  const topThree = standings.slice(0, 3);

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
              <span className="stamp">AUTHORITATIVE ELO</span>
              <span className="stamp green">
                {season ? season.name : "Season 1: Genesis"}
              </span>
            </div>
            <h1>Arena Leaderboard</h1>
            <p className="detail-lede">
              Official player rankings calculated authoritatively from completed, verified Arena matches. Ratings use competitive Elo ($K=32$) with seasonal tracking.
            </p>
          </div>

          <div className="leaderboard-controls">
            <div className="game-selector">
              <button
                className={`tab-btn ${selectedGame === "ludo-league" ? "active" : ""}`}
                onClick={() => setSelectedGame("ludo-league")}
              >
                Ludo League
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
        </section>

        {/* Podium for Top 3 (if available) */}
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

        {/* Full Table */}
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
                Complete your first authoritative Ludo League match to establish official season rankings!
              </p>
              <Link href="/games/ludo-league" className="primary-action">
                Play Ludo League
              </Link>
            </div>
          ) : (
            <div className="standings-table-wrap">
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
                  {standings.map((player) => {
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
          )}
        </section>

        {/* Footer info */}
        <div className="trust-line">
          <ShieldCheck size={16} />
          <span>
            Rankings update automatically upon authoritative match victory or forfeit settlement.
          </span>
        </div>
      </main>
    </div>
  );
}
