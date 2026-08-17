# Ludo Game Engine

## Status

The deterministic Ludo engine is implemented as `shared/game/ludo-engine.ts`. It is a pure module with no network, wallet, or UI dependencies. The current vertical slice persists its initial snapshot when a match is created, but does not yet expose server gameplay commands or a playable board UI.

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

The current suite covers deterministic initial snapshots, server-supplied dice, base-entry requirements, stale versions, duplicate nonces, captures, extra turns on six/capture, and win detection in `client/src/game/ludo-engine.test.ts`. Remaining engine work includes server command persistence, reconnects, timeouts, event-log replay, and property-based rule checks. The module currently uses a two-player track model with four pieces per player, a 52-square track, home progress, safe squares, and exact home-boundary validation.
