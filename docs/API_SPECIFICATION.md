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

## Milestone 07 Additions: Rating & Leaderboard Procedures

| Procedure            | Access    | Purpose                                              | Authoritative behavior                                                   |
| -------------------- | --------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `season.getActive`   | Public    | Retrieve active season metadata                      | Returns current seasonal window, number, and status                      |
| `leaderboard.getTop` | Public    | Query database leaderboard rankings                  | Returns ordered player ratings, rank, wins, losses, win rate, and streak |
| `auth.stats`         | Protected | Retrieve authenticated player stats & rating history | Returns true Elo rating, rank, streak, and recent rating transactions    |
| `auth.guestLogin`    | Public    | Authenticate dev/preview guest player session        | Mints valid session cookie & Bearer token for seamless multi-user tests  |
