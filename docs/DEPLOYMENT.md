# Nimiq Arena — Production Deployment Guide

## 1. Supported Deployment Environments

### Option A: Vercel Serverless (Frontend SPA + Serverless API)
- **Configuration**: [`vercel.json`](file:///home/oyeolorun/NimiqArena/vercel.json)
- **Serverless Entrypoint**: [`api/index.ts`](file:///home/oyeolorun/NimiqArena/api/index.ts)
- **Frontend Output Directory**: `dist/public`
- **Build Command**: `vite build`

### Option B: Persistent Node.js / Container (Recommended for Live Multiplayer)
- Platforms: **Render**, **Railway**, **Fly.io**, **AWS ECS**, **Docker / VPS**
- Command: `npm run build && npm start`
- Advantages: Keeps persistent long-lived SSE connections open indefinitely without serverless execution timeouts.

---

## 2. Required Production Environment Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | MySQL Connection URI | `mysql://user:pass@host:3306/nimiq_arena` |
| `JWT_SECRET` | 32+ character random string for session tokens | `openssl rand -base64 32` |
| `VITE_APP_ID` | Application identifier | `nimiq-arena-app` |
| `NIMIQ_PAYMENT_RECIPIENT` | Arena Nimiq treasury address | `NQ25 7E5E BR06 Q5HY Q10V S7KD T230 H6U1 W91T` |
| `NIMIQ_ARENA_ENTRY_VALUE_LUNA` | Entry stake per match in Luna (1 NIM = $10^8$ Luna) | `100000000` |
| `NIMIQ_NETWORK_ID` | Nimiq Network ID (`5` for Testnet, `42` for Mainnet) | `5` |
| `NIMIQ_RPC_URL` | Public or dedicated Nimiq JSON-RPC endpoint | `https://rpc.testnet.nimiqwatch.com` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server listening port | `3000` |

---

## 3. Database Setup & Migration Execution

1. **Generate and Apply Migrations**:
   ```bash
   npm run db:push
   ```
2. **Schema & Constraint Verification**:
   - `users`: Unique on `openId`.
   - `matches`: Unique on `joinCode`, `paymentIntentId`.
   - `match_players`: Unique on `(matchId, seat)` and `(matchId, userId)`.
   - `match_events`: Unique on `(matchId, version)` and `(matchId, commandNonce)`.
   - `player_ratings`: Unique on `(userId, gameSlug, seasonId)`.
   - `rating_history`: Unique on `(matchId, userId)`.
   - `payment_intents`: Unique on `(userId, clientNonce)` and index on `transactionHash`.
   - `payment_verifications`: Audit records for every verification attempt.

---

## 4. Post-Deployment Verification Checklist

1. **Health Check**:
   ```bash
   curl https://<your-domain>/api/trpc/system.health?input=%7B%22timestamp%22%3A1%7D
   # Expected response: {"result":{"data":{"ok":true}}}
   ```
2. **Game Catalog Check**:
   ```bash
   curl https://<your-domain>/api/trpc/game.getBySlug?input=%7B%22slug%22%3A%22ludo-league%22%7D
   # Expected response: {"result":{"data":{"slug":"ludo-league","status":"active",...}}}
   ```
3. **Frontend SPA Loading**:
   - Visit `https://<your-domain>/` and verify that the page renders without console errors.
   - Visit `https://<your-domain>/leaderboard` and `https://<your-domain>/profile`.

---

## 5. Secret Rotation & Incident Response Runbook

### Secret Rotation (`JWT_SECRET`)
1. Generate new 32-character secret: `openssl rand -base64 32`.
2. Update `JWT_SECRET` in environment variables.
3. Redeploy server. Active user sessions will gracefully re-authenticate on their next request.

### RPC Outage Mitigation
1. If the primary Nimiq RPC node experiences degraded performance or rate limiting, update `NIMIQ_RPC_URL` to an alternative public/private node and trigger zero-downtime redeployment.
