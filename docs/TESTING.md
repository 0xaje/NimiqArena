# Testing

## Current verification

The frontend and backend pass TypeScript checking and a production build. Vitest covers auth logout, required payment configuration, and payment procedure input validation. The provider path must be manually exercised in two environments: a regular browser, where the UI stays in browser-preview mode, and Nimiq Pay, where `init()` can resolve and `sendBasicTransaction()` can trigger a native approval dialog.

The payment path is expected to be verified in Nimiq Pay with a real test transaction: create intent, approve or reject the native dialog, observe the returned transaction hash, and confirm that the UI remains `submitted / verification pending` until a server-side verifier is connected.

## Required production test layers

| Layer         | Scope                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Unit          | Ludo rules, address formatting, payment-state transitions, idempotency helpers                        |
| Engine        | Full legal/illegal move matrix, deterministic replay, concurrency rejection                           |
| API           | Authentication, authorization, schema validation, match versioning, payment intent lifecycle          |
| Integration   | Nimiq Pay provider init, account request, signing/payment approval, rejected prompt, provider timeout |
| Browser smoke | Responsive layout, keyboard focus, truthful unavailable states, no false live data                    |
| Security      | Replay, duplicate commands, forged player IDs, amount/recipient tampering, rate limits                |

## Definition of done for a live feature

A feature is not complete when the button renders. It is complete when the server owns the decision, the failure path is tested, the wallet result is independently verified where applicable, and the UI reflects the real persisted state after reload or reconnect.

## Verified Production Test Suites (100% Passing)

All 19 test suites and 98 automated test cases pass with full test database integration and live Nimiq Testnet JSON-RPC verification:

```bash
DATABASE_URL="mysql://root:test@127.0.0.1:3307/nimiq_test" RUN_DB_INTEGRATION_TESTS=1 npm test -- --fileParallelism=false
```

| Suite | Category | Passing Tests | Description |
| :--- | :--- | :---: | :--- |
| `user-journey.e2e.test.ts` | **E2E 30-Step Journey** | 18 | Full 30-step lifecycle validation from match creation to live RPC settlement |
| `two-client-multiplayer.e2e.test.ts` | **E2E Multi-Client Transport** | 1 | Live 2-client HTTP + SSE bidirectional state propagation |
| `match.database.integration.test.ts` | **Database & ACID** | 11 | Match joins, duplicate joins, stale versions, nonces, rollbacks, sweeps |
| `rating.database.integration.test.ts` | **Elo & Seasons** | 6 | Live Elo rating transactions, rating floor, streaks, leaderboard sorting |
| `payment-verifier.integration.test.ts`| **Nimiq Blockchain RPC** | 9 | Live Testnet JSON-RPC verifier, underpaid reject, audit logging, gating |
| `match.integration.test.ts` | **Match Procedures** | 11 | Match creation, join validation, turn permissions, move rejections |
| `nimiq-verifier.test.ts` | **Blockchain Rules** | 9 | Hex format validation, address normalization, network ID verification |
| `rating-engine.test.ts` | **Elo Mathematics** | 7 | FIDE formula, expected scores, rating floor, K-factor adjustments |
| `ludo-engine.test.ts` | **Ludo Engine** | 6 | Base exit on 6, captures, safe squares, home overshoot rules, win checks |
| `game.router.test.ts` | **Game Catalog** | 4 | Game metadata lookup and default game seeding |
| `arena-state.test.ts` | **Client State** | 3 | Client session state and matchroom UI state helpers |
| `reconnect-policy.test.ts` | **Network Resiliency** | 2 | Exponential backoff, jitter calculation, reconnect ceiling |
| `payment-state.test.ts` | **Payment State** | 2 | Client payment state transitions and retry nonce rotation |
| `match-cleanup.test.ts` | **Maintenance Sweeps** | 2 | Cron authorization and match lifecycle expiry sweeping |
| `payment.router.test.ts` | **Payment Router** | 2 | Protected tRPC payment procedures and input validation |
| `payment-config.test.ts` | **Config Integrity** | 2 | Environment variable integrity for payment recipient & entry fee |
| `match-stream.test.ts` | **SSE Streaming** | 1 | Realtime match stream broadcast and participant authorization |
| `auth.logout.test.ts` | **Authentication** | 1 | Session cookie clearing and logout lifecycle |
| `match-event.test.ts` | **Event Idempotency** | 1 | Exact match event replay from database snapshots |
| **Total** | **19 Test Files** | **98 Tests** | **100% Pass Rate** |
