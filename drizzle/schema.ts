import { int, index, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
    ]).default("created").notNull(),
    clientNonce: varchar("clientNonce", { length: 64 }).notNull(),
    transactionHash: varchar("transactionHash", { length: 128 }),
    failureCode: varchar("failureCode", { length: 64 }),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdx: index("payment_intents_user_idx").on(table.userId),
    nonceIdx: uniqueIndex("payment_intents_user_nonce_idx").on(table.userId, table.clientNonce),
    txHashIdx: uniqueIndex("payment_intents_tx_hash_idx").on(table.transactionHash),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = typeof paymentIntents.$inferInsert;
