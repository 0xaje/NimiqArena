# Nimiq Arena — 100% Free Production Deployment Guide

This guide details how to deploy Nimiq Arena to production with **zero recurring costs ($0/mo)**, zero errors, and full support for live real-time multiplayer (persistent SSE connections).

---

## Architecture Overview

| Component | Recommended Free Provider | Why This Provider? | Cost |
| :--- | :--- | :--- | :--- |
| **Compute & API Server** | **[Render](https://render.com)** (Free Web Service) | Supports persistent Node.js runtime, long-lived Server-Sent Events (SSE) for live multiplayer games, free auto-renewing SSL/TLS, and automated GitHub CI/CD deployments. | **$0/mo** |
| **Database** | **[TiDB Cloud](https://tidbcloud.com)** or **[Aiven](https://aiven.io)** | MySQL-compatible cloud serverless database. TiDB offers 5 GB storage with 50M Request Units/mo, requiring **no credit card**. | **$0/mo** |
| **Blockchain RPC** | **Nimiq Official Public RPC** | Testnet (`https://rpc.testnet.nimiqwatch.com`) or Mainnet (`https://rpc.nimiqwatch.com`). | **$0/mo** |
| **Frontend & Assets** | Bundled with Backend | Served directly from `dist/public` by the Node server on the same origin (no CORS issues). | **$0/mo** |

> [!IMPORTANT]
> **Why Render instead of Vercel / Netlify?**
> Nimiq Arena relies on real-time Server-Sent Events (SSE) for synchronous Ludo and Connect NIM turns. Vercel and Netlify serverless functions have a strict 10s–60s timeout limit that cuts off multiplayer games midway. Render keeps persistent connections alive indefinitely.

---

## Step 1: Create Your Free MySQL Database (2 Minutes)

### Option A: TiDB Cloud Serverless (Recommended — No Credit Card Needed)
1. Go to **[tidbcloud.com](https://tidbcloud.com)** and sign up with your GitHub or Google account.
2. Click **Create Cluster** and select **Serverless**.
3. Choose your nearest region (e.g., `us-east-1` or `eu-central-1`).
4. Set a cluster name (e.g. `nimiq-arena-db`) and click **Create**.
5. Once ready, click **Connect**:
   - Choose **Connect with: General**.
   - Copy the MySQL Connection String. It looks like:
     ```
     mysql://<user>:<password>@<gateway-host>:4000/<database>?ssl={"rejectUnauthorized":true}
     ```
6. Save this connection string; this is your `DATABASE_URL`.

---

## Step 2: Initialize Database Tables

Before running the server, push the Drizzle schema to create all tables (`users`, `matches`, `match_players`, `match_events`, `player_ratings`, etc.):

From your local machine terminal:
```bash
DATABASE_URL="your-tidb-connection-string-here" npm run db:push
```

You should see Drizzle confirm all tables and indexes are generated and applied.

---

## Step 3: Deploy to Render (3 Minutes)

### Method 1: Using the Pre-Configured Blueprint (1 Click)
1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign in with GitHub.
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your repository: `0xaje/NimiqArena` (branch: `main`).
4. Render will automatically detect [`render.yaml`](file:///home/oyeolorun/NimiqArena/render.yaml) from the repository.
5. In the configuration screen, provide the required environment variables:
   - `DATABASE_URL`: Paste your TiDB connection string from Step 1.
   - `NIMIQ_PAYMENT_RECIPIENT`: Your Nimiq treasury address (e.g. `NQ07 0000 0000 0000 0000 0000 0000 0000`).
   - `NIMIQ_PAYOUT_PRIVATE_KEY`: (Optional) 64-char hex key if you wish to enable automated on-chain payouts, or leave blank to record ledger entitlements.
6. Click **Apply**. Render will automatically build the client bundle, esbuild the server, and deploy!

---

### Method 2: Manual Web Service Setup
If you prefer setting it up manually without Blueprint:
1. In Render Dashboard, click **New +** > **Web Service**.
2. Select your repository `0xaje/NimiqArena`.
3. Configure settings:
   - **Name**: `nimiq-arena`
   - **Region**: Same region as your database (for lowest latency).
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Advanced** > **Health Check Path**, enter: `/api/health`
5. Under **Environment Variables**, click **Add Environment Variable**:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `3000` | Port for Express server |
| `DATABASE_URL` | `mysql://user:pass@host:4000/db` | Your TiDB or MySQL connection string |
| `JWT_SECRET` | `generate-a-random-32-char-string` | E.g. `openssl rand -hex 32` |
| `TRUST_PROXY` | `1` | Enables secure cookie/IP detection behind Render proxy |
| `NIMIQ_NETWORK_ID` | `5` | `5` for Testnet, `42` for Mainnet |
| `NIMIQ_RPC_URL` | `https://rpc.testnet.nimiqwatch.com` | Official Nimiq JSON-RPC endpoint |
| `NIMIQ_PAYMENT_RECIPIENT` | `NQ07 0000 0000 0000 0000 0000 0000 0000` | Address where builder fees are received |
| `VITE_APP_ID` | `nimiq-arena-app` | App ID for Mini App SDK |

6. Click **Create Web Service**.

---

## Step 4: Verification & Live Health Check

Once the deployment completes (usually 2–3 minutes):
1. **Health Check Endpoint**:
   ```bash
   curl https://<your-render-app-name>.onrender.com/api/health
   # Expected response: {"status":"healthy","timestamp":1725...}
   ```
2. **Open the Web App**:
   - Visit `https://<your-render-app-name>.onrender.com`.
   - Verify that the landing page loads cleanly with the newly optimized mobile wallet capsule.
   - Click **Connect Wallet** to test Nimiq Hub / Nimiq Pay connection.
   - Play a Practice or Solo match in **Ludo League** or **Connect NIM**.
   - Check the **Leaderboard** and **Earn (Patron Vault)** tabs.

---

## Alternative: Self-Hosted Cloud VM / Docker (100% Free Forever)

If you have an **Oracle Cloud Always Free VM** or an existing server:
1. Clone the repository:
   ```bash
   git clone https://github.com/0xaje/NimiqArena.git
   cd NimiqArena
   ```
2. Launch with Docker Compose (spins up both MariaDB and Nimiq Arena in one command):
   ```bash
   docker compose up -d --build
   ```
3. Your app is running locally at `http://localhost:3000` with persistent storage in Docker volumes.
