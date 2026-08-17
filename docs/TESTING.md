# Testing

## Current verification

The frontend and backend pass TypeScript checking and a production build. Vitest covers auth logout, required payment configuration, and payment procedure input validation. The provider path must be manually exercised in two environments: a regular browser, where the UI stays in browser-preview mode, and Nimiq Pay, where `init()` can resolve and `sendBasicTransaction()` can trigger a native approval dialog.

The payment path is expected to be verified in Nimiq Pay with a real test transaction: create intent, approve or reject the native dialog, observe the returned transaction hash, and confirm that the UI remains `submitted / verification pending` until a server-side verifier is connected.

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
