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

| Boundary           | Responsibility                                                | Trust level                  |
| ------------------ | ------------------------------------------------------------- | ---------------------------- |
| Client             | Render server state, request wallet actions, submit intents   | Untrusted                    |
| API                | Authentication, authorization, schema validation, idempotency | Trusted application boundary |
| Game engine        | Deterministic rules, legal move validation, turn sequencing   | Pure domain service          |
| Database           | Durable match snapshots, events, users, ratings, ledger       | Source of record             |
| Payment worker     | Transaction lifecycle and confirmation reconciliation         | Trusted integration boundary |
| Nimiq Pay/provider | User-approved account/signing/payment operations              | External authority           |

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

## Ludo match-state milestone

Challenge Friend matches now create a host player row. A protected `match.joinByCode` request validates the normalized code, expiry, capacity, and duplicate participation before assigning seat 1 and transitioning the match to `in_progress`. Match state is readable only by joined participants.

The protected `match.command` procedure accepts only roll or move commands with an expected version and nonce. The server supplies the authenticated player seat, invokes the shared deterministic engine, updates the match snapshot with an optimistic version predicate, and appends a unique match event in the same transaction. Duplicate nonces replay the stored event without applying the command twice. The current transport boundary is short polling plus manual refresh; it is not presented as production real-time multiplayer until two real clients are connected through a push transport.

## Reliability milestone

Match presence is persisted in `match_players.lastSeenAt` and `status`. Participant heartbeats are authenticated mutations, while disconnects are explicit state transitions. Match reads and SSE snapshots call the lifecycle refresh boundary so expiry and stale-player transitions are not dependent on process memory.

The match room uses authenticated SSE with client-owned exponential reconnect backoff and tRPC state polling/manual refresh as resynchronization fallbacks. Persisted `stateVersion` remains the authority after reconnect or server restart; no in-memory match snapshot is required to recover the latest state.

Lifecycle cleanup is exposed through a cron-only `/api/scheduled/cleanupMatches` handler. The handler is idempotent and does not run an in-process scheduler. A production Heartbeat schedule has not been created or verified yet.

## Rating & Leaderboard Subsystem

Competitive outcomes originate solely from authoritative match completion:

```text
Engine Winner / Abandonment
            |
            v
Atomic DB Transaction
  ├── Update matches (status: finished, winnerUserId, loserUserId)
  ├── Calculate Elo Rating (K=32, Starting=1000, Floor=100)
  ├── Upsert player_ratings (seasonId, gameSlug, rating, wins, losses, streaks)
  └── Insert rating_history (matchId, userId, delta, outcome)
            |
            v
Leaderboard Query (Indexed by seasonId, gameSlug, rating DESC)
```

- **Zero Client Authority**: The client never submits winner, score, rank, or rating.
- **Idempotent Settlement**: Unique key constraints on `rating_history(matchId, userId)` protect against duplicate execution.
- **Pure Rating Calculation**: `calculateElo()` executes deterministically on instantaneous database rating states.

---

## Bot Orchestration & In-Memory Lock Boundary

Solo practice matches feature an authoritative server-side bot player (`system-bot-ai`).

### Architecture & Synchronization
```text
Human Move Applied  --->  DB Transaction  --->  maybeScheduleBotTurn()
                                                        |
                                                        v
                                            scheduleAutonomousBotStep()
                                                        | (450ms pacing)
                                                        v
                                          executeAuthoritativeBotTurnCore()
                                          [botMatchLocks: Set<string>]
                                                        |
                                            Server Roll & Bot Heuristic
                                                        |
                                                DB Transaction (v++)
                                                        |
                                              Turn returns to Human (0)
```

### Process-Local Scope & Limitations
- **Current Model**: `botMatchLocks: Set<string>` and `botMatchTimers: Map<string, NodeJS.Timeout>` reside in process memory.
- **Single-Node Guarantees**: For single-instance deployments, this model is 100% reliable, zero-latency, and requires zero external infrastructure (no Redis or message broker dependencies).
- **Multi-Process / Horizontal Scaling Boundary**: If the application scales to multiple Node processes, container clusters, or serverless functions behind a load balancer, process-local locks will NOT coordinate across instances.
- **Production Scaling Roadmap**:
  - *Option A (Preferred - Zero Infrastructure Overhead)*: Database row-level locks via `SELECT ... FOR UPDATE` on `matches` within a dedicated bot turn transaction.
  - *Option B (High Scale Clustering)*: Distributed lock manager (e.g. Redis Redlock).
  - In accordance with our reliability guidelines, external infrastructure is deferred until the deployment model strictly requires clustering.

