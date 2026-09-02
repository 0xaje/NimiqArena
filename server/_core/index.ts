import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createExpressApp } from "./app";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function verifyDatabaseConnectivity() {
  try {
    const { getDb } = await import("../db");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) {
      throw new Error("DATABASE_URL is not configured.");
    }
    await db.execute(sql`SELECT 1`);
    console.log("[Database] MariaDB/MySQL connection verified successfully.");
  } catch (err: any) {
    console.error("\n============================================================");
    console.error("[CRITICAL] DATABASE CONNECTION FAILED AT STARTUP");
    console.error("The application cannot function without a healthy database.");
    console.error("Error details:", err.message);
    console.error("\nTROUBLESHOOTING GUIDE:");
    console.error("1. Ensure the local Docker container is running: docker start nimiq-arena-db");
    console.error("2. Verify DATABASE_URL in your .env points to the correct host/port (e.g. 127.0.0.1:3307)");
    console.error("3. Check docs/DATABASE_SETUP.md for instructions on spinning up the database container.");
    console.error("============================================================\n");
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

async function startServer() {
  await verifyDatabaseConnectivity();
  const app = createExpressApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
