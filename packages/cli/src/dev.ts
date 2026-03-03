import { Command } from "commander";
import { resolve } from "path";
import { watch } from "fs";
import { runGenerate } from "./generate";

const ROOT = resolve(import.meta.dirname, "../../..");
const PROJECT_DIR = resolve(ROOT, "project");
const SERVER_DIR = resolve(ROOT, "packages/server");
const CLIENT_DIR = resolve(ROOT, "packages/client");

let serverProc: ReturnType<typeof Bun.spawn> | null = null;
let clientProc: ReturnType<typeof Bun.spawn> | null = null;
let regenerating = false;

function startServer() {
  if (serverProc) {
    serverProc.kill();
    serverProc = null;
  }

  serverProc = Bun.spawn(["bun", "run", "--watch", "src/index.ts"], {
    cwd: SERVER_DIR,
    stdout: "pipe",
    stderr: "pipe",
  });

  // Pipe with prefix
  pipeWithPrefix(serverProc.stdout, "[server]");
  pipeWithPrefix(serverProc.stderr, "[server]");
}

function startClient() {
  clientProc = Bun.spawn(["bun", "run", "dev"], {
    cwd: CLIENT_DIR,
    stdout: "pipe",
    stderr: "pipe",
  });

  pipeWithPrefix(clientProc.stdout, "[client]");
  pipeWithPrefix(clientProc.stderr, "[client]");
}

async function pipeWithPrefix(
  stream: ReadableStream<Uint8Array> | null,
  prefix: string
) {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${prefix} ${line}`);
        }
      }
    }
  } catch {
    // Stream closed
  }
}

async function handleFileChange(filename: string) {
  if (regenerating) return;
  regenerating = true;

  console.log(`[watch]  ${filename} changed → regenerating...`);

  try {
    await runGenerate();
    console.log("[watch]  Done. Server will auto-restart via --watch.");
  } catch (e: any) {
    console.error(`[watch]  Generate failed: ${e.message}`);
  } finally {
    regenerating = false;
  }
}

function setupWatcher() {
  // Watch project/ directory for changes
  const watcher = watch(PROJECT_DIR, { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (
      filename.endsWith(".entity.ts") ||
      filename === "appinfo.ts" ||
      filename === "menu.ts"
    ) {
      handleFileChange(filename);
    }
  });

  return watcher;
}

export const devCommand = new Command("dev")
  .description("Start dev mode: generate, watch entities, run server + client")
  .action(async () => {
    // Step 1: Initial generate
    console.log("[dev] Running initial generate...");
    try {
      await runGenerate();
    } catch (e: any) {
      console.error(`[dev] Initial generate failed: ${e.message}`);
      process.exit(1);
    }

    // Step 2: Start server and client
    console.log("[dev] Starting server and client...");
    startServer();
    startClient();

    // Step 3: Watch for changes
    const watcher = setupWatcher();
    console.log("[dev] Watching project/ for changes...\n");

    // Cleanup on exit
    process.on("SIGINT", () => {
      console.log("\n[dev] Shutting down...");
      watcher.close();
      serverProc?.kill();
      clientProc?.kill();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      watcher.close();
      serverProc?.kill();
      clientProc?.kill();
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});
  });
