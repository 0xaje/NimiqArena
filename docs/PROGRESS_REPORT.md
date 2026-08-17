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
