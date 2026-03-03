import { Command } from "commander";
import { existsSync, rmSync, readdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SERVER_DIR = join(ROOT, "packages/server");
const PROJECT_DIR = join(ROOT, "project");

function removeIfExists(path: string, label: string) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`  REMOVED  ${label}`);
  }
}

export const cleanupCommand = new Command("cleanup")
  .description("Clean generated artifacts (--db to reset DB, --all for full clean, --init to reset project)")
  .option("--db", "Also reset database")
  .option("--all", "Full clean including caches")
  .option("--init", "Reset project source code (DESTRUCTIVE)")
  .action(async (opts: { db?: boolean; all?: boolean; init?: boolean }) => {
    if (opts.all) opts.db = true;

    // Confirm for destructive operations
    if (opts.db || opts.all || opts.init) {
      if (opts.init) {
        console.log("DANGER: This will delete ALL entity definitions and reset configuration.");
        console.log("Type 'RESET' to confirm:");
      } else {
        console.log("WARNING: This will delete data. Ctrl+C to abort, Enter to continue.");
      }

      try {
        const input = await new Promise<string>((resolve) => {
          process.stdin.once("data", (data) => resolve(data.toString().trim()));
        });

        if (opts.init && input !== "RESET") {
          console.log("Abort: Verification failed.");
          process.exit(0);
        }
      } catch {
        // Non-interactive, proceed if not init
        if (opts.init) {
          console.log("Abort: Interactive input required for --init.");
          process.exit(1);
        }
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

    // Level 4: Project Reset
    if (opts.init) {
      console.log("[cleanup] Resetting project source code...");

      // 1. Clear entities
      const entitiesDir = join(PROJECT_DIR, "entities");
      if (existsSync(entitiesDir)) {
        const files = readdirSync(entitiesDir);
        for (const file of files) {
          removeIfExists(join(entitiesDir, file), `entity: ${file}`);
        }
      }

      // 2. Reset appinfo.ts
      const defaultAppInfo = `import { defineAppInfo } from '@zenku/core'

export default defineAppInfo({
  name: 'New Zenku App',
  defaultLanguage: 'zh-TW',
  availableLanguages: ['en', 'zh-TW'],
})
`;
      writeFileSync(join(PROJECT_DIR, "appinfo.ts"), defaultAppInfo);
      console.log("  RESET    appinfo.ts");

      // 3. Reset menu.ts
      const defaultMenu = `import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    i18n: { en: 'Dashboard', 'zh-TW': '儀錶板' },
    items: [],
  },
])
`;
      writeFileSync(join(PROJECT_DIR, "menu.ts"), defaultMenu);
      console.log("  RESET    menu.ts");
    }

    console.log("[cleanup] Done!");
  });
