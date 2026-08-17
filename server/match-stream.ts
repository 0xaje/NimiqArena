import type { Express } from "express";
import { getMatchPlayer, getMatchPlayers, refreshMatchLifecycle } from "./db";
import { createContext } from "./_core/context";

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
      const current = await refreshMatchLifecycle(matchId);
      if (!current) return;
      const players = await getMatchPlayers(matchId);
      res.write(
        `event: state\ndata: ${JSON.stringify({ id: current.id, status: current.status, stateVersion: current.stateVersion, snapshot: JSON.parse(current.stateJson), players: players.map(item => ({ seat: item.seat, status: item.status })), yourSeat: player.seat })}\n\n`
      );
    };

    await sendState();
    const heartbeat = setInterval(() => {
      void sendState().catch(() => undefined);
    }, 3_000);
    req.on("close", () => {
      closed = true;
      clearInterval(heartbeat);
    });
  });
}
