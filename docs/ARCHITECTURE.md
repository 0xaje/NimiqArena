# Architecture

## Current slice

Nimiq Arena is currently a frontend-only product foundation. The React client owns presentation, accessibility, provider detection, and user intent. It does not own balances, match outcomes, ratings, matchmaking, or settlement. The UI labels unavailable capabilities instead of providing local simulations.

## Target production shape

```text
Nimiq Pay WebView
        |
        v
React Mini App UI  --->  Arena API  --->  PostgreSQL
        |                    |                |
        |                    v                v
        |              Match service     Users / ratings / ledger
        |                    |
        v                    v
Nimiq provider  <------ Payment + settlement worker  ---> Nimiq network/indexer
```

## Domain boundaries

| Boundary | Responsibility | Trust level |
|---|---|---|
| Client | Render server state, request wallet actions, submit intents | Untrusted |
| API | Authentication, authorization, schema validation, idempotency | Trusted application boundary |
| Game engine | Deterministic rules, legal move validation, turn sequencing | Pure domain service |
| Database | Durable match snapshots, events, users, ratings, ledger | Source of record |
| Payment worker | Transaction lifecycle and confirmation reconciliation | Trusted integration boundary |
| Nimiq Pay/provider | User-approved account/signing/payment operations | External authority |

## State flow

Every match action should be represented as a command with `matchId`, `playerId`, `expectedVersion`, client nonce, and the requested move. The API validates authorization and version, the engine validates the move, and the database commits the event and next snapshot in one transaction. The client receives the authoritative snapshot or a typed rejection.

## Current implementation notes

The current UI includes a provider status card, a real account request path, a server-backed payment card, a static board preview, and feature gates for matchmaking, leaderboard, and playable board actions. Payment intent creation, confirmation-pending state, provider submission, and failure recording run through protected tRPC procedures. The board artwork is not game state, and a submitted transaction is not settlement.

The payment state machine is:

`created → confirmation_pending → submitted → verified`

Failure branches are `confirmation_pending → rejected`, `confirmation_pending → failed`, and `created/confirmation_pending → expired`. Only a trusted verification worker may produce `verified`; no public procedure accepts that state.


## Ludo vertical slice

The database now contains a real `games` catalog and `matches` table. The seeded product record is `ludo-league`; it is an active Ludo game record, not a simulated live match. A Challenge Friend request creates a backend-owned match ID, unique invite code, `waiting` status, engine version, expiry, and the initial serialized Ludo snapshot.

The frontend reads game detail through the public `game.getBySlug` procedure. Match creation and match-room reads use protected procedures. The client may display the returned identifier and invite code, but it cannot create an opponent, advance turns, write a result, or mark settlement. The next server slice must add authenticated join-by-code, atomic command handling, event persistence, and reconnection semantics.
