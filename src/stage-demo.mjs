#!/usr/bin/env node
/**
 * Stage the demo: run the regression check in the FOREGROUND against the live
 * Claude Code session, so the recorded failure exists before you hit record.
 *
 * Why this exists. Normally the check runs detached, after a turn ends, and you
 * wait several minutes with no feedback. That is fine in daily use and terrible
 * on recording day: if Kane cannot get a browser slot, the check silently fails
 * open and you are left staring at a counter that never moves.
 *
 * This runs exactly the same code path, in front of you, and tells you whether
 * it worked. Nothing is mocked.
 *
 * Usage:
 *   node src/stage-demo.mjs            # newest session, usually the one you just used
 *   node src/stage-demo.mjs <sessionId>
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { findWorkspace, INSTALL_ROOT, safeSessionId } from "./guard.mjs";

const WS = findWorkspace(process.cwd()) || INSTALL_ROOT;
const SESSIONS = join(WS, ".critique", "sessions");
const LEDGER = join(WS, ".critique", "ledger.json");

const openCount = () => {
  try {
    const raw = JSON.parse(readFileSync(LEDGER, "utf8"));
    return (Array.isArray(raw) ? raw : raw.entries || []).filter((e) => e && e.open === true).length;
  } catch {
    return 0;
  }
};

function newestSession() {
  if (!existsSync(SESSIONS)) return null;
  const dirs = readdirSync(SESSIONS)
    .filter((n) => !n.startsWith("t-") && !n.endsWith(".json"))
    .map((n) => ({ n, t: statSync(join(SESSIONS, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return dirs.length ? dirs[0].n : null;
}

const chromeAlive = () => {
  try {
    const out = execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count",
    ]).toString().trim();
    return Number(out) || 0;
  } catch {
    return null;
  }
};

const arg = process.argv[2];
const session = safeSessionId(arg || newestSession() || "demo");

console.log("");
console.log("  workspace : " + WS);
console.log("  session   : " + session + (arg ? " (given)" : " (newest)"));

const chrome = chromeAlive();
if (chrome !== null) {
  console.log("  chrome    : " + chrome + " processes");
  if (chrome > 8) {
    console.log("");
    console.log("  STOP. Kane needs a free debug port in 9222-9230 and they are likely all taken.");
    console.log("  Close Chrome, then run this again:");
    console.log("    Get-Process chrome | Stop-Process -Force");
    console.log("");
    process.exit(1);
  }
}

const dir = join(SESSIONS, session);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "touched.json"), JSON.stringify(["docs/demo/index.html"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));
if (!existsSync(join(dir, "claims.json"))) writeFileSync(join(dir, "claims.json"), "[]");

const before = openCount();
console.log("  open now  : " + before);
console.log("");
console.log("  Running the real check against the live app. This takes a few minutes.");
console.log("");

try {
  execFileSync(process.execPath, [join(INSTALL_ROOT, "src", "prosecute.mjs"), session, WS], {
    cwd: WS,
    stdio: "inherit",
  });
} catch {
  /* the prosecutor records its own outcome; a non-zero exit is not fatal here */
}

const after = openCount();
console.log("");
if (after > before) {
  console.log("  READY. A failure is recorded for session " + session + ".");
  console.log("  Go back to that same Claude Code window, ask it to fix the label,");
  console.log("  and it will be blocked the moment it tries to finish.");
} else {
  console.log("  NOTHING RECORDED. The app under test is probably not broken.");
  console.log("  Confirm the live page shows the wrong button label, then run this again:");
  console.log("    https://critique-six.vercel.app/demo/");
}
console.log("");
