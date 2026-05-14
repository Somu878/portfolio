import { accessSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

function exists(path) {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

function getMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function findCachedWrangler() {
  const npxRoot = join(homedir(), ".npm", "_npx");

  if (!exists(npxRoot)) {
    return "";
  }

  const candidates = readdirSync(npxRoot)
    .map((entry) => join(npxRoot, entry, "node_modules", ".bin", "wrangler"))
    .filter(exists)
    .sort((a, b) => getMtime(b) - getMtime(a));

  return candidates[0] || "";
}

const localWrangler = join(process.cwd(), "node_modules", ".bin", "wrangler");
const cachedWrangler = findCachedWrangler();
const command = exists(localWrangler) ? localWrangler : cachedWrangler || "npx";
const commandArgs = cachedWrangler || exists(localWrangler)
  ? args
  : ["--yes", "wrangler@latest", ...args];
const wranglerHome = join(process.cwd(), ".wrangler");
const wranglerLogs = join(wranglerHome, "logs");

mkdirSync(wranglerLogs, { recursive: true });

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || wranglerLogs
  }
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
