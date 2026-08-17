import type { Express, Request, Response } from "express";
import { sweepMatchLifecycle } from "./db";
import { sdk } from "./_core/sdk";

export async function cleanupMatchesHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    const result = await sweepMatchLifecycle();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Match cleanup failed.",
      timestamp: new Date().toISOString(),
    });
  }
}

export function registerMatchCleanup(app: Express) {
  app.post("/api/scheduled/cleanupMatches", cleanupMatchesHandler);
}
