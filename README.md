<div align="center">

# NIMIQ ARENA

### High-Velocity, Provably Fair Web3 Competitive Gaming on Nimiq Proof-of-Stake

[![Nimiq Albatross](https://img.shields.io/badge/Consensus-Nimiq_Albatross_PoS-EC9918?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VDOTkxOCI+PHBhdGggZD0iTTEyIDJMMiAxOWgxOSAxMiAyem0wIDRMNC41IDE3aDE1TDEyIDZ6Ii8+PC9zdmc+)](https://nimiq.com)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/Frontend-React_19_|_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![tRPC](https://img.shields.io/badge/API-tRPC_v11_|_Express-2596BE?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io)
[![MariaDB](https://img.shields.io/badge/Storage-MariaDB_11_ACID-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org)
[![Tests](https://img.shields.io/badge/Test_Suite-223_Passed_|_39_Suites-10B981?style=for-the-badge)](https://github.com/0xaje/NimiqArena)
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  <strong>Instant Settlement</strong> &bull;
  <strong>Sub-Second Finality</strong> &bull;
  <strong>Deterministic Game Verification</strong> &bull;
  <strong>Authoritative Server Loops</strong> &bull;
  <strong>Telegram Mini-App Native</strong>
</p>

</div>

---

## Executive Summary

Nimiq Arena is an open-source, non-custodial competitive gaming protocol and wagering platform powered by the Nimiq Proof-of-Stake (Albatross) blockchain. It merges browser-first micro-payments with authoritative, real-time multiplayer board and strategy games.

By capitalizing on Nimiq's sub-second block times and zero-friction micropayment architecture, Nimiq Arena solves the fundamental bottleneck of decentralized gaming: eliminating gas volatility, wallet signature popups during gameplay, and high counterparty risk.

Players can instantly compete in head-to-head matches, join multi-round bracket cups, practice against rule-complete algorithmic AI engines, or spectate high-stake tables in real time via Server-Sent Events (SSE).

---

## The Problem: Why Web3 Gaming Failed

Decentralized gaming has historically suffered from fatal architectural flaws that prevent mainstream adoption:

1. **Transaction Latency (The Block Delay Barrier)**:
   Turn-based matches on Ethereum, Polygon, or standard rollups require 3 to 15 seconds per state commitment. Forcing a player to wait for block inclusion to roll a die or drop a checker destroys the game loop.
2. **Punitive Gas Friction**:
   Executing individual game moves on-chain rapidly costs more in network fees than the match stake itself. Players should never pay gas fees to make tactical decisions.
3. **Wallet Interaction Burnout**:
   Conventional Web3 dApps bombard users with wallet signature popups for every single interaction, resulting in a 90%+ drop-off rate within the first 60 seconds.
4. **Opaque Escrow & Counterparty Default**:
   Centralized wagering sites utilize custodial hot wallets with zero visibility into pot solvency or payout algorithms, leaving players vulnerable to frozen balances and delayed withdrawals.

---

## The Solution: Nimiq Arena Architecture

Nimiq Arena introduces an authoritative hybrid wagering architecture designed specifically for the Nimiq ecosystem:

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Web Browser (React 19)    |  | Telegram Mini App    |  | Embedded Hub SDK   |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+----------------------------------------|------------------------------------------+
                                         |
                       tRPC (RPC) + Server-Sent Events (SSE)
                                         |
+----------------------------------------v------------------------------------------+
|                                APPLICATION ENGINE                                 |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Authoritative Match Loop  |  | Anti-Cheat Validator |  | Elo Rating Engine  |  |
|  | (Ludo / Connect NIM)      |  | & Turn Watchdogs     |  | (Glicko-2 Hybrid)  |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+----------------------------------------|------------------------------------------+
                                         |
                        BigInt Luna Allocations / Atomic ACID
                                         |
+----------------------------------------v------------------------------------------+
|                              CONSENSUS & SETTLEMENT                               |
|  +---------------------------+  +----------------------+  +--------------------+  |
|  | Nimiq PoS Albatross RPC   |  | On-Chain Escrow Pool |  | MariaDB State Log  |  |
|  | (1-Second Finality)       |  | (90/5/3/2 Split)     |  | (Idempotent Nonce) |  |
|  +---------------------------+  +----------------------+  +--------------------+  |
+-----------------------------------------------------------------------------------+
```

### Key Architectural Pillars

- **Authoritative Server Engine**:
  Clients never dictate game outcomes. They transmit raw intents (`roll`, `move`, `dropColumn`). The engine validates player turns, computes deterministic state mutations, verifies legal pathways, and broadcasts unified snapshots to all observers.
- **Sub-Second Proof-of-Stake Finality**:
  Leveraging Nimiq Albatross, match funding and escrow releases finalize within 1 second, enabling immediate post-match payouts without multi-minute confirmation periods.
- **Zero-Friction In-Match Progression**:
  On-chain transactions occur only at the financial boundaries of a match (Entry Escrow Deposit and Victory Pot Settlement). In-game turns execute instantaneously in memory at sub-50ms latency.
- **Provable Fairness via SHA-256 Commitments**:
  Dice rolls and RNG events are determined through cryptographic commit-reveal seeds. Before rolling, the system provides a cryptographic digest of the server seed and nonce. Upon match conclusion, the raw seeds are revealed for client-side mathematical verification.

---

## Industry Benchmark Comparison

| Dimension | Legacy Web3 (EVM / Rollups) | Traditional Web2 Wagering | Nimiq Arena |
| :--- | :--- | :--- | :--- |
| **Transaction Latency** | 5 to 60 seconds per confirmation | Sub-second (Centralized DB) | **1 second (Nimiq Albatross)** |
| **Gas Cost Per Move** | $0.05 to $2.50 per action | Free (Hidden in rake) | **$0.00 (Zero gas during play)** |
| **User Onboarding** | Seed phrase / Wallet mandatory | Email, Password, KYC verification | **1-Click Guest / Telegram SDK** |
| **Randomness Verification**| Chainlink VRF (Costly / Slow) | Proprietary black box (Unverifiable)| **SHA-256 Seed Commit-Reveal** |
| **Pot Allocation Transparency** | Varies / Often hidden | Hidden behind high margins | **100% On-Chain Exact Math** |
| **Multiplayer Sync** | Polling or third-party relayer | WebSockets (Proprietary) | **SSE Low-Overhead Realtime Bus** |
| **Mobile Integration** | Requires MetaMask Mobile browser | Native App Stores | **Telegram Mini App + Browser PWA**|

---

## Supported Game Catalog

### 1. Ludo League
A deterministic 2-player adaptation of the classic cross-and-circle strategic board game.
- **Authoritative Rules**: Complete home run tracks, safe zones, double-6 bonuses, and capture collisions that send opponent tokens back to base.
- **Dual-Dice Strategic Selection**: Players rolling distinct values can strategically choose which die to execute first to capture an opponent or secure safe tiles.
- **Automated Turn Watchdog**: A strict 30-second countdown enforces turn pacing. If a player disconnects, an authoritative timeout engine passes the turn or forfeits the match to protect the counterparty.
- **Adaptive AI Fallback**: Complete rule-evaluating bot capable of legal move heuristic calculation for solo practice or disconnected human replacement.

### 2. Connect NIM
A vertical 7-column by 6-row tactical alignment game.
- **Sub-50ms Turn Pipeline**: Rapid-fire disc drops with instant gravity settlement.
- **Authoritative Win Detection**: Zero-latency bitboard scan for horizontal, vertical, and diagonal 4-in-a-row vectors.
- **Draw Safeguards**: Automatic detection of board saturation resulting in full escrow refund distribution.

---

## Economic Model: 90 / 5 / 3 / 2 Pot Distribution

Every wagered match operates under a mathematically immutable pot distribution model:

```
TOTAL MATCH ESCROW POT (100%)
|
+---> 90%  WINNER PRIZE          (Dispatched to victorious player)
+--->  5%  BUILDER / REFERRAL    (5% lifetime cut to referrer or builder fee)
+--->  3%  NIMIQ ECOSYSTEM       (Deposited to community development pool)
+--->  2%  CHARITY VAULT         (Dedicated on-chain philanthropic reserve)
```

### Precision Financial Math (Luna Engine)

To prevent floating-point rounding errors or value leakage, all accounting calculations are computed in integer Luna units:

```typescript
// 1 NIM = 100,000 Luna
const LUNA_PER_NIM = BigInt(100_000);

export function calculatePotDistribution(totalPotNim: number): PotDistribution {
  const potLuna = BigInt(Math.round(totalPotNim * 100_000));
  
  const winnerLuna = (potLuna * BigInt(90)) / BigInt(100);
  const builderLuna = (potLuna * BigInt(5)) / BigInt(100);
  const ecosystemLuna = (potLuna * BigInt(3)) / BigInt(100);
  const charityLuna = potLuna - winnerLuna - builderLuna - ecosystemLuna; // Exact remainder
  
  return { ... };
}
```

---

## Security & Anti-Cheat System

- **Authoritative State Isolation**: Client devices only submit signed action payloads. The server validates player session authenticity, turn ownership, and move legality against the current state before applying mutations.
- **Idempotent Nonce Processing**: Every game action includes an incrementing transaction nonce. Duplicate or reordered requests caused by network jitter are acknowledged idempotently without corrupting game state.
- **Financial Circuit Breakers**: Automated payout workers enforce maximum balance outflow caps per hour. Suspicious transaction patterns automatically freeze automated withdrawals for manual security audit.
- **Rate-Limiting Matrix**: Multi-tiered rate limiters guard API endpoints against denial-of-service vectors, credential stuffing, and bot flooding.

---

## Technology Stack

- **Runtime & Core**: Node.js 20+, TypeScript 5.7+
- **API Protocol**: tRPC v11 with end-to-end type safety and Zod input schema validation
- **Web Framework**: Express.js with custom SSE stream dispatcher
- **Frontend Architecture**: React 19, Vite, Wouter (lightweight declarative routing)
- **Styling**: Vanilla CSS Design Tokens, responsive glassmorphism, responsive mobile-first layouts
- **Icons**: Lucide React
- **Database & ORM**: MariaDB 11, Drizzle ORM with foreign keys and strict ACID transactions
- **Blockchain Integration**: Nimiq PoS JSON-RPC, Nimiq Hub SDK, Nimiq Mini-App SDK
- **Testing Engine**: Vitest, Supertest, Chaos and concurrency simulation suites

---

## Getting Started

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

### 3. Start the MariaDB Container
```bash
docker run -d \
  --name nimiq-arena-db \
  -p 3307:3306 \
  -e MARIADB_ROOT_PASSWORD=test \
  -e MARIADB_DATABASE=nimiq_test \
  mariadb:11
```

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Initialize Database Schema
```bash
pnpm run db:push
```

### 6. Launch Development Server
```bash
pnpm run dev
```
The application will be accessible at `http://localhost:3000`.

---

## Verification & Test Suite

Nimiq Arena maintains complete test coverage spanning unit physics, database operations, RPC verifiers, and multi-client concurrency:

```bash
# Execute full test suite
pnpm test

# Run TypeScript type check
pnpm tsc --noEmit

# Compile production bundle
pnpm run build
```

### Test Coverage Highlights
- **Authoritative Engine Tests**: 100% legal move matrix validation for Ludo League and Connect NIM.
- **Concurrency & Chaos Tests**: Simulated race conditions, mid-game disconnections, and parallel move attempts.
- **Financial Escrow Integration**: On-chain payment intent verification, duplicate hash prevention, and Luna distribution precision.
- **Autonomous Bot Regression**: 30+ consecutive turn simulations against intelligent AI without state corruption.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
