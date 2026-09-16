<div align="center">

# NIMIQ ARENA

### Fast, Server-Authoritative Competitive Gaming on Nimiq Proof-of-Stake & Nimiq Hub

[![Nimiq Ecosystem](https://img.shields.io/badge/Network-Nimiq_PoS_Albatross-EC9918?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VDOTkxOCI+PHBhdGggZD0iTTEyIDJMMiAxOWgxOSAxMiAyem0wIDRMNC41IDE3aDE1TDEyIDZ6Ii8+PC9zdmc+)](https://nimiq.com)
[![Nimiq Hub](https://img.shields.io/badge/Wallet-Nimiq_Hub_%26_Pay_SDK-F5A623?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VDOTkxOCI+PHBhdGggZD0iTTEyIDJMMiAxOWgxOSAxMiAyem0wIDRMNC41IDE3aDE1TDEyIDZ6Ii8+PC9zdmc+)](https://hub.nimiq.com)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/Frontend-React_19_|_Vite_7-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![tRPC](https://img.shields.io/badge/API-tRPC_v11_|_Express-2596BE?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io)
[![MariaDB](https://img.shields.io/badge/Database-MariaDB_11_ACID-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org)
[![Tests](https://img.shields.io/badge/Automated_Tests-255_Passed_|_42_Suites-10B981?style=for-the-badge)](https://github.com/0xaje/NimiqArena)
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

<br />

**Nimiq Arena** is a competitive Web3 gaming platform and Progressive Web App (PWA) built natively on **Nimiq Hub** (`@nimiq/hub-api`), **Nimiq Pay Mobile SDK** (`@nimiq/mini-app-sdk`), and the **Nimiq Proof-of-Stake (Albatross)** consensus engine. It provides real-time, turn-based board and strategy duels (**Ludo League** & **Connect 4 Blitz**) with zero browser-extension requirements, instant NIM micro-stakes, non-custodial smart escrow settlement, optimistic concurrency control, and verifiable step-by-step match replays.

[Live Application](https://nimiqarena.onrender.com) &bull; [GitHub Repository](https://github.com/0xaje/NimiqArena) &bull; [Settlement Architecture](docs/SETTLEMENT_ARCHITECTURE_DECISION.md)

</div>

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Why Nimiq Arena?](#why-nimiq-arena)
3. [Verified Feature Matrix](#verified-feature-matrix)
4. [User Flow & Lifecycle](#user-flow--lifecycle)
5. [Game Engines & Rules](#game-engines--rules)
6. [Match Replay & State History](#match-replay--state-history)
7. [Nimiq Blockchain & Escrow Integration](#nimiq-blockchain--escrow-integration)
8. [Security & Game Integrity](#security--game-integrity)
9. [Realtime Architecture](#realtime-architecture)
10. [System Architecture Diagram](#system-architecture-diagram)
11. [Tech Stack](#tech-stack)
12. [Repository Structure](#repository-structure)
13. [Getting Started & Local Development](#getting-started--local-development)
14. [Environment Variables](#environment-variables)
15. [Automated Testing & Verification](#automated-testing--verification)
16. [Current Status & Limitations](#current-status--limitations)
17. [Judge Quickstart & Demo Guide](#judge-quickstart--demo-guide)
18. [License](#license)

---

## Product Overview

Nimiq Arena brings the speed and simplicity of traditional mobile arcade games to Web3 micro-transactions. Players can join ranked 1v1 matches, practice against autonomous AI bots, or challenge friends using 6-character room codes.

```
[ Choose Game ] ➔ [ Choose Mode & Stake ] ➔ [ Play Real-Time Match ] ➔ [ Instant Payout & Rating ] ➔ [ Step Replay ]
```

### Core Value Proposition
- **Seedless, Zero-Extension Onboarding via Nimiq Hub**: Players do not need to install browser extensions (like MetaMask) or manage raw private keys. The app connects directly to **Nimiq Hub** (`@nimiq/hub-api`) for instant, secure iframe/popup wallet interactions, and auto-detects **Nimiq Pay Mobile** (`@nimiq/mini-app-sdk`).
- **Zero Gas During Turns**: Players do not sign blockchain transactions for individual dice rolls or token drops. Game state transitions run on a low-latency server-authoritative engine.
- **Micro-Stakes with Sub-Second Finality**: Utilizing Nimiq Albatross 1-second block times and sub-cent fees, stakes as low as 1,000 NIM (~$0.40) settle instantly upon victory.
- **Progressive Web App (PWA)**: Installable directly to iOS Safari and Android Chrome home screens in standalone full-screen mode with responsive dynamic viewport scaling (`100dvh`).

---

## Why Nimiq Arena?

Turn-based Web3 games often suffer from two major architectural flaws:
1. **On-Chain Turn Latency**: Requiring a wallet popup and a 5–15 second block confirmation for every single move makes casual multiplayer unplayable.
2. **Opaque Custodial Servers**: Centralized platforms hold player deposits indefinitely without verifiable match history or open settlement logic.

### The Arena Approach
Nimiq Arena combines **server-authoritative game state machines** with **on-chain entry verification and automated settlement workers**:
- **Entry**: Payer sends stake directly on-chain to the treasury address with the match intent ID embedded in the transaction's `recipientData`.
- **Gameplay**: Turns execute in under 5ms using optimistic versioning (`expectedVersion`).
- **Settlement**: Upon victory, the backend payout worker dispatches net winnings directly to the winner's Nimiq address via an automated transaction with strict idempotency and circuit breakers.

---

## Verified Feature Matrix

| Feature | Status | Implementation Details |
| :--- | :---: | :--- |
| **Ludo League (1v1)** | ✅ Implemented | Full 52-cell track + home straight, 6-to-exit, multi-dice splitting, deterministic captures. |
| **Connect 4 Blitz (1v1)** | ✅ Implemented | 7×6 matrix, gravity simulation, 4-in-a-row victory detection, laser highlight. |
| **Ranked 1v1 Matchmaking** | ✅ Implemented | Wagered matchmaking queue with stake matching and challenge codes. |
| **Solo AI Bot Mode** | ✅ Implemented | Minimax Connect 4 bot + Heuristic Ludo bot (Practice & Wagered vs House). |
| **Private Friend Matches** | ✅ Implemented | 6-character alphanumeric join codes (`joinCode`) with instant link sharing. |
| **NIM Staking (1k–100k + Custom)** | ✅ Implemented | Preset chips (`1k`, `10k`, `50k`, `100k`) and custom numeric input in integer Luna. |
| **On-Chain Payment Verifier** | ✅ Implemented | Direct JSON-RPC node validation with automated fallback, amount, and intent checks. |
| **Automated Payout Worker** | ✅ Implemented | Option B hot-wallet payout via `@nimiq/core` with per-match cap & daily limit breakers. |
| **Server-Sent Events (SSE)** | ✅ Implemented | Real-time state broadcasting (`/api/matches/:id/events`) with 15s keep-alive pings. |
| **Step-by-Step Match Replay** | ✅ Implemented | Database-stored `matchEvents` sequencer reconstructing authoritative board states. |
| **Elo Rating Engine** | ✅ Implemented | Dynamic K-factor rating ladder across 5 tiers (Bronze, Silver, Gold, Diamond, Master). |
| **Top 3 Olympic Podium** | ✅ Implemented | Real data-driven seasonal leaderboard with win-rate calculations. |
| **Referral Fee Sharing (2%)** | ✅ Implemented | Unique referral codes distributing 2% of match pots to referrers upon victory. |
| **PWA Standalone Mode** | ✅ Implemented | Web App Manifest (`manifest.json`) + dual-axis viewport scaling (`min(96vw, 48dvh)`). |
| **4-Player Ludo Mode** | ⏳ Planned | Catalog entry present; 2-player 1v1 currently active. |
| **Tournament Bracket Cups** | ⏳ Planned | Showroom concept page; live matches currently run in 1v1 duel format. |

---

## User Flow & Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor P1 as Player 1
    actor P2 as Player 2
    participant Arena as Nimiq Arena Server
    participant DB as MariaDB
    participant RPC as Nimiq PoS RPC Node

    P1->>Arena: Create Match (Game, Stake: 1,000 NIM)
    Arena->>DB: Insert Match & Payment Intent (Intent ID, Nonce)
    P1->>RPC: Broadcast Entry TX (1,000 NIM + Intent ID in recipientData)
    P1->>Arena: Claim Payment (Tx Hash)
    Arena->>RPC: Verify Tx (Recipient, Amount, Data, Confirmations)
    RPC-->>Arena: Verification OK (executionResult: true)
    Arena->>DB: Mark Player 1 Paid & Ready

    P2->>Arena: Join Table by Code & Fund Stake
    Arena->>RPC: Verify Player 2 Tx
    Arena->>DB: Mark Player 2 Paid & Transition Match to in_progress

    loop Turn-by-Turn Play (Zero Gas)
        P1->>Arena: Send Command (roll / move, expectedVersion)
        Arena->>Arena: Apply State Machine & Validate Move
        Arena->>DB: Save Match State & Sequenced Event
        Arena-->>P1: SSE Broadcast New State
        Arena-->>P2: SSE Broadcast New State
    end

    Arena->>Arena: Victory Condition Detected
    Arena->>DB: Mark Match finished & Record Rating Changes
    Arena->>RPC: Dispatch Winner Payout (90% Pot via Hot Wallet)
    Arena-->>P1: SSE Broadcast Victory & Settlement
    Arena-->>P2: SSE Broadcast Victory & Settlement
```

---

## Game Engines & Rules

Both game engines are implemented as pure, deterministic state machines with no external network side effects during state evaluation:

### 1. Ludo League ([`shared/game/ludo-engine.ts`](shared/game/ludo-engine.ts))
- **Grid Layout**: Standard 15×15 grid with a 52-cell perimeter track, 4 home straight lanes, and a central Home Goal (`position: 56`).
- **Yard Exit**: Strict rule requiring a **6** on at least one die to bring a pawn out of the base onto the starting square (`position: 0`).
- **Multi-Dice Splitting**: In 2-dice modes, players rolling split dice (e.g. $[5, 3] = 8$) can allocate dice across different active pawns.
- **Captures & Stacking**: 
  - Landing on an opponent pawn on a track tile captures the opponent, sending them back to base (`-1`).
  - The capturing pawn remains on the landing square and continues its turn if remaining dice are available.
  - If multiple opponent pawns are stacked on a single tile, **only ONE** piece is captured per turn.
- **Victory**: Occurs when all required pawns (4 for single-set, 8 for double-set) reach the central goal (`position: 56`).

### 2. Connect 4 Blitz ([`shared/game/connect4-engine.ts`](shared/game/connect4-engine.ts))
- **Grid Layout**: 7 columns $\times$ 6 rows tactical matrix.
- **Gravity Mechanics**: Dropping a token into a column automatically places it in the lowest unoccupied row ($0$ to $5$).
- **Victory Condition**: Evaluates horizontal, vertical, and diagonal vectors for 4 consecutive tokens belonging to the same player.
- **Bot Engine ([`shared/game/connect4-bot.ts`](shared/game/connect4-bot.ts))**: Depth-limited Minimax algorithm with alpha-beta pruning and immediate threat neutralization.

---

## Match Replay & State History

Every authoritative match transition emits an immutable `matchEvent` stored in MariaDB:
```sql
CREATE TABLE matchEvents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matchId VARCHAR(32) NOT NULL,
  seq INT NOT NULL,
  eventType VARCHAR(64) NOT NULL,
  eventJson JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### How Replay Works
1. When viewing a completed match at `/replay?matchId=<id>`, the client fetches the match snapshot and the ordered sequence of events.
2. The replay viewer re-runs the deterministic state machine step-by-step from $Seq = 0$ to $Seq = N$.
3. Players can step forward, step backward, jump to specific turns, and inspect exact dice values, moves, and timestamps.

---

## Nimiq Blockchain & Escrow Integration

Nimiq Arena operates directly with the Nimiq PoS JSON-RPC specification and client SDKs:

### 1. Nimiq Hub & Nimiq Pay Dual-Mode Wallet Integration ([`client/src/lib/nimiq-wallet.ts`](client/src/lib/nimiq-wallet.ts))
Nimiq Arena provides a dual-mode Web3 wallet experience that automatically adapts to the player's device environment:
- **Nimiq Hub Web API (`@nimiq/hub-api`)**: In standard desktop and mobile browsers, the application communicates with the official Nimiq Hub (`hub.nimiq-testnet.com` / `hub.nimiq.com`). Players authenticate with `hubApi.chooseAddress({ minBalance: 0 })` and sign match stakes using `hubApi.checkout(...)` without installing any third-party browser extensions.
- **Nimiq Pay Mobile SDK (`@nimiq/mini-app-sdk`)**: When launched inside the official Nimiq Pay mobile wallet container, the app auto-detects `isRunningInNimiqPay()`, seamlessly binding the mobile native provider for instant biometric stake confirmations.

### 2. Luna Integer Precision Math
In Nimiq, $1 \text{ NIM} = 100,000 \text{ Luna}$. All internal payment intents, balances, fee cuts, and payout amounts are calculated strictly using integer Luna math to prevent floating-point rounding errors.

### 3. Pot Distribution Formula ([`shared/game/pot-distribution.ts`](shared/game/pot-distribution.ts))
Total Gross Match Purse is distributed upon match finalization:
$$\text{Gross Pot} = \text{Player 1 Stake} + \text{Player 2 Stake}$$

$$\begin{aligned}
\text{Winner Payout} &= 90\% \times \text{Gross Pot} \\
\text{Arena Builder} &= 5\% \times \text{Gross Pot} \\
\text{Referral Award} &= 2\% \times \text{Gross Pot} \quad \text{(retained by Platform if unreferred)} \\
\text{Charity Allocation} &= 1\% \times \text{Gross Pot} \\
\text{Community Reserve} &= 2\% \times \text{Gross Pot}
\end{aligned}$$

### 4. Anti-Replay & Transaction Verification ([`server/nimiq-verifier.ts`](server/nimiq-verifier.ts))
To prevent transaction recycling and double-spend attacks:
1. Payer submits payment with `paymentIntentId` attached to transaction `recipientData`.
2. Verifier checks:
   - Transaction hash matches standard 64-character hex format.
   - Recipient address matches configured treasury address (`normalizeNimiqAddress`).
   - Transferred value $\ge \text{expectedValueLuna}$.
   - Embedded recipient data matches `expectedData` (intent ID).
   - Network ID matches target chain ($5$ for Testnet, $42$ for Mainnet).
   - Execution result is `true` with required block confirmations.

### 5. Payout Worker & Circuit Breakers ([`server/payout-worker.ts`](server/payout-worker.ts))
- **Option B (Automated Payout)**: Signed using `@nimiq/core` TransactionBuilder and broadcast to RPC.
- **Option A (Ledger Fallback)**: If hot wallet is disabled or key is absent, net prize is credited to player ledger.
- **Safety Breakers**:
  - `MAX_PAYOUT_PER_MATCH_NIM`: Rejects single match payouts exceeding configured limit.
  - `DAILY_PAYOUT_LIMIT_NIM`: Rolling 24-hour ceiling preventing abnormal aggregate disbursements.

---

## Security & Game Integrity

1. **Optimistic Versioning & Concurrency**:
   Every state update increments `stateVersion`. Game commands require `expectedVersion === stateVersion`, rejecting duplicate or out-of-order requests.
2. **IDOR Prevention**:
   Every match read and command execution is guarded by `requireMatchParticipant(matchId, userId)`, preventing unauthorized state tampering.
3. **Token-Bucket Rate Limiting**:
   - `auth.guestLogin`: Max 10 requests / min.
   - `payment`: Max 20 requests / min.
4. **Autonomous Heartbeat Daemon**:
   A background daemon monitors matches every 15 seconds. If a disconnected player exceeds the grace period (`ABANDONMENT_GRACE_MS = 60000`), the match automatically awards a forfeit victory to the active player.

---

## Realtime Architecture

Real-time state synchronization is delivered via Server-Sent Events (SSE) at `GET /api/matches/:id/events`:

```
+------------------+          HTTP /tRPC           +-----------------------+
|   React Client   | ────────────────────────────> | Express + tRPC Server |
|                  | <════════════════════════════ |                       |
+------------------+    Server-Sent Events (SSE)   +-----------------------+
                             (State, Emotes, Chat)             │
                                                               ▼
                                                       +-----------------------+
                                                       |     MariaDB Pool      |
                                                       +-----------------------+
```

- **Transport**: Standard HTTP/1.1 and HTTP/2 SSE streaming with `Cache-Control: no-cache, no-transform`.
- **In-App WebView Token Fallback**: Supports `?token=...` query authentication for environments where third-party session cookies are restricted (e.g. mobile wallet WebViews).
- **Keep-Alive**: Automatic 15-second heartbeat packets prevent mobile carrier proxy disconnects.

---

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (PWA / Browser)"]
        UI["React 19 + TailwindCSS 4 UI"]
        WalletHook["useNimiqWallet Hook"]
        SSEClient["SSE Stream Listener"]
        Audio["Web Audio Engine"]
    end

    subgraph ServerLayer ["Server Layer (Node.js + Express)"]
        Router["tRPC v11 Router & Middleware"]
        RateLimiter["Token-Bucket Rate Limiter"]
        MatchStream["Match Event Streamer (SSE)"]
        Heartbeat["Match Heartbeat Daemon"]
        PayoutWorker["Payout Worker & Circuit Breakers"]
    end

    subgraph Engines ["Core Game & Verification Engines"]
        LudoEng["Deterministic Ludo Engine"]
        C4Eng["Deterministic Connect 4 Engine"]
        BotAI["Minimax & Heuristic AI"]
        Verifier["Nimiq PoS RPC Verifier"]
    end

    subgraph StorageLayer ["Storage & Blockchain"]
        DB[("MariaDB 11 ACID")]
        NimiqRPC["Nimiq PoS JSON-RPC Node"]
    end

    UI -->|tRPC Mutations & Queries| Router
    UI -->|Connects to EventSource| MatchStream
    WalletHook -->|Signs / Submits Tx| NimiqRPC

    Router --> RateLimiter
    Router --> LudoEng
    Router --> C4Eng
    Router --> BotAI
    Router --> Verifier

    MatchStream --> DB
    Heartbeat --> DB
    PayoutWorker --> DB
    PayoutWorker -->|Broadcasts Payout Tx| NimiqRPC
    Verifier -->|Validates Intent & Confirmations| NimiqRPC

    LudoEng --> DB
    C4Eng --> DB
```

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Component rendering and client state management. |
| **Build Tool** | Vite 7.1 (`vite`, `@vitejs/plugin-react`) | Rapid HMR and optimized production bundling. |
| **Styling** | TailwindCSS 4 (`tailwindcss`, `@tailwindcss/vite`) | Utility-first CSS with CSS variables and dynamic viewport units. |
| **Routing** | Wouter 3.3 (`wouter`) | Lightweight client-side router with patch support. |
| **API Layer** | tRPC v11 (`@trpc/server`, `@trpc/client`, `@trpc/react-query`) | End-to-end type-safe RPC with Zod schema validation. |
| **Server Runtime** | Node.js + Express 4.21 (`express`) | HTTP server, static file host, and SSE event streaming. |
| **Database & ORM** | MariaDB 11 + Drizzle ORM (`drizzle-orm`, `mysql2`) | Relational persistence, connection pooling, and migrations. |
| **Blockchain Client** | `@nimiq/core` & `@nimiq/hub-api` | Transaction building, signing, and Nimiq Hub wallet connection. |
| **Realtime** | Server-Sent Events (SSE) | Unidirectional event stream for board state, emotes, and chat. |
| **Testing** | Vitest 2.1 (`vitest`) | Unit, integration, chaos, and end-to-end test suites. |

---

## Repository Structure

```
NimiqArena/
├── client/                      # React frontend application
│   ├── public/                  # Static assets & PWA manifest.json
│   ├── src/
│   │   ├── components/          # Reusable UI, Game Boards, and Modals
│   │   │   ├── game/            # LudoBoard2D, Connect4Board2D, Dice, Modals
│   │   │   └── navigation/      # MobileBottomNav, TopNav
│   │   ├── pages/               # Route pages (Home, LudoDetail, MatchRoom, Replay, etc.)
│   │   ├── lib/                 # Client utilities, tRPC client, wallet hooks
│   │   └── index.css            # Global CSS, theme variables, and responsive layout
│   └── index.html               # Entry HTML with PWA & mobile viewport meta tags
├── server/                      # Node.js + Express backend
│   ├── _core/                   # Server initialization, tRPC context, rate limiter, cookies
│   ├── db.ts                    # Database queries, match state mutations, game dispatchers
│   ├── routers.ts               # tRPC procedures (auth, match, payment, leaderboard, game)
│   ├── match-stream.ts          # Realtime Server-Sent Events (SSE) streaming engine
│   ├── nimiq-verifier.ts        # Authoritative Nimiq PoS JSON-RPC transaction verifier
│   ├── payout-worker.ts         # Automated hot-wallet payout dispatcher with circuit breakers
│   ├── rating-engine.ts         # Elo rating calculation algorithms
│   └── *.test.ts                # Integration and unit test suites
├── shared/                      # Isomorphic shared code (Client + Server)
│   ├── const.ts                 # Timing constants, error messages, cookie names
│   ├── schema.ts                # Shared TypeScript types
│   ├── nimiq-network.ts         # Network configuration (Testnet vs Mainnet RPCs)
│   └── game/                    # Deterministic game engines (ludo-engine, connect4-engine, bots)
├── drizzle/                     # Database schemas and migrations
│   └── schema.ts                # Drizzle table definitions
├── docs/                        # Technical documentation, ADRs, and QA checklists
├── package.json                 # Project dependencies and script definitions
└── vite.config.ts               # Vite build configuration
```

---

## Getting Started & Local Development

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Database**: Docker (for local MariaDB container) or a running MySQL/MariaDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/0xaje/NimiqArena.git
cd NimiqArena
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Spin Up Local Database
```bash
# Start local MariaDB Docker container on port 3307
docker run -d --name nimiq-arena-db \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=nimiq_arena \
  -p 3307:3306 \
  mariadb:11
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=mysql://root:password@127.0.0.1:3307/nimiq_arena
SESSION_SECRET=dev-session-secret-change-in-production-min32chars
NIMIQ_NETWORK=testnet
NIMIQ_RPC_URL=https://rpc.testnet.nimiqwatch.com
NIMIQ_PAYMENT_RECIPIENT_ADDRESS=NQ0700000000000000000000000000000000
ENABLE_AUTOMATED_PAYOUTS=false
```

### 5. Run Database Migrations
```bash
npm run db:push
```

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `3000` | HTTP port for the Express application server. |
| `NODE_ENV` | Required | `development` | Environment mode (`development` or `production`). |
| `DATABASE_URL` | Required | — | MySQL/MariaDB connection URI (`mysql://user:pass@host:port/db`). |
| `SESSION_SECRET` | Required | — | Secret string for session signing (minimum 32 chars). |
| `NIMIQ_NETWORK` | Optional | `testnet` | Target network (`testnet` = Chain ID 5, `mainnet` = Chain ID 42). |
| `NIMIQ_RPC_URL` | Optional | `https://rpc.testnet.nimiqwatch.com` | Nimiq JSON-RPC endpoint. |
| `NIMIQ_PAYMENT_RECIPIENT_ADDRESS` | Required for Staking | — | Treasury IBAN address (`NQ...`) receiving match stakes. |
| `ENABLE_AUTOMATED_PAYOUTS` | Optional | `false` | Enables Option B automated on-chain payouts via hot wallet. |
| `NIMIQ_PAYOUT_PRIVATE_KEY` | Optional | — | Hex private key for automated payout signing (if enabled). |
| `MAX_PAYOUT_PER_MATCH_NIM` | Optional | `0` | Hard cap per match payout in NIM (`0` = unconstrained). |
| `DAILY_PAYOUT_LIMIT_NIM` | Optional | `0` | Daily disbursement ceiling in NIM (`0` = unconstrained). |

---

## Automated Testing & Verification

The repository contains a test suite covering game logic, payment verification, database persistence, multiplayer lifecycle, and rate limiting.

### Running Tests
```bash
# Run full automated test suite (42 test files, 255 tests)
npm run test

# Run TypeScript type safety check (0 errors)
npm run check

# Build production client and server bundles
npm run build
```

### Test Coverage Highlights
- **Game Engines**: 16 unit tests for Ludo multi-dice, captures, and yard exits; 7 unit tests for Connect 4 victory matrices.
- **Blockchain Verification**: 10 integration tests querying live Nimiq PoS Testnet JSON-RPC endpoints, verifying confirmations, recipient matching, and anti-replay rejection.
- **Settlement & Circuit Breakers**: 5 tests verifying integer Luna distributions, payout capping, and idempotency guarantees.
- **E2E Multiplayer**: Full 2-client lifecycle tests verifying HTTP + SSE transport over live database transactions.

---

## Current Status & Limitations

### Working & Verified
- Complete 2-player Ludo and Connect 4 state machines.
- Real-time multiplayer synchronization via Server-Sent Events (SSE).
- Nimiq PoS Testnet payment verification with automated RPC failover.
- Autonomous match heartbeat daemon with disconnect timeouts.
- Step-by-step match replay engine and Elo rating ladders.
- Full PWA support with standalone mobile installation.

### Known Limitations
- **Single Server Instance SSE**: The current SSE broadcaster uses Node.js `EventEmitter`. For horizontal scaling across multiple load-balanced nodes, Redis Pub/Sub should be attached.
- **Testnet Default**: The live deployment currently defaults to Nimiq Testnet Albatross (Chain ID: 5). Mainnet deployment requires setting `NIMIQ_NETWORK=mainnet` and configuring a funded mainnet treasury.

---

## Judge Quickstart & Demo Guide

To test Nimiq Arena in 2 minutes:

1. **Open the Web App**: Visit [https://nimiqarena.onrender.com](https://nimiqarena.onrender.com).
2. **Instant Guest Login**: Click **"Get Started"** or select a game; a guest session is minted automatically.
3. **Try Solo AI Bot Mode**:
   - Navigate to **Connect 4 Blitz** $\rightarrow$ select **"Solo Bot"** $\rightarrow$ click **"Start Match"**.
   - Drop tokens against the Minimax AI in real time.
4. **Try Ludo League (1v1)**:
   - Navigate to **Ludo League** $\rightarrow$ select **"Solo Bot"** or **"Friend Invite"**.
   - Roll dice, advance pawns, capture opponent pieces, and watch real-time turn synchronization.
5. **Inspect Match Replay**:
   - Complete a match $\rightarrow$ click **"Tx & Replay"** $\rightarrow$ step through every recorded turn.
6. **Get Free Test NIM**:
   - Open **Player Profile** $\rightarrow$ tap **"Get Free Test NIM"** to request 50 Testnet NIM from the faucet.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
