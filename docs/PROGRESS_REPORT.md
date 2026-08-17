# Progress Report

## Milestone 01 — Product foundation and provider boundary

**Date:** 2026-08-17

### What was built

Nimiq Arena now has a responsive Courtline Editorial matchroom with branded sidebar navigation, matchday hero artwork, provider status cards, a static board preview, truthful unavailable states, and a real Nimiq Mini App provider initialization path. The wallet button requests accounts only when the official provider is ready; regular browser previews remain clearly labeled and do not fabricate a wallet connection.

The official `@nimiq/mini-app-sdk` dependency was added. Generated assets include the Arena mark, hero artwork, field plate, and token asset. Documentation now covers architecture, Nimiq integration, Ludo engine requirements, security, testing, decisions, and this report.

### Files changed

- `client/src/App.tsx`
- `client/src/pages/Home.tsx`
- `client/src/index.css`
- `client/index.html`
- `ideas.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/LUDO_GAME_ENGINE.md`
- `docs/NIMIQ_INTEGRATION.md`
- `docs/PROGRESS_REPORT.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `package.json` and `pnpm-lock.yaml`

### Tests performed

`pnpm check` passed. `pnpm exec vitest run` passed with 1 test file and 3 tests. `pnpm build` passed, with a non-blocking Vite warning that the main JavaScript chunk is larger than 500 kB. The dev server was restarted after dependency installation, and the final page was captured in a desktop full-page browser verification pass. The regular browser path correctly stays in provider-preview mode; a real Nimiq Pay approval flow still requires testing inside the host app.

### Known issues

The backend, database, server-authoritative Ludo engine, multiplayer transport, matchmaking, ratings, leaderboard, escrow/payment flow, settlement verification, and reconnection protocol are not implemented. The board preview is not playable by design. The generated asset jobs included a failed token render, so the final UI uses reliable editorial image fallbacks and a deterministic CSS token instead of showing a broken generated placeholder.

### Decisions

The first delivery prioritizes correctness and truthful states over simulated completeness. Official Nimiq documentation is used as the integration source of truth. Payment is deferred until the product has a trusted backend contract and defined payout policy.

### Milestone 02 — NIM payment intent and confirmation flow

**Date:** 2026-08-17

The project was upgraded to a backend-capable stack and now persists payment intents with server-owned recipient, server-owned entry amount in Luna, idempotency nonce, expiry, provider failure state, transaction hash, and explicit lifecycle status. Protected tRPC procedures create intents, mark confirmation pending, record rejected/failed provider outcomes, submit returned transaction hashes, and read intent state. The client calls the official `sendBasicTransaction({ recipient, value })` SDK method only after the intent is created and confirmation-pending.

The UI now exposes a NIM entry card with creating, native confirmation, rejected, failed, submitted, and verification-pending states. A fresh idempotency nonce is generated for each new attempt so a rejected, failed, or expired payment can be retried without reusing a closed intent. The server also creates a fresh intent when an idempotency record has expired.

Verification performed: `pnpm check`, `pnpm test` with 3 test files and 5 tests, `pnpm build`, and a desktop browser screenshot. The retry helper explicitly covers rejected, failed, and expired states. The remaining production gap is a trusted Nimiq transaction verifier that checks the submitted hash, recipient, value, network, and confirmation policy before transitioning an intent to `verified`; the current app correctly stops at `submitted / verification pending`.

### Milestone 03 — Multi-game Arena frontend direction

**Date:** 2026-08-17

The frontend was redesigned from a single Ludo matchroom into a broader Nimiq Arena game destination. The new home experience introduces a platform-level discovery header, featured-game stage, game-library rail, future-game cards, Arena vision rail, and a visible truth panel for Nimiq Pay, NIM entry, and multiplayer availability. Ludo is positioned as the featured first title rather than the entire product. Additional games are clearly labeled `COMING SOON` or `CONCEPT` and do not pretend to be playable.

Research was recorded in `docs/GAMING_PLATFORM_RESEARCH.md`, using current Steam discovery patterns, Epic Games Store category rails, and a game-library UX case study as reference points. The design direction translates those patterns into a Nimiq Arena “Game Room / Matchday Network” system with editorial cards, courtline rules, mono status stamps, tactile imagery, and explicit real/not-live boundaries.

Verification performed: `pnpm check`, `pnpm build`, and desktop/mobile screenshots at 1280px and 390px widths. The Nimiq wallet and payment states remain truthful; no balances, online players, leaderboards, matchmaking, or future games are fabricated.

### Next step

Implement the trusted server-side Nimiq transaction verification worker and connect verified payment intents to real match creation. In parallel, add real game records and availability data to replace the current frontend-only game index.

### Milestone 04 — Real Ludo game and Challenge Friend vertical slice

**Date:** 2026-08-17

The product now has a real backend Game domain and Match domain. The database contains `games` and `matches`; the migration registers the active `ludo-league` product record and persists match IDs, unique invite codes, waiting status, engine version, expiry, state version, and serialized initial Ludo snapshots.

The shared deterministic engine is implemented in `shared/game/ludo-engine.ts`. It validates match identity, expected version, command nonce, turn ownership, dice lifecycle, base entry, home-boundary movement, captures, safe squares, extra turns, and win detection. It returns typed rejections instead of mutating state. Six engine tests cover the core rule and concurrency-safety behaviors.

The backend exposes `game.getBySlug`, protected `match.createChallenge`, and protected `match.getById` procedures. The new Ludo detail page reads the real game record and creates a real Challenge Friend waiting match when authenticated. The match room displays the returned ID and invite code, but explicitly does not simulate a friend, gameplay, results, ratings, matchmaking, or settlement.

Verification performed: `pnpm check` passed, `pnpm test` passed with 7 test files and 18 tests, the Ludo detail page was browser-verified at desktop width, and the production build remains the final required check before checkpointing. The known gaps are authenticated join-by-code, server gameplay-command persistence, reconnection, matchmaking, and trusted on-chain settlement verification.

### Next milestone

Add the authenticated friend-join flow, then expose server-authoritative Ludo commands through an atomic match-event API. Only after that should the playable board UI and real matchmaking queue be connected.

### Milestone commit

The verified vertical slice was committed as `fbada1b` with message `feat: add real ludo match vertical slice`.

### Milestone 05 — Real friend join and authoritative Ludo state boundary

**Date:** 2026-08-17

Matches now persist host and joined-player rows in `match_players`, while `match_events` stores append-only command outcomes with unique `(matchId, version)` and `(matchId, commandNonce)` constraints. Challenge codes are validated server-side for format, expiry, capacity, duplicate joins, and seat assignment. A successful second join transitions the match from `waiting` to `in_progress`; no opponent is created locally.

Protected tRPC procedures now include `match.joinByCode`, participant-only `match.getById`, participant-only `match.state`, and `match.command`. Roll and move requests carry an expected version and nonce. The server supplies the authenticated seat, runs the shared Ludo engine, updates the snapshot with an optimistic version check, and appends the event transactionally. Duplicate nonces replay the prior event rather than applying a command twice.

The frontend now includes `/join` for real challenge-code entry and a match room that renders only the protected authoritative snapshot. The board shows actual server state, server turn, dice, player seats, and rule-derived piece labels. Roll and move controls are enabled only when the snapshot says the authenticated player may act. The room uses short polling and manual refresh as a synchronization foundation; production push transport and reconnect subscriptions are not claimed.

Verification performed: `pnpm check` passed, `pnpm test` passed with 7 test files and 20 tests, `pnpm build` passed with the existing large-chunk warning, and the join/match routes were visually verified at a mobile breakpoint. The current milestone still does not implement Solo, Quick Match, public matchmaking, production real-time push, reconnect heartbeats, abandoned-match cleanup, ratings, settlement, or a documented fairness protocol for money-enabled dice.

### Next milestone

Add authenticated reconnect/presence semantics and a real push transport, then test two real clients joining the same match and receiving the same persisted snapshots before expanding matchmaking.

### Milestone 05 correction

The event table now also persists `snapshotJson` for each command event. Duplicate nonce replay returns the original post-command snapshot and event rather than the latest match snapshot. Migration `0003_natural_carlie_cooper.sql` was reviewed and applied. Formatting checks now pass on all changed files; TypeScript checks, 20 tests, and the production build pass. Backend tests currently cover protected input validation; database-backed success, stale-version, unauthorized-participant, duplicate-replay, and concurrent-conflict integration cases remain required before claiming the command API production-ready.

### Milestone 05 final correction

`match_events` now also stores `resultStatus`. Duplicate nonce replay uses the stored snapshot, event, and original result status, so a later match transition cannot change the replay response. Migration `0004_pretty_shaman.sql` was reviewed and applied. The shared replay regression is included in Vitest; final verification now reports 8 test files and 21 passing tests, with formatting, TypeScript, and production build checks passing.

### Follow-up commit

The exact replay-status correction was committed as `d31350d` with message `fix: preserve exact ludo command replay`.

### Milestone 05 final verification

The backend integration suite now covers successful Challenge Friend join, expired and full-match rejection, duplicate join idempotency, unauthorized command rejection, successful roll, stale-version conflict, duplicate command replay, and concurrent conflict handling. The authenticated SSE stream at `/api/matches/:id/events` is registered server-side and consumed by the match room, with polling/manual refresh fallback. The gated database integration test `server/match.database.integration.test.ts` verifies exact command replay when run with `RUN_DB_INTEGRATION_TESTS=1` against a dedicated test database; the default verification intentionally skips it to avoid touching a non-dedicated database.

The latest default verification reports 10 test files, 31 passing tests, and 1 intentionally skipped database integration test, with formatting, TypeScript, and production build checks passing. No opponent, online presence, matchmaking result, rating, payout, settlement, or production reconnect guarantee is fabricated.

### Final milestone commit

The completed join coverage, exact replay, and authenticated match-state stream milestone was committed as `490baa5` with message `feat: add ludo match state streaming`.

### Milestone 06 — Production-Grade Multiplayer Verification and Reliability

**Date:** 2026-08-17

#### What was built & verified:

1. **Dedicated Database Integration Matrix (`server/match.database.integration.test.ts`)**:
   - Spun up isolated MariaDB test database container (`mysql://root:test@127.0.0.1:3307/nimiq_test`) and executed all 11 database integration dimensions:
     - Match creation with host seat 0 and initial snapshot persistence.
     - Match joining with seat 1 and status transition to `in_progress`.
     - Idempotent duplicate joins returning identical seats.
     - Full match rejection when a 3rd player attempts to join.
     - Match expiration enforcement and idempotent background sweeps.
     - Authoritative roll commands, snapshot version increments, and event persistence in `match_events`.
     - Stale version rejection with optimistic concurrency locking.
     - Duplicate command nonce idempotency and exact replay.
     - Concurrent command execution conflicts (one succeeds, conflicting rejected).
     - Clean transactional rollback on invalid engine commands without version drift.
     - Stale participant disconnection and abandoned active match cancellation after the 10-minute grace period.

2. **Real-Time Hardening & Event-Driven Push (`server/match-stream.ts`)**:
   - Added instant real-time event broadcasting (`matchEventsEmitter`) triggered immediately on player joins, dice rolls, piece moves, heartbeats, and disconnects.
   - Heartbeat comment frames (`: heartbeat <timestamp>\n\n`) emitted every 10 seconds to maintain HTTP connections and prevent intermediary proxy timeout.
   - Clean socket cleanup and listener removal on stream close.

3. **Live Two-Client Multiplayer E2E Verification (`server/two-client-multiplayer.e2e.test.ts`)**:
   - Automated end-to-end test spinning up a real Express HTTP server with tRPC and SSE routes.
   - Created two independent authenticated users (Client A & Client B) with real JWT session tokens.
   - Client A creates match; Client B joins match via join code.
   - Both clients establish real HTTP SSE streams (`/api/matches/:id/events`).
   - Client A rolls dice -> Client B immediately receives new authoritative game state via SSE.
   - Client B attempts out-of-turn command -> rejected with typed error; match state intact.
   - Client A replays duplicate roll nonce -> returns identical replayed result without advancing version.
   - Client A disconnects stream & signals disconnect -> player marked disconnected -> Client A reconnects with heartbeat -> state restored to `joined` with full history intact.

4. **Repository-Wide Verification**:
   - `pnpm format`: passed (all code formatted with Prettier).
   - `pnpm check`: passed (TypeScript `tsc --noEmit` reports 0 errors).
   - `pnpm test`: passed (14 test files, 49 tests passing).
   - `pnpm build`: passed (production client bundle and server bundle built successfully).

#### Scope Boundary Adherence:

No Quick Match, leaderboard, ratings, payouts, settlement, or new games were added, strictly adhering to the multiplayer reliability and verification directive.

### Milestone 07 — Real Rating System, Authoritative Match Completion, Database-Backed Leaderboard & Seasons

**Date:** 2026-08-17

#### What was built & verified:

1. **Deterministic Server Elo Rating Engine (`server/rating-engine.ts`)**:
   - Calibrated competitive Elo formula: Starting rating 1000, K-factor 32, rating floor 100.
   - Guaranteed minimum delta (+1 for winner / -1 for loser) unless bounded by rating floor.
   - Comprehensive unit test suite (`server/rating-engine.test.ts`) verifying expected scores, symmetric adjustments, underdog multipliers, floor clamping, draw calculations, and abandoned outcomes (7/7 unit tests passing).

2. **Database Schema & Data Layer (`drizzle/schema.ts`, `server/db.ts`)**:
   - `seasons` table: seasonal boundaries, numbers, statuses (`active`, `upcoming`, `ended`).
   - `player_ratings` table: seasonal and per-game tracking of Elo rating, wins, losses, win rate, current streak, best streak, and matches played.
   - `rating_history` table: immutable transaction logs capturing matchId, opponent ID, pre/post ratings, delta, and outcome.
   - `matches` table: extended with `winnerUserId`, `loserUserId`, and `seasonId`.

3. **Authoritative & Idempotent Completion Pipeline**:
   - Wired rating settlement into `applyLudoMatchCommand` inside the atomic database transaction when the engine declares a winner.
   - Wired abandonment resolution into `refreshMatchLifecycle` to penalize forfeiting players and award abandoned wins after the 10-minute grace window.
   - Unique constraints on `(matchId, userId)` guarantee zero double counting or duplicate executions on nonce replays.

4. **Real Database-Backed Leaderboard & Player Profile (`server/routers.ts`)**:
   - `season.getActive`: provides live season metadata.
   - `leaderboard.getTop`: queries real database player ratings ordered by rating and wins with calculated win rates and streaks. No fake or hardcoded players.
   - `auth.stats`: queries authenticated user's real rating, season rank, win/loss record, streaks, and last 20 rating transaction history rows.

5. **Frontend UI Real Data Integration**:
   - `client/src/pages/Home.tsx`: Leaderboard section renders live database ranks and honest empty states; Player Profile section displays real competitive metrics and transaction logs.
   - `client/src/pages/MatchRoom.tsx`: Concluded matches display authoritative victory/defeat banners and direct links to the live leaderboard.

6. **Dedicated Real Database Integration Matrix (`server/rating.database.integration.test.ts`)**:
   - Verified active season provisioning and lookup.
   - Verified winner rating gain (+16) and loser rating decrease (-16) on authoritative completion.
   - Verified duplicate completion idempotency and non-replay drift.
   - Verified abandoned match rating settlement and forfeit penalty.
   - Verified leaderboard ordering and ranking calculations against real MariaDB.
   - Verified player profile rank and transaction history retrieval.

### Milestone 08 — Real Nimiq On-Chain Transaction Verification, Payment State Machine & Match Entry Gating

**Date:** 2026-08-17

#### What was built & verified:

1. **Authoritative Nimiq PoS (Albatross) JSON-RPC Verifier (`server/nimiq-verifier.ts`)**:
   - Official protocol query: `getTransactionByHash` against live public Nimiq PoS nodes (`https://rpc.testnet.nimiqwatch.com` / `https://rpc.nimiqwatch.com`).
   - Real-world on-chain verification rules:
     1. Transaction format validation and existence on-chain.
     2. `executionResult === true` (no reverted transactions).
     3. Address normalization and exact match against server-owned recipient address.
     4. Transferred Luna amount $\ge$ expected entry fee (`valueLuna`). Rejects underpaid transactions.
     5. Block confirmation threshold ($\ge 1$). Rejects unconfirmed mempool entries.
     6. Network ID matching (`5` for Testnet, `42` for Mainnet).

2. **Durable Payment State Machine & Audit Layer (`drizzle/schema.ts`, `server/db.ts`)**:
   - Expanded `paymentIntents.status`: `created` -> `confirmation_pending` -> `submitted` -> `verifying` -> `verified` / `rejected` / `failed` / `expired` / `invalid` / `underpaid` / `wrong_recipient` / `duplicate` / `verification_failed`.
   - `payment_verifications` audit table: immutably logs every verification attempt with block number, sender, recipient, value, confirmations, and raw RPC response payload.
   - Match eligibility linkage: `matches.paymentIntentId` and `match_players.paymentIntentId` bind verified payment intents to match entries with duplicate prevention.

3. **Live RPC & Gated Database Integration Test Matrix (`server/payment-verifier.integration.test.ts`)**:
   - Verified against real on-chain Testnet transaction hash `3cd3908a903461dab66cd71910d35c66564ca59983eeeb138dbd0bd93e647b3a` (Network 5, Value 402251 Luna).
   - Proved:
     - Live public RPC query success.
     - Authoritative payment verification on valid amount and recipient.
     - Rejection of wrong recipient (`wrong_recipient`).
     - Rejection of underpaid amount (`underpaid`).
     - Rejection of non-existent hash (`invalid`).
     - Full database persistence of block number, network ID, confirmations, and audit trail.
     - Rejection of duplicate transaction hash replay (`duplicate`).
     - Match entry gating via `claimVerifiedPaymentForMatch` and prevention of double claims.
     - Prevention of unverified payment from being claimed for match entry.

4. **Frontend Truth Panel & Verification Trigger (`client/src/pages/Home.tsx`)**:
   - Added `payment.verify` mutation to trigger server verification on submitted transactions.
   - Truth Panel accurately reports real verification statuses (`VERIFIED`, `UNDERPAID`, `WRONG RECIPIENT`, `DUPLICATE`, etc.).

5. **Repository Verification**:
   - `tsc --noEmit`: passed (0 TypeScript errors).
   - `vitest run`: passed (18 test files, 80 tests passing 100%).
   - `npm run build`: passed (clean production client and server bundles).
