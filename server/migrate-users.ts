import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection could not be established.");
    process.exit(1);
  }
  console.log("Adding columns to users table...");
  const queries = [
    sql`ALTER TABLE \`users\` ADD COLUMN \`points\` int NOT NULL DEFAULT 1000`,
    sql`ALTER TABLE \`users\` ADD COLUMN \`referralCode\` varchar(32) NULL`,
    sql`ALTER TABLE \`users\` ADD COLUMN \`referredByUserId\` int NULL`,
    sql`ALTER TABLE \`users\` ADD COLUMN \`referralEarningsNim\` int NOT NULL DEFAULT 0`,
    sql`ALTER TABLE \`users\` ADD COLUMN \`evmAddress\` varchar(64) NULL`,
    sql`CREATE INDEX \`users_referral_code_idx\` ON \`users\` (\`referralCode\`)`
  ];

  for (const q of queries) {
    try {
      await db.execute(q);
      console.log("Successfully executed:", q);
    } catch (err: any) {
      console.log("Notice:", err.message);
    }
  }
  console.log("Migration finished.");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
