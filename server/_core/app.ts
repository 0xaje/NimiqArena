import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerMatchStream } from "../match-stream";
import { registerMatchCleanup } from "../match-cleanup";
import { apiRateLimiter } from "./rateLimiter";

export function createExpressApp(): Express {
  const app = express();
  // Configure body parser with larger size limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Apply rate limiting on API endpoints
  app.use("/api", apiRateLimiter);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Nimiq Arena",
      miniAppSdk: "0.1.0",
      database: Boolean(process.env.DATABASE_URL),
    });
  });

  // Register API features
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerMatchStream(app);
  registerMatchCleanup(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
