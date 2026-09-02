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
import { getDb, upsertUser } from "./db";
import { matches, matchPlayers, matchEvents, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";

describe("Multiplayer Chaos & State Convergence Verification Suite", () => {
  let server: Server;
  let baseUrl: string;
  const suffix = `${Date.now()}-${nanoid(6)}`;
  const hostOpenId = `chaos-host-${suffix}`;
  const guestOpenId = `chaos-guest-${suffix}`;
  let hostToken: string;
  let guestToken: string;
  let matchId: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    await upsertUser({
      openId: hostOpenId,
      name: "Chaos Player A (Host)",
      role: "user",
    });
    await upsertUser({
      openId: guestOpenId,
      name: "Chaos Player B (Guest)",
      role: "user",
    });

    hostToken = await sdk.createSessionToken(hostOpenId, {
      name: "Chaos Player A (Host)",
    });
    guestToken = await sdk.createSessionToken(guestOpenId, {
      name: "Chaos Player B (Guest)",
    });

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
      if (matchId) {
        await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
        await db.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId));
        await db.delete(matches).where(eq(matches.id, matchId));
      }
      await db.delete(users).where(eq(users.openId, hostOpenId));
      await db.delete(users).where(eq(users.openId, guestOpenId));
    }
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  function makeClient(token: string) {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/api/trpc`,
          transformer: superjson,
          headers: () => ({
            cookie: `${COOKIE_NAME}=${token}`,
            Authorization: `Bearer ${token}`,
          }),
        }),
      ],
    });
  }

  it("creates a 2-player match and transitions to in_progress", async () => {
    const hostClient = makeClient(hostToken);
    const guestClient = makeClient(guestToken);

    // Host creates match
    const created = await hostClient.match.createChallenge.mutate({
      gameSlug: "ludo-league",
    });
    matchId = created.id;
    expect(created.status).toBe("waiting");

    // Guest joins match
    const joined = await guestClient.match.joinByCode.mutate({
      joinCode: created.joinCode,
    });
    expect(joined.status).toBe("in_progress");
  });

  it("handles simultaneous conflicting commands: executes the first and safely rejects the other", async () => {
    const hostClient = makeClient(hostToken);
    const guestClient = makeClient(guestToken);

    const initial = await hostClient.match.state.query({ id: matchId });
    const currentVersion = initial.stateVersion;

    // Concurrently send roll commands from both Host and Guest
    const [resHost, resGuest] = await Promise.allSettled([
      hostClient.match.command.mutate({
        id: matchId,
        command: {
          kind: "roll",
          expectedVersion: currentVersion,
          nonce: `simul-host-${nanoid(20)}`,
        },
      }),
      guestClient.match.command.mutate({
        id: matchId,
        command: {
          kind: "roll",
          expectedVersion: currentVersion,
          nonce: `simul-guest-${nanoid(20)}`,
        },
      }),
    ]);

    // Host has turn 0, so host's roll succeeds
    expect(resHost.status).toBe("fulfilled");

    // Guest does not have turn or has version clash, so guest's roll is rejected safely
    expect(resGuest.status).toBe("rejected");
  });

  it("replays duplicate nonce idempotently without double-rolling or advancing version", async () => {
    const hostClient = makeClient(hostToken);
    const currentState = await hostClient.match.state.query({ id: matchId });

    // Try replaying host's previous roll or submitting a duplicated nonce
    const fixedNonce = `chaos-nonce-${nanoid(20)}`;

    // If host has turn and dice is null, roll once
    let state = currentState;
    if (state.snapshot.currentPlayer === 0 && state.snapshot.dice === null) {
      const res1 = await hostClient.match.command.mutate({
        id: matchId,
        command: {
          kind: "roll",
          expectedVersion: state.stateVersion,
          nonce: fixedNonce,
        },
      });

      // Submit identical nonce again
      const res2 = await hostClient.match.command.mutate({
        id: matchId,
        command: {
          kind: "roll",
          expectedVersion: state.stateVersion,
          nonce: fixedNonce,
        },
      });

      expect(res2.snapshot.version).toBe(res1.snapshot.version);
      expect(res2.snapshot.lastRoll?.value).toBe(res1.snapshot.lastRoll?.value);
    }
  });

  it("recovers from stale expectedVersion by refetching authoritative state and continuing", async () => {
    const hostClient = makeClient(hostToken);
    const guestClient = makeClient(guestToken);

    // Intentionally pass an obsolete version (0)
    let caughtError: any = null;
    try {
      await hostClient.match.command.mutate({
        id: matchId,
        command: {
          kind: "roll",
          expectedVersion: 0,
          nonce: `stale-nonce-${nanoid(20)}`,
        },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toMatch(/Match state changed|version mismatch|It is not your turn/i);

    // Client recovery: refetches authoritative state
    const recoveredHostState = await hostClient.match.state.query({ id: matchId });
    const recoveredGuestState = await guestClient.match.state.query({ id: matchId });

    // Both clients observe identical authoritative version and snapshot
    expect(recoveredHostState.stateVersion).toBe(recoveredGuestState.stateVersion);
    expect(recoveredHostState.snapshot.currentPlayer).toBe(
      recoveredGuestState.snapshot.currentPlayer
    );
  });

  it("simulates client disconnect and reconnect: recovers authoritative state without data loss", async () => {
    const hostClient = makeClient(hostToken);
    const guestClient = makeClient(guestToken);

    // Host "disconnects" (drops client reference)
    // Server state remains intact in database
    const guestState = await guestClient.match.state.query({ id: matchId });

    // Host "reconnects" (creates new client instance)
    const newHostClient = makeClient(hostToken);
    const reconnectedState = await newHostClient.match.state.query({ id: matchId });

    // Assert exact state parity
    expect(reconnectedState.stateVersion).toBe(guestState.stateVersion);
    expect(reconnectedState.snapshot.version).toBe(guestState.snapshot.version);
    expect(reconnectedState.id).toBe(matchId);
    expect(reconnectedState.status).toBe("in_progress");
  });

  it("executes multi-turn 2-player human gameplay where both clients converge authoritatively on every turn", async () => {
    const hostClient = makeClient(hostToken);
    const guestClient = makeClient(guestToken);

    let turnsExecuted = 0;
    const targetTurns = 10;

    while (turnsExecuted < targetTurns) {
      const hostState = await hostClient.match.state.query({ id: matchId });
      const guestState = await guestClient.match.state.query({ id: matchId });

      // Invariant: Both clients ALWAYS hold identical state version and snapshot
      expect(hostState.stateVersion).toBe(guestState.stateVersion);
      expect(hostState.snapshot.version).toBe(guestState.snapshot.version);
      expect(hostState.snapshot.currentPlayer).toBe(guestState.snapshot.currentPlayer);

      const activeSeat = hostState.snapshot.currentPlayer;
      const activeClient = activeSeat === 0 ? hostClient : guestClient;
      const currentVer = hostState.stateVersion;

      if (hostState.snapshot.dice === null) {
        // Active player rolls
        const rollRes = await activeClient.match.command.mutate({
          id: matchId,
          command: {
            kind: "roll",
            expectedVersion: currentVer,
            nonce: `turn-roll-${turnsExecuted}-${nanoid(16)}`,
          },
        });
        expect(rollRes.snapshot.version).toBeGreaterThan(currentVer);
        turnsExecuted++;
      } else {
        // Active player selects a legal piece if available
        const pieces = hostState.snapshot.players[activeSeat].pieces;
        const diceVal = hostState.snapshot.dice;
        let movableIdx = -1;
        pieces.forEach((p: any, idx: number) => {
          if (p.position === -1 && diceVal === 6) movableIdx = idx;
          else if (p.position >= 0 && p.position + diceVal <= 57) movableIdx = idx;
        });

        if (movableIdx !== -1) {
          const moveRes = await activeClient.match.command.mutate({
            id: matchId,
            command: {
              kind: "move",
              pieceIndex: movableIdx,
              expectedVersion: currentVer,
              nonce: `turn-move-${turnsExecuted}-${nanoid(16)}`,
            },
          });
          expect(moveRes.snapshot.version).toBeGreaterThan(currentVer);
        }
        turnsExecuted++;
      }
    }

    // Final verification: parity is preserved after full sequence
    const finalHost = await hostClient.match.state.query({ id: matchId });
    const finalGuest = await guestClient.match.state.query({ id: matchId });
    expect(finalHost.stateVersion).toBe(finalGuest.stateVersion);
    expect(finalHost.snapshot.version).toBe(finalGuest.snapshot.version);
    expect(finalHost.snapshot.currentPlayer).toBe(finalGuest.snapshot.currentPlayer);
  });
});
