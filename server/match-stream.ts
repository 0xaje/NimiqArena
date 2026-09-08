import { EventEmitter } from "node:events";
import type { Express } from "express";
import {
  getMatchPlayer,
  getMatchPlayers,
  refreshMatchLifecycle,
  touchMatchPlayerPresence,
} from "./db";
import { PLAYER_HEARTBEAT_INTERVAL_MS } from "@shared/const";
import { createContext } from "./_core/context";

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

export function notifyMatchUpdated(matchId: string) {
  matchEventsEmitter.emit(`match:${matchId}`);
}

export function broadcastEmote(matchId: string, payload: EmotePayload) {
  matchEventsEmitter.emit(`match:${matchId}:emote`, payload);
}

export function broadcastQuickChat(matchId: string, payload: QuickChatPayload) {
  matchEventsEmitter.emit(`match:${matchId}:chat`, payload);
}

export function registerMatchStream(app: Express) {
  app.get("/api/matches/:id/events", async (req, res) => {
    const context = await createContext({ req, res } as never);
    if (!context.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const matchId = req.params.id;
    const match = await refreshMatchLifecycle(matchId);
    if (!match) {
      res.status(404).json({ message: "Match not found." });
      return;
    }
    const player = await getMatchPlayer(matchId, context.user.id);

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
            yourSeat: player.seat,
          })}\n\n`
        );
      } catch {
        // Stream write or DB read failed; ignore if closed
      }
    };

    const onMatchUpdate = () => {
      void sendState().catch(() => undefined);
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
