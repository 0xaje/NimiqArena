import { createServer, type Server } from "node:http";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter, type AppRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerMatchStream } from "./match-stream";
import { sdk } from "./_core/sdk";
import { getDb, getUserByOpenId, upsertUser } from "./db";
import { matches, matchPlayers, matchEvents, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../shared/const";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";
if (runDatabaseIntegration && process.env.NIMIQ_ARENA_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NIMIQ_ARENA_TEST_DATABASE_URL;
}

describe.skipIf(!runDatabaseIntegration)(
  "Two-Client Live Multiplayer E2E Real Transport Verification",
  () => {
    let server: Server;
    let baseUrl: string;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hostOpenId = `client-a-${suffix}`;
    const guestOpenId = `client-b-${suffix}`;
    let hostToken: string;
    let guestToken: string;
    let createdMatchId: string;

    beforeAll(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database URL not set for E2E multiplayer test");

      // Seed real users
      await upsertUser({
        openId: hostOpenId,
        name: "Player A (Host)",
        role: "user",
      });
      await upsertUser({
        openId: guestOpenId,
        name: "Player B (Guest)",
        role: "user",
      });

      hostToken = await sdk.createSessionToken(hostOpenId, {
        name: "Player A (Host)",
      });
      guestToken = await sdk.createSessionToken(guestOpenId, {
        name: "Player B (Guest)",
      });

      // Spin up real Express HTTP server with tRPC and SSE
      const app = express();
      app.use(express.json());
      registerMatchStream(app);
      app.use(
        "/api/trpc",
        createExpressMiddleware({
          router: appRouter,
          createContext,
        })
      );

      await new Promise<void>(resolve => {
        server = createServer(app);
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (typeof addr === "object" && addr) {
            baseUrl = `http://127.0.0.1:${addr.port}`;
          }
          resolve();
        });
      });
    });

    afterAll(async () => {
      const db = await getDb();
      if (db) {
        if (createdMatchId) {
          await db
            .delete(matchEvents)
            .where(eq(matchEvents.matchId, createdMatchId));
          await db
            .delete(matchPlayers)
            .where(eq(matchPlayers.matchId, createdMatchId));
          await db.delete(matches).where(eq(matches.id, createdMatchId));
        }
        await db.delete(users).where(eq(users.openId, hostOpenId));
        await db.delete(users).where(eq(users.openId, guestOpenId));
      }
      if (server) {
        await new Promise<void>(resolve => server.close(() => resolve()));
      }
    });

    function makeTrpcCaller(token: string) {
      return createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${baseUrl}/api/trpc`,
            transformer: superjson,
            headers: () => ({
              Cookie: `${COOKIE_NAME}=${token}`,
            }),
          }),
        ],
      });
    }

    it("executes full two-client multiplayer lifecycle over real HTTP & SSE transport", async () => {
      const clientA = makeTrpcCaller(hostToken);
      const clientB = makeTrpcCaller(guestToken);

      // 1. Client A creates match
      const createRes = await clientA.match.createChallenge.mutate({
        gameSlug: "ludo-league",
      });
      expect(createRes.id).toBeDefined();
      expect(createRes.joinCode).toBeDefined();
      expect(createRes.status).toBe("waiting");
      createdMatchId = createRes.id;

      // 2. Client B joins match with joinCode
      const joinRes = await clientB.match.joinByCode.mutate({
        joinCode: createRes.joinCode,
      });
      expect(joinRes.id).toBe(createdMatchId);
      expect(joinRes.seat).toBe(1);
      expect(joinRes.status).toBe("in_progress");

      // 3. Connect real SSE stream for Client A and Client B
      const streamEventsA: Array<{
        stateVersion: number;
        status: string;
        dice?: number;
        currentPlayer?: number;
      }> = [];
      const streamEventsB: Array<{
        stateVersion: number;
        status: string;
        dice?: number;
        currentPlayer?: number;
      }> = [];

      const connectSse = (token: string, eventSink: typeof streamEventsA) => {
        const controller = new AbortController();
        const promise = (async () => {
          try {
            const res = await fetch(
              `${baseUrl}/api/matches/${createdMatchId}/events`,
              {
                headers: { Cookie: `${COOKIE_NAME}=${token}` },
                signal: controller.signal,
              }
            );
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";
              for (const block of lines) {
                const match = block.match(/event:\s*state\ndata:\s*(.+)/);
                if (match) {
                  try {
                    const parsed = JSON.parse(match[1]);
                    eventSink.push({
                      stateVersion: parsed.stateVersion,
                      status: parsed.status,
                      dice: parsed.snapshot?.dice,
                      currentPlayer: parsed.snapshot?.currentPlayer,
                    });
                  } catch {
                    // Ignore parse error
                  }
                }
              }
            }
          } catch {
            // Aborted on cleanup
          }
        })();
        return { controller, promise };
      };

      const sseA = connectSse(hostToken, streamEventsA);
      const sseB = connectSse(guestToken, streamEventsB);

      // Wait for initial SSE connect messages
      await new Promise(r => setTimeout(r, 600));
      expect(streamEventsA.length).toBeGreaterThanOrEqual(1);
      expect(streamEventsB.length).toBeGreaterThanOrEqual(1);

      // 4. Client A (Seat 0, Turn 0) rolls the dice
      const rollNonceA = `e2e-roll-a-${suffix}`;
      const rollRes = await clientA.match.command.mutate({
        id: createdMatchId,
        command: {
          kind: "roll",
          expectedVersion: 0,
          nonce: rollNonceA,
        },
      });
      expect(rollRes.snapshot.version).toBe(1);
      expect(rollRes.snapshot.lastRoll?.value).toBeGreaterThanOrEqual(1);
      expect(rollRes.snapshot.lastRoll?.value).toBeLessThanOrEqual(6);

      // Wait for SSE broadcast
      await new Promise(r => setTimeout(r, 400));

      // Client B receives new state via SSE
      const latestEventB = streamEventsB[streamEventsB.length - 1];
      expect(latestEventB.stateVersion).toBe(1);
      expect(latestEventB.status).toBe("in_progress");

      // 5. Invalid action rejected: inactive client attempts to roll out of turn
      const invalidNonce = `e2e-invalid-${suffix}`;
      const inactiveClient = rollRes.snapshot.currentPlayer === 0 ? clientB : clientA;
      await expect(
        inactiveClient.match.command.mutate({
          id: createdMatchId,
          command: {
            kind: "roll",
            expectedVersion: rollRes.snapshot.version,
            nonce: invalidNonce,
          },
        })
      ).rejects.toThrow();

      // 6. Duplicate action replay: Client A submits same rollNonceA -> original result replayed
      const dupRes = await clientA.match.command.mutate({
        id: createdMatchId,
        command: {
          kind: "roll",
          expectedVersion: 0,
          nonce: rollNonceA,
        },
      });
      expect(dupRes.idempotent).toBe(true);
      expect(dupRes.snapshot.version).toBe(1);

      // 7. Client A disconnect & reconnect flow
      await clientA.match.disconnect.mutate({ id: createdMatchId });
      sseA.controller.abort();

      const stateAfterDisconnect = await clientB.match.state.query({
        id: createdMatchId,
      });
      expect(stateAfterDisconnect.stateVersion).toBe(1);
      expect(stateAfterDisconnect.status).toBe("in_progress");

      // Client A sends heartbeat on reconnect -> status restored to joined
      const heartbeatRes = await clientA.match.heartbeat.mutate({
        id: createdMatchId,
      });
      expect(heartbeatRes.ok).toBe(true);

      const refreshedState = await clientA.match.state.query({
        id: createdMatchId,
      });
      const hostPlayer = refreshedState.players.find((p: any) => p.seat === 0);
      expect(hostPlayer.status).toBe("joined");

      // Clean up SSE streams
      sseA.controller.abort();
      sseB.controller.abort();
    });
  }
);
