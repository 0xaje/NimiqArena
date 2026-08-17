# Nimiq Arena

Nimiq Arena is a social competitive gaming Mini App concept for Nimiq Pay. Ludo is the first game inside the Arena; the product is designed to expand to additional games later.

## Current status

This repository contains the first frontend milestone. It is a responsive React + TypeScript + Vite experience that connects the primary journey from Arena home through game selection, match mode, challenge preview, Ludo presentation, result preview, leaderboard, and profile.

The current build does **not** include a backend, database, realtime multiplayer, production authentication, real matchmaking, live leaderboards, Nimiq wallet integration, NIM payments, signing, or settlement. Development values are labeled in the interface and isolated in `src/data/devData.ts`. See `docs/` for the architecture and production plan.

## Run locally

```bash
pnpm install
pnpm dev
```

The Vite server is configured with `host: true` so that a future Nimiq Pay local testing flow can reach the development server. The current app does not initialize the Nimiq SDK.

## Verify

```bash
pnpm check
pnpm test
pnpm build
```

## Engineering documentation

The required project documentation is in `docs/`: architecture, Nimiq integration, Ludo engine requirements, security, testing, decisions, and the current progress report.
