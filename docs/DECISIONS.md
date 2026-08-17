# Decisions

## 2026-08-17 — Courtline Editorial direction

The first product surface uses a contemporary sports-editorial language rather than a generic crypto dashboard. This supports trust, matchday focus, and a visible distinction between actual provider state and unavailable product capabilities.

## 2026-08-17 — Truthful frontend scope

The current project remains frontend-only. No fake balances, players, ratings, leaderboards, matchmaking, multiplayer, payments, or transaction confirmations are included. UI controls for those areas are explicit feature gates.

## 2026-08-17 — Official SDK boundary

The project installs and uses `@nimiq/mini-app-sdk` with the documented `init()` and `listAccounts()` flow. Payment and settlement are deferred until a trusted backend and policy exist; the Hub API is documented as a candidate official payment integration path, not silently approximated.

## 2026-08-17 — Real game records before visual availability

The Arena index now reads Ludo from the backend `games` table. Future titles remain frontend-only informational cards until their own records and availability contracts exist. This prevents the catalog from presenting concepts as playable products.

## 2026-08-17 — Challenge Friend creates a waiting match only

Challenge Friend creates a real backend match ID and invite code with a persisted initial Ludo snapshot. It does not create an opponent, auto-join a second player, start gameplay, or fabricate a result. Joining, command execution, and reconnection are intentionally deferred.

## 2026-08-17 — Shared deterministic engine

The Ludo rules module lives under `shared/game/ludo-engine.ts` so server and client can share the same pure contract while the server remains authoritative. Every command carries a match ID, expected version, player ID, and nonce. Server-owned randomness is passed into the engine rather than generated in the UI.

## 2026-08-17 — Public game detail, protected match access

Game detail is intentionally public because it describes a catalog record and availability, not a user-owned asset. Challenge Friend creation and match-room reads remain protected because they expose user-owned match identifiers and invite state.

## 2026-08-17 — Route verification scope

The Ludo detail page and match-room unavailable state were verified at desktop and mobile breakpoints. The screenshots validate layout and honest loading/error states; they do not claim authenticated match creation or friend joining without a real session.

## 2026-08-17 — Persisted presence and lifecycle ownership

Player presence is represented by authenticated server-written `lastSeenAt` and `status` fields. Lifecycle decisions are made from persisted rows, not browser timers or process-local memory. Stale joined participants become disconnected; expired and abandoned matches transition only through server lifecycle logic.

## 2026-08-17 — SSE recovery without fake real-time claims

The match room uses authenticated SSE, capped exponential reconnect backoff, monotonic state-version resynchronization, and polling/manual refresh fallbacks. A production scheduler is not embedded in the Node process. Cleanup is exposed as a cron-only endpoint, but no Heartbeat schedule or two-client transport verification is claimed until explicitly run.

## 2026-08-17 — Dedicated database and two-client evidence required

Mocked tests are useful contract coverage but are not evidence of real persisted-row behavior or multiplayer. The gated database suite requires a dedicated disposable database URL, and the two-client flow requires two independent authenticated clients. Until both are available, the report must label those results NOT VERIFIED.

## 2026-08-17 — Elo Rating Model & Seasonal Boundaries

Competitive Ludo rankings use standard competitive Elo calibration with $K=32$, starting rating 1000, and a hard floor of 100. Ratings update strictly inside the atomic database transaction that completes a match. Unique constraints on `rating_history(matchId, userId)` protect against duplicate execution. Seasons partition ratings and leaderboards without wiping historical transaction records.

## 2026-08-17 — Server-Authoritative Nimiq PoS JSON-RPC Verification

Payment verification strictly uses server-to-node JSON-RPC 2.0 (`getTransactionByHash`) against public Nimiq PoS (Albatross) nodes. The client is never trusted to determine payment success, amount received, or recipient validity. Reverted executions (`executionResult === false`), underpaid values (`value < valueLuna`), address mismatches, unconfirmed mempool entries, and duplicate hash replays are authoritatively rejected and audited in `payment_verifications`. Match entry gating strictly requires a verified payment intent. Escrow payouts are intentionally deferred to future milestones.
