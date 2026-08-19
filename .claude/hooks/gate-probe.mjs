#!/usr/bin/env node
// Bet 1 probe: can a Stop hook block the agent AND feed text back to the model?
// Blocks exactly once (flag file), then allows — self-limiting, no infinite loop.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stateDir = join(root, ".critique");
const flag = join(stateDir, "probe-blocked-once");
const log = join(stateDir, "probe-log.json");

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {}

let payload = {};
try {
  payload = JSON.parse(input);
} catch {}

mkdirSync(stateDir, { recursive: true });

// Record exactly what the Stop hook receives — this is the real schema, not the docs'.
const seen = existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : [];
seen.push({
  at: new Date().toISOString(),
  keys: Object.keys(payload),
  hook_event_name: payload.hook_event_name,
  session_id: payload.session_id,
  has_last_assistant_message: "last_assistant_message" in payload,
  last_assistant_message: payload.last_assistant_message,
  stop_hook_active: payload.stop_hook_active,
  transcript_path: payload.transcript_path,
  cwd: payload.cwd,
});
writeFileSync(log, JSON.stringify(seen, null, 2));

if (!existsSync(flag)) {
  writeFileSync(flag, "1");
  // stderr is the channel that reaches the model on exit 2.
  process.stderr.write(
    "CRITIQUE GATE: verification failed. " +
      "Kane falsified the claim: the dark mode toggle throws on second click. " +
      "Reply with exactly the word BLOCKED-AND-RESUMED to confirm you received this."
  );
  process.exit(2);
}

process.exit(0);
