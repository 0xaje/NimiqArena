import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createChallengeMatch,
  getActiveMatchesForDirectory,
  getDb,
  getUserByOpenId,
  upsertUser,
} from "./db";
import { matchPlayers, matches, users } from "../drizzle/schema";

const runDatabaseIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "1";

// "N Active"-style labels across the client (Home, LudoDetail, GamesShowroom)
// used to read `activeMatches.length` off this same capped list and display
// it as if it were the system-wide count — understating real activity any
// time more matches were running than the page size. This asserts the fix
// at the source: the directory's total has to reflect every active match,
// not just the ones in the returned page.
describe.skipIf(!runDatabaseIntegration)(
  "getActiveMatchesForDirectory total count",
  () => {
    it("reports the real total even when the page is smaller than it", async () => {
      const db = await getDb();
      if (!db) throw new Error("RUN_DB_INTEGRATION_TESTS requires DATABASE_URL.");

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const openId = `active-directory-host-${suffix}`;
      await upsertUser({ openId, name: "Directory Host", role: "user" });
      const host = await getUserByOpenId(openId);
      if (!host) throw new Error("Failed to create test host user");

      const before = await getActiveMatchesForDirectory(1);
      const baselineTotal = before.totalCount;

      const created = await Promise.all(
        Array.from({ length: 3 }, () =>
          createChallengeMatch({ userId: host.id, gameSlug: "ludo-league" })
        )
      );
      const matchIds = created.map(m => m.id);

      try {
        // Ask for a page far smaller than the 3 matches just created.
        const page = await getActiveMatchesForDirectory(1);

        expect(page.matches.length).toBe(1);
        // The total must count all of them, not just the one row returned.
        expect(page.totalCount).toBe(baselineTotal + 3);
      } finally {
        for (const id of matchIds) {
          await db.delete(matchPlayers).where(eq(matchPlayers.matchId, id));
          await db.delete(matches).where(eq(matches.id, id));
        }
        await db.delete(users).where(eq(users.openId, openId));
      }
    });
  }
);
