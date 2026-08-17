# Nimiq Arena Progress Report

## Milestone

Frontend foundation and connected product journey.

## What was built

The empty repository now contains a React, TypeScript, and Vite application with a mobile-first premium dark interface. The connected journey includes Arena home, game selection, match type selection, challenge-friend room preview, Ludo board presentation, result preview, leaderboard, and profile.

Reusable UI primitives cover avatars, badges, navigation buttons, stat rows, match cards, leaderboard rows, challenge state, dice, and board pieces. The Ludo presentation is deliberately separated from the future deterministic engine boundary.

Development-only data is isolated and visibly labeled. Nimiq wallet and payment behavior is represented by a typed service port that rejects calls as NOT IMPLEMENTED; no blockchain operation, balance, user account, or settlement is fabricated.

## Files changed

The implementation includes `package.json`, `pnpm-lock.yaml`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/App.tsx`, `src/main.tsx`, `src/styles.css`, typed domain/data/service modules, unit tests, and the required engineering documentation under `docs/`.

## Tests performed

`pnpm check` passed. `pnpm test` passed with 2 tests. `pnpm build` passed and generated the production bundle. A browser smoke test verified the home, games, match-type, and challenge-preview journey at the local Vite server.

## Known issues

The repository has no backend, database, authoritative Ludo engine, realtime transport, production authentication, Nimiq SDK integration, matchmaking, leaderboard service, or transaction settlement. The current Ludo interaction is a presentation preview. The challenge code is not a real room identifier, and result values are not recorded anywhere.

## Decisions

The first milestone honors the supplied frontend-only scope and the master engineering rules by making every missing production capability explicit rather than presenting a simulation as live behavior. Official Nimiq Mini App research is recorded in `docs/NIMIQ_INTEGRATION.md` and `docs/nimiq-research-notes.md`.

## Next step

Review the production bundle, commit the milestone with a meaningful message, and push it to the selected GitHub repository. After that, the next engineering milestone should define the server-authoritative Ludo state model and API contracts before adding multiplayer.
