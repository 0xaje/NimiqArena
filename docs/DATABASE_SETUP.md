# Nimiq Arena — Database Architecture & Setup Guide

This guide details the database architecture, local development setup, container management, and troubleshooting procedures for Nimiq Arena.

---

## 1. Database Architecture

Nimiq Arena uses **MariaDB / MySQL 8.0+** with **Drizzle ORM** for transactional, ACID-compliant persistence of:
- Matches, state versions, and JSON snapshots (`matches`)
- Participant seats and heartbeat timestamps (`match_players`)
- Append-only event sourcing logs (`match_events`)
- Elo rating transactions and seasonal stats (`player_ratings`, `rating_history`)
- Blockchain payment intents and anti-replay records (`payment_intents`)

In accordance with our **Non-Negotiable Truth Policy**, Nimiq Arena **never uses a silent in-memory database fallback**. If the database is unreachable, the application fails fast and reports diagnostic instructions.

---

## 2. Docker Container Setup

The official local development container is named `nimiq-arena-db`.

### Starting Existing Container
```bash
docker start nimiq-arena-db
```

### Checking Container Status
```bash
docker ps -a --filter name=nimiq-arena-db
```

### Creating New Container (If not already created)
```bash
docker run -d \
  --name nimiq-arena-db \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=test \
  -e MYSQL_DATABASE=nimiq_arena \
  mariadb:10.11
```

---

## 3. Environment Configuration

Ensure your `.env` file contains the correct connection string targeting port `3307`:

```env
DATABASE_URL="mysql://root:test@127.0.0.1:3307/nimiq_arena"
```

For running database-backed integration tests:
```env
RUN_DB_INTEGRATION_TESTS=1
NIMIQ_ARENA_TEST_DATABASE_URL="mysql://root:test@127.0.0.1:3307/nimiq_test"
```

---

## 4. Applying Schema Migrations

To sync schema changes defined in `drizzle/schema.ts` to the active database:

```bash
pnpm drizzle-kit push:mysql
```

---

## 5. Diagnostic Commands

### Direct Shell Access
```bash
docker exec -it nimiq-arena-db mariadb -u root -ptest nimiq_arena
```

### Check Database Health
```bash
curl -s http://localhost:3000/api/health | jq
```
Expected output:
```json
{
  "status": "ok",
  "service": "Nimiq Arena",
  "database": true
}
```

---

## 6. Troubleshooting Startup Failures

If you encounter `ECONNREFUSED 127.0.0.1:3307`:
1. Check if Docker is running: `docker info`
2. Start the database container: `docker start nimiq-arena-db`
3. Verify the port is listening: `netstat -tlpn | grep 3307` or `lsof -i :3307`
4. Test direct connectivity: `nc -zv 127.0.0.1 3307`
