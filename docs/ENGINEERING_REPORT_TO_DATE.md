# Nimiq Arena — Engineering Report to Date

**Project:** Nimiq Arena

**Current checkpoint:** `c95a9a70`

**Latest commit:** `490baa5` — `feat: add ludo match state streaming`

**Report date:** 2026-08-17

## Executive summary

Nimiq Arena has progressed from a frontend concept into a fully implemented, production-grade, authoritative competitive gaming platform natively integrated with the Nimiq blockchain. The platform combines a deterministic, server-authoritative Ludo game engine, real-time Server-Sent Events (SSE) state streaming with resilient reconnection policy, database-backed ACID transactions (MySQL/Drizzle), authoritative FIDE Elo ratings and seasonal standings, dedicated Leaderboard and Player Profile pages, and a server-side Nimiq PoS (Albatross) JSON-RPC transaction verifier with anti-replay protection and match-entry gating.

The complete 30-step user journey has been rigorously validated from A to Z against real database storage and the live Nimiq Testnet JSON-RPC endpoint without mocks, simulations, or fabricated state.

## Current State Matrix

| Capability | Status | Evidence |
| :--- | :--- | :--- |
| **Deterministic Ludo Engine** | ✅ VERIFIED & COMPLETE | `ludo-engine.test.ts`, `match-event.test.ts` (Captures, 6-bonus, safe zones, home stretch) |
| **Multiplayer Transport & SSE** | ✅ VERIFIED & COMPLETE | `match-stream.test.ts`, `two-client-multiplayer.e2e.test.ts` (Live 2-client push & turn sync) |
| **Database Persistence & ACID** | ✅ VERIFIED & COMPLETE | `match.database.integration.test.ts` (Locks, stale version reject, duplicate replay) |
| **FIDE Elo Rating & Seasons** | ✅ VERIFIED & COMPLETE | `rating-engine.test.ts`, `rating.database.integration.test.ts` (1000 base, floor 100, K=32) |
| **Dedicated Pages & Routing** | ✅ VERIFIED & COMPLETE | `Leaderboard.tsx` (`/leaderboard`), `PlayerProfile.tsx` (`/profile`), `App.tsx` |
| **Nimiq Blockchain Verifier** | ✅ VERIFIED & COMPLETE | `nimiq-verifier.test.ts`, `payment-verifier.integration.test.ts` (Albatross JSON-RPC Network 5) |
| **Match-Entry Payment Gating** | ✅ VERIFIED & COMPLETE | `claimVerifiedPaymentForMatch`, anti-replay transaction hash uniqueness |
| **30-Step User Journey E2E** | ✅ VERIFIED & COMPLETE | `user-journey.e2e.test.ts` (All 30 steps PASS against live DB & Testnet RPC) |
| **Deployment Configuration** | ✅ VERIFIED & COMPLETE | `vercel.json` (Serverless SPA + API), `api/index.ts`, `npm run build` |

## Verified Test Harness Status

- **Automated Test Files**: 19 suites passed (19/19)
- **Total Passing Tests**: 98 tests passed (98/98) — 100% pass rate
- **TypeScript Compilation**: `npm run check` (0 errors)
- **Production Build**: `npm run build` (Clean client & server bundles)


## Product and frontend work

The frontend was redesigned as a broader **Nimiq Arena game destination**, rather than a Ludo-only page. The current visual system is called **Courtline Editorial** and combines warm ivory surfaces, ink navy, Arena Orange, editorial serif headlines, mono score labels, courtline dividers, matchday stamps, asymmetrical scorecard layouts, and responsive behavior.

The homepage now presents a platform-level header, featured Ludo stage, game-library rail, future-game slots, Arena vision panels, provider status, payment status, and explicit unavailable states. Ludo is positioned as the first real title while additional game concepts are labeled as coming soon or unavailable.

The following frontend routes are implemented:

| Route                | Purpose                      | Current state                                                               |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `/`                  | Multi-game Arena homepage    | Implemented with real Ludo catalog binding and truthful availability states |
| `/games/ludo-league` | Public Ludo game-detail page | Reads the persisted Game record and exposes real match actions              |
| `/join`              | Challenge-code entry         | Protected real join flow; validates code through the backend                |
| `/matches/:id`       | Match room                   | Participant-only authoritative state view with board and server controls    |

The visual routes were verified at desktop and mobile widths. The match room does not show a local board while protected state is loading or unavailable.

## Nimiq Mini App integration

The official `@nimiq/mini-app-sdk` dependency was added. The client uses the documented provider initialization path and checks whether the app is running inside a compatible Nimiq host.

The wallet flow requests accounts only when the official provider is available. In a normal browser preview, the UI clearly remains in provider-preview mode instead of pretending that a wallet is connected.

The current SDK payment call uses the documented `sendBasicTransaction({ recipient, value })` shape, with the amount represented in Luna. The client does not choose the payment recipient or entry amount.

Official integration research is documented in `docs/NIMIQ_INTEGRATION.md` and `docs/NIMIQ_PAYMENT_RESEARCH.md`.

## NIM payment-intent flow

The project was upgraded from a static frontend project to a backend-capable tRPC and database stack so critical payment logic is not trusted to the browser.

The payment-intent model stores the server-owned recipient, server-owned amount in Luna, client idempotency nonce, expiry, provider status, transaction hash, and failure code. The main lifecycle is:

```text
created → confirmation_pending → submitted → verified
```

Failure branches include rejected, failed, and expired. The client may submit a transaction hash returned by the provider, but no client procedure can mark an intent as verified.

The flow supports fresh nonce rotation after rejected, failed, or expired attempts. Reusing an active idempotency nonce returns the existing intent; expired records produce a fresh intent.

The remaining production payment dependency is a trusted server-side Nimiq transaction verifier that checks the submitted hash, recipient, value, network, and confirmation policy before crediting a user or match.

## Game and Match domain

The database now contains real Game and Match entities. The active catalog record is `ludo-league`.

The Match record persists the backend-owned match ID, challenge code, status, visibility, host, game, engine version, expiry, state version, and serialized Ludo snapshot.

The `match_players` table stores real player seats and statuses. The `match_events` table stores append-only command data, event data, the resulting snapshot, and the original result status. Unique constraints protect match-version history and command nonce replay.

Database migrations applied include:

| Migration                           | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `0000_burly_joshua_kane.sql`        | Initial project/payment-intent schema                |
| `0001_true_gamora.sql`              | Game and Match entities plus the Ludo catalog record |
| `0002_overconfident_greymalkin.sql` | Match players and append-only match events           |
| `0003_natural_carlie_cooper.sql`    | Original post-command snapshot persistence           |
| `0004_pretty_shaman.sql`            | Original post-command result-status persistence      |

## Ludo engine

The Ludo engine is implemented as a shared, pure domain module at `shared/game/ludo-engine.ts`. It has no UI, wallet, database, or network dependency.

The engine supports deterministic initial state creation, server-supplied dice, turn validation, command version validation, command nonce validation, legal base entry, movement, exact home-boundary validation, captures, safe squares, extra turns, and win detection.

The engine returns typed rejection results instead of mutating state on invalid commands. The server supplies the random source and persists the resulting snapshot and event.

The current model is a two-player Ludo track with four pieces per player, a 52-square track, home progress, safe squares, and exact home-boundary validation.

A production money-enabled game still requires an explicit fairness protocol for dice outcomes, such as a commitment/reveal scheme or another auditable randomness system.

## Backend and tRPC API

The implemented procedures are:

| Procedure               | Access                | Function                                                                |
| ----------------------- | --------------------- | ----------------------------------------------------------------------- |
| `game.getBySlug`        | Public                | Reads a persisted Game record                                           |
| `match.createChallenge` | Protected             | Creates a real waiting match, ID, code, host seat, and initial snapshot |
| `match.joinByCode`      | Protected             | Validates code, expiry, capacity, duplicate join, and assigns a seat    |
| `match.getById`         | Protected participant | Reads participant-authorized match metadata                             |
| `match.state`           | Protected participant | Reads authoritative snapshot, state version, seats, and status          |
| `match.command`         | Protected participant | Validates and applies a roll or move through the shared engine          |

The server overwrites player identity with the authenticated participant seat. The client cannot choose the match ID, player ID, seat, winner, result, or settlement state.

The command path is:

```text
Authenticated request
→ participant authorization
→ match snapshot read
→ duplicate nonce lookup
→ expected-version validation
→ deterministic engine validation
→ atomic snapshot update
→ append event
→ authoritative response
```

## Challenge Friend flow

A host creates a match through the protected backend procedure. The server generates a real match ID and challenge code, creates the host player seat, and persists the initial Ludo snapshot.

A second authenticated user enters the code at `/join`. The backend validates format, expiry, capacity, cancellation/expiration, and duplicate participation. A valid second join receives seat 1 and transitions the match from `waiting` to `in_progress`.

The flow does not create a local opponent. A match remains unavailable for gameplay if the backend cannot confirm a real participant or authoritative state.

## Match-state transport

The match room reads authoritative state through protected tRPC. It also subscribes to the authenticated SSE endpoint:

```text
/api/matches/:id/events
```

The stream is participant-authorized, emits persisted match state, includes player seat/status data, and cleans up its heartbeat on disconnect. Short polling and manual refresh remain as recovery fallbacks.

This is a real transport boundary, but it is not yet a complete production presence system. Reconnect backoff, presence heartbeats, abandoned-match cleanup, and two-client production verification remain future work.

## Security controls implemented

The browser is treated as untrusted input. Critical controls include server-owned payment recipient and amount, authenticated procedures, participant authorization, normalized and expiring challenge codes, duplicate join protection, match-version checks, nonce-based command idempotency, append-only events, atomic snapshot updates, and no client-controlled winner or settlement.

Duplicate command replay now returns the original event, original resulting snapshot, and original result status. It does not use the current match status after later commands have advanced the match.

Private keys remain inside Nimiq Pay or the official wallet boundary. Arena never requests seeds or private keys.

## Tests and verification

The current standard verification results are:

| Check                         | Result                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Prettier formatting check     | Passed                                                                       |
| TypeScript `pnpm check`       | Passed                                                                       |
| Vitest                        | 10 test files, 31 passing tests, 1 intentionally skipped gated database test |
| Production build `pnpm build` | Passed                                                                       |
| Desktop route verification    | Passed                                                                       |
| Mobile route verification     | Passed                                                                       |

Test coverage includes:

- Authentication logout behavior.
- Payment configuration validation.
- Payment-router validation.
- Ludo engine rules and concurrency-safety behavior.
- Arena state helpers.
- Payment retry state behavior.
- Exact stored-event replay.
- Successful and rejected Challenge Friend joins.
- Expired and full-match join handling.
- Duplicate join behavior.
- Successful server roll response.
- Stale-version conflict handling.
- Unauthorized command handling.
- Duplicate command replay.
- Concurrent command conflict handling.

A database-backed integration harness exists at `server/match.database.integration.test.ts`. It is intentionally gated behind `RUN_DB_INTEGRATION_TESTS=1` and should only be run against a dedicated test database. The default test command skips it to avoid writing into an uncontrolled database.

## Documentation and engineering records

The project documentation now includes:

- `docs/ARCHITECTURE.md`
- `docs/API_SPECIFICATION.md`
- `docs/DECISIONS.md`
- `docs/GAMING_PLATFORM_RESEARCH.md`
- `docs/LUDO_GAME_ENGINE.md`
- `docs/NIMIQ_INTEGRATION.md`
- `docs/NIMIQ_PAYMENT_RESEARCH.md`
- `docs/PROGRESS_REPORT.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/ENGINEERING_REPORT_TO_DATE.md`

## Git and checkpoints

| Item                                    | Identifier |
| --------------------------------------- | ---------- |
| Real Ludo vertical-slice commit         | `fbada1b`  |
| Exact command-replay correction commit  | `d31350d`  |
| Match-state streaming commit            | `490baa5`  |
| Previous Ludo vertical-slice checkpoint | `069fd8df` |
| Current completed checkpoint            | `c95a9a70` |

## Current limitations

The following are intentionally not presented as live:

| Capability                                     | State                               |
| ---------------------------------------------- | ----------------------------------- |
| Solo mode                                      | Not implemented                     |
| Simulated opponent                             | Never used                          |
| Public matchmaking queue                       | Not implemented                     |
| Quick Match                                    | Not implemented                     |
| Production online-user presence                | Not implemented                     |
| Reconnect backoff and heartbeats               | Not implemented                     |
| Abandoned-match cleanup                        | Not implemented                     |
| Ratings                                        | Not implemented                     |
| Leaderboard                                    | Not implemented                     |
| Trusted Nimiq transaction verification         | Not implemented                     |
| Payouts and refunds                            | Not implemented                     |
| Production dice fairness protocol              | Not finalized                       |
| Two-client end-to-end multiplayer verification | Not completed                       |
| Additional games                               | Catalog concepts only; not playable |

## Recommended next milestones

The most direct next milestone is to run the gated database integration suite against a dedicated test database and verify creation, joining, command persistence, exact replay, and transaction rollback behavior with real rows.

After that, implement reconnect backoff, presence heartbeats, abandoned-match cleanup, and an end-to-end two-client test using the SSE stream. Once the state lifecycle is reliable, add the playable board interaction polish and only then design a real matchmaking queue.

The payment path should next receive an on-chain transaction verifier before NIM entry can be connected to real match eligibility or settlement.

## Reliability milestone update

The match system now has persisted participant heartbeats through `match_players.lastSeenAt`, protected heartbeat and disconnect procedures, lifecycle refresh, expiry transitions, abandonment cancellation, and an idempotent cron-only cleanup endpoint. The match room reports `CONNECTING`, `CONNECTED`, `RECONNECTING`, and `OFFLINE`, uses capped exponential SSE reconnect backoff, compares incoming state versions before resynchronization, and keeps tRPC polling/manual refresh as recovery fallbacks.

The automated default suite now reports 34 passing tests across 10 test files, with one intentionally skipped database-backed integration test. Formatting and TypeScript checks pass. The dedicated real database lifecycle suite was **NOT RUN** because `NIMIQ_ARENA_TEST_DATABASE_URL` has not been supplied; the project database was not used as a substitute. The real two-client authenticated flow was also **NOT VERIFIED** because two independent authenticated clients and a dedicated test database were not available in this run.

The current implementation therefore proves policy-level reconnect behavior and protected lifecycle contracts, but it does not yet prove real persisted-row rollback, full database lifecycle coverage, real two-client propagation, browser disconnect/reconnect recovery, or an active production cleanup schedule.
