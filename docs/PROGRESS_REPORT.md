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
