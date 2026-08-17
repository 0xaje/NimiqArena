# Decisions

## 2026-08-17 — Courtline Editorial direction

The first product surface uses a contemporary sports-editorial language rather than a generic crypto dashboard. This supports trust, matchday focus, and a visible distinction between actual provider state and unavailable product capabilities.

## 2026-08-17 — Truthful frontend scope

The current project remains frontend-only. No fake balances, players, ratings, leaderboards, matchmaking, multiplayer, payments, or transaction confirmations are included. UI controls for those areas are explicit feature gates.

## 2026-08-17 — Official SDK boundary

The project installs and uses `@nimiq/mini-app-sdk` with the documented `init()` and `listAccounts()` flow. Payment and settlement are deferred until a trusted backend and policy exist; the Hub API is documented as a candidate official payment integration path, not silently approximated.
