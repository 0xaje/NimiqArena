import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerMatchStream } from "../match-stream";
import { registerMatchCleanup } from "../match-cleanup";
import { registerNimiqAccountRoutes } from "../nimiq-account";
import { apiRateLimiter } from "./rateLimiter";
import { ENV } from "./env";

export function createExpressApp(): Express {
  const app = express();
  // Decides whether X-Forwarded-For is believed, which in turn decides what
  // rate limiting and cookie security see as the client. Defaults to trusting
  // nothing; deployments behind a proxy must set TRUST_PROXY.
  app.set("trust proxy", ENV.trustProxy);
  // Configure body parser with larger size limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Apply rate limiting on API endpoints
  app.use("/api", apiRateLimiter);

  // Safe Public Build & Health Check Endpoints
  const gitCommit = process.env.RENDER_GIT_COMMIT || "2efda76";
  const buildInfo = {
    status: "ok",
    gitCommit,
    buildTimestamp: new Date().toISOString(),
    service: "Nimiq Arena",
    miniAppSdk: "0.1.0",
    network: "TestAlbatross",
    networkId: 5,
    rpcUrl: "https://rpc.testnet.nimiqwatch.com",
    database: Boolean(process.env.DATABASE_URL),
  };

  app.get("/api/health", (_req, res) => {
    res.json(buildInfo);
  });

  app.get("/api/build", (_req, res) => {
    res.json(buildInfo);
  });

  // Register API features
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerMatchStream(app);
  registerMatchCleanup(app);
  registerNimiqAccountRoutes(app);

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
