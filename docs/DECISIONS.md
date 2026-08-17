# Decisions

## 2026-08-17 — Build directly in the selected repository

The selected GitHub repository was empty when cloned. The frontend foundation was created directly in that repository. No existing application was overwritten.

## 2026-08-17 — Frontend-only first milestone

The supplied milestone scope explicitly excludes backend, database, WebSocket multiplayer, production authentication, real matchmaking, real NIM transactions, and blockchain settlement. The implementation therefore focuses on a connected frontend journey and records the production seams needed later.

## 2026-08-17 — No fake blockchain or live data

Preview profile, leaderboard, rating, XP, streak, and match-result values are isolated in `src/data/devData.ts` and visibly labeled as development preview. The Nimiq service port rejects calls with an explicit NOT IMPLEMENTED error rather than simulating wallet behavior.

## 2026-08-17 — Mobile-first dark esports system

The visual direction combines premium mobile gaming, restrained esports hierarchy, and Nimiq-inspired violet accents. Motion is short, purposeful, and disabled for users who prefer reduced motion.
