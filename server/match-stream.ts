import { EventEmitter } from "node:events";
import type { Express } from "express";
import {
  getMatchPlayer,
  getMatchPlayers,
  getUserByOpenId,
  refreshMatchLifecycle,
  touchMatchPlayerPresence,
} from "./db";
import { PLAYER_HEARTBEAT_INTERVAL_MS } from "@shared/const";
import { createContext } from "./_core/context";
import { sdk } from "./_core/sdk";

const matchEventsEmitter = new EventEmitter();
matchEventsEmitter.setMaxListeners(200);

export interface EmotePayload {
  id: string;
  userId: number;
  userName: string;
  seat: number;
  emote: string; // e.g. "rocket", "fire", "diamond", etc.
  emoji: string; // e.g. "🚀"
  timestamp: number;
}

export interface QuickChatPayload {
  id: string;
  userId: number;
  userName: string;
  seat: number;
  message: string;
  timestamp: number;
}

export interface DirectStatePayload {
  id: string;
  status: string;
  engineVersion: string;
  stateVersion: number;
  snapshot: any;
  players?: Array<{ seat: number; status: string; lastSeenAt: Date }>;
}

export function notifyMatchUpdated(matchId: string, payload?: DirectStatePayload) {
  matchEventsEmitter.emit(`match:${matchId}`, payload);
}

export function broadcastEmote(matchId: string, payload: EmotePayload) {
  matchEventsEmitter.emit(`match:${matchId}:emote`, payload);
}

export function broadcastQuickChat(matchId: string, payload: QuickChatPayload) {
  matchEventsEmitter.emit(`match:${matchId}:chat`, payload);
}

export function registerMatchStream(app: Express) {
  app.get("/api/matches/:id/events", async (req, res) => {
    let user = (await createContext({ req, res } as never)).user;

    // WebView / In-app browser fallback: EventSource cannot set custom headers,
    // so pass token in query param when cookies are blocked or isolated.
    if (!user && typeof req.query.token === "string" && req.query.token.length > 0) {
      try {
        const session = await sdk.verifySession(req.query.token);
        if (session?.openId) {
          user = (await getUserByOpenId(session.openId)) ?? null;
        }
      } catch (err) {
        console.warn("[MatchStream] Query token auth failed:", err);
      }
    }

    if (!user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const matchId = req.params.id;
    const match = await refreshMatchLifecycle(matchId);
    if (!match) {
      res.status(404).json({ message: "Match not found." });
      return;
    }
    let initialPlayer = await getMatchPlayer(matchId, user.id);

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let closed = false;
    const sendState = async () => {
      if (closed) return;
      try {
        const current = await refreshMatchLifecycle(matchId);
        if (!current || closed) return;
        const players = await getMatchPlayers(matchId);
        if (closed) return;

        let activePlayer = initialPlayer;
        if (!activePlayer) {
          activePlayer = await getMatchPlayer(matchId, user.id);
          if (activePlayer) initialPlayer = activePlayer;
        }

        const resolvedSeat = activePlayer ? activePlayer.seat : -1;

        res.write(
          `event: state\ndata: ${JSON.stringify({
            id: current.id,
            status: current.status,
            engineVersion: current.engineVersion,
            stateVersion: current.stateVersion,
            snapshot: JSON.parse(current.stateJson),
            players: players.map(item => ({
              seat: item.seat,
              status: item.status,
              // The client decides when to warn about an absent opponent, and
              // was reading this from the polled query only - so a stream
              // update left it undefined and the two disagreed.
              lastSeenAt: item.lastSeenAt,
            })),
            yourSeat: resolvedSeat,
          })}\n\n`
        );
      } catch {
        // Stream write or DB read failed; ignore if closed
      }
    };

    const onMatchUpdate = (payload?: DirectStatePayload) => {
      if (closed) return;
      if (payload && payload.snapshot) {
        try {
          const resolvedSeat = initialPlayer ? initialPlayer.seat : -1;
          res.write(
            `event: state\ndata: ${JSON.stringify({
              id: payload.id,
              status: payload.status,
              engineVersion: payload.engineVersion,
              stateVersion: payload.stateVersion,
              snapshot: payload.snapshot,
              players: payload.players ?? [],
              yourSeat: resolvedSeat,
            })}\n\n`
          );
        } catch {
          // write failed; socket closed
        }
      } else {
        void sendState().catch(() => undefined);
      }
    };

    const onEmote = (payload: EmotePayload) => {
      if (closed) return;
      try {
        res.write(`event: emote\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // socket closed
      }
    };

    const onChat = (payload: QuickChatPayload) => {
      if (closed) return;
      try {
        res.write(`event: chat\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // socket closed
      }
    };

    matchEventsEmitter.on(`match:${matchId}`, onMatchUpdate);
    matchEventsEmitter.on(`match:${matchId}:emote`, onEmote);
    matchEventsEmitter.on(`match:${matchId}:chat`, onChat);

    await sendState();

    // Send periodic state sync and keepalive heartbeat
    const periodicSync = setInterval(() => {
      void sendState().catch(() => undefined);
    }, 3_000);

    // An open stream is proof the player is there, and it survives the browser
    // throttling background timers - which was marking players absent purely
    // for having tabbed away. The client's own beat still drives presence when
    // the stream is unavailable.
    const presenceSync = setInterval(() => {
      if (closed || !player) return;
      void touchMatchPlayerPresence(matchId, context.user!.id).catch(
        () => undefined
      );
    }, PLAYER_HEARTBEAT_INTERVAL_MS);

    const pingInterval = setInterval(() => {
      if (!closed) {
        try {
          res.write(`: heartbeat ${Date.now()}\n\n`);
        } catch {
          // Socket closed
        }
      }
    }, 10_000);

    req.on("close", () => {
      closed = true;
      clearInterval(periodicSync);
      clearInterval(presenceSync);
      clearInterval(pingInterval);
      matchEventsEmitter.off(`match:${matchId}`, onMatchUpdate);
      matchEventsEmitter.off(`match:${matchId}:emote`, onEmote);
      matchEventsEmitter.off(`match:${matchId}:chat`, onChat);
    });
  });
}
