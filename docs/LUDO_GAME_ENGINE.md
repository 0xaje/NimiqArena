# Ludo Game Engine

## Status

The playable Ludo engine is **not implemented** in this frontend slice. The visual board preview is artwork only and cannot move pieces or produce a match result.

## Target engine contract

The engine should be a pure deterministic module with no network, wallet, or UI dependencies. It accepts a validated command plus a prior immutable snapshot and returns either a typed rejection or a new snapshot with an append-only event.

```ts
applyCommand(snapshot, command, randomSource):
  | { ok: true; snapshot; event }
  | { ok: false; code; reason }
```

The command must include the match ID, player ID, expected state version, command nonce, and move intent. The engine decides legal turn, dice usage, entry rules, captures, safe squares, home path, win condition, and timeout consequences. The API, not the client, owns the random source and persists the result.

## Fairness design questions

Before money is enabled, the product must choose and document whether dice outcomes use a server commitment/reveal protocol, a verifiable randomness service, or another auditable method. The engine must record enough information for a completed match to be independently reviewed without allowing a player to rewrite history.

## Required test categories

The future suite must cover legal moves, illegal moves, exact boundary positions, captures, extra turns, simultaneous requests, duplicate nonces, reconnects, timeouts, and deterministic replay from the event log. Property-based tests should verify that no piece leaves the board model or skips a turn without a rule-approved transition.
