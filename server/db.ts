import { and, eq, inArray, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertGame,
  InsertUser,
  games,
  matchEvents,
  matchPlayers,
  matches,
  paymentIntents,
  users,
  type Game,
  type Match,
  type PaymentIntent,
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

let _db: ReturnType<typeof drizzle> | null = null;

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

type LudoServerCommand =
  | Omit<Extract<LudoCommand, { kind: "roll" }>, "matchId" | "playerId">
  | Omit<Extract<LudoCommand, { kind: "move" }>, "matchId" | "playerId">;

export async function applyLudoMatchCommand(input: {
  matchId: string;
  userId: number;
  command: LudoServerCommand;
}) {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const { randomInt } = await import("node:crypto");
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
