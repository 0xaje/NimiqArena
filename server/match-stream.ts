import { EventEmitter } from "node:events";
import type { Express } from "express";
import { getMatchPlayer, getMatchPlayers, refreshMatchLifecycle } from "./db";
import { createContext } from "./_core/context";

const matchEventsEmitter = new EventEmitter();
matchEventsEmitter.setMaxListeners(100);

export function notifyMatchUpdated(matchId: string) {
  matchEventsEmitter.emit(`match:${matchId}`);
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
    const player = match
      ? await getMatchPlayer(matchId, context.user.id)
      : undefined;
    if (!match || !player) {
      res
        .status(403)
        .json({ message: "Only joined match participants may subscribe." });
      return;
    }

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
            stateVersion: current.stateVersion,
            snapshot: JSON.parse(current.stateJson),
            players: players.map(item => ({
              seat: item.seat,
              status: item.status,
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

    matchEventsEmitter.on(`match:${matchId}`, onMatchUpdate);

    await sendState();

    // Send periodic state sync and keepalive heartbeat
    const periodicSync = setInterval(() => {
      void sendState().catch(() => undefined);
    }, 3_000);

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
      clearInterval(pingInterval);
      matchEventsEmitter.off(`match:${matchId}`, onMatchUpdate);
    });
  });
}
