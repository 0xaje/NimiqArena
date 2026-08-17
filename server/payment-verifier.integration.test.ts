import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  matches,
  matchPlayers,
  paymentIntents,
  paymentVerifications,
  users,
} from "../drizzle/schema";
import {
  bootstrapDatabase,
  claimVerifiedPaymentForMatch,
  createChallengeMatch,
  createPaymentIntent,
  getPaymentIntentWithAudit,
  updatePaymentIntent,
  upsertUser,
  verifyPaymentIntent,
} from "./db";
import {
  getNimiqTransaction,
  verifyNimiqPayment,
  normalizeNimiqAddress,
} from "./nimiq-verifier";

const TEST_DB_URL =
  process.env.NIMIQ_ARENA_TEST_DATABASE_URL ||
  "mysql://root:test@127.0.0.1:3307/nimiq_test";
const shouldRunDb = Boolean(process.env.RUN_DB_INTEGRATION_TESTS);

// Real Nimiq Testnet Transaction on chain (Network 5, Albatross PoS)
const REAL_TESTNET_TX_HASH =
  "3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a";
const REAL_TESTNET_RPC = "https://rpc.testnet.nimiqwatch.com";

describe("Real Nimiq PoS Blockchain Live RPC Verification", () => {
  it("queries the live public Nimiq PoS Testnet JSON-RPC endpoint for a real transaction", async () => {
    const { transaction: tx, error } = await getNimiqTransaction(
      REAL_TESTNET_TX_HASH,
      REAL_TESTNET_RPC,
      10000
    );
    expect(error).toBeUndefined();
    expect(tx).not.toBeNull();
    if (tx) {
      expect(tx.hash.toLowerCase()).toBe(REAL_TESTNET_TX_HASH.toLowerCase());
      expect(typeof tx.blockNumber).toBe("number");
      expect(tx.blockNumber).toBeGreaterThan(0);
      expect(typeof tx.from).toBe("string");
      expect(typeof tx.to).toBe("string");
      expect(typeof tx.value).toBe("number");
      expect(tx.value).toBe(402251); // 402,251 Luna
      expect(tx.networkId).toBe(5); // Testnet
      expect(tx.executionResult).toBe(true);
      expect(tx.confirmations).toBeGreaterThanOrEqual(1);
    }
  });

  it("authoritatively verifies real on-chain transaction matching expected recipient and amount", async () => {
    // Normalizing recipient address from live tx
    const expectedRecipient = "NQ0700000000000000000000000000000000";
    const result = await verifyNimiqPayment({
      transactionHash: REAL_TESTNET_TX_HASH,
      expectedRecipient,
      expectedValueLuna: 400000, // <= 402251 Luna transferred
      expectedNetworkId: 5,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(result.success).toBe(true);
    expect(result.failureReason).toBeUndefined();
    expect(result.transaction).toBeDefined();
    expect(result.transaction?.executionResult).toBe(true);
    expect(result.transaction?.networkId).toBe(5);
  });

  it("authoritatively rejects real on-chain transaction with wrong recipient", async () => {
    const wrongRecipient = "NQ81C01NBASE000000000000000000000000";
    const result = await verifyNimiqPayment({
      transactionHash: REAL_TESTNET_TX_HASH,
      expectedRecipient: wrongRecipient,
      expectedValueLuna: 400000,
      expectedNetworkId: 5,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("wrong_recipient");
    expect(result.errorMessage).toMatch(/recipient mismatch/i);
  });

  it("authoritatively rejects real on-chain transaction with underpaid amount", async () => {
    const expectedRecipient = "NQ0700000000000000000000000000000000";
    const result = await verifyNimiqPayment({
      transactionHash: REAL_TESTNET_TX_HASH,
      expectedRecipient,
      expectedValueLuna: 1000000, // Expected 10 NIM (1,000,000 Luna), but tx was 402,251 Luna
      expectedNetworkId: 5,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("underpaid");
    expect(result.errorMessage).toMatch(/underpaid/i);
  });

  it("authoritatively rejects non-existent transaction hash", async () => {
    const nonExistentHash =
      "0000000000000000000000000000000000000000000000000000000000000001";
    const result = await verifyNimiqPayment({
      transactionHash: nonExistentHash,
      expectedRecipient: "NQ0700000000000000000000000000000000",
      expectedValueLuna: 100000,
      expectedNetworkId: 5,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("invalid");
  });
});

const dbSuite = shouldRunDb ? describe : describe.skip;

dbSuite("Gated Database & Live Nimiq Verification Lifecycle Matrix", () => {
  let pool: mysql.Pool;
  let db: ReturnType<typeof drizzle>;
  let hostUserId: number;
  let joinerUserId: number;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NIMIQ_PAYMENT_RECIPIENT =
      "NQ07 0000 0000 0000 0000 0000 0000 0000 0000";
    process.env.NIMIQ_ARENA_ENTRY_VALUE_LUNA = "400000";
    process.env.NIMIQ_NETWORK_ID = "5";
    process.env.NIMIQ_RPC_URL = REAL_TESTNET_RPC;

    pool = mysql.createPool(TEST_DB_URL);
    db = drizzle(pool);

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
        paymentIntentId VARCHAR(32) NULL,
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
        `ALTER TABLE matches ADD COLUMN paymentIntentId VARCHAR(32) NULL;`
      );
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matchId VARCHAR(32) NOT NULL,
        userId INT NOT NULL,
        seat INT UNSIGNED NOT NULL,
        paymentIntentId VARCHAR(32) NULL,
        status ENUM('joined', 'disconnected', 'left') NOT NULL DEFAULT 'joined',
        joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSeenAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX match_players_match_idx (matchId),
        INDEX match_players_user_idx (userId),
        UNIQUE INDEX match_players_match_user_idx (matchId, userId),
        UNIQUE INDEX match_players_match_seat_idx (matchId, seat)
      );
    `);

    try {
      await pool.query(
        `ALTER TABLE match_players ADD COLUMN paymentIntentId VARCHAR(32) NULL;`
      );
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id VARCHAR(32) PRIMARY KEY,
        userId INT NOT NULL,
        recipient VARCHAR(64) NOT NULL,
        valueLuna INT UNSIGNED NOT NULL,
        clientNonce VARCHAR(64) NOT NULL,
        transactionHash VARCHAR(128) NULL,
        senderAddress VARCHAR(64) NULL,
        blockNumber INT UNSIGNED NULL,
        confirmations INT UNSIGNED NULL,
        networkId INT UNSIGNED NULL,
        status ENUM(
          'created',
          'confirmation_pending',
          'submitted',
          'verifying',
          'verified',
          'rejected',
          'failed',
          'expired',
          'invalid',
          'underpaid',
          'wrong_recipient',
          'duplicate',
          'verification_failed'
        ) NOT NULL DEFAULT 'created',
        failureCode VARCHAR(64) NULL,
        expiresAt TIMESTAMP NOT NULL,
        verifiedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX payment_intents_user_idx (userId),
        INDEX payment_intents_tx_idx (transactionHash),
        UNIQUE INDEX payment_intents_user_nonce_idx (userId, clientNonce)
      );
    `);

    try {
      await pool.query(`
        ALTER TABLE payment_intents
        MODIFY COLUMN status ENUM(
          'created',
          'confirmation_pending',
          'submitted',
          'verifying',
          'verified',
          'rejected',
          'failed',
          'expired',
          'invalid',
          'underpaid',
          'wrong_recipient',
          'duplicate',
          'verification_failed'
        ) NOT NULL DEFAULT 'created';
      `);
      await pool.query(`ALTER TABLE payment_intents ADD COLUMN senderAddress VARCHAR(64) NULL;`);
      await pool.query(`ALTER TABLE payment_intents ADD COLUMN blockNumber INT UNSIGNED NULL;`);
      await pool.query(`ALTER TABLE payment_intents ADD COLUMN confirmations INT UNSIGNED NULL;`);
      await pool.query(`ALTER TABLE payment_intents ADD COLUMN networkId INT UNSIGNED NULL;`);
      await pool.query(`ALTER TABLE payment_intents ADD COLUMN verifiedAt TIMESTAMP NULL;`);
    } catch {}

    await pool.query(`DROP TABLE IF EXISTS payment_verifications;`);
    await pool.query(`
      CREATE TABLE payment_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paymentIntentId VARCHAR(32) NOT NULL,
        transactionHash VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL,
        sender VARCHAR(64) NULL,
        recipient VARCHAR(64) NULL,
        valueLuna INT UNSIGNED NULL,
        blockNumber INT UNSIGNED NULL,
        confirmations INT UNSIGNED NULL,
        networkId INT NULL,
        executionResult BOOLEAN NULL,
        failureReason VARCHAR(64) NULL,
        rawResponseJson TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX payment_verifications_intent_idx (paymentIntentId),
        INDEX payment_verifications_tx_idx (transactionHash)
      );
    `);

    try {
      await pool.query(
        `ALTER TABLE payment_intents DROP INDEX payment_intents_tx_hash_idx;`
      );
    } catch {}
    try {
      await pool.query(
        `CREATE INDEX payment_intents_tx_hash_idx ON payment_intents (transactionHash);`
      );
    } catch {}

    // Create test users
    await upsertUser({
      openId: "verify-user-1",
      name: "Payment Verifier Host",
      role: "user",
    });
    await upsertUser({
      openId: "verify-user-2",
      name: "Payment Verifier Joiner",
      role: "user",
    });

    const u1 = (
      await db
        .select()
        .from(users)
        .where(eq(users.openId, "verify-user-1"))
        .limit(1)
    )[0]!;
    const u2 = (
      await db
        .select()
        .from(users)
        .where(eq(users.openId, "verify-user-2"))
        .limit(1)
    )[0]!;
    hostUserId = u1.id;
    joinerUserId = u2.id;

    // Clean up any intents from previous test runs
    await pool.query(`DELETE FROM payment_verifications WHERE paymentIntentId IN (SELECT id FROM payment_intents WHERE userId IN (?, ?));`, [hostUserId, joinerUserId]);
    await pool.query(`DELETE FROM match_players WHERE userId IN (?, ?);`, [hostUserId, joinerUserId]);
    await pool.query(`DELETE FROM matches WHERE hostUserId IN (?, ?);`, [hostUserId, joinerUserId]);
    await pool.query(`DELETE FROM payment_intents WHERE userId IN (?, ?);`, [hostUserId, joinerUserId]);
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("creates a payment intent and authoritatively verifies against real on-chain transaction", async () => {
    const nonce = `pv-nonce-real-${Date.now()}`;
    const intent = await createPaymentIntent({
      userId: hostUserId,
      clientNonce: nonce,
    });

    expect(intent.status).toBe("created");
    expect(intent.recipient).toBe(process.env.NIMIQ_PAYMENT_RECIPIENT);
    expect(intent.valueLuna).toBeGreaterThan(0);

    // Transition to submitted
    await updatePaymentIntent(intent.id, hostUserId, {
      status: "submitted",
      transactionHash: REAL_TESTNET_TX_HASH,
    });

    // Authoritatively verify
    const verification = await verifyPaymentIntent({
      id: intent.id,
      userId: hostUserId,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(verification.success).toBe(true);
    expect(verification.intent.status).toBe("verified");
    expect(verification.intent.blockNumber).toBeGreaterThan(0);
    expect(verification.intent.networkId).toBe(5);
    expect(verification.intent.confirmations).toBeGreaterThanOrEqual(1);
    expect(verification.intent.verifiedAt).not.toBeNull();
    expect(verification.verification).toBeDefined();
    expect(verification.verification?.status).toBe("verified");

    // Check full audit trail
    const audit = await getPaymentIntentWithAudit(intent.id, hostUserId);
    expect(audit).not.toBeNull();
    expect(audit?.intent.status).toBe("verified");
    expect(audit?.verifications.length).toBeGreaterThanOrEqual(1);
    expect(audit?.verifications[0].status).toBe("verified");
  });

  it("rejects duplicate transaction hash submission on a second payment intent", async () => {
    const nonce2 = `pv-nonce-dup-${Date.now()}`;
    const intent2 = await createPaymentIntent({
      userId: joinerUserId,
      clientNonce: nonce2,
    });

    // Submit the SAME transaction hash that was already verified for hostUserId
    await updatePaymentIntent(intent2.id, joinerUserId, {
      status: "submitted",
      transactionHash: REAL_TESTNET_TX_HASH,
    });

    const dupVerification = await verifyPaymentIntent({
      id: intent2.id,
      userId: joinerUserId,
      rpcUrl: REAL_TESTNET_RPC,
    });

    expect(dupVerification.success).toBe(false);
    expect(dupVerification.intent.status).toBe("duplicate");
    expect(dupVerification.errorMessage).toMatch(/already claimed/i);

    const audit = await getPaymentIntentWithAudit(intent2.id, joinerUserId);
    expect(audit?.intent.status).toBe("duplicate");
  });

  it("claims verified payment for match entry and prevents double claim for same match", async () => {
    // 1. Create a challenge match
    const match = await createChallengeMatch({
      userId: hostUserId,
      gameSlug: "ludo-league",
    });

    // 2. Find the verified payment intent from previous test
    const verifiedIntents = await db
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.userId, hostUserId),
          eq(paymentIntents.status, "verified")
        )
      );
    expect(verifiedIntents.length).toBeGreaterThanOrEqual(1);
    const verifiedIntent = verifiedIntents[0];

    // 3. Claim the verified payment for match entry
    const claimResult = await claimVerifiedPaymentForMatch({
      matchId: match.id,
      userId: hostUserId,
      paymentIntentId: verifiedIntent.id,
    });

    expect(claimResult.success).toBe(true);
    expect(claimResult.matchId).toBe(match.id);
    expect(claimResult.paymentIntentId).toBe(verifiedIntent.id);

    const updatedPlayer = (
      await db
        .select()
        .from(matchPlayers)
        .where(
          and(
            eq(matchPlayers.matchId, match.id),
            eq(matchPlayers.userId, hostUserId)
          )
        )
        .limit(1)
    )[0];
    expect(updatedPlayer?.paymentIntentId).toBe(verifiedIntent.id);

    // 4. Try claiming the same payment intent for another match -> must reject
    const match2 = await createChallengeMatch({
      userId: hostUserId,
      gameSlug: "ludo-league",
    });

    await expect(
      claimVerifiedPaymentForMatch({
        matchId: match2.id,
        userId: hostUserId,
        paymentIntentId: verifiedIntent.id,
      })
    ).rejects.toThrow(/already been used/i);
  });

  it("prevents unverified payment from being claimed for match entry", async () => {
    const unverifiedNonce = `pv-nonce-unverified-${Date.now()}`;
    const unverifiedIntent = await createPaymentIntent({
      userId: hostUserId,
      clientNonce: unverifiedNonce,
    });

    const match = await createChallengeMatch({
      userId: hostUserId,
      gameSlug: "ludo-league",
    });

    await expect(
      claimVerifiedPaymentForMatch({
        matchId: match.id,
        userId: hostUserId,
        paymentIntentId: unverifiedIntent.id,
      })
    ).rejects.toThrow(/not verified/i);
  });
});
