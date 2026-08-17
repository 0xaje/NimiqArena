# Testing

## Current verification

| Check | Result |
|---|---|
| TypeScript compiler (`pnpm check`) | Passed |
| Production bundle (`pnpm build`) | Passed |
| Domain boundary unit tests | Added; run with `pnpm test` |
| Browser journey smoke test | Pending after local preview is started |
| API, websocket, database, and Nimiq integration tests | Not applicable; those systems are not implemented |

The current unit tests verify that development profile and leaderboard preview data remain internally consistent and that the Nimiq wallet port rejects connection and payment calls instead of returning fabricated results.

## Required next tests

The next milestone should add pure Ludo engine tests before wiring any realtime transport. API contract tests should then cover authorization, idempotency, match lifecycle, rating updates, and payment state transitions. Integration tests should exercise reconnects, duplicate messages, provider rejection, pending settlement, and database transaction rollback.

A browser smoke test should verify the complete frontend journey from home to games, match selection, challenge preview, Ludo preview, result, leaderboard, and profile, including keyboard focus and responsive mobile layout.
