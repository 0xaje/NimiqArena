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
    fileParallelism: false,
    env: {
      VITE_APP_ID: "nimiq-arena-app",
      JWT_SECRET: "nimiq-arena-development-jwt-secret-key-32-chars-long",
      NIMIQ_ARENA_ENTRY_VALUE_LUNA: "100000",
      NIMIQ_PAYMENT_RECIPIENT: "NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX",
      NIMIQ_SETTLEMENT_ADDRESS: "NQ51 85HV UT5T 22TU SKH3 50ED NSKL FKMK 0CJX",
      DATABASE_URL: "mysql://root:test@127.0.0.1:3307/nimiq_test",
      NIMIQ_ARENA_TEST_DATABASE_URL: "mysql://root:test@127.0.0.1:3307/nimiq_test",
      RUN_DB_INTEGRATION_TESTS: "1",
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
