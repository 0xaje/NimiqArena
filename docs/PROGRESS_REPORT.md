# Nimiq Arena Progress Report

## Milestone

Frontend experience refinement and verified product journey.

## What was built

The existing React, TypeScript, and Vite application now presents a complete mobile-first Arena journey: splash entrance, Arena home, game selection, match type selection, challenge-friend preview, Ludo match presentation, result preview, leaderboard, and profile.

The frontend uses reusable presentation primitives for avatars, badges, navigation, leaderboard rows, development notices, challenge states, dice, and Ludo board pieces. The Ludo screen remains a presentation layer; it does not contain authoritative game rules or claim a connected opponent.

The splash screen establishes the Nimiq Arena identity with the tagline `PLAY. CHALLENGE. COMPETE.` and transitions into the home screen. All development data and preview outcomes remain explicitly labelled. The app does not fabricate wallet connections, balances, NIM transfers, matchmaking, live users, ratings, or blockchain settlement.

## Files changed

The main implementation changes are in `src/App.tsx`, `src/styles.css`, `src/types/domain.ts`, `src/types/nimiq.ts`, `src/services/nimiqWallet.ts`, and `src/services/arenaApi.ts`. `NimiqMiniAppWallet` now uses the official `@nimiq/mini-app-sdk` for provider initialization, account discovery, challenge signing, and user-approved NIM transaction submission. `ArenaHttpApi` defines typed calls for future backend auth challenges, sessions, payment intents, hash submission, and payment-state reads.

## Tests performed

The following commands passed after the implementation changes:

| Check | Result |
|---|---|
| `pnpm check` | Passed: TypeScript emitted no errors. |
| `pnpm test` | Passed: 4 Vitest tests. |
| `pnpm build` | Passed: Vite generated the production bundle. |

The tests verify development leaderboard consistency, account discovery and selection, challenge signing, exact payment-intent forwarding, and rejection of expired or mismatched payment intents.

## Known issues

This milestone still has no backend session endpoint, signature verifier, database, authoritative deterministic Ludo engine, realtime transport, matchmaking, live leaderboard service, Nimiq RPC verifier, reconciliation worker, or transaction settlement. The frontend adapter returns `submitted` after the provider returns a transaction hash; it does not mark payments as verified or unlock matches.

## Security posture

The client remains untrusted by design. No frontend action is treated as proof of a move, payment, identity, rating update, or match result. Provider errors, permission rejection, expired intents, payer mismatches, and invalid transaction-hash responses are surfaced as failures rather than converted into success.

## Next step

The next engineering milestone should implement the backend auth challenge/session flow and payment-intent state machine, plus an RPC verification worker, before exposing paid match entry. The server-authoritative Ludo state model remains required before multiplayer.

## SDK integration milestone

The official `@nimiq/mini-app-sdk` dependency is installed. `NimiqMiniAppWallet` now implements provider initialization, account discovery, explicit account selection, backend challenge signing, and exact payment-intent submission. `ArenaHttpApi` defines typed calls for future backend auth challenges, sessions, payment intents, hash submission, and payment-state reads. `NimiqArenaClient` composes those boundaries without claiming settlement, and `useNimiqWallet` exposes safe state/actions to React components.

Provider errors, permission rejection, expired intents, payer mismatches, and invalid provider hashes are surfaced as failures rather than converted into success. `pnpm check`, `pnpm test`, and `pnpm build` all passed, with 6 unit tests covering the adapter and orchestration paths.

The next step is to implement the backend auth challenge/session flow, payment-intent state machine, Nimiq RPC verification worker, and atomic match-unlock transition before exposing paid competitive entry.
