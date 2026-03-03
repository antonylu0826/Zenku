import { Command } from "commander";
import { resolve } from "path";
import { runGenerate } from "./generate";

const ROOT = resolve(import.meta.dirname, "../../..");
const CLIENT_DIR = resolve(ROOT, "packages/client");
const SERVER_DIR = resolve(ROOT, "packages/server");

export const startCommand = new Command("start")
  .description("Production mode: generate, build client, start server")
  .action(async () => {
    // Step 1: Generate
    console.log("[start] Running generate...");
    try {
      await runGenerate();
    } catch (e: any) {
      console.error(`[start] Generate failed: ${e.message}`);
      process.exit(1);
    }

    // Step 2: Build client
    console.log("[start] Building client...");
    const buildProc = Bun.spawn(["bun", "run", "build"], {
      cwd: CLIENT_DIR,
      stdout: "inherit",
      stderr: "inherit",
    });
    const buildExit = await buildProc.exited;
    if (buildExit !== 0) {
      console.error("[start] Client build failed");
      process.exit(buildExit);
    }

    // Step 3: Start server in production
    console.log("[start] Starting server (production)...");
    const serverProc = Bun.spawn(["bun", "run", "src/index.ts"], {
      cwd: SERVER_DIR,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });

    const serverExit = await serverProc.exited;
    process.exit(serverExit);
  });
