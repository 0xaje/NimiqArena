import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  games,
  matchEvents,
  matchPlayers,
  matches,
  paymentIntents,
  playerRatings,
  ratingHistory,
  seasons,
  users,
} from "../drizzle/schema";
import {
  applyLudoMatchCommand,
  createChallengeMatch,
  ensureDefaultGamesSeeded,
  ensureDefaultSeasonsSeeded,
  getActiveSeason,
  getLeaderboard,
  getPlayerStats,
  joinMatchByCode,
  refreshMatchLifecycle,
  settleMatchRating,
  upsertUser,
} from "./db";
import { STARTING_RATING } from "./rating-engine";

const TEST_DB_URL =
  process.env.NIMIQ_ARENA_TEST_DATABASE_URL ||
  "mysql://root:test@127.0.0.1:3307/nimiq_test";
const shouldRun = Boolean(process.env.RUN_DB_INTEGRATION_TESTS);

const suite = shouldRun ? describe : describe.skip;

suite("Authoritative Rating & Leaderboard Database Integration Matrix", () => {
  let pool: mysql.Pool;
  let db: ReturnType<typeof drizzle>;
  let user1Id: number;
  let user2Id: number;
  let user3Id: number;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    pool = mysql.createPool(TEST_DB_URL);
    db = drizzle(pool);

    // Initialize database schema tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT NULL,
        email VARCHAR(320) NULL,
        loginMethod VARCHAR(64) NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(32) PRIMARY KEY,
        slug VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        kind ENUM('ludo') NOT NULL,
        status ENUM('active', 'coming_soon', 'concept', 'unavailable') NOT NULL DEFAULT 'unavailable',
        description TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS seasons (
        id VARCHAR(32) PRIMARY KEY,
        number INT UNSIGNED NOT NULL UNIQUE,
        name VARCHAR(64) NOT NULL,
        status ENUM('upcoming', 'active', 'ended') NOT NULL DEFAULT 'active',
        startsAt TIMESTAMP NOT NULL,
        endsAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX seasons_status_idx (status)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(32) PRIMARY KEY,
        gameId VARCHAR(32) NOT NULL,
        seasonId VARCHAR(32) NOT NULL DEFAULT 'season-1',
        hostUserId INT NOT NULL,
        winnerUserId INT NULL,
        loserUserId INT NULL,
        joinCode VARCHAR(12) NOT NULL UNIQUE,
        visibility ENUM('challenge_friend', 'public') NOT NULL DEFAULT 'challenge_friend',
        status ENUM('waiting', 'in_progress', 'finished', 'cancelled', 'expired') NOT NULL DEFAULT 'waiting',
        engineVersion VARCHAR(16) NOT NULL,
        stateVersion INT UNSIGNED NOT NULL DEFAULT 0,
        stateJson TEXT NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX matches_game_idx (gameId),
        INDEX matches_season_idx (seasonId),
        INDEX matches_host_idx (hostUserId),
        INDEX matches_winner_idx (winnerUserId)
      );
    `);

    try {
      await pool.query(
        `ALTER TABLE matches ADD COLUMN IF NOT EXISTS seasonId VARCHAR(32) NOT NULL DEFAULT 'season-1';`
      );
      await pool.query(
        `ALTER TABLE matches ADD COLUMN IF NOT EXISTS winnerUserId INT NULL;`
      );
      await pool.query(
        `ALTER TABLE matches ADD COLUMN IF NOT EXISTS loserUserId INT NULL;`
      );
    } catch {
      // Columns may already exist
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matchId VARCHAR(32) NOT NULL,
        userId INT NOT NULL,
        seat INT UNSIGNED NOT NULL,
        status ENUM('joined', 'disconnected', 'left') NOT NULL DEFAULT 'joined',
        joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSeenAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX match_players_match_idx (matchId),
        INDEX match_players_user_idx (userId),
        UNIQUE KEY match_players_match_user_idx (matchId, userId),
        UNIQUE KEY match_players_match_seat_idx (matchId, seat)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        matchId VARCHAR(32) NOT NULL,
        version INT UNSIGNED NOT NULL,
        userId INT NOT NULL,
        commandNonce VARCHAR(64) NOT NULL,
        commandJson TEXT NOT NULL,
        eventJson TEXT NOT NULL,
        snapshotJson TEXT NOT NULL,
        resultStatus VARCHAR(32) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY match_events_match_version_idx (matchId, version),
        UNIQUE KEY match_events_match_nonce_idx (matchId, commandNonce)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_ratings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        gameSlug VARCHAR(64) NOT NULL,
        seasonId VARCHAR(32) NOT NULL,
        rating INT NOT NULL DEFAULT 1000,
        wins INT UNSIGNED NOT NULL DEFAULT 0,
        losses INT UNSIGNED NOT NULL DEFAULT 0,
        currentStreak INT UNSIGNED NOT NULL DEFAULT 0,
        bestStreak INT UNSIGNED NOT NULL DEFAULT 0,
        matchesPlayed INT UNSIGNED NOT NULL DEFAULT 0,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY player_ratings_user_game_season_idx (userId, gameSlug, seasonId),
        INDEX player_ratings_leaderboard_idx (seasonId, gameSlug, rating)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rating_history (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        matchId VARCHAR(32) NOT NULL,
        userId INT NOT NULL,
        seasonId VARCHAR(32) NOT NULL,
        gameSlug VARCHAR(64) NOT NULL,
        previousRating INT NOT NULL,
        ratingChange INT NOT NULL,
        newRating INT NOT NULL,
        opponentUserId INT NOT NULL,
        opponentRating INT NOT NULL,
        outcome ENUM('win', 'loss', 'draw', 'abandoned_loss', 'abandoned_win') NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY rating_history_match_user_idx (matchId, userId),
        INDEX rating_history_user_season_idx (userId, seasonId, createdAt)
      );
    `);

    await ensureDefaultGamesSeeded(db);
    await ensureDefaultSeasonsSeeded(db);

    // Create test users
    await upsertUser({ openId: "test-user-alpha", name: "Alice Alpha" });
    await upsertUser({ openId: "test-user-beta", name: "Bob Beta" });
    await upsertUser({ openId: "test-user-gamma", name: "Charlie Gamma" });

    const u1 = await db
      .select()
      .from(users)
      .where(eq(users.openId, "test-user-alpha"))
      .limit(1);
    const u2 = await db
      .select()
      .from(users)
      .where(eq(users.openId, "test-user-beta"))
      .limit(1);
    const u3 = await db
      .select()
      .from(users)
      .where(eq(users.openId, "test-user-gamma"))
      .limit(1);

    user1Id = u1[0].id;
    user2Id = u2[0].id;
    user3Id = u3[0].id;

    // Clean match tables
    await db.delete(ratingHistory);
    await db.delete(playerRatings);
    await db.delete(matchEvents);
    await db.delete(matchPlayers);
    await db.delete(matches);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("1. Verifies active season lookup and default initialization", async () => {
    const season = await getActiveSeason();
    expect(season).not.toBeNull();
    expect(season?.id).toBe("season-1");
    expect(season?.number).toBe(1);
    expect(season?.status).toBe("active");
  });

  it("2. Verifies authoritative rating settlement: Winner rating increase & Loser rating decrease", async () => {
    const match = await createChallengeMatch({
      userId: user1Id,
      gameSlug: "ludo-league",
    });
    await joinMatchByCode({ userId: user2Id, joinCode: match.joinCode });

    // Settle match with user1 (Alice) winning against user2 (Bob)
    await db.transaction(async tx => {
      await settleMatchRating(tx, {
        matchId: match.id,
        gameSlug: "ludo-league",
        seasonId: "season-1",
        winnerUserId: user1Id,
        loserUserId: user2Id,
        outcome: "win",
      });
    });

    const stats1 = await getPlayerStats({
      userId: user1Id,
      seasonId: "season-1",
    });
    const stats2 = await getPlayerStats({
      userId: user2Id,
      seasonId: "season-1",
    });

    expect(stats1.rating).toBe(1016); // 1000 + 16
    expect(stats1.wins).toBe(1);
    expect(stats1.losses).toBe(0);
    expect(stats1.currentStreak).toBe(1);
    expect(stats1.winRate).toBe(100);

    expect(stats2.rating).toBe(984); // 1000 - 16
    expect(stats2.wins).toBe(0);
    expect(stats2.losses).toBe(1);
    expect(stats2.currentStreak).toBe(0);
    expect(stats2.winRate).toBe(0);

    // Verify rating_history row persisted
    expect(stats1.history.length).toBe(1);
    expect(stats1.history[0].matchId).toBe(match.id);
    expect(stats1.history[0].ratingChange).toBe(16);
    expect(stats1.history[0].outcome).toBe("win");
    expect(stats1.history[0].opponentName).toBe("Bob Beta");
  });

  it("3. Verifies duplicate completion idempotency (zero double counting)", async () => {
    const match = await createChallengeMatch({
      userId: user1Id,
      gameSlug: "ludo-league",
    });
    await joinMatchByCode({ userId: user2Id, joinCode: match.joinCode });

    // Settle once
    await db.transaction(async tx => {
      await settleMatchRating(tx, {
        matchId: match.id,
        gameSlug: "ludo-league",
        seasonId: "season-1",
        winnerUserId: user1Id,
        loserUserId: user2Id,
        outcome: "win",
      });
    });

    const ratingBefore = (await getPlayerStats({ userId: user1Id })).rating;

    // Settle second time on identical matchId
    await db.transaction(async tx => {
      await settleMatchRating(tx, {
        matchId: match.id,
        gameSlug: "ludo-league",
        seasonId: "season-1",
        winnerUserId: user1Id,
        loserUserId: user2Id,
        outcome: "win",
      });
    });

    const ratingAfter = (await getPlayerStats({ userId: user1Id })).rating;
    expect(ratingAfter).toBe(ratingBefore); // Must NOT change on duplicate invocation
  });

  it("4. Verifies abandoned match resolution and rating penalization", async () => {
    const match = await createChallengeMatch({
      userId: user3Id,
      gameSlug: "ludo-league",
    });
    await joinMatchByCode({ userId: user2Id, joinCode: match.joinCode });

    // Simulate user2 disconnecting and 10m grace period expiring
    const tenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await db
      .update(matchPlayers)
      .set({ status: "disconnected", lastSeenAt: tenMinutesAgo })
      .where(eq(matchPlayers.userId, user2Id));

    // Run lifecycle refresh
    const refreshed = await refreshMatchLifecycle(match.id, new Date());
    expect(refreshed?.status).toBe("finished");

    const stats3 = await getPlayerStats({ userId: user3Id });
    expect(stats3.wins).toBe(1);
    expect(stats3.history[0].outcome).toBe("abandoned_win");
  });

  it("5. Verifies database-backed leaderboard ordering, ranks, and streaks", async () => {
    const leaderboard = await getLeaderboard({
      gameSlug: "ludo-league",
      seasonId: "season-1",
    });

    expect(leaderboard.length).toBeGreaterThanOrEqual(3);
    // User1 (Alice) has 2 wins, rating > 1000
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].userName).toBe("Alice Alpha");
    expect(leaderboard[0].rating).toBeGreaterThan(1000);
    expect(leaderboard[0].currentStreak).toBe(2);

    // Verify ranks are consecutive
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[2].rank).toBe(3);
  });

  it("6. Verifies player stats profile integration returns true rank and history", async () => {
    const stats = await getPlayerStats({
      userId: user1Id,
      gameSlug: "ludo-league",
      seasonId: "season-1",
    });

    expect(stats.rank).toBe(1);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(100);
    expect(stats.bestStreak).toBe(2);
    expect(stats.history.length).toBe(2);
  });
});
