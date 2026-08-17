# Security

Nimiq Arena treats the browser as hostile input. The current frontend does not create user identities, balances, matches, or claims of online activity.

## Required controls before production money or multiplayer

| Threat | Required control |
|---|---|
| Manipulated move | Server-authoritative engine validates every command against a stored match version |
| Duplicate request | Client nonce plus server-side idempotency record |
| Replay attack | Expiring session tokens, command nonce, match version, and signed/authenticated session binding |
| Race condition | Database transaction with optimistic version check or serialized match actor |
| Unauthorized match access | Authorization on every match read/write; never rely on hidden client routes |
| Payment manipulation | Server-owned amount/recipient/payment intent; verify transaction hash and status independently |
| Fake settlement | Credit only after backend verification and defined confirmation policy |
| Disconnect | Persisted snapshots, reconnect token, turn deadline, and deterministic timeout policy |
| Abuse and spam | Rate limiting, device identifier where appropriate, abuse telemetry, and moderation path |
| RNG disputes | Commit/reveal or auditable server-side randomness with an explicit fairness protocol |

## Wallet security

Private keys must remain inside Nimiq Pay or the official wallet boundary. Arena must request only the operation it needs and display human-readable purpose and amount before approval. No secret, seed phrase, or private key may be requested from the client.

## Current safeguards

The frontend only calls the official SDK `init()` and `listAccounts()` path when the provider is ready. It displays a browser-preview state when Nimiq Pay is absent, and all unavailable controls explain that no simulated action occurred.
