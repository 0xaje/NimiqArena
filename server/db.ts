import { randomInt } from "node:crypto";
import {
  ABANDONMENT_GRACE_MS,
  MATCH_PLAY_WINDOW_MS,
  PLAYER_HEARTBEAT_TIMEOUT_MS,
} from "@shared/const";
import { and, desc, eq, gt, inArray, lt, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertGame,
  InsertSeason,
  InsertUser,
  games,
  matchEvents,
  matchPlayers,
  matches,
  paymentIntents,
  paymentVerifications,
  playerRatings,
  ratingHistory,
  seasons,
  users,
  type Game,
  type Match,
  type PaymentIntent,
  type PaymentVerification,
  type PlayerRating,
  type RatingHistory,
  type Season,
} from "../drizzle/schema";
import {
  applyCommand,
  createLudoSnapshot,
  type LudoCommand,
  type LudoEvent,
  type LudoSnapshot,
  type LudoMode,
  type LudoPlayerId,
} from "../shared/game/ludo-engine";
import { selectBestBotMove } from "../shared/game/ludo-bot";
import {
  applyConnect4Command,
  createConnect4Snapshot,
  type Connect4Command,
  type Connect4Event,
  type Connect4Snapshot,
} from "../shared/game/connect4-engine";
import { selectBestConnect4Drop } from "../shared/game/connect4-bot";
import { replayStoredMatchEvent } from "../shared/game/match-event";
import { calculatePotDistribution } from "../shared/game/pot-distribution";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { notifyMatchUpdated } from "./match-stream";
import { calculateElo, STARTING_RATING } from "./rating-engine";
import {
  verifyNimiqPayment,
  normalizeNimiqAddress,
  type NimiqVerificationResult,
} from "./nimiq-verifier";

export type LudoServerCommand =
  | Omit<Extract<LudoCommand, { kind: "roll" }>, "matchId" | "playerId">
  | Omit<Extract<LudoCommand, { kind: "move" }>, "matchId" | "playerId">;

let _db: ReturnType<typeof drizzle> | null = null;

export const DEFAULT_SEASON: InsertSeason = {
  id: "season-1",
  number: 1,
  name: "Season 1: Genesis",
  status: "active",
  startsAt: new Date("2026-01-01T00:00:00Z"),
  endsAt: new Date("2026-12-31T23:59:59Z"),
};

export const DEFAULT_GAMES: InsertGame[] = [
  {
    id: "ludo-league",
    slug: "ludo-league",
    name: "Ludo League",
    kind: "ludo",
    status: "active",
    description: "Classic 2-player authoritative board game",
  },
  {
    id: "connect-four",
    slug: "connect-four",
    name: "Connect NIM",
    kind: "connect4",
    status: "active",
    description:
      "Vertical 7x6 tactical strategy game. Drop discs to connect 4 in a row horizontally, vertically, or diagonally.",
  },
];

export async function ensureDefaultSeasonsSeeded(
  db: ReturnType<typeof drizzle>
) {
  await db
    .insert(seasons)
    .values(DEFAULT_SEASON)
    .onDuplicateKeyUpdate({
      set: { name: DEFAULT_SEASON.name, status: DEFAULT_SEASON.status },
    });
}

export async function ensureDefaultGamesSeeded(db: ReturnType<typeof drizzle>) {
  for (const game of DEFAULT_GAMES) {
    await db
      .insert(games)
      .values(game)
      .onDuplicateKeyUpdate({ set: { status: game.status, name: game.name } });
  }
}

let _initDbPromise: Promise<void> | null = null;

async function ensureTablesExist(db: ReturnType<typeof drizzle>) {
  const tableStatements = [
    sql`CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`openId\` varchar(64) NOT NULL,
      \`name\` text,
      \`email\` varchar(320),
      \`loginMethod\` varchar(64),
      \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
      \`address\` varchar(64),
      \`points\` int NOT NULL DEFAULT 1000,
      \`referralCode\` varchar(32),
      \`referredByUserId\` int,
      \`referralEarningsNim\` int NOT NULL DEFAULT 0,
      \`evmAddress\` varchar(64),
      \`avatar\` varchar(255),
      \`welcomeClaimed\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`games\` (
      \`id\` varchar(32) NOT NULL,
      \`slug\` varchar(64) NOT NULL,
      \`name\` varchar(128) NOT NULL,
      \`kind\` enum('ludo','connect4') NOT NULL,
      \`status\` enum('active','coming_soon','concept','unavailable') NOT NULL DEFAULT 'unavailable',
      \`description\` text NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`games_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`seasons\` (
      \`id\` varchar(32) NOT NULL,
      \`number\` int unsigned NOT NULL,
      \`name\` varchar(64) NOT NULL,
      \`status\` enum('upcoming','active','ended') NOT NULL DEFAULT 'active',
      \`startsAt\` timestamp NOT NULL,
      \`endsAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`seasons_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`matches\` (
      \`id\` varchar(32) NOT NULL,
      \`gameId\` varchar(32) NOT NULL,
      \`seasonId\` varchar(32) NOT NULL DEFAULT 'season-1',
      \`hostUserId\` int NOT NULL,
      \`winnerUserId\` int,
      \`loserUserId\` int,
      \`paymentIntentId\` varchar(32),
      \`joinCode\` varchar(16) NOT NULL,
      \`visibility\` enum('challenge_friend','public') NOT NULL DEFAULT 'challenge_friend',
      \`status\` enum('waiting','in_progress','finished','cancelled','expired') NOT NULL DEFAULT 'waiting',
      \`engineVersion\` varchar(16) NOT NULL,
      \`stateVersion\` int unsigned NOT NULL DEFAULT 0,
      \`stateJson\` text NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`matches_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`matches_joinCode_unique\` UNIQUE(\`joinCode\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`match_players\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`matchId\` varchar(32) NOT NULL,
      \`userId\` int NOT NULL,
      \`seat\` int unsigned NOT NULL,
      \`paymentIntentId\` varchar(32),
      \`status\` enum('joined','disconnected','left') NOT NULL DEFAULT 'joined',
      \`joinedAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`lastSeenAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`match_players_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`match_events\` (
      \`id\` int unsigned AUTO_INCREMENT NOT NULL,
      \`matchId\` varchar(32) NOT NULL,
      \`version\` int unsigned NOT NULL,
      \`userId\` int NOT NULL,
      \`commandNonce\` varchar(64) NOT NULL,
      \`commandJson\` text NOT NULL,
      \`eventJson\` text NOT NULL,
      \`snapshotJson\` text NOT NULL,
      \`resultStatus\` varchar(32) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`match_events_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`player_ratings\` (
      \`id\` int unsigned AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`gameSlug\` varchar(64) NOT NULL,
      \`seasonId\` varchar(32) NOT NULL,
      \`rating\` int NOT NULL DEFAULT 1000,
      \`wins\` int unsigned NOT NULL DEFAULT 0,
      \`losses\` int unsigned NOT NULL DEFAULT 0,
      \`currentStreak\` int unsigned NOT NULL DEFAULT 0,
      \`bestStreak\` int unsigned NOT NULL DEFAULT 0,
      \`matchesPlayed\` int unsigned NOT NULL DEFAULT 0,
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`player_ratings_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`rating_history\` (
      \`id\` int unsigned AUTO_INCREMENT NOT NULL,
      \`matchId\` varchar(32) NOT NULL,
      \`userId\` int NOT NULL,
      \`seasonId\` varchar(32) NOT NULL,
      \`gameSlug\` varchar(64) NOT NULL,
      \`previousRating\` int NOT NULL,
      \`ratingChange\` int NOT NULL,
      \`newRating\` int NOT NULL,
      \`opponentUserId\` int NOT NULL,
      \`opponentRating\` int NOT NULL,
      \`outcome\` enum('win','loss','draw','abandoned_loss','abandoned_win') NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`rating_history_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`payment_intents\` (
      \`id\` varchar(32) NOT NULL,
      \`userId\` int NOT NULL,
      \`recipient\` varchar(64) NOT NULL,
      \`valueLuna\` int unsigned NOT NULL,
      \`status\` enum('created','confirmation_pending','submitted','verifying','verified','rejected','failed','expired','invalid','underpaid','wrong_recipient','duplicate','verification_failed') NOT NULL DEFAULT 'created',
      \`clientNonce\` varchar(64) NOT NULL,
      \`transactionHash\` varchar(128),
      \`senderAddress\` varchar(64),
      \`blockNumber\` int unsigned,
      \`confirmations\` int unsigned,
      \`networkId\` int,
      \`failureCode\` varchar(64),
      \`verifiedAt\` timestamp NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`payment_intents_id\` PRIMARY KEY(\`id\`)
    )`,
    sql`CREATE TABLE IF NOT EXISTS \`payment_verifications\` (
      \`id\` int unsigned AUTO_INCREMENT NOT NULL,
      \`paymentIntentId\` varchar(32) NOT NULL,
      \`transactionHash\` varchar(128) NOT NULL,
      \`status\` varchar(32) NOT NULL,
      \`sender\` varchar(64),
      \`recipient\` varchar(64),
      \`valueLuna\` int unsigned,
      \`blockNumber\` int unsigned,
      \`confirmations\` int unsigned,
      \`networkId\` int,
      \`executionResult\` boolean,
      \`failureReason\` varchar(64),
      \`rawResponseJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`payment_verifications_id\` PRIMARY KEY(\`id\`)
    )`,
  ];

  for (const stmt of tableStatements) {
    try {
      await db.execute(stmt);
    } catch (err: any) {
      console.warn("[Database] Schema check notice:", err.message);
    }
  }
}

async function bootstrapDatabase(db: ReturnType<typeof drizzle>) {
  try {
    await ensureTablesExist(db);
    await ensureDefaultGamesSeeded(db);
    await ensureDefaultSeasonsSeeded(db);
  } catch (err) {
    console.warn("[Database] Bootstrapping tables/seeds failed:", err);
  }
}

// Lazily create the drizzle instance with connection pooling and SSL support.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      let url = process.env.DATABASE_URL;
      // If user specified the read-only MySQL system database /sys on TiDB, automatically redirect to /test
      if (url.includes("tidbcloud.com") && /\/sys(\?|$)/.test(url)) {
        url = url.replace(/\/sys(\?|$)/, "/test$1");
      }
      if (url.includes("tidbcloud.com") && !url.includes("ssl=")) {
        url += (url.includes("?") ? "&" : "?") + 'ssl={"rejectUnauthorized":true}';
      }

      _db = drizzle(url);
      if (_db && !_initDbPromise) {
        _initDbPromise = bootstrapDatabase(_db);
      }
      await _initDbPromise;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "address"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByNimiqAddress(address: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const normalized = normalizeNimiqAddress(address);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.address, normalized))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function checkUsernameAvailable(
  name: string,
  excludeUserId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const cleanName = name.trim();
  if (!cleanName) return false;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, cleanName))
    .limit(1);

  if (existing.length === 0) return true;
  if (excludeUserId && existing[0].id === excludeUserId) return true;
  return false;
}

export async function registerUserIdentity(input: {
  userId: number;
  name: string;
  avatar?: string;
  referralCodeUsed?: string;
  address?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const cleanName = input.name.trim();
  if (cleanName.length < 2 || cleanName.length > 32) {
    throw new Error("Username must be between 2 and 32 characters.");
  }
  const isAvailable = await checkUsernameAvailable(cleanName, input.userId);
  if (!isAvailable) {
    throw new Error(`Username "${cleanName}" is already taken.`);
  }

  const currentUser = (
    await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
  )[0];
  if (!currentUser) throw new Error("User not found.");

  let referredByUserId = currentUser.referredByUserId;

  // Handle referral code if provided and not yet referred
  if (input.referralCodeUsed && !referredByUserId) {
    const code = input.referralCodeUsed.trim().toLowerCase();
    const referrer = (
      await db
        .select()
        .from(users)
        .where(eq(users.referralCode, code))
        .limit(1)
    )[0];
    if (referrer && referrer.id !== input.userId) {
      referredByUserId = referrer.id;
      // Award referrer +500 points
      await db
        .update(users)
        .set({ points: sql`${users.points} + 500` })
        .where(eq(users.id, referrer.id));
    }
  }

  // Set user's own referral code as their username
  const myReferralCode = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

  await db
    .update(users)
    .set({
      name: cleanName,
      avatar: input.avatar !== undefined ? input.avatar : currentUser.avatar,
      referralCode: myReferralCode || `user${input.userId}`,
      referredByUserId,
      address: input.address
        ? normalizeNimiqAddress(input.address)
        : currentUser.address,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId));

  return (
    await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
  )[0];
}

export async function claimWelcomeReward(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (!user) throw new Error("User not found");
  if (user.welcomeClaimed) {
    return {
      success: true,
      alreadyClaimed: true,
      points: user.points,
      welcomeClaimed: true,
      message: "Welcome gift has already been claimed.",
    };
  }

  await db
    .update(users)
    .set({
      points: sql`${users.points} + 1000`,
      welcomeClaimed: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const updated = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];

  return {
    success: true,
    alreadyClaimed: false,
    points: updated.points,
    welcomeClaimed: true,
    message: "1,000 Welcome Arena Points added to your balance!",
  };
}

export async function getUserReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (!user) return null;

  const referredUsers = await db
    .select({
      id: users.id,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.referredByUserId, userId));

  return {
    referralCode: user.referralCode || `user${user.id}`,
    points: user.points,
    referralEarningsNim: user.referralEarningsNim,
    totalReferred: referredUsers.length,
    referredUsers,
  };
}

export async function linkUserEvmAddress(userId: number, evmAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = evmAddress.toLowerCase().trim();
  await db
    .update(users)
    .set({ evmAddress: normalized, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { success: true, ok: true, evmAddress: normalized };
}

export async function getGameBySlug(slug: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Game service is unavailable. Database connection is required.");
  let result = await db
    .select()
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  if (!result[0] && DEFAULT_GAMES.some(g => g.slug === slug)) {
    await ensureDefaultGamesSeeded(db);
    result = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  }
  return result[0];
}

export async function createChallengeMatch(input: {
  userId: number;
  gameSlug: string;
  mode?: LudoMode;
}): Promise<Match> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active")
    throw new Error("This game is not available for match creation.");

  const id = nanoid(20);
  const joinCode = nanoid(10).replace(/[-_]/g, "A").toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, input.mode ?? "2p_double", 2);

  await db.transaction(async tx => {
    await tx.insert(matches).values({
      id,
      gameId: game.id,
      hostUserId: input.userId,
      joinCode,
      visibility: "challenge_friend",
      status: "waiting",
      engineVersion,
      stateVersion: snapshot.version,
      stateJson: JSON.stringify(snapshot),
      expiresAt,
    });
    await tx
      .insert(matchPlayers)
      .values({ matchId: id, userId: input.userId, seat: 0, status: "joined" });
  });
  const created = await db
    .select()
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Match could not be created.");
  return created[0];
}

export async function findOrCreateQuickMatch(input: {
  userId: number;
  gameSlug: string;
}): Promise<{
  matchId: string;
  status: "waiting" | "in_progress";
  seat: number;
  expiresAt: Date;
}> {
  const db = await getDb();
  if (!db) throw new Error("Matchmaking service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active") {
    throw new Error("This game is not available for matchmaking.");
  }

  // 1. Search for an existing open public waiting match
  const openMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.gameId, game.id),
        eq(matches.visibility, "public"),
        eq(matches.status, "waiting"),
        ne(matches.hostUserId, input.userId),
        gt(matches.expiresAt, new Date())
      )
    )
    .orderBy(desc(matches.createdAt))
    .limit(5);

  // 2. Try to join one of the available matches in an ACID transaction
  for (const candidate of openMatches) {
    try {
      const joined = await db.transaction<
        | {
            matchId: string;
            status: "waiting" | "in_progress";
            seat: number;
            expiresAt: Date;
          }
        | null
      >(async tx => {
        const current = (
          await tx
            .select()
            .from(matches)
            .where(
              and(
                eq(matches.id, candidate.id),
                eq(matches.status, "waiting")
              )
            )
            .limit(1)
        )[0];
        if (!current) return null;

        const players = await tx
          .select()
          .from(matchPlayers)
          .where(eq(matchPlayers.matchId, candidate.id));

        if (players.length >= 2) return null;
        if (players.some(p => p.userId === input.userId)) {
          return {
            matchId: candidate.id,
            status: current.status as "waiting" | "in_progress",
            seat: players.find(p => p.userId === input.userId)?.seat ?? 0,
            expiresAt: current.expiresAt,
          };
        }

        await tx.insert(matchPlayers).values({
          matchId: candidate.id,
          userId: input.userId,
          seat: 1,
          status: "joined",
        });

        // The ticket's expiry was a queue timeout; play gets its own window.
        const playExpiresAt = matchPlayWindowExpiry();
        await tx
          .update(matches)
          .set({ status: "in_progress", expiresAt: playExpiresAt })
          .where(eq(matches.id, candidate.id));

        return {
          matchId: candidate.id,
          status: "in_progress" as const,
          seat: 1,
          expiresAt: playExpiresAt,
        };
      });

      if (joined) {
        notifyMatchUpdated(joined.matchId);
        return joined;
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 3. If no open matches available, create a fresh public waiting ticket
  const id = nanoid(20);
  const joinCode = nanoid(10).replace(/[-_]/g, "A").toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins queue timeout
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, "2p_double", 2);

  await db.transaction(async tx => {
    await tx.insert(matches).values({
      id,
      gameId: game.id,
      hostUserId: input.userId,
      joinCode,
      visibility: "public",
      status: "waiting",
      engineVersion,
      stateVersion: snapshot.version,
      stateJson: JSON.stringify(snapshot),
      expiresAt,
    });
    await tx
      .insert(matchPlayers)
      .values({ matchId: id, userId: input.userId, seat: 0, status: "joined" });
  });

  return {
    matchId: id,
    status: "waiting",
    seat: 0,
    expiresAt,
  };
}

export async function cancelWaitingMatch(input: {
  userId: number;
  matchId: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const res = await db.transaction(async tx => {
    const match = (
      await tx
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, input.matchId),
            eq(matches.hostUserId, input.userId),
            eq(matches.status, "waiting")
          )
        )
        .limit(1)
    )[0];
    if (!match) {
      return { ok: false, reason: "Match not found or already started" };
    }

    await tx
      .update(matches)
      .set({ status: "cancelled" })
      .where(eq(matches.id, input.matchId));

    return { ok: true };
  });

  if (res.ok) {
    notifyMatchUpdated(input.matchId);
  }
  return res;
}

export async function getMatchQueueStatus(input: {
  userId: number;
  matchId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const match = await refreshMatchLifecycle(input.matchId);
  if (!match) throw new Error("Match was not found.");

  const players = await getMatchPlayers(input.matchId);
  const opponentPlayer = players.find(p => p.userId !== input.userId);
  let opponent = null;

  if (opponentPlayer) {
    const opponentUser = (
      await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, opponentPlayer.userId))
        .limit(1)
    )[0];
    if (opponentUser) {
      opponent = {
        id: opponentUser.id,
        name: opponentUser.name || `Player ${opponentPlayer.seat + 1}`,
      };
    }
  }

  return {
    matchId: match.id,
    status: match.status,
    playerCount: players.length,
    opponent,
    expiresAt: match.expiresAt,
  };
}

export async function getOrCreateBotUser() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  let bot = (
    await db
      .select()
      .from(users)
      .where(eq(users.openId, "system-bot-ai"))
      .limit(1)
  )[0];

  if (!bot) {
    await db.insert(users).values({
      openId: "system-bot-ai",
      name: "Arena Bot (AI)",
      loginMethod: "bot",
      role: "user",
      lastSignedIn: new Date(),
    });
    bot = (
      await db
        .select()
        .from(users)
        .where(eq(users.openId, "system-bot-ai"))
        .limit(1)
    )[0]!;
  }
  return bot;
}

export async function createSoloPracticeMatch(input: {
  userId: number;
  gameSlug: string;
}): Promise<Match> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active") {
    throw new Error("This game is not available for practice match creation.");
  }

  const botUser = await getOrCreateBotUser();

  const id = nanoid(20);
  const joinCode = `BOT${nanoid(7).replace(/[-_]/g, "A").toUpperCase()}`;
  // Starts in progress, so it gets the play window rather than a lobby clock.
  const expiresAt = matchPlayWindowExpiry();
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, "2p_double", 2);

  await db.transaction(async tx => {
    await tx.insert(matches).values({
      id,
      gameId: game.id,
      hostUserId: input.userId,
      joinCode,
      visibility: "challenge_friend",
      status: "in_progress", // Instantly in progress with bot
      engineVersion,
      stateVersion: snapshot.version,
      stateJson: JSON.stringify(snapshot),
      expiresAt,
    });
    await tx.insert(matchPlayers).values([
      { matchId: id, userId: input.userId, seat: 0, status: "joined" },
      { matchId: id, userId: botUser.id, seat: 1, status: "joined" },
    ]);
  });

  const created = await db
    .select()
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Solo practice match could not be created.");
  return created[0];
}

export async function addBotToWaitingMatch(
  matchId: string,
  requestingUserId: number
): Promise<Match> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const match = await getMatchById(matchId);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "waiting") {
    throw new Error("Match is already in progress or completed.");
  }
  if (match.hostUserId !== requestingUserId) {
    throw new Error("Only the host can add a bot to this match.");
  }
  // A bot cannot post a stake, so filling a wagered seat with one would let a
  // host play for a pot only the opponent - or nobody - funded. It also starts
  // the match, which would walk straight around the escrow gate.
  if (isWageredMatch(match)) {
    throw new Error("A wagered match cannot be played against a bot.");
  }

  const botUser = await getOrCreateBotUser();

  await db.transaction(async tx => {
    const existingPlayers = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId));

    const p1 = existingPlayers.find(p => p.seat === 1);
    if (!p1) {
      await tx.insert(matchPlayers).values({
        matchId,
        userId: botUser.id,
        seat: 1,
        status: "joined",
      });
    } else {
      await tx
        .update(matchPlayers)
        .set({ userId: botUser.id, status: "joined", lastSeenAt: new Date() })
        .where(eq(matchPlayers.id, p1.id));
    }

    const newJoinCode = match.joinCode.startsWith("BOT")
      ? match.joinCode
      : `BOT${match.joinCode.slice(0, 7)}`;

    await tx
      .update(matches)
      .set({
        status: "in_progress",
        joinCode: newJoinCode,
        expiresAt: matchPlayWindowExpiry(),
      })
      .where(eq(matches.id, matchId));
  });

  notifyMatchUpdated(matchId);
  const updated = await getMatchById(matchId);
  if (!updated) throw new Error("Failed to load updated match.");
  return updated;
}

const botMatchLocks = new Set<string>();
const botMatchTimers = new Map<string, NodeJS.Timeout>();

export function isMatchBotLocked(matchId: string): boolean {
  return botMatchLocks.has(matchId);
}

export function clearBotMatchTimerAndLock(matchId: string) {
  const timer = botMatchTimers.get(matchId);
  if (timer) {
    clearTimeout(timer);
    botMatchTimers.delete(matchId);
  }
  botMatchLocks.delete(matchId);
}

async function passBotTurnToOpponent(
  matchId: string,
  snapshot: LudoSnapshot,
  botSeat: number
) {
  const db = await getDb();
  if (!db) return;
  await db.transaction(async tx => {
    const latest = (
      await tx
        .select()
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1)
    )[0];
    if (!latest || latest.status !== "in_progress") return;

    const nextSeat = (botSeat === 0 ? 1 : 0) as LudoPlayerId;
    const nextSnapshot: LudoSnapshot = {
      ...snapshot,
      version: snapshot.version + 1,
      dice: null,
      currentPlayer: nextSeat,
    };

    await tx
      .update(matches)
      .set({
        stateVersion: nextSnapshot.version,
        stateJson: JSON.stringify(nextSnapshot),
      })
      .where(eq(matches.id, matchId));
  });

  notifyMatchUpdated(matchId);
}

async function executeAuthoritativeBotTurnCore(matchId: string) {
  const match = await getMatchById(matchId);
  if (!match || match.status !== "in_progress") return null;

  const botUser = await getOrCreateBotUser();
  const players = await getMatchPlayers(matchId);
  const botPlayer = players.find(p => p.userId === botUser.id);
  if (!botPlayer) return null;

  // Connect 4 Bot Step
  if (match.engineVersion === "connect4-v1") {
    const c4Snapshot = JSON.parse(match.stateJson) as Connect4Snapshot;
    if (
      c4Snapshot.currentPlayer !== botPlayer.seat ||
      c4Snapshot.winner !== null
    ) {
      return { ok: true as const, snapshot: c4Snapshot };
    }
    const bestDrop = selectBestConnect4Drop(
      c4Snapshot,
      botPlayer.seat as 0 | 1
    );
    if (bestDrop) {
      const dropRes = await applyConnect4MatchCommand({
        matchId,
        userId: botUser.id,
        command: {
          column: bestDrop.column,
          expectedVersion: c4Snapshot.version,
          nonce: nanoid(24),
        },
      });
      return { ok: true as const, ...dropRes };
    }
    return { ok: true as const, snapshot: c4Snapshot };
  }

  // Ludo Bot Step: authoritatively execute bot's turn sequence
  let maxSteps = 6;
  let currentSnapshot: LudoSnapshot | null = null;

  while (maxSteps > 0) {
    maxSteps--;

    const currentMatch = await getMatchById(matchId);
    if (!currentMatch || currentMatch.status !== "in_progress") break;

    let snapshot = JSON.parse(currentMatch.stateJson) as LudoSnapshot;
    currentSnapshot = snapshot;
    if (
      snapshot.currentPlayer !== botPlayer.seat ||
      snapshot.winner !== null
    ) {
      break;
    }

    try {
      // 1. Roll dice if not already rolled
      let currentDice = snapshot.dice;
      if (currentDice === null) {
        const rollResult = await applyLudoMatchCommand({
          matchId,
          userId: botUser.id,
          command: {
            kind: "roll",
            expectedVersion: currentMatch.stateVersion,
            nonce: nanoid(24),
          },
        });
        snapshot = rollResult.snapshot;
        currentSnapshot = snapshot;
        currentDice = snapshot.dice;
      }

      // If rolling forfeits turn (no legal moves possible) or game finished, break out
      if (
        currentDice === null ||
        snapshot.currentPlayer !== botPlayer.seat ||
        snapshot.winner !== null
      ) {
        break;
      }

      // Natural pacing before move (skipped in automated tests for high-speed simulation)
      if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
        await new Promise(r => setTimeout(r, 60));
      }

      // 2. Choose best legal move for bot
      const bestMove = selectBestBotMove(
        snapshot,
        botPlayer.seat as 0 | 1,
        currentDice
      );

      if (bestMove) {
        const moveResult = await applyLudoMatchCommand({
          matchId,
          userId: botUser.id,
          command: {
            kind: "move",
            pieceIndex: bestMove.pieceIndex,
            dieValue: bestMove.dieValue,
            expectedVersion: snapshot.version,
            nonce: nanoid(24),
          },
        });
        snapshot = moveResult.snapshot;
        currentSnapshot = snapshot;

        // If bot continues turn (remaining dice or bonus turn), wait briefly before next action
        if (
          snapshot.currentPlayer === botPlayer.seat &&
          snapshot.winner === null
        ) {
          if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
            await new Promise(r => setTimeout(r, 80));
          }
          continue;
        } else {
          break;
        }
      } else {
        // Fallback if no legal move was found
        await passBotTurnToOpponent(matchId, snapshot, botPlayer.seat);
        break;
      }
    } catch (stepErr) {
      console.warn(
        `[Bot] Transient error during bot step in match ${matchId}:`,
        stepErr instanceof Error ? stepErr.message : stepErr
      );
      // Re-read latest match state from DB to see if state advanced or needs fail-safe pass
      const refreshed = await getMatchById(matchId);
      if (!refreshed || refreshed.status !== "in_progress") break;
      const refSnapshot = JSON.parse(refreshed.stateJson) as LudoSnapshot;
      currentSnapshot = refSnapshot;
      if (
        refSnapshot.currentPlayer !== botPlayer.seat ||
        refSnapshot.winner !== null
      ) {
        break;
      }
      // UNCONDITIONAL FAIL-SAFE:
      // If the match is still on the bot's turn after an error, pass the turn to the opponent!
      // Never leave it stranded on currentPlayer === 1!
      await passBotTurnToOpponent(matchId, refSnapshot, botPlayer.seat);
      break;
    }
  }

  // End-of-loop guarantee: If match is still on bot's turn, pass it cleanly to opponent
  if (
    currentSnapshot &&
    currentSnapshot.currentPlayer === botPlayer.seat &&
    currentSnapshot.winner === null
  ) {
    await passBotTurnToOpponent(matchId, currentSnapshot, botPlayer.seat);
    const finalized = await getMatchById(matchId);
    if (finalized) {
      currentSnapshot = JSON.parse(finalized.stateJson);
    }
  }

  return { ok: true as const, snapshot: currentSnapshot };
}

export function scheduleAutonomousBotStep(matchId: string, delayMs = 150) {
  if (botMatchLocks.has(matchId)) return;
  const existing = botMatchTimers.get(matchId);
  if (existing) clearTimeout(existing);

  const effectiveDelay =
    process.env.NODE_ENV === "test" || process.env.VITEST ? 10 : delayMs;

  const timer = setTimeout(async () => {
    botMatchTimers.delete(matchId);
    if (botMatchLocks.has(matchId)) return;

    botMatchLocks.add(matchId);
    try {
      await executeAuthoritativeBotTurnCore(matchId);
    } catch (err) {
      console.error(
        `[Bot] Error during autonomous bot turn in match ${matchId}:`,
        err
      );
    } finally {
      botMatchLocks.delete(matchId);
    }
  }, effectiveDelay);

  botMatchTimers.set(matchId, timer);
}

export async function maybeScheduleBotTurn(
  matchId: string,
  nextPlayerSeat: number
) {
  if (botMatchLocks.has(matchId)) return;
  try {
    const botUser = await getOrCreateBotUser();
    const players = await getMatchPlayers(matchId);
    const nextPlayer = players.find(p => p.seat === nextPlayerSeat);
    if (nextPlayer && nextPlayer.userId === botUser.id) {
      scheduleAutonomousBotStep(matchId, 150);
    }
  } catch (err) {
    console.error(`[Bot] Error in maybeScheduleBotTurn:`, err);
  }
}

export async function executeBotTurn(input: {
  matchId: string;
  userId?: number;
}) {
  const match = await getMatchById(input.matchId);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "in_progress") {
    throw new Error("Match is not in progress.");
  }

  // Clear any pending timer since we are executing now
  const pendingTimer = botMatchTimers.get(input.matchId);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    botMatchTimers.delete(input.matchId);
  }

  let lockWaitRetries = 20;
  while (botMatchLocks.has(input.matchId) && lockWaitRetries > 0) {
    lockWaitRetries--;
    await new Promise(r => setTimeout(r, 50));
  }

  if (botMatchLocks.has(input.matchId)) {
    const latest = await getMatchById(input.matchId);
    return {
      ok: true as const,
      snapshot: latest ? JSON.parse(latest.stateJson) : null,
    };
  }

  botMatchLocks.add(input.matchId);
  try {
    const res = await executeAuthoritativeBotTurnCore(input.matchId);
    return res ?? { ok: true as const };
  } finally {
    botMatchLocks.delete(input.matchId);
  }
}

export async function getMatchById(id: string): Promise<Match | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db
    .select()
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  return result[0];
}

export async function getMatchPlayer(matchId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db
    .select()
    .from(matchPlayers)
    .where(
      and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId))
    )
    .limit(1);
  return result[0];
}

/** Clock a match gets once play begins. See matchPlayWindowExpiry. */
export function matchPlayWindowExpiry(from = new Date()): Date {
  return new Date(from.getTime() + MATCH_PLAY_WINDOW_MS);
}

export async function heartbeatMatchPlayer(matchId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const now = new Date();
  const updated = await db
    .update(matchPlayers)
    .set({ status: "joined", lastSeenAt: now })
    .where(
      and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId))
    );
  if (!updated[0]?.affectedRows)
    throw new Error("You are not a participant in this match.");
  notifyMatchUpdated(matchId);
  return { ok: true as const, lastSeenAt: now };
}

/**
 * Records that a player is still present, without waking every subscriber.
 *
 * heartbeatMatchPlayer notifies the match, which is right for an explicit beat
 * but would loop if called from inside the stream's own tick. Presence is the
 * only thing being updated here, and nobody needs to be told about it.
 */
export async function touchMatchPlayerPresence(matchId: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(matchPlayers)
    .set({ status: "joined", lastSeenAt: new Date() })
    .where(
      and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId))
    );
}

export async function disconnectMatchPlayer(matchId: string, userId: number) {
  const botUser = await getOrCreateBotUser();
  if (userId === botUser.id) return; // Never disconnect the bot

  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  await db
    .update(matchPlayers)
    .set({ status: "disconnected", lastSeenAt: new Date() })
    .where(
      and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId))
    );
  notifyMatchUpdated(matchId);
}

export async function refreshMatchLifecycle(matchId: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  return db.transaction(async tx => {
    const match = (
      await tx.select().from(matches).where(eq(matches.id, matchId)).limit(1)
    )[0];
    if (!match) return undefined;
    // Two different clocks share this field. While a match is waiting it
    // holds a lobby timeout; the moment play starts it is reset to the much
    // longer play window, so a game is never ended by the deadline of the
    // invite it grew out of. It used to be, roughly 13 minutes after a
    // quick-match ticket was created, mid-game and under both players.
    //
    // What remains here is a backstop for a match that stalls forever with
    // nobody disconnecting, which the abandonment rules below cannot catch.
    if (
      match.expiresAt.getTime() <= now.getTime() &&
      !["finished", "cancelled", "expired"].includes(match.status)
    ) {
      await tx
        .update(matches)
        .set({ status: "expired" })
        .where(eq(matches.id, matchId));
      return { ...match, status: "expired" as const };
    }
    const botUser = await getOrCreateBotUser();
    const staleBefore = new Date(now.getTime() - PLAYER_HEARTBEAT_TIMEOUT_MS);
    await tx
      .update(matchPlayers)
      .set({ status: "disconnected" })
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          eq(matchPlayers.status, "joined"),
          ne(matchPlayers.userId, botUser.id),
          lt(matchPlayers.lastSeenAt, staleBefore)
        )
      );

    // Perpetually keep the bot player joined and active with current timestamp
    await tx
      .update(matchPlayers)
      .set({ status: "joined", lastSeenAt: now })
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          eq(matchPlayers.userId, botUser.id)
        )
      );
    const players = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId));
    const allDisconnected =
      players.length > 0 && players.every(player => player.status !== "joined");
    const lastActivityAt = players.reduce(
      (latest, player) => Math.max(latest, player.lastSeenAt.getTime()),
      match.updatedAt.getTime()
    );
    const joinedPlayers = players.filter(p => p.status === "joined");
    const disconnectedPlayers = players.filter(p => p.status !== "joined");

    if (
      match.status === "in_progress" &&
      joinedPlayers.length === 1 &&
      disconnectedPlayers.length === 1
    ) {
      const disconnectedAt = disconnectedPlayers[0].lastSeenAt.getTime();
      if (disconnectedAt + ABANDONMENT_GRACE_MS <= now.getTime()) {
        await settleMatchRating(tx, {
          matchId: match.id,
          gameSlug: "ludo-league",
          seasonId: match.seasonId ?? "season-1",
          winnerUserId: joinedPlayers[0].userId,
          loserUserId: disconnectedPlayers[0].userId,
          outcome: "abandoned_win",
        });
        return { ...match, status: "finished" as const };
      }
    }

    if (
      allDisconnected &&
      ["waiting", "in_progress"].includes(match.status) &&
      lastActivityAt + ABANDONMENT_GRACE_MS <= now.getTime()
    ) {
      await tx
        .update(matches)
        .set({ status: "cancelled" })
        .where(eq(matches.id, matchId));
      return { ...match, status: "cancelled" as const };
    }

    // Self-healing: if a match has 2 players in waiting room, transition to in_progress
    if (match.status === "waiting" && players.length >= 2) {
      let canStart = false;
      if (!isWageredMatch(match)) {
        canStart = true;
      } else {
        const playerIntents = players.map(p => p.paymentIntentId).filter(Boolean);
        if (playerIntents.length === 2) {
          const intents = await tx
            .select()
            .from(paymentIntents)
            .where(inArray(paymentIntents.id, playerIntents as string[]));
          canStart = intents.length === 2 && intents.every(pi => pi.status === "verified");
        }
      }

      if (canStart) {
        const playExpiresAt = matchPlayWindowExpiry();
        await tx
          .update(matchPlayers)
          .set({ status: "joined", lastSeenAt: now })
          .where(eq(matchPlayers.matchId, matchId));
        await tx
          .update(matches)
          .set({ status: "in_progress", expiresAt: playExpiresAt })
          .where(eq(matches.id, matchId));
        notifyMatchUpdated(matchId);
        return { ...match, status: "in_progress" as const, expiresAt: playExpiresAt };
      }
    }

    return match;
  });
}

export async function sweepMatchLifecycle(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const active = await db
    .select({ id: matches.id })
    .from(matches)
    .where(inArray(matches.status, ["waiting", "in_progress"]));
  let changed = 0;
  for (const row of active) {
    const result = await refreshMatchLifecycle(row.id, now);
    if (result?.status === "expired" || result?.status === "cancelled") {
      changed += 1;
    } else if (result?.status === "in_progress" && result.joinCode?.startsWith("BOT")) {
      // Process Crash Recovery: Resurrect stranded bot turn if inactive for > 4s
      try {
        const snap = JSON.parse(result.stateJson);
        if (snap?.currentPlayer === 1 && snap?.winner === null && !botMatchLocks.has(result.id)) {
          const inactiveMs = now.getTime() - result.updatedAt.getTime();
          if (inactiveMs > 4000) {
            void executeBotTurn({ matchId: result.id });
            changed += 1;
          }
        }
      } catch {
        // Safe ignore
      }
    }
  }
  return { changed };
}

export async function joinMatchByCode(input: {
  userId: number;
  joinCode: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db.transaction(async tx => {
    const found = await tx
      .select()
      .from(matches)
      .where(eq(matches.joinCode, input.joinCode.toUpperCase()))
      .limit(1);
    const match = found[0];
    if (!match) throw new Error("Challenge code is invalid.");
    if (
      match.expiresAt.getTime() <= Date.now() ||
      match.status === "expired" ||
      match.status === "cancelled"
    ) {
      if (match.status !== "expired")
        await tx
          .update(matches)
          .set({ status: "expired" })
          .where(eq(matches.id, match.id));
      throw new Error("This match is no longer available.");
    }
    const existing = await tx
      .select()
      .from(matchPlayers)
      .where(
        and(
          eq(matchPlayers.matchId, match.id),
          eq(matchPlayers.userId, input.userId)
        )
      )
      .limit(1);
    const seats = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, match.id));
    if (existing[0]) {
      let currentMatch = match;
      if (seats.length >= 2 && !isWageredMatch(match) && match.status === "waiting") {
        const playExpiresAt = matchPlayWindowExpiry();
        await tx
          .update(matches)
          .set({ status: "in_progress", expiresAt: playExpiresAt })
          .where(eq(matches.id, match.id));
        currentMatch = { ...match, status: "in_progress" as const, expiresAt: playExpiresAt };
      }
      return { match: currentMatch, player: existing[0], allPlayers: seats };
    }
    if (seats.length >= 2)
      throw new Error("This match already has two players.");
    await tx.insert(matchPlayers).values({
      matchId: match.id,
      userId: input.userId,
      seat: 1,
      status: "joined",
    });
    // A wagered match stays in the waiting room until both stakes are
    // verified; claiming the second deposit starts it. Previously play began
    // the moment someone joined, so a whole match could be played out and
    // "settled" against a pot nobody had paid into.
    const nextStatus = isWageredMatch(match)
      ? ("waiting" as const)
      : ("in_progress" as const);

    const playExpiresAt =
      nextStatus === "in_progress" ? matchPlayWindowExpiry() : match.expiresAt;

    if (nextStatus !== match.status) {
      await tx
        .update(matches)
        .set(
          nextStatus === "in_progress"
            ? { status: nextStatus, expiresAt: playExpiresAt }
            : { status: nextStatus }
        )
        .where(eq(matches.id, match.id));
    }
    const player = (
      await tx
        .select()
        .from(matchPlayers)
        .where(
          and(
            eq(matchPlayers.matchId, match.id),
            eq(matchPlayers.userId, input.userId)
          )
        )
        .limit(1)
    )[0];
    if (!player) throw new Error("Player could not be joined.");

    const allPlayers = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, match.id));

    return {
      match: { ...match, status: nextStatus, expiresAt: playExpiresAt },
      player,
      allPlayers,
    };
  });

  // Real-time broadcast AFTER transaction has committed
  try {
    notifyMatchUpdated(result.match.id, {
      id: result.match.id,
      status: result.match.status,
      engineVersion: result.match.engineVersion,
      stateVersion: result.match.stateVersion,
      snapshot: JSON.parse(result.match.stateJson),
      players: (result.allPlayers || []).map((item: any) => ({
        seat: item.seat,
        status: item.status,
        lastSeenAt: item.lastSeenAt,
      })),
    });
  } catch (notifyErr) {
    console.warn("[joinMatchByCode] notifyMatchUpdated error:", notifyErr);
  }

  return {
    match: result.match,
    player: result.player,
  };
}

export async function forceStartMatch(input: {
  matchId: string;
  userId: number;
}): Promise<{ success: boolean; match: Match }> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");

  const result = await db.transaction(async tx => {
    const match = (
      await tx.select().from(matches).where(eq(matches.id, input.matchId)).limit(1)
    )[0];
    if (!match) throw new Error("Match not found.");

    if (match.status === "in_progress") {
      return { match, alreadyStarted: true };
    }

    if (["finished", "cancelled", "expired"].includes(match.status)) {
      throw new Error(`Match has already ${match.status}.`);
    }

    const players = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, input.matchId));

    const callerSeat = players.find(p => p.userId === input.userId);
    if (!callerSeat) {
      throw new Error("You are not a participant in this match.");
    }

    if (players.length < 2) {
      throw new Error("Waiting for an opponent to connect before starting.");
    }

    // Check wager escrow requirements
    if (isWageredMatch(match)) {
      const escrowDetails = await getMatchEscrowDetails(input.matchId);
      if (escrowDetails.isWagered && !escrowDetails.allVerified) {
        const callerStatus = escrowDetails.playerStatuses.find(p => p.userId === input.userId);
        if (!callerStatus?.verified) {
          throw new Error("Please lock your NIM stake into escrow before starting.");
        }
        throw new Error("Waiting for opponent to lock their wager stake into escrow.");
      }
    }

    const now = new Date();
    const playExpiresAt = matchPlayWindowExpiry();

    // Touch all players' lastSeenAt and ensure joined
    await tx
      .update(matchPlayers)
      .set({ status: "joined", lastSeenAt: now })
      .where(eq(matchPlayers.matchId, input.matchId));

    await tx
      .update(matches)
      .set({
        status: "in_progress",
        expiresAt: playExpiresAt,
        updatedAt: now,
      })
      .where(eq(matches.id, input.matchId));

    const updatedMatch: Match = {
      ...match,
      status: "in_progress" as const,
      expiresAt: playExpiresAt,
      updatedAt: now,
    };

    return { match: updatedMatch, alreadyStarted: false, players };
  });

  try {
    notifyMatchUpdated(result.match.id, {
      id: result.match.id,
      status: result.match.status,
      engineVersion: result.match.engineVersion,
      stateVersion: result.match.stateVersion,
      snapshot: JSON.parse(result.match.stateJson),
      players: (result.players || []).map((item: any) => ({
        seat: item.seat,
        status: "joined",
        lastSeenAt: new Date(),
      })),
    });
  } catch (notifyErr) {
    console.warn("[forceStartMatch] notifyMatchUpdated error:", notifyErr);
  }

  return { success: true, match: result.match };
}

export async function getMatchPlayers(matchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  return db
    .select({
      id: matchPlayers.id,
      matchId: matchPlayers.matchId,
      userId: matchPlayers.userId,
      seat: matchPlayers.seat,
      paymentIntentId: matchPlayers.paymentIntentId,
      status: matchPlayers.status,
      joinedAt: matchPlayers.joinedAt,
      updatedAt: matchPlayers.updatedAt,
      lastSeenAt: matchPlayers.lastSeenAt,
      name: users.name,
      address: users.address,
    })
    .from(matchPlayers)
    .leftJoin(users, eq(matchPlayers.userId, users.id))
    .where(eq(matchPlayers.matchId, matchId));
}

export async function getActiveSeason(): Promise<Season | null> {
  const db = await getDb();
  if (!db) throw new Error("Season service is unavailable. Database connection is required.");
  await ensureDefaultSeasonsSeeded(db);
  const active = await db
    .select()
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  return active[0] ?? null;
}

export async function settleMatchRating(
  tx: any,
  input: {
    matchId: string;
    gameSlug: string;
    seasonId?: string;
    winnerUserId: number;
    loserUserId: number;
    outcome?: "win" | "abandoned_win";
  }
) {
  const seasonId = input.seasonId ?? "season-1";
  const outcomeWinner = input.outcome ?? "win";
  const outcomeLoser =
    outcomeWinner === "abandoned_win" ? "abandoned_loss" : "loss";
  const existingHistory = (
    await tx
      .select()
      .from(ratingHistory)
      .where(
        and(
          eq(ratingHistory.matchId, input.matchId),
          eq(ratingHistory.userId, input.winnerUserId)
        )
      )
      .limit(1)
  )[0];
  if (existingHistory) return;

  let winnerRatingRow = (
    await tx
      .select()
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.userId, input.winnerUserId),
          eq(playerRatings.gameSlug, input.gameSlug),
          eq(playerRatings.seasonId, seasonId)
        )
      )
      .limit(1)
  )[0];

  if (!winnerRatingRow) {
    await tx.insert(playerRatings).values({
      userId: input.winnerUserId,
      gameSlug: input.gameSlug,
      seasonId: seasonId,
      rating: STARTING_RATING,
    });
    winnerRatingRow = (
      await tx
        .select()
        .from(playerRatings)
        .where(
          and(
            eq(playerRatings.userId, input.winnerUserId),
            eq(playerRatings.gameSlug, input.gameSlug),
            eq(playerRatings.seasonId, seasonId)
          )
        )
        .limit(1)
    )[0]!;
  }

  let loserRatingRow = (
    await tx
      .select()
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.userId, input.loserUserId),
          eq(playerRatings.gameSlug, input.gameSlug),
          eq(playerRatings.seasonId, seasonId)
        )
      )
      .limit(1)
  )[0];

  if (!loserRatingRow) {
    await tx.insert(playerRatings).values({
      userId: input.loserUserId,
      gameSlug: input.gameSlug,
      seasonId: seasonId,
      rating: STARTING_RATING,
    });
    loserRatingRow = (
      await tx
        .select()
        .from(playerRatings)
        .where(
          and(
            eq(playerRatings.userId, input.loserUserId),
            eq(playerRatings.gameSlug, input.gameSlug),
            eq(playerRatings.seasonId, seasonId)
          )
        )
        .limit(1)
    )[0]!;
  }

  const eloResult = calculateElo({
    ratingA: winnerRatingRow.rating,
    ratingB: loserRatingRow.rating,
    outcomeA: "win",
  });

  const newWinnerWins = winnerRatingRow.wins + 1;
  const newWinnerMatches = winnerRatingRow.matchesPlayed + 1;
  const newWinnerStreak = winnerRatingRow.currentStreak + 1;
  const newWinnerBestStreak = Math.max(
    winnerRatingRow.bestStreak,
    newWinnerStreak
  );

  await tx
    .update(playerRatings)
    .set({
      rating: eloResult.newRatingA,
      wins: newWinnerWins,
      matchesPlayed: newWinnerMatches,
      currentStreak: newWinnerStreak,
      bestStreak: newWinnerBestStreak,
    })
    .where(eq(playerRatings.id, winnerRatingRow.id));

  const newLoserLosses = loserRatingRow.losses + 1;
  const newLoserMatches = loserRatingRow.matchesPlayed + 1;
  const newLoserStreak = 0;

  await tx
    .update(playerRatings)
    .set({
      rating: eloResult.newRatingB,
      losses: newLoserLosses,
      matchesPlayed: newLoserMatches,
      currentStreak: newLoserStreak,
    })
    .where(eq(playerRatings.id, loserRatingRow.id));

  await tx.insert(ratingHistory).values([
    {
      matchId: input.matchId,
      userId: input.winnerUserId,
      seasonId: seasonId,
      gameSlug: input.gameSlug,
      previousRating: eloResult.previousRatingA,
      ratingChange: eloResult.changeA,
      newRating: eloResult.newRatingA,
      opponentUserId: input.loserUserId,
      opponentRating: eloResult.previousRatingB,
      outcome: outcomeWinner,
    },
    {
      matchId: input.matchId,
      userId: input.loserUserId,
      seasonId: seasonId,
      gameSlug: input.gameSlug,
      previousRating: eloResult.previousRatingB,
      ratingChange: eloResult.changeB,
      newRating: eloResult.newRatingB,
      opponentUserId: input.winnerUserId,
      opponentRating: eloResult.previousRatingA,
      outcome: outcomeLoser,
    },
  ]);

  await tx
    .update(matches)
    .set({
      winnerUserId: input.winnerUserId,
      loserUserId: input.loserUserId,
      status: "finished",
    })
    .where(eq(matches.id, input.matchId));
}

export async function applyLudoMatchCommand(input: {
  matchId: string;
  userId: number;
  command: LudoServerCommand & { expectedVersion: number; nonce: string };
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db.transaction(async tx => {
    const [[match], [playerFound], [previousEvent]] = await Promise.all([
      tx
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1),
      tx
        .select()
        .from(matchPlayers)
        .where(
          and(
            eq(matchPlayers.matchId, input.matchId),
            eq(matchPlayers.userId, input.userId)
          )
        )
        .limit(1),
      tx
        .select()
        .from(matchEvents)
        .where(
          and(
            eq(matchEvents.matchId, input.matchId),
            eq(matchEvents.commandNonce, input.command.nonce)
          )
        )
        .limit(1),
    ]);

    if (!match) throw new Error("Match not found.");
    if (!playerFound) throw new Error("You are not a joined player in this match.");
    let player = playerFound;
    if (player.status !== "joined") {
      await tx
        .update(matchPlayers)
        .set({ status: "joined", lastSeenAt: new Date() })
        .where(eq(matchPlayers.id, player.id));
      player = { ...player, status: "joined" };
    }

    if (previousEvent)
      return replayStoredMatchEvent<LudoSnapshot, LudoEvent>(previousEvent);

    const snapshot = JSON.parse(match.stateJson) as LudoSnapshot;

    // If rolling on active turn with unrolled dice, or moving with rolled dice, auto-sync version
    // to prevent spurious rejections from rapid turn transitions
    if (
      input.command.kind === "roll" &&
      snapshot.currentPlayer === player.seat &&
      snapshot.dice === null
    ) {
      input.command.expectedVersion = match.stateVersion;
    } else if (
      input.command.kind === "move" &&
      snapshot.currentPlayer === player.seat &&
      snapshot.dice !== null
    ) {
      input.command.expectedVersion = match.stateVersion;
    } else if (match.stateVersion !== input.command.expectedVersion) {
      throw new Error("Match state changed; retry with the latest state.");
    }

    if (match.status !== "in_progress")
      throw new Error("Match is not ready for gameplay.");

    const command: LudoCommand = {
      ...input.command,
      expectedVersion: snapshot.version,
      matchId: input.matchId,
      playerId: player.seat as 0 | 1,
    };
    const engineResult = applyCommand(snapshot, command, () =>
      randomInt(1, 7)
    );
    if (!engineResult.ok)
      throw new Error(`${engineResult.code}: ${engineResult.reason}`);
    const updated = await tx
      .update(matches)
      .set({
        stateVersion: engineResult.snapshot.version,
        stateJson: JSON.stringify(engineResult.snapshot),
        status:
          engineResult.snapshot.winner === null ? "in_progress" : "finished",
      })
      .where(
        and(
          eq(matches.id, input.matchId),
          eq(matches.stateVersion, snapshot.version)
        )
      );
    if (updated[0]?.affectedRows !== 1)
      throw new Error("Match state changed; retry with the latest state.");
    await tx.insert(matchEvents).values({
      matchId: input.matchId,
      version: engineResult.snapshot.version,
      userId: input.userId,
      commandNonce: input.command.nonce,
      commandJson: JSON.stringify(command),
      eventJson: JSON.stringify(engineResult.event),
      snapshotJson: JSON.stringify(engineResult.snapshot),
      resultStatus:
        engineResult.snapshot.winner === null ? "in_progress" : "finished",
    });

    if (engineResult.snapshot.winner !== null) {
      const seats = await tx
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, input.matchId));
      const winnerSeat = engineResult.snapshot.winner;
      const winnerPlayer = seats.find(p => p.seat === winnerSeat);
      const loserPlayer = seats.find(p => p.seat !== winnerSeat);
      if (winnerPlayer && loserPlayer) {
        await settleMatchRating(tx, {
          matchId: input.matchId,
          gameSlug: "ludo-league",
          seasonId: match.seasonId ?? "season-1",
          winnerUserId: winnerPlayer.userId,
          loserUserId: loserPlayer.userId,
          outcome: "win",
        });
      }
    }

    return {
      snapshot: engineResult.snapshot,
      event: engineResult.event,
      status:
        engineResult.snapshot.winner === null ? "in_progress" : "finished",
      idempotent: false,
    };
  });
  if (!result.idempotent) {
    notifyMatchUpdated(input.matchId, {
      id: input.matchId,
      status: result.status,
      engineVersion: "ludo-v1",
      stateVersion: result.snapshot.version,
      snapshot: result.snapshot,
    });
    if (result.status === "in_progress") {
      void maybeScheduleBotTurn(input.matchId, result.snapshot.currentPlayer);
    } else {
      clearBotMatchTimerAndLock(input.matchId);
      if (result.status === "finished") {
        void import("./payout-worker")
          .then(m => m.processMatchPayout(input.matchId))
          .catch(err => console.warn("[PayoutWorker] Ludo auto payout trigger:", err));
      }
    }
  }
  return result;
}

export async function applyConnect4MatchCommand(input: {
  matchId: string;
  userId: number;
  command: { column: number; expectedVersion: number; nonce: string };
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db.transaction(async tx => {
    const [[match], [playerFound], [previousEvent]] = await Promise.all([
      tx
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1),
      tx
        .select()
        .from(matchPlayers)
        .where(
          and(
            eq(matchPlayers.matchId, input.matchId),
            eq(matchPlayers.userId, input.userId)
          )
        )
        .limit(1),
      tx
        .select()
        .from(matchEvents)
        .where(
          and(
            eq(matchEvents.matchId, input.matchId),
            eq(matchEvents.commandNonce, input.command.nonce)
          )
        )
        .limit(1),
    ]);

    if (!match) throw new Error("Match not found.");
    if (!playerFound) throw new Error("You are not a joined player in this match.");
    let player = playerFound;
    if (player.status !== "joined") {
      await tx
        .update(matchPlayers)
        .set({ status: "joined", lastSeenAt: new Date() })
        .where(eq(matchPlayers.id, player.id));
      player = { ...player, status: "joined" };
    }

    if (previousEvent) {
      return replayStoredMatchEvent<Connect4Snapshot, Connect4Event>(
        previousEvent
      );
    }

    if (match.stateVersion !== input.command.expectedVersion) {
      throw new Error("Match state changed; retry with the latest state.");
    }
    if (match.status !== "in_progress") {
      throw new Error("Match is not ready for gameplay.");
    }

    const snapshot = JSON.parse(match.stateJson) as Connect4Snapshot;
    const command: Connect4Command = {
      kind: "drop",
      column: input.command.column,
      playerId: player.seat as 0 | 1,
      matchId: input.matchId,
      expectedVersion: input.command.expectedVersion,
      nonce: input.command.nonce,
    };

    const applyResult = applyConnect4Command(snapshot, command);
    if (!applyResult.ok) {
      throw new Error(applyResult.message);
    }

    const nextSnapshot = applyResult.snapshot;
    const event = applyResult.event;

    await tx
      .update(matches)
      .set({
        stateVersion: nextSnapshot.version,
        stateJson: JSON.stringify(nextSnapshot),
        status: nextSnapshot.winner !== null ? "finished" : "in_progress",
      })
      .where(eq(matches.id, input.matchId));

    await tx.insert(matchEvents).values({
      matchId: input.matchId,
      version: nextSnapshot.version,
      userId: input.userId,
      commandNonce: input.command.nonce,
      commandJson: JSON.stringify(command),
      eventJson: JSON.stringify(event),
      snapshotJson: JSON.stringify(nextSnapshot),
      resultStatus:
        nextSnapshot.winner === null ? "in_progress" : "finished",
    });

    if (
      nextSnapshot.winner !== null &&
      typeof nextSnapshot.winner === "number"
    ) {
      const seats = await tx
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, input.matchId));
      const winnerSeat = nextSnapshot.winner;
      const winnerPlayer = seats.find(p => p.seat === winnerSeat);
      const loserPlayer = seats.find(p => p.seat !== winnerSeat);
      if (winnerPlayer && loserPlayer) {
        await settleMatchRating(tx, {
          matchId: input.matchId,
          gameSlug: "connect-four",
          seasonId: match.seasonId ?? "season-1",
          winnerUserId: winnerPlayer.userId,
          loserUserId: loserPlayer.userId,
          outcome: "win",
        });
      }
    }

    return {
      snapshot: nextSnapshot,
      event,
      status: nextSnapshot.winner === null ? "in_progress" : "finished",
      idempotent: false,
    };
  });

  if (!result.idempotent) {
    notifyMatchUpdated(input.matchId, {
      id: input.matchId,
      status: result.status,
      engineVersion: "connect4-v1",
      stateVersion: result.snapshot.version,
      snapshot: result.snapshot,
    });
    if (result.status === "in_progress") {
      void maybeScheduleBotTurn(input.matchId, result.snapshot.currentPlayer);
    } else {
      clearBotMatchTimerAndLock(input.matchId);
      if (result.status === "finished") {
        void import("./payout-worker")
          .then(m => m.processMatchPayout(input.matchId))
          .catch(err => console.warn("[PayoutWorker] Connect4 auto payout trigger:", err));
      }
    }
  }
  return result;
}

export async function getLeaderboardTop(options?: {
  gameSlug?: string;
  seasonId?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const gameSlug = options?.gameSlug ?? "ludo-league";
  const season = options?.seasonId
    ? { id: options.seasonId }
    : await getActiveSeason();
  const seasonId = season?.id ?? "season-1";
  const limitCount = options?.limit ?? 50;

  const rows = await db
    .select({
      userId: playerRatings.userId,
      userName: users.name,
      rating: playerRatings.rating,
      wins: playerRatings.wins,
      losses: playerRatings.losses,
      matchesPlayed: playerRatings.matchesPlayed,
      currentStreak: playerRatings.currentStreak,
      bestStreak: playerRatings.bestStreak,
    })
    .from(playerRatings)
    .leftJoin(users, eq(playerRatings.userId, users.id))
    .where(
      and(
        eq(playerRatings.gameSlug, gameSlug),
        eq(playerRatings.seasonId, seasonId),
        gt(playerRatings.matchesPlayed, 0)
      )
    )
    .orderBy(desc(playerRatings.rating), desc(playerRatings.wins))
    .limit(limitCount);

  return rows.map((row, index) => {
    const winRate =
      row.matchesPlayed > 0
        ? Math.round((row.wins / row.matchesPlayed) * 100)
        : 0;
    return {
      rank: index + 1,
      userId: row.userId,
      userName: row.userName || `Player ${row.userId}`,
      rating: row.rating,
      wins: row.wins,
      losses: row.losses,
      matchesPlayed: row.matchesPlayed,
      winRate,
      currentStreak: row.currentStreak,
      bestStreak: row.bestStreak,
    };
  });
}

export const getLeaderboard = getLeaderboardTop;

export async function getPlayerStats(input: {
  userId: number;
  gameSlug?: string;
  seasonId?: string;
}) {
  const db = await getDb();
  if (!db)
    return {
      rating: STARTING_RATING,
      rank: null,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      history: [],
    };

  const gameSlug = input.gameSlug ?? "ludo-league";
  const season = input.seasonId
    ? { id: input.seasonId }
    : await getActiveSeason();
  const seasonId = season?.id ?? "season-1";

  const ratingRow = (
    await db
      .select()
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.userId, input.userId),
          eq(playerRatings.gameSlug, gameSlug),
          eq(playerRatings.seasonId, seasonId)
        )
      )
      .limit(1)
  )[0];

  let rank: number | null = null;
  if (ratingRow && ratingRow.matchesPlayed > 0) {
    const higherRated = await db
      .select({ id: playerRatings.id })
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.gameSlug, gameSlug),
          eq(playerRatings.seasonId, seasonId),
          gt(playerRatings.matchesPlayed, 0),
          gt(playerRatings.rating, ratingRow.rating)
        )
      );
    rank = higherRated.length + 1;
  }

  const history = await db
    .select({
      id: ratingHistory.id,
      matchId: ratingHistory.matchId,
      previousRating: ratingHistory.previousRating,
      ratingChange: ratingHistory.ratingChange,
      newRating: ratingHistory.newRating,
      opponentUserId: ratingHistory.opponentUserId,
      opponentName: users.name,
      opponentRating: ratingHistory.opponentRating,
      outcome: ratingHistory.outcome,
      createdAt: ratingHistory.createdAt,
    })
    .from(ratingHistory)
    .leftJoin(users, eq(ratingHistory.opponentUserId, users.id))
    .where(
      and(
        eq(ratingHistory.userId, input.userId),
        eq(ratingHistory.gameSlug, gameSlug),
        eq(ratingHistory.seasonId, seasonId)
      )
    )
    .orderBy(desc(ratingHistory.createdAt))
    .limit(20);

  const wins = ratingRow?.wins ?? 0;
  const losses = ratingRow?.losses ?? 0;
  const matchesPlayed = ratingRow?.matchesPlayed ?? 0;
  const winRate =
    matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  return {
    rating: ratingRow?.rating ?? STARTING_RATING,
    rank,
    wins,
    losses,
    matchesPlayed,
    winRate,
    currentStreak: ratingRow?.currentStreak ?? 0,
    bestStreak: ratingRow?.bestStreak ?? 0,
    history: history.map(h => ({
      id: h.id,
      matchId: h.matchId,
      previousRating: h.previousRating,
      ratingChange: h.ratingChange,
      newRating: h.newRating,
      outcome: h.outcome,
      opponentName: h.opponentName || `Player ${h.opponentUserId}`,
      opponentRating: h.opponentRating,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * What one seat in this match costs, in Luna.
 *
 * A wagered match carries a root intent whose value is the agreed stake; the
 * flat arena entry fee applies to everything else. Both sides of a wager pay
 * the same, so this is the single source of truth for pricing a seat and for
 * checking, at claim time, that a deposit actually covers it.
 */
export async function requiredEntryLunaForMatch(
  // The database handle or an open transaction, as settleMatchRating takes.
  runner: any,
  match: Match
): Promise<number> {
  if (!match.paymentIntentId) return ENV.nimiqArenaEntryValueLuna;

  const rootIntent = (
    await runner
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, match.paymentIntentId))
      .limit(1)
  )[0];

  return rootIntent?.valueLuna ?? ENV.nimiqArenaEntryValueLuna;
}

/** A wagered match is one created with a stake attached. */
export function isWageredMatch(match: Match): boolean {
  return Boolean(match.paymentIntentId);
}

/** Intent states that can still become a payment, so are worth reusing. */
const REUSABLE_INTENT_STATUSES = [
  "created",
  "confirmation_pending",
  "submitted",
];

export async function createPaymentIntent(input: {
  userId: number;
  clientNonce: string;
  /** Prices the intent for a specific seat instead of the flat entry fee. */
  matchId?: string;
}): Promise<PaymentIntent> {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");
  if (!ENV.nimiqPaymentRecipient)
    throw new Error("Nimiq payment recipient is not configured.");

  if (
    !Number.isSafeInteger(ENV.nimiqArenaEntryValueLuna) ||
    ENV.nimiqArenaEntryValueLuna <= 0
  ) {
    throw new Error("Arena entry amount is not configured.");
  }

  // Pricing a seat: charge the stake this match was created with, not the flat
  // entry fee. Without this a player could enter a 10,000 NIM wager for 1 NIM.
  let valueLuna = ENV.nimiqArenaEntryValueLuna;
  if (input.matchId) {
    const match = await getMatchById(input.matchId);
    if (!match) throw new Error("Match not found.");

    const seat = await getMatchPlayer(input.matchId, input.userId);
    if (!seat) throw new Error("You are not a participant in this match.");

    valueLuna = await requiredEntryLunaForMatch(db, match);

    // The host's stake intent is created with the match; reuse it rather than
    // stranding it and charging them through a second one.
    if (seat.paymentIntentId) {
      const seatIntent = (
        await db
          .select()
          .from(paymentIntents)
          .where(eq(paymentIntents.id, seat.paymentIntentId))
          .limit(1)
      )[0];

      if (
        seatIntent &&
        seatIntent.userId === input.userId &&
        seatIntent.valueLuna >= valueLuna &&
        seatIntent.expiresAt.getTime() > Date.now() &&
        REUSABLE_INTENT_STATUSES.includes(seatIntent.status)
      ) {
        return seatIntent;
      }
    }
  }

  const existing = await db
    .select()
    .from(paymentIntents)
    .where(
      and(
        eq(paymentIntents.userId, input.userId),
        eq(paymentIntents.clientNonce, input.clientNonce)
      )
    )
    .limit(1);
  if (existing[0] && existing[0].expiresAt.getTime() > Date.now())
    return existing[0];

  const id = nanoid(20);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(paymentIntents).values({
    id,
    userId: input.userId,
    recipient: ENV.nimiqPaymentRecipient,
    valueLuna,
    clientNonce: input.clientNonce,
    status: "created",
    expiresAt,
  });
  const created = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Payment intent could not be created.");
  return created[0];
}

export async function getPaymentIntentForUser(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");
  const result = await db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.id, id), eq(paymentIntents.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updatePaymentIntent(
  id: string,
  userId: number,
  values: Partial<
    Pick<
      PaymentIntent,
      | "status"
      | "transactionHash"
      | "failureCode"
      | "senderAddress"
      | "blockNumber"
      | "confirmations"
      | "networkId"
      | "verifiedAt"
    >
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");
  await db
    .update(paymentIntents)
    .set(values)
    .where(and(eq(paymentIntents.id, id), eq(paymentIntents.userId, userId)));
  return getPaymentIntentForUser(id, userId);
}

/**
 * True when an error is MySQL's duplicate-key rejection.
 *
 * Drizzle wraps driver errors, so the original code and errno live somewhere
 * down the cause chain rather than on the error itself.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  let current: any = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (current.code === "ER_DUP_ENTRY" || current.errno === 1062) return true;
    current = current.cause;
  }
  return false;
}

/**
 * Authoritatively verifies a payment intent against the Nimiq blockchain.
 * Updates state machine, checks duplicate consumption, and records an audit log.
 */
export async function verifyPaymentIntent(input: {
  id: string;
  userId: number;
  rpcUrl?: string;
}): Promise<{
  success: boolean;
  intent: PaymentIntent;
  verification?: PaymentVerification;
  failureReason?: string;
  errorMessage?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");

  const intent = await getPaymentIntentForUser(input.id, input.userId);
  if (!intent) throw new Error("Payment intent not found.");

  // Idempotency: If already verified, return directly with latest audit log
  if (intent.status === "verified") {
    const latestAudit = (
      await db
        .select()
        .from(paymentVerifications)
        .where(eq(paymentVerifications.paymentIntentId, intent.id))
        .orderBy(desc(paymentVerifications.createdAt))
        .limit(1)
    )[0];
    return {
      success: true,
      intent,
      verification: latestAudit,
    };
  }

  if (intent.expiresAt.getTime() <= Date.now()) {
    await updatePaymentIntent(intent.id, input.userId, {
      status: "expired",
      failureCode: "Payment intent expired before verification",
    });
    const updated = (await getPaymentIntentForUser(intent.id, input.userId))!;
    return {
      success: false,
      intent: updated,
      failureReason: "expired",
      errorMessage: "Payment intent expired",
    };
  }

  const txHash = intent.transactionHash;
  if (!txHash) {
    throw new Error("No transaction hash has been submitted for this payment intent.");
  }

  // 1. Move to verifying state
  await updatePaymentIntent(intent.id, input.userId, { status: "verifying" });

  // 2. Check for duplicate hash replay across all other verified intents
  const duplicate = (
    await db
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.transactionHash, txHash),
          eq(paymentIntents.status, "verified")
        )
      )
      .limit(1)
  )[0];

  if (duplicate && duplicate.id !== intent.id) {
    await updatePaymentIntent(intent.id, input.userId, {
      status: "duplicate",
      failureCode: "duplicate",
    });
    const updated = (await getPaymentIntentForUser(intent.id, input.userId))!;
    const [audit] = await db
      .insert(paymentVerifications)
      .values({
        paymentIntentId: intent.id,
        transactionHash: txHash,
        status: "duplicate",
        failureReason: "duplicate",
        rawResponseJson: JSON.stringify({ duplicateOfIntentId: duplicate.id }),
      })
      .$returningId();
    const verification = (
      await db
        .select()
        .from(paymentVerifications)
        .where(eq(paymentVerifications.id, audit.id))
        .limit(1)
    )[0];
    return {
      success: false,
      intent: updated,
      verification,
      failureReason: "duplicate",
      errorMessage: `Duplicate transaction hash already claimed by intent ${duplicate.id}`,
    };
  }

  // 3. Perform authoritative blockchain verification
  const verifyResult = await verifyNimiqPayment({
    transactionHash: txHash,
    expectedRecipient: intent.recipient,
    expectedValueLuna: intent.valueLuna,
    // The payer writes the intent id into the transaction, so a transfer can
    // only settle the intent it was actually made for.
    expectedData: intent.id,
    // Verify against the network this deployment is configured for, rather
    // than defaulting to testnet regardless of configuration.
    expectedNetworkId: ENV.nimiqNetworkId,
    rpcUrl: input.rpcUrl ?? ENV.nimiqRpcUrl,
    minConfirmations: 1,
  });

  if (verifyResult.success && verifyResult.transaction) {
    const tx = verifyResult.transaction;

    // The pre-check above ran before the chain call, so another request could
    // have verified this same hash while we were waiting on the network. The
    // check and the write therefore happen together: the locking read
    // serialises concurrent verifications of one hash, and the unique index on
    // verifiedTransactionHash is the backstop if one slips past anyway.
    let claimedByOtherIntent: string | null = null;
    try {
      await db.transaction(async trx => {
        const rival = (
          await trx
            .select()
            .from(paymentIntents)
            .where(
              and(
                eq(paymentIntents.transactionHash, txHash),
                eq(paymentIntents.status, "verified")
              )
            )
            .limit(1)
            .for("update")
        )[0];

        if (rival && rival.id !== intent.id) {
          claimedByOtherIntent = rival.id;
          return;
        }

        await trx
          .update(paymentIntents)
          .set({
            status: "verified",
            senderAddress: tx.from,
            blockNumber: tx.blockNumber,
            confirmations: tx.confirmations,
            networkId: tx.networkId,
            verifiedAt: new Date(),
            failureCode: null,
          })
          .where(
            and(
              eq(paymentIntents.id, intent.id),
              eq(paymentIntents.userId, input.userId)
            )
          );
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const rival = (
        await db
          .select()
          .from(paymentIntents)
          .where(
            and(
              eq(paymentIntents.transactionHash, txHash),
              eq(paymentIntents.status, "verified")
            )
          )
          .limit(1)
      )[0];
      claimedByOtherIntent = rival?.id ?? "another intent";
    }

    if (claimedByOtherIntent) {
      await updatePaymentIntent(intent.id, input.userId, {
        status: "duplicate",
        failureCode: "duplicate",
      });
      const updatedDuplicate = (await getPaymentIntentForUser(
        intent.id,
        input.userId
      ))!;
      const [dupAudit] = await db
        .insert(paymentVerifications)
        .values({
          paymentIntentId: intent.id,
          transactionHash: txHash,
          status: "duplicate",
          failureReason: "duplicate",
          rawResponseJson: JSON.stringify({
            duplicateOfIntentId: claimedByOtherIntent,
          }),
        })
        .$returningId();
      const dupVerification = (
        await db
          .select()
          .from(paymentVerifications)
          .where(eq(paymentVerifications.id, dupAudit.id))
          .limit(1)
      )[0];
      return {
        success: false,
        intent: updatedDuplicate,
        verification: dupVerification,
        failureReason: "duplicate",
        errorMessage: `Duplicate transaction hash already claimed by intent ${claimedByOtherIntent}`,
      };
    }

    const updated = (await getPaymentIntentForUser(intent.id, input.userId))!;

    const [audit] = await db
      .insert(paymentVerifications)
      .values({
        paymentIntentId: intent.id,
        transactionHash: txHash,
        status: "verified",
        sender: tx.from,
        recipient: tx.to,
        valueLuna: tx.value,
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations,
        networkId: tx.networkId,
        executionResult: tx.executionResult ?? true,
        rawResponseJson: JSON.stringify(verifyResult.rawResponse),
      })
      .$returningId();

    const verification = (
      await db
        .select()
        .from(paymentVerifications)
        .where(eq(paymentVerifications.id, audit.id))
        .limit(1)
    )[0];

    return {
      success: true,
      intent: updated,
      verification,
    };
  }

  // Failure path: Map explicit failure code
  const failureStatus =
    verifyResult.failureReason === "underpaid"
      ? "underpaid"
      : verifyResult.failureReason === "wrong_recipient"
      ? "wrong_recipient"
      : verifyResult.failureReason === "invalid" ||
        // A transfer that names another intent is not a payment for this one.
        verifyResult.failureReason === "data_mismatch"
      ? "invalid"
      : "verification_failed";

  await updatePaymentIntent(intent.id, input.userId, {
    status: failureStatus,
    failureCode: verifyResult.failureReason ?? "verification_failed",
  });
  const updated = (await getPaymentIntentForUser(intent.id, input.userId))!;

  const [audit] = await db
    .insert(paymentVerifications)
    .values({
      paymentIntentId: intent.id,
      transactionHash: txHash,
      status: failureStatus,
      failureReason: verifyResult.failureReason,
      rawResponseJson: JSON.stringify(verifyResult.rawResponse),
    })
    .$returningId();

  const verification = (
    await db
      .select()
      .from(paymentVerifications)
      .where(eq(paymentVerifications.id, audit.id))
      .limit(1)
    )[0];

  return {
    success: false,
    intent: updated,
    verification,
    failureReason: verifyResult.failureReason,
    errorMessage: verifyResult.errorMessage,
  };
}

/**
 * Returns payment intent details with verification audit log and match eligibility.
 */
export async function getPaymentIntentWithAudit(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");

  const intent = await getPaymentIntentForUser(id, userId);
  if (!intent) return undefined;

  const verifications = await db
    .select()
    .from(paymentVerifications)
    .where(eq(paymentVerifications.paymentIntentId, id))
    .orderBy(desc(paymentVerifications.createdAt));

  // Check if already claimed for a match
  const claimedPlayer = (
    await db
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.paymentIntentId, id))
      .limit(1)
  )[0];

  const claimedMatch = (
    await db
      .select()
      .from(matches)
      .where(eq(matches.paymentIntentId, id))
      .limit(1)
  )[0];

  const isClaimed = Boolean(claimedPlayer || claimedMatch);
  const isEligibleForMatch = intent.status === "verified" && !isClaimed;

  return {
    intent,
    verifications,
    isEligibleForMatch,
    claimedMatchId: claimedPlayer?.matchId || claimedMatch?.id || null,
  };
}

/**
 * Claims a verified payment intent for a match entry.
 * Prevents double entry or claiming an unverified intent.
 */
export async function claimVerifiedPaymentForMatch(input: {
  matchId: string;
  userId: number;
  paymentIntentId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match payment service is unavailable.");

  const result = await db.transaction(async tx => {
    const match = (
      await tx.select().from(matches).where(eq(matches.id, input.matchId)).limit(1)
    )[0];
    if (!match) throw new Error("Match not found.");

    // The update below silently affected no rows when the caller held no seat,
    // and still reported success.
    const seat = (
      await tx
        .select()
        .from(matchPlayers)
        .where(
          and(
            eq(matchPlayers.matchId, input.matchId),
            eq(matchPlayers.userId, input.userId)
          )
        )
        .limit(1)
    )[0];
    if (!seat) throw new Error("You are not a participant in this match.");

    const intent = (
      await tx
        .select()
        .from(paymentIntents)
        .where(
          and(
            eq(paymentIntents.id, input.paymentIntentId),
            eq(paymentIntents.userId, input.userId)
          )
        )
        .limit(1)
    )[0];

    if (!intent) throw new Error("Payment intent not found.");
    if (intent.status !== "verified") {
      throw new Error(
        `Payment is not verified (current status: ${intent.status}). Cannot enter paid match.`
      );
    }

    // A verified intent proves a payment happened, not that it covers this
    // seat. Without this, a flat-fee entry intent buys into any stake.
    const requiredLuna = await requiredEntryLunaForMatch(tx, match);
    if (intent.valueLuna < requiredLuna) {
      throw new Error(
        `Deposit of ${intent.valueLuna} Luna does not cover the ${requiredLuna} Luna entry for this match.`
      );
    }

    const existingClaim = (
      await tx
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.paymentIntentId, input.paymentIntentId))
        .limit(1)
    )[0];

    if (existingClaim && existingClaim.matchId !== input.matchId) {
      throw new Error("Payment intent has already been used for another match.");
    }

    await tx
      .update(matchPlayers)
      .set({ paymentIntentId: input.paymentIntentId })
      .where(
        and(
          eq(matchPlayers.matchId, input.matchId),
          eq(matchPlayers.userId, input.userId)
        )
      );

    // With both stakes in hand the wagered match can start. Joining no longer
    // does this, so play waits on escrow rather than on trust.
    let escrowFunded = false;
    if (isWageredMatch(match)) {
      const seats = await tx
        .select()
        .from(matchPlayers)
        .where(eq(matchPlayers.matchId, input.matchId));

      const funded = await Promise.all(
        seats.map(async current => {
          const seatIntentId =
            current.userId === input.userId
              ? input.paymentIntentId
              : current.paymentIntentId;
          if (!seatIntentId) return false;

          const seatIntent = (
            await tx
              .select()
              .from(paymentIntents)
              .where(eq(paymentIntents.id, seatIntentId))
              .limit(1)
          )[0];

          return Boolean(
            seatIntent &&
              seatIntent.status === "verified" &&
              seatIntent.valueLuna >= requiredLuna
          );
        })
      );

      escrowFunded = seats.length === 2 && funded.every(Boolean);

      if (escrowFunded && match.status === "waiting") {
        await tx
          .update(matches)
          .set({ status: "in_progress", expiresAt: matchPlayWindowExpiry() })
          .where(
            and(eq(matches.id, input.matchId), eq(matches.status, "waiting"))
          );
      }
    }

    return {
      success: true,
      matchId: input.matchId,
      paymentIntentId: input.paymentIntentId,
      escrowFunded,
    };
  });

  if (result.escrowFunded) {
    try {
      notifyMatchUpdated(input.matchId);
    } catch (e) {
      console.warn("[confirmEscrowDeposit] notifyMatchUpdated error:", e);
    }
  }

  return result;
}

export async function createWageredChallengeMatch(input: {
  userId: number;
  gameSlug: string;
  stakeNim: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active") {
    throw new Error("This game is not available for wagered match creation.");
  }
  if (input.stakeNim < 1 || input.stakeNim > 500000) {
    throw new Error("Stake must be between 1 and 500,000 NIM.");
  }

  const id = nanoid(20);
  const joinCode = `WAG${nanoid(7).replace(/[-_]/g, "A").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, "2p_double", 2);

  // Initial root payment intent for the host's stake
  const hostIntentId = nanoid(20);
  const lunaPerNim = 100_000;
  const valueLuna = Math.floor(input.stakeNim * lunaPerNim);

  await db.transaction(async tx => {
    await tx.insert(paymentIntents).values({
      id: hostIntentId,
      userId: input.userId,
      recipient: normalizeNimiqAddress(ENV.nimiqPaymentRecipient),
      valueLuna,
      status: "created",
      clientNonce: nanoid(24),
      expiresAt,
    });

    await tx.insert(matches).values({
      id,
      gameId: game.id,
      hostUserId: input.userId,
      joinCode,
      visibility: "challenge_friend",
      status: "waiting",
      paymentIntentId: hostIntentId,
      engineVersion,
      stateVersion: snapshot.version,
      stateJson: JSON.stringify(snapshot),
      expiresAt,
    });

    await tx.insert(matchPlayers).values({
      matchId: id,
      userId: input.userId,
      seat: 0,
      paymentIntentId: hostIntentId,
      status: "joined",
    });
  });

  const match = await getMatchById(id);
  if (!match) throw new Error("Wagered match could not be created.");
  return {
    match,
    hostPaymentIntentId: hostIntentId,
    stakeNim: input.stakeNim,
    valueLuna,
  };
}

export async function getMatchEscrowDetails(matchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");

  const match = await getMatchById(matchId);
  if (!match) throw new Error("Match not found.");

  const players = await getMatchPlayers(matchId);
  const isWagered = Boolean(
    match.paymentIntentId || match.joinCode.startsWith("WAG")
  );

  let stakeNim = 0;
  let totalPotNim = 0;
  const playerStatuses: {
    userId: number;
    seat: number;
    paymentIntentId: string | null;
    status: string;
    verified: boolean;
    txHash: string | null;
  }[] = [];

  if (isWagered && match.paymentIntentId) {
    const rootIntent = (
      await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.id, match.paymentIntentId))
        .limit(1)
    )[0];

    if (rootIntent) {
      stakeNim = rootIntent.valueLuna / 100_000;
      totalPotNim = stakeNim * 2;
    }
  }

  for (const p of players) {
    let verified = false;
    let status = "unpaid";
    let txHash: string | null = null;

    if (p.paymentIntentId) {
      const pIntent = (
        await db
          .select()
          .from(paymentIntents)
          .where(eq(paymentIntents.id, p.paymentIntentId))
          .limit(1)
      )[0];
      if (pIntent) {
        status = pIntent.status;
        verified = pIntent.status === "verified";
        txHash = pIntent.transactionHash ?? null;
      }
    }

    playerStatuses.push({
      userId: p.userId,
      seat: p.seat,
      paymentIntentId: p.paymentIntentId,
      status,
      verified,
      txHash,
    });
  }

  const allVerified =
    playerStatuses.length === 2 && playerStatuses.every(p => p.verified);
  const escrowState = !isWagered
    ? "not_wagered"
    : match.status === "finished"
      ? "settled"
      : allVerified
        ? "locked_in_escrow"
        : "pending_deposits";

  return {
    matchId,
    isWagered,
    stakeNim,
    totalPotNim,
    escrowState,
    allVerified,
    playerStatuses,
    treasuryAddress: normalizeNimiqAddress(ENV.nimiqPaymentRecipient),
  };
}

export async function settleMatchWinnerPayout(input: {
  matchId: string;
  winnerUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");

  const match = await getMatchById(input.matchId);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "finished") {
    throw new Error("Match is not finished yet.");
  }
  if (match.winnerUserId !== input.winnerUserId) {
    throw new Error("Winner mismatch for payout settlement.");
  }

  const escrow = await getMatchEscrowDetails(input.matchId);
  const winnerUser = (
    await db
      .select()
      .from(users)
      .where(eq(users.id, input.winnerUserId))
      .limit(1)
  )[0];

  const grossPotNim = escrow.totalPotNim || 0;
  const hasReferrer = Boolean(winnerUser?.referredByUserId);
  const dist = calculatePotDistribution(grossPotNim, hasReferrer);

  // Credit 5% referral earning and points to the referrer if present
  if (hasReferrer && dist.referrerNim > 0 && winnerUser?.referredByUserId) {
    try {
      await db
        .update(users)
        .set({
          referralEarningsNim: sql`${users.referralEarningsNim} + ${Math.round(dist.referrerNim)}`,
          points: sql`${users.points} + ${Math.round(dist.referrerNim * 10)}`,
        })
        .where(eq(users.id, winnerUser.referredByUserId));
    } catch (err) {
      console.warn("[Referral] Failed to credit referrer:", err);
    }
  }

  const protocolFeeNim = Number(
    (dist.builderNim + dist.ecosystemNim + dist.charityNim + dist.referrerNim).toFixed(2)
  ); // 10% platform total
  const netPayoutNim = dist.winnerNim; // 90% Winner
  const isTestnet = ENV.nimiqNetworkId === 5;

  let payoutResult: {
    status?: string;
    payoutTxHash?: string;
    explorerUrl?: string;
    errorMessage?: string;
  } | null = null;
  try {
    const { processMatchPayout } = await import("./payout-worker");
    payoutResult = await processMatchPayout(input.matchId);
  } catch (err) {
    console.warn("[PayoutWorker] settleMatchWinnerPayout execution notice:", err);
  }

  return {
    success: true,
    matchId: input.matchId,
    winnerUserId: input.winnerUserId,
    winnerName: winnerUser?.name || `Player`,
    grossPotNim,
    protocolFeeNim,
    netPayoutNim,
    distribution: {
      winnerNim: dist.winnerNim,
      referrerNim: dist.referrerNim,
      builderNim: dist.builderNim,
      ecosystemNim: dist.ecosystemNim,
      charityNim: dist.charityNim,
    },
    settlementStatus: payoutResult?.status || "ledger_entitlement_confirmed",
    payoutTxHash: payoutResult?.payoutTxHash || null,
    settledAt: new Date().toISOString(),
    network: isTestnet ? "testnet" : "mainnet",
    explorerUrl: payoutResult?.explorerUrl || null,
    notice:
      payoutResult?.errorMessage ||
      (payoutResult?.status === "settled_on_chain"
        ? `Disbursed ${netPayoutNim} NIM directly on-chain to winner's Nimiq wallet.`
        : "Winner pot entitlement (90% of pot) recorded authoritatively on Testnet ledger. Platform allocation: 8% Builder Pool (including Patron revenue share), 2% Referral. Automated on-chain disbursement worker is active."),
  };
}

/* ==========================================================================
   AUTHORITATIVE MATCH HEARTBEAT DAEMON
   Prevents matches from stalling or freezing across server restarts,
   browser backgrounding, dropped SSE streams, or transient network delays.
   ========================================================================== */

let matchHeartbeatTimer: NodeJS.Timeout | null = null;

export function startMatchHeartbeatDaemon(intervalMs = 10000): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return null; // Keep unit tests isolated and deterministic
  }
  if (matchHeartbeatTimer) return matchHeartbeatTimer;

  matchHeartbeatTimer = setInterval(async () => {
    try {
      const db = await getDb();
      if (!db) return;

      const activeMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.status, "in_progress"));

      const now = Date.now();

      for (const match of activeMatches) {
        if (!match.stateJson) continue;

        const isBotMatch = Boolean(match.joinCode?.startsWith("BOT"));
        let snapshot: LudoSnapshot | null = null;
        try {
          snapshot = JSON.parse(match.stateJson);
        } catch {
          continue;
        }

        if (!snapshot || snapshot.winner !== null) continue;

        // Authoritative Bot Heartbeat: If it is Bot's turn and idle for > 1.2s, execute bot step
        if (isBotMatch && snapshot.currentPlayer === 1) {
          const lastUpdatedMs = match.updatedAt ? new Date(match.updatedAt).getTime() : 0;
          const idleMs = now - lastUpdatedMs;

          if (idleMs > 1200 && !botMatchLocks.has(match.id)) {
            scheduleAutonomousBotStep(match.id, 50);
          }
        }
      }
    } catch (err) {
      console.error("[MatchHeartbeat] Tick error:", err);
    }
  }, intervalMs);

  return matchHeartbeatTimer;
}

export function stopMatchHeartbeatDaemon() {
  if (matchHeartbeatTimer) {
    clearInterval(matchHeartbeatTimer);
    matchHeartbeatTimer = null;
  }
}

export async function getActiveMatchesForDirectory(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const list = await db
    .select({
      id: matches.id,
      joinCode: matches.joinCode,
      status: matches.status,
      gameId: matches.gameId,
      stateVersion: matches.stateVersion,
      createdAt: matches.createdAt,
      updatedAt: matches.updatedAt,
      paymentIntentId: matches.paymentIntentId,
    })
    .from(matches)
    .where(or(eq(matches.status, "in_progress"), eq(matches.status, "waiting")))
    .orderBy(desc(matches.updatedAt))
    .limit(limit);

  return list;
}

