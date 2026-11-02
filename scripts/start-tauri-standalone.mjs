#!/usr/bin/env node
/**
 * EasyDebt Desktop — Standalone Server Launcher for Tauri Production Bundles
 *
 * Ensures the local persistent database directory exists, sets PORT=3000,
 * and starts the Next.js standalone server so the Tauri WebView can connect
 * offline or online.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = process.env.PORT || "3000";
const HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

const appDataDir = process.env.EASYDEBT_DATA_DIR || path.join(os.homedir(), ".easydebt-desktop");

if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

const localDbPath = path.join(appDataDir, "easydebt-desktop-db.json");
const standaloneServerPath = path.join(process.cwd(), ".next", "standalone", "server.js");

const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const standaloneStatic = path.join(standaloneDir, ".next", "static");
const standalonePublic = path.join(standaloneDir, "public");

if (fs.existsSync(path.join(process.cwd(), ".next", "static"))) {
  fs.cpSync(path.join(process.cwd(), ".next", "static"), standaloneStatic, { recursive: true, force: true });
}
if (fs.existsSync(path.join(process.cwd(), "public"))) {
  fs.cpSync(path.join(process.cwd(), "public"), standalonePublic, { recursive: true, force: true });
}

console.log(`[EasyDebt Desktop] Local DB path: ${localDbPath}`);
console.log(`[EasyDebt Desktop] Starting Next.js standalone server on http://${HOSTNAME}:${PORT}`);

if (fs.existsSync(standaloneServerPath)) {
  const child = spawn(process.execPath, [standaloneServerPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT,
      HOSTNAME,
      EASYDEBT_LOCAL_DB_PATH: localDbPath,
    },
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  console.error(`[EasyDebt Desktop] Standalone build not found at ${standaloneServerPath}. Run "npm run build" first.`);
  process.exit(1);
}
