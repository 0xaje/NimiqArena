import { randomInt } from "node:crypto";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
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
  playerRatings,
  ratingHistory,
  seasons,
  users,
  type Game,
  type Match,
  type PaymentIntent,
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
} from "../shared/game/ludo-engine";
import { replayStoredMatchEvent } from "../shared/game/match-event";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { notifyMatchUpdated } from "./match-stream";
import { calculateElo, STARTING_RATING } from "./rating-engine";

export type LudoServerCommand =
  | Omit<Extract<LudoCommand, { kind: "roll" }>, "matchId" | "playerId">
  | Omit<Extract<LudoCommand, { kind: "move" }>, "matchId" | "playerId">;

let _db: ReturnType<typeof drizzle> | null = null;

export const DEFAULT_SEASON: InsertSeason = {
  id: "season-1",
  number: 1,
  name: "Season 01: Opening Tables",
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

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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
  if (!db) throw new Error("Game service is unavailable.");
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
}): Promise<Match> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active")
    throw new Error("This game is not available for match creation.");

  const id = nanoid(20);
  const joinCode = nanoid(10).replace(/[-_]/g, "A").toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const snapshot = createLudoSnapshot(id);
  await db.transaction(async tx => {
    await tx.insert(matches).values({
      id,
      gameId: game.id,
      hostUserId: input.userId,
      joinCode,
      visibility: "challenge_friend",
      status: "waiting",
      engineVersion: "ludo-v1",
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
  if (!db) throw new Error("Season service is unavailable.");
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

  // Check if rating history already recorded for this match (idempotency guard)
  const existingHistory = await tx
    .select()
    .from(ratingHistory)
    .where(eq(ratingHistory.matchId, input.matchId))
    .limit(1);

  if (existingHistory.length > 0) {
    return; // Already settled
  }

  // Fetch or default rating for Winner
  const winnerRatingRow = (
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

  // Fetch or default rating for Loser
  const loserRatingRow = (
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

  const currentRatingWinner = winnerRatingRow?.rating ?? STARTING_RATING;
  const currentRatingLoser = loserRatingRow?.rating ?? STARTING_RATING;

  const eloResult = calculateElo({
    ratingA: currentRatingWinner,
    ratingB: currentRatingLoser,
    outcomeA: outcomeWinner,
  });

  // Update or insert winner player_ratings
  if (winnerRatingRow) {
    const nextStreak = winnerRatingRow.currentStreak + 1;
    await tx
      .update(playerRatings)
      .set({
        rating: eloResult.newRatingA,
        wins: winnerRatingRow.wins + 1,
        matchesPlayed: winnerRatingRow.matchesPlayed + 1,
        currentStreak: nextStreak,
        bestStreak: Math.max(winnerRatingRow.bestStreak, nextStreak),
      })
      .where(eq(playerRatings.id, winnerRatingRow.id));
  } else {
    await tx.insert(playerRatings).values({
      userId: input.winnerUserId,
      gameSlug: input.gameSlug,
      seasonId,
      rating: eloResult.newRatingA,
      wins: 1,
      losses: 0,
      currentStreak: 1,
      bestStreak: 1,
      matchesPlayed: 1,
    });
  }

  // Update or insert loser player_ratings
  if (loserRatingRow) {
    await tx
      .update(playerRatings)
      .set({
        rating: eloResult.newRatingB,
        losses: loserRatingRow.losses + 1,
        matchesPlayed: loserRatingRow.matchesPlayed + 1,
        currentStreak: 0,
      })
      .where(eq(playerRatings.id, loserRatingRow.id));
  } else {
    await tx.insert(playerRatings).values({
      userId: input.loserUserId,
      gameSlug: input.gameSlug,
      seasonId,
      rating: eloResult.newRatingB,
      wins: 0,
      losses: 1,
      currentStreak: 0,
      bestStreak: 0,
      matchesPlayed: 1,
    });
  }

  // Record rating history for winner
  await tx.insert(ratingHistory).values({
    matchId: input.matchId,
    userId: input.winnerUserId,
    seasonId,
    gameSlug: input.gameSlug,
    previousRating: currentRatingWinner,
    ratingChange: eloResult.changeA,
    newRating: eloResult.newRatingA,
    opponentUserId: input.loserUserId,
    opponentRating: currentRatingLoser,
    outcome: outcomeWinner,
  });

  // Record rating history for loser
  await tx.insert(ratingHistory).values({
    matchId: input.matchId,
    userId: input.loserUserId,
    seasonId,
    gameSlug: input.gameSlug,
    previousRating: currentRatingLoser,
    ratingChange: eloResult.changeB,
    newRating: eloResult.newRatingB,
    opponentUserId: input.winnerUserId,
    opponentRating: currentRatingWinner,
    outcome: outcomeLoser,
  });

  // Update match record with winnerUserId and loserUserId
  await tx
    .update(matches)
    .set({
      winnerUserId: input.winnerUserId,
      loserUserId: input.loserUserId,
      status: "finished",
    })
    .where(eq(matches.id, input.matchId));
}

export async function getLeaderboard(input?: {
  gameSlug?: string;
  seasonId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Leaderboard service is unavailable.");
  const gameSlug = input?.gameSlug ?? "ludo-league";
  const seasonId = input?.seasonId ?? "season-1";
  const limit = Math.min(input?.limit ?? 50, 100);
  const offset = input?.offset ?? 0;

  const rows = await db
    .select({
      id: playerRatings.id,
      userId: playerRatings.userId,
      rating: playerRatings.rating,
      wins: playerRatings.wins,
      losses: playerRatings.losses,
      currentStreak: playerRatings.currentStreak,
      bestStreak: playerRatings.bestStreak,
      matchesPlayed: playerRatings.matchesPlayed,
      userName: users.name,
      userOpenId: users.openId,
    })
    .from(playerRatings)
    .innerJoin(users, eq(playerRatings.userId, users.id))
    .where(
      and(
        eq(playerRatings.gameSlug, gameSlug),
        eq(playerRatings.seasonId, seasonId)
      )
    )
    .orderBy(desc(playerRatings.rating), desc(playerRatings.wins))
    .limit(limit)
    .offset(offset);

  return rows.map((row, index) => {
    const winRate =
      row.matchesPlayed > 0
        ? Math.round((row.wins / row.matchesPlayed) * 100)
        : 0;
    return {
      rank: offset + index + 1,
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

export async function getPlayerStats(input: {
  userId: number;
  gameSlug?: string;
  seasonId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Profile service is unavailable.");
  const gameSlug = input.gameSlug ?? "ludo-league";
  const seasonId = input.seasonId ?? "season-1";

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

  // Calculate player's current rank position in season
  let rank: number | null = null;
  if (ratingRow) {
    const higher = await db
      .select({ id: playerRatings.id })
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.gameSlug, gameSlug),
          eq(playerRatings.seasonId, seasonId),
          gt(playerRatings.rating, ratingRow.rating)
        )
      );
    rank = higher.length + 1;
  }

  // Fetch recent rating history
  const history = await db
    .select({
      id: ratingHistory.id,
      matchId: ratingHistory.matchId,
      previousRating: ratingHistory.previousRating,
      ratingChange: ratingHistory.ratingChange,
      newRating: ratingHistory.newRating,
      outcome: ratingHistory.outcome,
      opponentUserId: ratingHistory.opponentUserId,
      opponentRating: ratingHistory.opponentRating,
      createdAt: ratingHistory.createdAt,
      opponentName: users.name,
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

    if (match.stateVersion !== input.command.expectedVersion) {
      throw new Error("Match state changed; retry with the latest state.");
    }
    if (match.status !== "in_progress")
      throw new Error("Match is not ready for gameplay.");
    const snapshot = JSON.parse(match.stateJson) as LudoSnapshot;
    const command: LudoCommand = {
      ...input.command,
      matchId: input.matchId,
      playerId: player.seat as 0 | 1,
    };
    const engineResult = applyCommand(snapshot, command, () => randomInt(1, 7));
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
    Pick<PaymentIntent, "status" | "transactionHash" | "failureCode">
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
