# API Specification

## Implemented procedures

| Procedure               | Access                | Purpose                                         | Authoritative behavior                                                        |
| ----------------------- | --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `game.getBySlug`        | Public                | Read the persisted game catalog record          | Returns database data only                                                    |
| `match.createChallenge` | Protected             | Create a private waiting match                  | Generates the ID/code server-side and persists the initial snapshot           |
| `match.joinByCode`      | Protected             | Validate a challenge code and join a match      | Enforces expiry, capacity, duplicate player protection, and seat assignment   |
| `match.getById`         | Protected participant | Read match metadata                             | Rejects users who are not joined players                                      |
| `match.state`           | Protected participant | Read authoritative snapshot and player presence | Returns server state version, snapshot, seats, and joined/disconnected status |
| `match.command`         | Protected participant | Request a server-validated roll or move         | Applies the shared engine inside a transaction and persists an event          |

## Command contract

A command includes `id`, `kind`, `expectedVersion`, and a client nonce. `roll` requests a server-owned dice value. `move` includes a `pieceIndex`. The server supplies `matchId` and the authenticated player seat; the client cannot choose either field.

The command path is:

```text
Authenticated request
→ participant lookup
→ match snapshot read
→ duplicate nonce lookup
→ expected-version and engine validation
→ atomic match snapshot update
→ append match event
→ authoritative response
```

The browser synchronization boundary uses an authenticated SSE stream at `/api/matches/:id/events`, with the protected state query, short polling interval, and manual refresh retained as recovery fallbacks. The stream emits persisted participant state and closes cleanly when the client disconnects. Reconnect backoff, presence heartbeats, abandoned-match cleanup, and two-client production verification remain future work.

## Explicitly unavailable

There is no public matchmaking queue, Solo bot, rating result, leaderboard, payout, settlement verification, or simulated opponent. The match room reports `WAITING` until a real second player joins. A client cannot mark a match finished or write a winner.

## Reliability milestone additions

`match.heartbeat` is a protected participant mutation that records `lastSeenAt` and restores a disconnected participant to `joined` only after authorization. `match.disconnect` records an explicit participant disconnect state.

The authenticated SSE stream now uses client-side exponential reconnect backoff and match-state invalidation fallback. The client reports `CONNECTING`, `CONNECTED`, `RECONNECTING`, or `OFFLINE` in the match room. State resynchronization accepts only equal or newer persisted state versions.

`POST /api/scheduled/cleanupMatches` is a cron-only lifecycle endpoint. It expires active matches past `expiresAt` and cancels waiting or in-progress matches when all participants have been disconnected beyond the abandonment grace period. No schedule has been created or verified in this milestone.
