import { Command } from "commander";
import { existsSync, rmSync } from "fs";
import { resolve, join } from "path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SERVER_DIR = join(ROOT, "packages/server");

function removeIfExists(path: string, label: string) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`  REMOVED  ${label}`);
  }
}

export const cleanupCommand = new Command("cleanup")
  .description("Clean generated artifacts (--db to reset DB, --all for full clean)")
  .option("--db", "Also reset database")
  .option("--all", "Full clean including caches")
  .action(async (opts: { db?: boolean; all?: boolean }) => {
    if (opts.all) opts.db = true;

    // Confirm for destructive operations
    if (opts.db || opts.all) {
      console.log("WARNING: This will delete data. Ctrl+C to abort, Enter to continue.");
      // In non-interactive environments, proceed anyway
      try {
        const input = await new Promise<string>((resolve) => {
          process.stdin.once("data", (data) => resolve(data.toString().trim()));
          // Auto-proceed after 5s in CI
          setTimeout(() => resolve(""), 5000);
        });
      } catch {
        // Non-interactive, proceed
      }
    }

    console.log("[cleanup] Removing generated artifacts...");

    // Level 1: Generated artifacts
    removeIfExists(join(SERVER_DIR, "schema.zmodel"), "schema.zmodel (generated)");
    removeIfExists(join(SERVER_DIR, "prisma/schema.prisma"), "prisma/schema.prisma");

    // Level 2: Database
    if (opts.db) {
      console.log("[cleanup] Resetting database...");
      removeIfExists(join(SERVER_DIR, "prisma/dev.db"), "prisma/dev.db");
      removeIfExists(join(SERVER_DIR, "prisma/dev.db-journal"), "prisma/dev.db-journal");
    }

    // Level 3: Full clean
    if (opts.all) {
      console.log("[cleanup] Full clean (caches)...");
      removeIfExists(join(SERVER_DIR, "node_modules/.prisma"), "node_modules/.prisma");
    }

    console.log("[cleanup] Done!");
  });
