import {
  int,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const games = mysqlTable(
  "games",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    kind: mysqlEnum("kind", ["ludo"]).notNull(),
    status: mysqlEnum("status", [
      "active",
      "coming_soon",
      "concept",
      "unavailable",
    ])
      .default("unavailable")
      .notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    slugIdx: uniqueIndex("games_slug_idx").on(table.slug),
  })
);

export const matches = mysqlTable(
  "matches",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    gameId: varchar("gameId", { length: 32 }).notNull(),
    hostUserId: int("hostUserId").notNull(),
    joinCode: varchar("joinCode", { length: 12 }).notNull(),
    visibility: mysqlEnum("visibility", ["challenge_friend", "public"])
      .default("challenge_friend")
      .notNull(),
    status: mysqlEnum("status", [
      "waiting",
      "in_progress",
      "finished",
      "cancelled",
      "expired",
    ])
      .default("waiting")
      .notNull(),
    engineVersion: varchar("engineVersion", { length: 16 }).notNull(),
    stateVersion: int("stateVersion", { unsigned: true }).default(0).notNull(),
    stateJson: text("stateJson").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    gameIdx: index("matches_game_idx").on(table.gameId),
    hostIdx: index("matches_host_idx").on(table.hostUserId),
    joinCodeIdx: uniqueIndex("matches_join_code_idx").on(table.joinCode),
  })
);

export const matchPlayers = mysqlTable(
  "match_players",
  {
    id: int("id").autoincrement().primaryKey(),
    matchId: varchar("matchId", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    seat: int("seat", { unsigned: true }).notNull(),
    status: mysqlEnum("status", ["joined", "disconnected", "left"])
      .default("joined")
      .notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  },
  table => ({
    matchIdx: index("match_players_match_idx").on(table.matchId),
    userIdx: index("match_players_user_idx").on(table.userId),
    matchUserIdx: uniqueIndex("match_players_match_user_idx").on(
      table.matchId,
      table.userId
    ),
    matchSeatIdx: uniqueIndex("match_players_match_seat_idx").on(
      table.matchId,
      table.seat
    ),
  })
);

export const matchEvents = mysqlTable(
  "match_events",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    matchId: varchar("matchId", { length: 32 }).notNull(),
    version: int("version", { unsigned: true }).notNull(),
    userId: int("userId").notNull(),
    commandNonce: varchar("commandNonce", { length: 64 }).notNull(),
    commandJson: text("commandJson").notNull(),
    eventJson: text("eventJson").notNull(),
    snapshotJson: text("snapshotJson").notNull(),
    resultStatus: varchar("resultStatus", { length: 32 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    matchVersionIdx: uniqueIndex("match_events_match_version_idx").on(
      table.matchId,
      table.version
    ),
    matchNonceIdx: uniqueIndex("match_events_match_nonce_idx").on(
      table.matchId,
      table.commandNonce
    ),
  })
);

export const paymentIntents = mysqlTable(
  "payment_intents",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    recipient: varchar("recipient", { length: 64 }).notNull(),
    valueLuna: int("valueLuna", { unsigned: true }).notNull(),
    status: mysqlEnum("status", [
      "created",
      "confirmation_pending",
      "submitted",
      "verified",
      "rejected",
      "failed",
      "expired",
    ])
      .default("created")
      .notNull(),
    clientNonce: varchar("clientNonce", { length: 64 }).notNull(),
    transactionHash: varchar("transactionHash", { length: 128 }),
    failureCode: varchar("failureCode", { length: 64 }),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("payment_intents_user_idx").on(table.userId),
    nonceIdx: uniqueIndex("payment_intents_user_nonce_idx").on(
      table.userId,
      table.clientNonce
    ),
    txHashIdx: uniqueIndex("payment_intents_tx_hash_idx").on(
      table.transactionHash
    ),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type InsertMatchPlayer = typeof matchPlayers.$inferInsert;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type InsertMatchEvent = typeof matchEvents.$inferInsert;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = typeof paymentIntents.$inferInsert;
