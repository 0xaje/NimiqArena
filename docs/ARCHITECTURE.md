# Nimiq Arena Architecture

## Current milestone

This repository now contains the first frontend product milestone for Nimiq Arena. The repository was empty at the start of the task, so the application foundation was created directly in the selected repository rather than replacing an existing codebase.

The current runtime is a React + TypeScript + Vite single-page application. The frontend owns presentation, navigation, responsive layout, and development-only preview state. It does not own authoritative match state, ratings, user identity, payments, or settlement.

## Target production shape

| Boundary | Production responsibility | Current status |
|---|---|---|
| Frontend | Render screens, collect intent, display verified server results | Implemented as a frontend preview |
| API | Authenticate requests, create matches, expose read models | Not implemented |
| Backend | Authorize users, enforce idempotency, persist match and rating state | Not implemented |
| Game engine | Deterministic, server-authoritative Ludo rules and legal move validation | Presentation shell only |
| Realtime layer | Matchmaking, room membership, reconnect and event delivery | Not implemented |
| Nimiq | Wallet approval, signing, payment intent and settlement verification | Explicitly not implemented |
| Database | Users, matches, events, ratings, seasons and ledger references | Not implemented |

The intended dependency direction is `pages/components -> typed service ports -> API client -> backend`, with the backend depending on the game engine and Nimiq settlement adapters. The client must never be the source of truth for a match outcome or payment result.

## Frontend organization

`src/App.tsx` currently provides the first connected journey and reusable presentational primitives. The `src/types` folder defines domain contracts. Development preview data lives in `src/data/devData.ts`, while the Nimiq boundary is isolated in `src/services/nimiqWallet.ts` so a future implementation can replace it without changing the UI contract.

The Ludo board is a presentation component at this stage. Its visual state must be replaced by a server snapshot and event stream before the game is presented as multiplayer or competitive.

## Failure and security posture

The app uses explicit preview notices for development data and rejects wallet operations rather than fabricating success. Future API calls must use request identifiers, server-side authorization, validated state transitions, and replay-safe event handling. Reconnection must resynchronize from an authoritative snapshot rather than replaying client-local guesses.
