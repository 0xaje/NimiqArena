<div align="center">

# NIMIQ ARENA

### The Premier Non-Custodial Competitive Gaming Protocol on Nimiq Proof-of-Stake

[![Nimiq Ecosystem](https://img.shields.io/badge/Platform-Nimiq_Hub_&_Ecosystem_Native-EC9918?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VDOTkxOCI+PHBhdGggZD0iTTEyIDJMMiAxOWgxOSAxMiAyem0wIDRMNC41IDE3aDE1TDEyIDZ6Ii8+PC9zdmc+)](https://nimiq.com)
[![Consensus](https://img.shields.io/badge/Consensus-Albatross_PoS_(1s_Finality)-00F0FF?style=for-the-badge)](https://nimiq.com/developers)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/Frontend-React_19_|_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![tRPC](https://img.shields.io/badge/API-tRPC_v11_|_Express-2596BE?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io)
[![MariaDB](https://img.shields.io/badge/Storage-MariaDB_11_ACID-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org)
[![Tests](https://img.shields.io/badge/Automated_Tests-223_Passed_|_39_Suites-10B981?style=for-the-badge)](https://github.com/0xaje/NimiqArena)
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  <strong>Native Nimiq WebApp</strong> &bull;
  <strong>Sub-Second Settlement</strong> &bull;
  <strong>Deterministic Game Engine</strong> &bull;
  <strong>100% Transparent Pot Math</strong> &bull;
  <strong>Community Governed Roadmap</strong>
</p>

</div>

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Nimiq First: Built for the Nimiq Ecosystem](#nimiq-first-built-for-the-nimiq-ecosystem)
- [The Problem: Why Legacy Web3 Gaming Failed](#the-problem-why-legacy-web3-gaming-failed)
- [The Nimiq Arena Solution & Architecture](#the-nimiq-arena-solution--architecture)
- [Industry Benchmark Matrix](#industry-benchmark-matrix)
- [Economic Model: 90 / 5 / 3 / 2 Pot Distribution](#economic-model-90--5--3--2-pot-distribution)
- [Referral System & Builder Fee Sharing](#referral-system--builder-fee-sharing)
- [Step-by-Step User Walkthrough & Guide](#step-by-step-user-walkthrough--guide)
- [Game Catalog: Genesis Games & Community Pipeline](#game-catalog-genesis-games--community-pipeline)
- [Security, Anti-Cheat & Provable Fairness](#security-anti-cheat--provable-fairness)
- [Technical Architecture & State Streaming](#technical-architecture--state-streaming)
- [Local Setup & Developer Quickstart](#local-setup--developer-quickstart)
- [Automated Verification & Test Suite](#automated-verification--test-suite)
- [License](#license)

---

## Executive Summary

Nimiq Arena is a peer-to-peer competitive gaming platform engineered natively for the Nimiq Proof-of-Stake (Albatross) blockchain. It merges browser-first micro-payments with authoritative, real-time multiplayer board and strategy games.

By capitalizing on Nimiq's 1-second block times and low-friction micropayment architecture, Nimiq Arena solves the core usability failures that plagued previous Web3 gaming projects: eliminating gas fee volatility, eliminating wallet signature popups during turn-by-turn play, and eliminating custodial counterparty risk.

Players can enter wagered head-to-head matches, compete in multi-round tournament cups, train against authoritative algorithmic AI bots, or spectate high-stakes tables live through low-overhead Server-Sent Events (SSE).

---

## Nimiq First: Built for the Nimiq Ecosystem

Nimiq Arena is built directly upon Nimiq's core principles: **ease of use, browser-native cryptography, and ultra-fast micro-transactions**.

```
+------------------------------------------------------------------------------------+
|                             NIMIQ ECOSYSTEM AT CORE                                |
|                                                                                    |
|  +---------------------------+  +----------------------+  +---------------------+  |
|  | Nimiq Web Application     |  | Nimiq Hub SDK        |  | Nimiq Albatross PoS |  |
|  | Browser-First Experience  |  | Zero-Extension Login |  | 1-Second Finality   |  |
|  +---------------------------+  +----------------------+  +---------------------+  |
|                                                                                    |
|  +---------------------------+  +----------------------+  +---------------------+  |
|  | Non-Custodial Escrow      |  | Luna Precision Math  |  | Telegram Gateway    |  |
|  | Provably Fair Settlement  |  | 1 NIM = 100,000 Luna |  | Ecosystem Outreach  |  |
|  +---------------------------+  +----------------------+  +---------------------+  |
+------------------------------------------------------------------------------------+
```

### Why Nimiq is the Ideal Layer-1 for Gaming

1. **Browser-Native Cryptography**:
   Unlike Ethereum or Solana dApps that force users to install browser extensions (such as MetaMask or Phantom), Nimiq was designed from day one to operate directly inside the web browser. Keys can be managed in-session or connected with a single tap via the official Nimiq Hub.
2. **Albatross Proof-of-Stake Finality**:
   With 1-second block confirmation times, match funding and escrow distribution occur almost instantaneously, matching the responsiveness of high-end Web2 game servers.
3. **Micro-Transaction Viability**:
   Standard transaction fees on Nimiq are negligible fractions of a cent, allowing micro-stakes as low as 10 NIM or 50 NIM without fee erosion.
4. **Telegram Distribution as an Extension, Not a Replacement**:
   While Nimiq Arena features full integration with the Telegram Mini App SDK (enabling 1-click room code sharing and native haptics), the core application is a fully standalone Nimiq Web App designed to be hosted directly within the Nimiq ecosystem and directory.

---

## The Problem: Why Legacy Web3 Gaming Failed

Decentralized gaming platforms have suffered from three systemic issues that drove away 95% of players:

1. **The Block Latency Trap**:
   Turn-based matches built directly on Ethereum, Polygon, or generic rollups require 3 to 15 seconds per state commitment. Forcing a player to wait for a blockchain block confirmation just to roll a die or drop a checker destroys the gameplay experience.
2. **Gas Depletion on Game Decisions**:
   Submitting every game action as an on-chain transaction forces players to pay gas fees for tactical decisions. In games like Ludo (often spanning 40+ turns), gas costs rapidly dwarf the actual wager.
3. **Opaque Custodial Platforms**:
   Web2 wagering sites and pseudo-Web3 casinos operate custodial balances behind proprietary databases. Players have no visibility into escrow solvency, rake calculations, or RNG fairness.

---

## The Nimiq Arena Solution & Architecture

Nimiq Arena solves these challenges through an **authoritative hybrid wagering architecture**:

- **On-Chain Boundaries, In-Memory Velocity**:
  On-chain consensus is engaged precisely where it belongs: at the financial boundaries of a match (Escrow Deposit and Prize Distribution).
- **Sub-50ms State Execution**:
  During the active match, player moves execute in an authoritative server loop running deterministic rule engines, broadcast to clients via Server-Sent Events (SSE).
- **Provably Fair RNG**:
  Every random event (such as a Ludo dice roll) is generated using a cryptographically committed SHA-256 hash before the roll occurs, allowing clients to independently audit fairness after the match.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Nimiq Web App (React 19)  |  | Nimiq Hub SDK        |  | Telegram Mini App  |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+----------------------------------------|------------------------------------------+
                                         |
                       tRPC (RPC) + Server-Sent Events (SSE)
                                         |
+----------------------------------------v------------------------------------------+
|                            AUTHORITATIVE ENGINE TIER                              |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Game Engine Modules       |  | Anti-Cheat & Turn    |  | Rating Engine      |  |
|  | (Ludo / Connect NIM)      |  | Watchdog (30s)       |  | (Elo System)       |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+----------------------------------------|------------------------------------------+
                                         |
                       BigInt Luna Allocations / Atomic ACID
                                         |
+----------------------------------------v------------------------------------------+
|                       SETTLEMENT & CONSENSUS LAYER (NIMIQ)                        |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Nimiq PoS JSON-RPC Node   |  | Non-Custodial Escrow |  | MariaDB State Log  |  |
|  | (1-Second Finality)       |  | Settlement (90/5/3/2)|  | (Idempotent Nonce) |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Industry Benchmark Matrix

| Dimension | Legacy Web3 (EVM / Rollups) | Traditional Web2 Wagering | Nimiq Arena |
| :--- | :--- | :--- | :--- |
| **Transaction Finality** | 5 to 60 seconds per confirmation | Centralized Database (Opaque) | **1 second (Nimiq Albatross PoS)** |
| **Gas Cost Per Turn** | $0.05 to $2.50 per action | Free (Hidden in high rake) | **$0.00 (Zero gas during play)** |
| **Wallet Onboarding** | Seed phrase / Extension required | Email, Password, KYC verification | **Instant Guest / Nimiq Hub 1-Click** |
| **Randomness Verification**| Costly or slow oracles | Black-box server PRNG | **SHA-256 Seed Commit-Reveal** |
| **Pot Math Transparency** | Often undocumented or variable | 10% to 20% platform rake | **100% Mathematically Proven Split** |
| **Multiplayer Sync** | Polling or third-party relayers | Custom WebSockets | **SSE Lightweight Event Pipeline** |
| **Mobile Integration** | In-app mobile browser only | Native App Stores | **Nimiq WebApp PWA + Telegram SDK** |

---

## Economic Model: 90 / 5 / 3 / 2 Pot Distribution

Every competitive match operates under a strictly enforced, four-way pot distribution model:

```
TOTAL MATCH ESCROW POT (100%)
|
+---> 90%  WINNER PRIZE          (Dispatched directly to victorious player)
+--->  5%  BUILDER / REFERRAL    (Dispatched to Referrer, or Platform Maintenance)
+--->  3%  NIMIQ ECOSYSTEM       (Deposited to Community Development Reserve)
+--->  2%  CHARITY VAULT         (Dedicated on-chain philanthropic fund)
```

### Luna-Precision Math (No Rounding Drift)

In financial systems, floating-point math causes rounding discrepancies. Nimiq Arena executes all monetary math using integer arithmetic denominated in **Luna** (`1 NIM = 100,000 Luna`):

```typescript
export const LUNA_PER_NIM = BigInt(100_000);

export function calculatePotDistribution(totalPotNim: number): PotDistribution {
  const potLuna = BigInt(Math.round(totalPotNim * 100_000));
  
  const winnerLuna = (potLuna * BigInt(90)) / BigInt(100);
  const builderLuna = (potLuna * BigInt(5)) / BigInt(100);
  const ecosystemLuna = (potLuna * BigInt(3)) / BigInt(100);
  // Remainder is mathematically allocated to Charity to ensure sum === potLuna exactly
  const charityLuna = potLuna - winnerLuna - builderLuna - ecosystemLuna;

  return { ... };
}
```

### Example Stake Calculations

| Total Pot (NIM) | Winner (90%) | Builder / Referral (5%) | Ecosystem (3%) | Charity (2%) |
| :--- | :--- | :--- | :--- | :--- |
| **20 NIM** (2x 10) | 18.0 NIM | 1.0 NIM | 0.6 NIM | 0.4 NIM |
| **100 NIM** (2x 50) | 90.0 NIM | 5.0 NIM | 3.0 NIM | 2.0 NIM |
| **200 NIM** (2x 100)| 180.0 NIM | 10.0 NIM | 6.0 NIM | 4.0 NIM |
| **1,000 NIM** (2x 500)| 900.0 NIM | 50.0 NIM | 30.0 NIM | 20.0 NIM |

---

## Referral System & Builder Fee Sharing

A key design innovation of Nimiq Arena is its **Builder-Share Referral Architecture**.

Instead of retaining the 5% Builder Fee as pure platform profit, Nimiq Arena shares this allocation directly with the community:

```
BUILDER FEE ALLOCATION (5% of Total Pot)
|
+---> IF PLAYER WAS REFERRED:
|     100% of Builder Fee (5% of pot in NIM) is paid directly to the Referrer
|     + 500 Arena Points awarded upon registration
|
+---> IF PLAYER HAS NO REFERRER:
      Retained by the platform builder address for infrastructure & hosting
```

### How Referrals Work in Practice

1. **Unique Referral Links**:
   Every registered player receives a dedicated referral code and link (e.g. `https://arena.nimiq.com/?ref=player-code`).
2. **Automated Binding**:
   When a new player joins via a referral link, their account is permanently linked to the referrer in the database.
3. **Lifetime Passive Earnings**:
   Whenever that referred user wins any competitive wagered match in Ludo League, Connect NIM, or future arena games, the full 5% Builder Fee is automatically dispatched to the referrer's balance.
4. **Referral Hub Dashboard**:
   Players can track their total referred users, matches won by their referee network, and lifetime NIM earned through the interactive Earn NIM dashboard.

---

## Step-by-Step User Walkthrough & Guide

### Step 1: Onboarding & Identity Claim
- Visit Nimiq Arena in any modern web browser or open via the Telegram Mini App.
- New players are automatically provisioned with a secure guest profile or can connect their Nimiq wallet with one click.
- Claim your Welcome Gift of **1,000 Arena Points** immediately from the profile banner to establish your ranking baseline.

### Step 2: Choose Game & Match Mode
- Navigate to the Game Directory and choose your arena:
  - **Ludo League**: Turn-based tactical dice rolling and token capture.
  - **Connect NIM**: Fast-paced 4-in-a-row disc alignment.
- Select your mode:
  - **Free Practice (vs AI)**: Zero stake, instant start against the heuristic bot.
  - **Play with Friend**: Generate an 8-character invite code and share a direct link over Telegram, WhatsApp, or Twitter.
  - **Wager Match**: Select a stake (10 NIM, 50 NIM, 100 NIM, or 250 NIM) to enter the matchmaking queue.

### Step 3: Non-Custodial Escrow Deposit
- In wagered matches, the system generates a secure payment intent bound to your match ID.
- Confirm the transaction via your Nimiq Wallet or Hub.
- Within 1 second, Nimiq Albatross confirms the transaction on-chain, both players are locked into the table, and the match countdown begins.

### Step 4: Live Tactical Gameplay
- **Real-Time Board Sync**: Watch your opponent's moves stream live at sub-50ms latency.
- **Turn Watchdog**: Each player has 30 seconds per turn. If a player exceeds their time limit, the authoritative engine passes the turn or declares a forfeit to protect the counterparty.
- **In-Game Reactions**: Send quick emotes and tactical game chat through the interactive Emote Wheel during live action.

### Step 5: Provably Fair Verification
- Click the Shield icon at any point during or after the match to open the Provably Fair modal.
- View the active engine version, match fingerprint, and pre-committed SHA-256 seeds to independently verify dice rolls and move legality.

### Step 6: Victory Settlement & Payout
- Upon checkmate or final home run, the authoritative engine computes the final score.
- The 90% prize pot is credited to the winner, the 5% builder fee is credited to the referrer, and the ecosystem/charity pools are updated.
- Results appear instantly on the global Leaderboard, updating player Elo ratings and seasonal tournament standings.

---

## Game Catalog: Genesis Games & Community Pipeline

### Genesis Games (Active Now)

1. **Ludo League**:
   - 2-player authoritative board engine.
   - Dual-dice mechanic with independent movement selection.
   - Complete capture collisions, safe havens, and double-6 bonus rolls.
   - Heuristic AI bot fallback for solo practice.

2. **Connect NIM**:
   - 7x6 vertical gravity grid.
   - Instant drop-column physics and bitboard win detection.
   - Rapid 15-second turn timers for ultra-fast tactical gameplay.

### Arena Governance & Community Game Pipeline

Nimiq Arena is built as an extensible gaming framework, not a static two-game portal. We are actively expanding the arena catalog and introducing **community-governed game additions**:

```
EXPANSION ROADMAP & COMMUNITY PIPELINE
|
+---> PHASE 1: GENESIS LAUNCH (CURRENT)
|     Ludo League + Connect NIM fully active with wager escrow.
|
+---> PHASE 2: COMMUNITY GOVERNANCE & VOTING (NEXT)
|     Nimiq Arena players and NIM holders vote on the next title:
|     - Candidate A: Tactical Speed Chess (Blitz 3m + 2s)
|     - Candidate B: Cryptic Checkers (Authoritative jump rules)
|     - Candidate C: Naval Battleship (Grid coordinate strategy)
|
+---> PHASE 3: OPEN BUILDER SDK
      External game developers can plug in custom HTML5 engines
      using the standardized IGameEngine interface and earn
      the 5% Builder Fee on every wagered match played!
```

---

## Security, Anti-Cheat & Provable Fairness

1. **Zero Client Authority**:
   Clients cannot mutate board state, change scores, or simulate dice rolls. Every action is validated against server-side board rules.
2. **Idempotent Action Nonces**:
   All game commands include monotonic nonces. Duplicate packets caused by network lag or re-transmissions are safely deduplicated without state corruption.
3. **Turn Watchdogs & Forfeit Protection**:
   Automated background sweepers monitor match heartbeats. Abandoned matches automatically time out, refunding or awarding wins authoritatively.
4. **Financial Outflow Circuit Breakers**:
   Automated payout systems feature strict hourly caps and anomaly detection to prevent unauthorized draining in edge cases.

---

## Technical Architecture & State Streaming

### Authoritative Game Loop & SSE Pipeline

```
[ Client A ] ----( tRPC Action: dropColumn )----> [ Express / tRPC Server ]
                                                          |
                                            +-------------v-------------+
                                            |  Validate Turn Ownership  |
                                            |  Validate Legal Column    |
                                            |  Apply State Mutation     |
                                            +-------------+-------------+
                                                          |
[ Client A ] <---( SSE: match-event: move )---------------+
[ Client B ] <---( SSE: match-event: move )---------------+
[ Spectators]<---( SSE: match-event: move )---------------+
```

- **Server-Sent Events (SSE)** provide lightweight, unidirectional streaming over standard HTTP/2, avoiding WebSocket firewall drops and battery drain on mobile devices.
- **Reconnect Resilience**: Clients reconnecting after signal loss automatically catch up using state version numbers, receiving any missed events seamlessly.

---

## Local Setup & Developer Quickstart

### Prerequisites
- Node.js 20 or higher
- pnpm package manager (`npm install -g pnpm`)
- Docker (for local MariaDB container)

### 1. Clone the Repository
```bash
git clone https://github.com/0xaje/NimiqArena.git
cd NimiqArena
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://root:test@127.0.0.1:3307/nimiq_test
NIMIQ_RPC_URL=https://rpc.testnet.nimiq.watch
NIMIQ_NETWORK=testnet
SESSION_SECRET=your-secure-session-secret-key-at-least-32-chars
BUILDER_ADDRESS=NQ0700000000000000000000000000000000
COMMUNITY_ADDRESS=NQ0700000000000000000000000000000000
CHARITY_ADDRESS=NQ0700000000000000000000000000000000
```

### 3. Start MariaDB Container
```bash
docker run -d \
  --name nimiq-arena-db \
  -p 3307:3306 \
  -e MARIADB_ROOT_PASSWORD=test \
  -e MARIADB_DATABASE=nimiq_test \
  mariadb:11
```

### 4. Install Dependencies & Push Schema
```bash
pnpm install
pnpm run db:push
```

### 5. Launch Development Server
```bash
pnpm run dev
```
Open `http://localhost:3000` in your browser.

---

## Automated Verification & Test Suite

Nimiq Arena maintains an extensive automated test suite covering game physics, network chaos, database concurrency, and on-chain RPC verifiers:

```bash
# Execute Vitest test suite
pnpm test

# Verify TypeScript type safety
pnpm tsc --noEmit

# Compile production bundle
pnpm run build
```

### Test Suite Summary
- **39 Test Suites Passing**
- **223 Automated Tests Passing**
- **100% Physics Validation**: Ludo movement heuristics, home stretch entries, and Connect NIM bitboards.
- **Concurrency & Chaos**: Simulated race conditions, mid-game disconnects, and double-spend attempts.
- **Live RPC Verification**: Real integration tests against Nimiq Albatross testnet nodes.

---

## License

This project is open-source software licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
