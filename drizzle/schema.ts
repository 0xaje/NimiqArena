import {
  boolean,
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

export const seasons = mysqlTable(
  "seasons",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    number: int("number", { unsigned: true }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["upcoming", "active", "ended"])
      .default("active")
      .notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    numberIdx: uniqueIndex("seasons_number_idx").on(table.number),
    statusIdx: index("seasons_status_idx").on(table.status),
  })
);

export const matches = mysqlTable(
  "matches",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    gameId: varchar("gameId", { length: 32 }).notNull(),
    seasonId: varchar("seasonId", { length: 32 }).default("season-1").notNull(),
    hostUserId: int("hostUserId").notNull(),
    winnerUserId: int("winnerUserId"),
    loserUserId: int("loserUserId"),
    paymentIntentId: varchar("paymentIntentId", { length: 32 }),
    joinCode: varchar("joinCode", { length: 16 }).unique().notNull(),
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
    seasonIdx: index("matches_season_idx").on(table.seasonId),
    hostIdx: index("matches_host_idx").on(table.hostUserId),
    winnerIdx: index("matches_winner_idx").on(table.winnerUserId),
    paymentIntentIdx: uniqueIndex("matches_payment_intent_idx").on(table.paymentIntentId),
    joinCodeIdx: uniqueIndex("matches_join_code_idx").on(table.joinCode),
  })
);

export const playerRatings = mysqlTable(
  "player_ratings",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    gameSlug: varchar("gameSlug", { length: 64 }).notNull(),
    seasonId: varchar("seasonId", { length: 32 }).notNull(),
    rating: int("rating").default(1000).notNull(),
    wins: int("wins", { unsigned: true }).default(0).notNull(),
    losses: int("losses", { unsigned: true }).default(0).notNull(),
    currentStreak: int("currentStreak", { unsigned: true })
      .default(0)
      .notNull(),
    bestStreak: int("bestStreak", { unsigned: true }).default(0).notNull(),
    matchesPlayed: int("matchesPlayed", { unsigned: true })
      .default(0)
      .notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userGameSeasonIdx: uniqueIndex("player_ratings_user_game_season_idx").on(
      table.userId,
      table.gameSlug,
      table.seasonId
    ),
    leaderboardIdx: index("player_ratings_leaderboard_idx").on(
      table.seasonId,
      table.gameSlug,
      table.rating
    ),
  })
);

export const ratingHistory = mysqlTable(
  "rating_history",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    matchId: varchar("matchId", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    seasonId: varchar("seasonId", { length: 32 }).notNull(),
    gameSlug: varchar("gameSlug", { length: 64 }).notNull(),
    previousRating: int("previousRating").notNull(),
    ratingChange: int("ratingChange").notNull(),
    newRating: int("newRating").notNull(),
    opponentUserId: int("opponentUserId").notNull(),
    opponentRating: int("opponentRating").notNull(),
    outcome: mysqlEnum("outcome", [
      "win",
      "loss",
      "draw",
      "abandoned_loss",
      "abandoned_win",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    matchUserIdx: uniqueIndex("rating_history_match_user_idx").on(
      table.matchId,
      table.userId
    ),
    userSeasonIdx: index("rating_history_user_season_idx").on(
      table.userId,
      table.seasonId,
      table.createdAt
    ),
  })
);

export const matchPlayers = mysqlTable(
  "match_players",
  {
    id: int("id").autoincrement().primaryKey(),
    matchId: varchar("matchId", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    seat: int("seat", { unsigned: true }).notNull(),
    paymentIntentId: varchar("paymentIntentId", { length: 32 }),
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
    playerPaymentIntentIdx: uniqueIndex("match_players_payment_intent_idx").on(
      table.paymentIntentId
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
      "verifying",
      "verified",
      "rejected",
      "failed",
      "expired",
      "invalid",
      "underpaid",
      "wrong_recipient",
      "duplicate",
      "verification_failed",
    ])
      .default("created")
      .notNull(),
    clientNonce: varchar("clientNonce", { length: 64 }).notNull(),
    transactionHash: varchar("transactionHash", { length: 128 }),
    senderAddress: varchar("senderAddress", { length: 64 }),
    blockNumber: int("blockNumber", { unsigned: true }),
    confirmations: int("confirmations", { unsigned: true }),
    networkId: int("networkId"),
    failureCode: varchar("failureCode", { length: 64 }),
    verifiedAt: timestamp("verifiedAt"),
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
    txHashIdx: index("payment_intents_tx_hash_idx").on(
      table.transactionHash
    ),
  })
);

export const paymentVerifications = mysqlTable(
  "payment_verifications",
  {
    id: int("id", { unsigned: true }).autoincrement().primaryKey(),
    paymentIntentId: varchar("paymentIntentId", { length: 32 }).notNull(),
    transactionHash: varchar("transactionHash", { length: 128 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    sender: varchar("sender", { length: 64 }),
    recipient: varchar("recipient", { length: 64 }),
    valueLuna: int("valueLuna", { unsigned: true }),
    blockNumber: int("blockNumber", { unsigned: true }),
    confirmations: int("confirmations", { unsigned: true }),
    networkId: int("networkId"),
    executionResult: boolean("executionResult"),
    failureReason: varchar("failureReason", { length: 64 }),
    rawResponseJson: text("rawResponseJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    intentIdx: index("payment_verifications_intent_idx").on(table.paymentIntentId),
    txHashIdx: index("payment_verifications_tx_hash_idx").on(table.transactionHash),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;
export type PlayerRating = typeof playerRatings.$inferSelect;
export type InsertPlayerRating = typeof playerRatings.$inferInsert;
export type RatingHistory = typeof ratingHistory.$inferSelect;
export type InsertRatingHistory = typeof ratingHistory.$inferInsert;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type InsertMatchPlayer = typeof matchPlayers.$inferInsert;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type InsertMatchEvent = typeof matchEvents.$inferInsert;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = typeof paymentIntents.$inferInsert;
export type PaymentVerification = typeof paymentVerifications.$inferSelect;
export type InsertPaymentVerification = typeof paymentVerifications.$inferInsert;
