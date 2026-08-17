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

## Real match-system verification milestone

The default suite currently passes 37 tests across 12 test files, with three gated database lifecycle tests skipped because `NIMIQ_ARENA_TEST_DATABASE_URL` has not yet been supplied. The gated suite must run with `DATABASE_URL` pointed at that dedicated disposable database and `RUN_DB_INTEGRATION_TESTS=1`; it creates and cleans temporary rows and must not use the project database.

The real database lifecycle matrix must cover match creation, successful join, duplicate join, expired match, full match, roll, move, stale-version rejection, exact duplicate replay, concurrent commands, transaction rollback, event persistence, and snapshot persistence. These cases are NOT VERIFIED until the dedicated run completes.

The two-client matrix is also NOT VERIFIED. It requires two independent authenticated clients: Client A creates, Client B joins, both receive the same persisted state, actions propagate in both directions, invalid and duplicate commands are handled correctly, and reconnect restores the latest state version. Mocked router tests are not evidence of this end-to-end result.

The automated coverage now includes cron-only cleanup authorization, gated expiry/abandonment lifecycle cases, capped exponential reconnect delay, monotonic state resynchronization, and a transport test that opens a new SSE subscription after disconnect and verifies the latest state version. Browser and server logs still need a real two-client run before production claims are made.
