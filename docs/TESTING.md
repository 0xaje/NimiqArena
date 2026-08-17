# Testing

## Current verification

The frontend must pass TypeScript checking and a production build. The provider path must be manually exercised in two environments: a regular browser, where the UI stays in browser-preview mode, and Nimiq Pay, where `init()` can resolve and the account request can trigger a native approval dialog.

## Required production test layers

| Layer | Scope |
|---|---|
| Unit | Ludo rules, address formatting, payment-state transitions, idempotency helpers |
| Engine | Full legal/illegal move matrix, deterministic replay, concurrency rejection |
| API | Authentication, authorization, schema validation, match versioning, payment intent lifecycle |
| Integration | Nimiq Pay provider init, account request, signing/payment approval, rejected prompt, provider timeout |
| Browser smoke | Responsive layout, keyboard focus, truthful unavailable states, no false live data |
| Security | Replay, duplicate commands, forged player IDs, amount/recipient tampering, rate limits |

## Definition of done for a live feature

A feature is not complete when the button renders. It is complete when the server owns the decision, the failure path is tested, the wallet result is independently verified where applicable, and the UI reflects the real persisted state after reload or reconnect.
