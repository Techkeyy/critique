#!/usr/bin/env node
/**
 * Register (or remove) Critique's hooks in the user-level Claude Code settings.
 *
 * Safety rules, in order of importance:
 *  1. Never clobber hooks belonging to anything else. We merge, and we only ever
 *     remove entries whose command points at THIS repo's hooks directory.
 *  2. Never overwrite a settings file we could not parse. A malformed file is a
 *     stop condition, not something to "fix" by replacing it.
 *  3. Always back up before writing.
 *  4. Idempotent. Running twice leaves exactly one pair of entries.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = join(ROOT, ".claude", "hooks");
const SETTINGS_DIR = join(homedir(), ".claude");
const SETTINGS = join(SETTINGS_DIR, "settings.json");

// Forward slashes work on every platform here and survive JSON round-trips.
const fwd = (p) => p.replace(/\\/g, "/");
const GATE = `node ${fwd(join(HOOKS, "gate.mjs"))}`;
const OBSERVE = `node ${fwd(join(HOOKS, "observe.mjs"))}`;

const uninstall = process.argv.includes("--uninstall");

function readSettings() {
  if (!existsSync(SETTINGS)) return {};
  const raw = readFileSync(SETTINGS, "utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`\ncritique: ${SETTINGS} is not valid JSON, so it was left untouched.`);
    console.error(`  ${err.message}`);
    console.error("  Fix the file by hand, then run this again.\n");
    process.exit(1);
  }
}

/** True when a hook entry belongs to this Critique checkout. */
function isOurs(entry) {
  return JSON.stringify(entry).includes(fwd(HOOKS));
}

/** Drop our entries from an event's hook groups, keeping everyone else's. */
function stripOurs(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isOurs(h)) }))
    .filter((g) => (g.hooks || []).length > 0);
}

const settings = readSettings();
settings.hooks = settings.hooks || {};

const before = JSON.stringify(settings);

settings.hooks.Stop = stripOurs(settings.hooks.Stop);
settings.hooks.PostToolUse = stripOurs(settings.hooks.PostToolUse);

if (!uninstall) {
  settings.hooks.Stop.push({
    hooks: [{ type: "command", command: GATE, timeout: 120 }],
  });
  settings.hooks.PostToolUse.push({
    matcher: "Edit|Write",
    hooks: [{ type: "command", command: OBSERVE, timeout: 15 }],
  });
}

for (const k of ["Stop", "PostToolUse"]) {
  if (!settings.hooks[k].length) delete settings.hooks[k];
}
if (!Object.keys(settings.hooks).length) delete settings.hooks;

if (JSON.stringify(settings) === before) {
  console.log(uninstall ? "critique: nothing to remove." : "critique: already registered.");
  process.exit(0);
}

mkdirSync(SETTINGS_DIR, { recursive: true });
if (existsSync(SETTINGS)) {
  const backup = `${SETTINGS}.critique-backup`;
  copyFileSync(SETTINGS, backup);
  console.log(`backed up  ${backup}`);
}
writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n");

if (uninstall) {
  console.log(`removed    Critique hooks from ${SETTINGS}`);
  console.log("\nThe gate is off. Your other hooks were left alone.\n");
} else {
  console.log(`registered ${SETTINGS}`);
  console.log(`  Stop         ${GATE}`);
  console.log(`  PostToolUse  ${OBSERVE}  (Edit|Write)`);
  console.log("\nThe gate only acts inside this folder. It stays inert in every other project.");
  console.log("Start a NEW Claude Code session here, edit a file, and let it finish.\n");
}
