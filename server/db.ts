import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, games, matches, paymentIntents, users, type Game, type Match, type PaymentIntent } from "../drizzle/schema";
import { createLudoSnapshot } from "../shared/game/ludo-engine";
import { nanoid } from "nanoid";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
      values.role = 'admin';
      updateSet.role = 'admin';
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getGameBySlug(slug: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Game service is unavailable.");
  const result = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return result[0];
}

export async function createChallengeMatch(input: { userId: number; gameSlug: string }): Promise<Match> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const game = await getGameBySlug(input.gameSlug);
  if (!game || game.status !== "active") throw new Error("This game is not available for match creation.");

  const id = nanoid(20);
  const joinCode = nanoid(8).toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const snapshot = createLudoSnapshot(id);
  await db.insert(matches).values({
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
  const created = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  if (!created[0]) throw new Error("Match could not be created.");
  return created[0];
}

export async function getMatchById(id: string): Promise<Match | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Match service is unavailable.");
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0];
}

export async function createPaymentIntent(input: {
  userId: number;
  clientNonce: string;
}): Promise<PaymentIntent> {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");
  if (!ENV.nimiqPaymentRecipient) throw new Error("Nimiq payment recipient is not configured.");

  if (!Number.isSafeInteger(ENV.nimiqArenaEntryValueLuna) || ENV.nimiqArenaEntryValueLuna <= 0) {
    throw new Error("Arena entry amount is not configured.");
  }

  const existing = await db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.userId, input.userId), eq(paymentIntents.clientNonce, input.clientNonce)))
    .limit(1);
  if (existing[0] && existing[0].expiresAt.getTime() > Date.now()) return existing[0];

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
  const created = await db.select().from(paymentIntents).where(eq(paymentIntents.id, id)).limit(1);
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

export async function updatePaymentIntent(id: string, userId: number, values: Partial<Pick<PaymentIntent, "status" | "transactionHash" | "failureCode">>) {
  const db = await getDb();
  if (!db) throw new Error("Payment service is unavailable.");
  await db.update(paymentIntents).set(values).where(and(eq(paymentIntents.id, id), eq(paymentIntents.userId, userId)));
  return getPaymentIntentForUser(id, userId);
}

