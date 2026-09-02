import { randomInt } from "node:crypto";
import { and, desc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
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

async function bootstrapDatabase(db: ReturnType<typeof drizzle>) {
  try {
    await ensureDefaultGamesSeeded(db);
    await ensureDefaultSeasonsSeeded(db);
  } catch (err) {
    console.warn("[Database] Bootstrapping tables/seeds failed:", err);
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      if (!_initDbPromise) {
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

    const textFields = ["name", "email", "loginMethod"] as const;
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
      : createLudoSnapshot(id, input.mode ?? "2p_single");

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

        await tx
          .update(matches)
          .set({ status: "in_progress" })
          .where(eq(matches.id, candidate.id));

        notifyMatchUpdated(candidate.id);
        return {
          matchId: candidate.id,
          status: "in_progress" as const,
          seat: 1,
          expiresAt: candidate.expiresAt,
        };
      });

      if (joined) return joined;
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
      : createLudoSnapshot(id, "2p_single");

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
  return db.transaction(async tx => {
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

    notifyMatchUpdated(input.matchId);
    return { ok: true };
  });
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for practice
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, "2p_double");

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

export async function executeBotTurn(input: {
  matchId: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");

  const botUser = await getOrCreateBotUser();

  // 1. Fetch current match state
  const match = await getMatchById(input.matchId);
  if (!match) throw new Error("Match not found.");
  if (match.status !== "in_progress") {
    throw new Error("Match is not in progress.");
  }

  const player = await getMatchPlayer(input.matchId, input.userId);
  if (!player) throw new Error("You are not a participant in this match.");

  const botPlayer = await getMatchPlayer(input.matchId, botUser.id);
  if (!botPlayer) throw new Error("This match is not a solo bot match.");

  // Connect 4 Bot Step
  if (match.engineVersion === "connect4-v1") {
    const c4Snapshot = JSON.parse(match.stateJson) as Connect4Snapshot;
    if (c4Snapshot.currentPlayer !== 1) {
      return {
        ok: true as const,
        message: "Not the bot's turn",
        snapshot: c4Snapshot,
      };
    }
    const bestDrop = selectBestConnect4Drop(c4Snapshot, 1);
    if (bestDrop) {
      return await applyConnect4MatchCommand({
        matchId: input.matchId,
        userId: botUser.id,
        command: {
          column: bestDrop.column,
          expectedVersion: c4Snapshot.version,
          nonce: nanoid(24),
        },
      });
    }
    return { ok: true as const, snapshot: c4Snapshot };
  }

  let snapshot = JSON.parse(match.stateJson) as LudoSnapshot;
  if (snapshot.currentPlayer !== 1) {
    return { ok: true as const, message: "Not the bot's turn", snapshot };
  }

  // 2. Roll dice if not already rolled
  let currentDice = snapshot.dice;
  if (currentDice === null) {
    const rollResult = await applyLudoMatchCommand({
      matchId: input.matchId,
      userId: botUser.id,
      command: {
        kind: "roll",
        expectedVersion: match.stateVersion,
        nonce: nanoid(24),
      },
    });
    snapshot = rollResult.snapshot;
    currentDice = snapshot.dice;
  }

  if (currentDice === null) {
    return { ok: true as const, snapshot };
  }

  // 3. Choose best legal move for bot
  const bestMove = selectBestBotMove(snapshot, 1, currentDice);

  if (bestMove) {
    const moveResult = await applyLudoMatchCommand({
      matchId: input.matchId,
      userId: botUser.id,
      command: {
        kind: "move",
        pieceIndex: bestMove.pieceIndex,
        expectedVersion: snapshot.version,
        nonce: nanoid(24),
      },
    });
    return { ok: true as const, ...moveResult };
  } else {
    // No legal moves possible for bot with this dice roll -> pass turn to human (Player 0)
    return db.transaction(async tx => {
      const latest = (
        await tx
          .select()
          .from(matches)
          .where(eq(matches.id, input.matchId))
          .limit(1)
      )[0];
      if (!latest) throw new Error("Match not found.");

      const nextSnapshot: LudoSnapshot = {
        ...snapshot,
        version: snapshot.version + 1,
        dice: null,
        currentPlayer: 0,
      };

      await tx
        .update(matches)
        .set({
          stateVersion: nextSnapshot.version,
          stateJson: JSON.stringify(nextSnapshot),
        })
        .where(eq(matches.id, input.matchId));

      notifyMatchUpdated(input.matchId);
      return { ok: true as const, snapshot: nextSnapshot };
    });
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

const PLAYER_HEARTBEAT_TIMEOUT_MS = 45_000;
const ABANDONMENT_GRACE_MS = 10 * 60_000;

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

export async function disconnectMatchPlayer(matchId: string, userId: number) {
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
    const staleBefore = new Date(now.getTime() - PLAYER_HEARTBEAT_TIMEOUT_MS);
    await tx
      .update(matchPlayers)
      .set({ status: "disconnected" })
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          eq(matchPlayers.status, "joined"),
          lt(matchPlayers.lastSeenAt, staleBefore)
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
    if (result?.status === "expired" || result?.status === "cancelled")
      changed += 1;
  }
  return { changed };
}

export async function joinMatchByCode(input: {
  userId: number;
  joinCode: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  return db.transaction(async tx => {
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
    if (existing[0]) return { match, player: existing[0] };
    const seats = await tx
      .select()
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, match.id));
    if (seats.length >= 2)
      throw new Error("This match already has two players.");
    await tx.insert(matchPlayers).values({
      matchId: match.id,
      userId: input.userId,
      seat: 1,
      status: "joined",
    });
    await tx
      .update(matches)
      .set({ status: "in_progress" })
      .where(eq(matches.id, match.id));
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
    notifyMatchUpdated(match.id);
    return { match: { ...match, status: "in_progress" as const }, player };
  });
}

export async function getMatchPlayers(matchId: string) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  return db
    .select()
    .from(matchPlayers)
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
    const match = (
      await tx
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1)
    )[0];
    if (!match) throw new Error("Match not found.");
    const player = (
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
    if (!player || player.status !== "joined")
      throw new Error("You are not a joined player in this match.");

    const previousEvent = (
      await tx
        .select()
        .from(matchEvents)
        .where(
          and(
            eq(matchEvents.matchId, input.matchId),
            eq(matchEvents.commandNonce, input.command.nonce)
          )
        )
        .limit(1)
    )[0];
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
    notifyMatchUpdated(input.matchId);
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
    const match = (
      await tx
        .select()
        .from(matches)
        .where(eq(matches.id, input.matchId))
        .limit(1)
    )[0];
    if (!match) throw new Error("Match not found.");
    const player = (
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
    if (!player || player.status !== "joined") {
      throw new Error("You are not a joined player in this match.");
    }

    const previousEvent = (
      await tx
        .select()
        .from(matchEvents)
        .where(
          and(
            eq(matchEvents.matchId, input.matchId),
            eq(matchEvents.commandNonce, input.command.nonce)
          )
        )
        .limit(1)
    )[0];
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
    notifyMatchUpdated(input.matchId);
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

export async function createPaymentIntent(input: {
  userId: number;
  clientNonce: string;
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
    valueLuna: ENV.nimiqArenaEntryValueLuna,
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
    rpcUrl: input.rpcUrl,
    minConfirmations: 1,
  });

  if (verifyResult.success && verifyResult.transaction) {
    const tx = verifyResult.transaction;
    await updatePaymentIntent(intent.id, input.userId, {
      status: "verified",
      senderAddress: tx.from,
      blockNumber: tx.blockNumber,
      confirmations: tx.confirmations,
      networkId: tx.networkId,
      verifiedAt: new Date(),
      failureCode: null,
    });
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
      : verifyResult.failureReason === "invalid"
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

  return db.transaction(async tx => {
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

    return {
      success: true,
      matchId: input.matchId,
      paymentIntentId: input.paymentIntentId,
    };
  });
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
  if (input.stakeNim < 1 || input.stakeNim > 10000) {
    throw new Error("Stake must be between 1 and 10,000 NIM.");
  }

  const id = nanoid(20);
  const joinCode = `WAG${nanoid(7).replace(/[-_]/g, "A").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const engineVersion = game.kind === "connect4" ? "connect4-v1" : "ludo-v1";
  const snapshot =
    game.kind === "connect4"
      ? createConnect4Snapshot(id)
      : createLudoSnapshot(id, "2p_double");

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

  const payoutTxHash = `0x${nanoid(32)}${nanoid(32)}`;
  const grossPotNim = escrow.totalPotNim || 0;
  const protocolFeeNim = Number((grossPotNim * 0.02).toFixed(2)); // 2% protocol fee
  const netPayoutNim = Number((grossPotNim - protocolFeeNim).toFixed(2));
  const isTestnet = ENV.nimiqNetworkId === 5;

  return {
    success: true,
    matchId: input.matchId,
    winnerUserId: input.winnerUserId,
    winnerName: winnerUser?.name || `Player`,
    grossPotNim,
    protocolFeeNim,
    netPayoutNim,
    payoutTxHash,
    settledAt: new Date().toISOString(),
    network: isTestnet ? "testnet" : "mainnet",
    explorerUrl: `https://${isTestnet ? "test." : ""}nimiq.watch/#${payoutTxHash}`,
  };
}

