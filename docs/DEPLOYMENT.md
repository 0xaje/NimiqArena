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

## 2. Production Environment Variables (Render Dashboard)

| Variable | Description | Recommended / Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode | `production` |
| `DATABASE_URL` | MySQL Connection URI (e.g. TiDB Cloud Serverless or Aiven MySQL) | `mysql://user:pass@host:3306/nimiq_arena?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | 32+ character random string for session auth cookies | Generate via `openssl rand -base64 32` or Render "Generate" |
| `TRUST_PROXY` | Reverse proxy trust count (Render uses 1 proxy layer) | `1` |
| `PORT` | Listening HTTP port | `3000` |
| `NIMIQ_NETWORK_ID` | Network ID (`5` for Testnet Albatross, `42` for Mainnet) | `5` |
| `NIMIQ_RPC_URL` | Authoritative Nimiq JSON-RPC endpoint | `https://rpc.testnet.nimiqwatch.com` |
| `NIMIQ_PAYMENT_RECIPIENT` | Arena central escrow treasury wallet | `NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX` |
| `NIMIQ_SETTLEMENT_ADDRESS` | Settlement destination address | `NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX` |
| `NIMIQ_BUILDER_ADDRESS` | Arena Builder treasury (receives 5–7% pot cut) | `NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX` |
| `NIMIQ_CHARITY_ADDRESS` | Charity address (receives 1% pot cut) | `NQ44 KUSA 4K5M 5LMJ JKET 1GLB 0T8R 9J63 LMJ3` |
| `NIMIQ_ECOSYSTEM_ADDRESS` | Ecosystem fund address (receives 2% pot cut) | `NQ26 DH1P 5F4E H3PE 6STN 54MH 8296 G0UK 29AE` |
| `ENABLE_AUTOMATED_PAYOUTS` | Enable real on-chain automated payouts | `true` |
| `NIMIQ_PAYOUT_PRIVATE_KEY` | Hot-wallet private key (64-character hex) for on-chain broadcast | `[Secret Hot Wallet Private Key]` |
| `DISABLE_PAYOUT_LIMITS` | Remove payout limits (allow any stake & payout amount) | `true` |
| `MAX_PAYOUT_PER_MATCH_NIM` | Per-match cap (set `0` for uncapped) | `0` |
| `DAILY_PAYOUT_LIMIT_NIM` | Daily disbursement volume cap (set `0` for uncapped) | `0` |
| `DISCORD_WEBHOOK_URL` *(Optional)* | Discord incoming webhook to broadcast matches & wins | `https://discord.com/api/webhooks/...` |
| `TELEGRAM_BOT_TOKEN` *(Optional)* | Telegram Bot token for community alerts | `123456789:ABC...` |
| `TELEGRAM_CHAT_ID` *(Optional)* | Telegram chat/channel ID for announcements | `@nimiqarena_chat` or `-100...` |

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
