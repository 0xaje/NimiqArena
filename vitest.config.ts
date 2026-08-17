import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    env: {
      VITE_APP_ID: "nimiq-arena-app",
      JWT_SECRET: "nimiq-arena-development-jwt-secret-key-32-chars-long",
      NIMIQ_ARENA_ENTRY_VALUE_LUNA: "100000",
      NIMIQ_PAYMENT_RECIPIENT: "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
    },
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.ts",
      "client/**/*.spec.ts",
      "shared/**/*.test.ts",
      "shared/**/*.spec.ts",
    ],
  },
});
