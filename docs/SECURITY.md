# Security

Nimiq Arena treats the browser as hostile input. The current frontend does not create user identities, balances, matches, or claims of online activity.

## Required controls before production money or multiplayer

| Threat                    | Required control                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Manipulated move          | Server-authoritative engine validates every command against a stored match version              |
| Duplicate request         | Client nonce plus server-side idempotency record                                                |
| Replay attack             | Expiring session tokens, command nonce, match version, and signed/authenticated session binding |
| Race condition            | Database transaction with optimistic version check or serialized match actor                    |
| Unauthorized match access | Authorization on every match read/write; never rely on hidden client routes                     |
| Payment manipulation      | Server-owned amount/recipient/payment intent; verify transaction hash and status independently  |
| Fake settlement           | Credit only after backend verification and defined confirmation policy                          |
| Disconnect                | Persisted snapshots, reconnect token, turn deadline, and deterministic timeout policy           |
| Abuse and spam            | Rate limiting, device identifier where appropriate, abuse telemetry, and moderation path        |
| RNG disputes              | Commit/reveal or auditable server-side randomness with an explicit fairness protocol            |

## Wallet security

Private keys must remain inside Nimiq Pay or the official wallet boundary. Arena must request only the operation it needs and display human-readable purpose and amount before approval. No secret, seed phrase, or private key may be requested from the client.

## Current safeguards

The frontend only calls the official SDK `init()` path when the provider is ready. Payment intents are created only through protected tRPC procedures, use a server-owned recipient and entry amount, and are idempotent on `(userId, clientNonce)`. The transaction hash is accepted only as `submitted`; it cannot set `verified`. Provider rejection is stored as `rejected`, malformed/provider failures as `failed`, and all unavailable states explain that no simulated action occurred.

The remaining production control is on-chain verification. A worker or trusted backend integration must independently inspect the submitted hash, recipient, value, network, and confirmation policy before changing any intent to `verified` or crediting a player.

## Implemented Ludo controls

Challenge codes are generated server-side, normalized before lookup, expire with the match, and cannot allocate a third seat. A host is inserted as seat 0 during the same transaction as match creation. Join requests are protected and idempotent for an already joined user.

Roll and move commands are accepted only from a joined participant. The server overwrites the player identity with the authenticated seat, validates the command through the shared engine, rejects stale state versions, and stores a unique nonce/event record. The optimistic version predicate prevents two concurrent commands from both advancing the same snapshot. The client board renders the returned snapshot and never decides turns, dice, legality, winners, ratings, or settlement.

The current browser synchronization mechanism is polling and manual refresh. It does not claim secure push presence, reconnect subscriptions, or abandoned-match cleanup; those remain required before production multiplayer.
