/**
 * Stress the hooks with the things a real session will eventually do:
 * malformed payloads, hostile session ids, corrupted state, concurrency,
 * and every Kane failure mode. No credits, no network.
 *
 * The bar for every case is the same: NEVER strand the agent, NEVER throw,
 * NEVER write outside the workspace.
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const GATE = ".claude/hooks/gate.mjs";
const OBSERVE = ".claude/hooks/observe.mjs";
const CWD = process.cwd();
const SESSIONS = join(".critique", "sessions");

let pass = 0;
let fail = 0;
function check(ok, label, extra = "") {
  if (ok) {
    pass += 1;
    console.log("  ok   " + label);
  } else {
    fail += 1;
    console.log("  FAIL " + label + (extra ? "  :: " + extra : ""));
  }
}

function runHook(script, payload, env = {}, raw = null) {
  const input = raw !== null ? raw : JSON.stringify(payload);
  try {
    execFileSync("node", [script], {
      input,
      stdio: ["pipe", "pipe", "pipe"],
      env: { CRITIQUE_LEDGER_FILE: join(SESSIONS, "stress-ledger.json"), ...process.env, CRITIQUE_TEST_MODE: "1", ...env },
      timeout: 20000,
    });
    return { code: 0, stderr: "" };
  } catch (e) {
    return { code: e.status, stderr: e.stderr ? String(e.stderr) : "", killed: e.killed };
  }
}

function seed(sessionId, touched = ["src/kane.mjs"], attempts = 0) {
  const dir = join(SESSIONS, sessionId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "touched.json"), JSON.stringify(touched));
  writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts }));
  return dir;
}

const base = (over = {}) => ({
  hook_event_name: "Stop",
  cwd: CWD,
  session_id: "stress",
  last_assistant_message: "I added the toggle.",
  stop_hook_active: false,
  ...over,
});

console.log("\n1. MALFORMED AND HOSTILE INPUT");
{
  const junk = [
    ["empty stdin", ""],
    ["not json", "this is not json at all"],
    ["truncated json", '{"hook_event_name":"Stop","cwd":'],
    ["json array", "[1,2,3]"],
    ["json null", "null"],
    ["huge message", JSON.stringify(base({ last_assistant_message: "x".repeat(500000) }))],
    ["null bytes", JSON.stringify(base({ last_assistant_message: "a\u0000b" }))],
    ["deep nesting", JSON.stringify({ ...base(), nested: JSON.parse("[".repeat(200) + "]".repeat(200)) })],
  ];
  for (const [label, raw] of junk) {
    const r = runHook(GATE, null, {}, raw);
    check(r.code === 0 || r.code === 2, "gate survives " + label, "exit " + r.code);
  }
}

console.log("\n2. HOSTILE SESSION IDS (must not escape the workspace)");
{
  const before = existsSync(SESSIONS) ? readdirSync(SESSIONS).length : 0;
  const evil = [
    "../../../escaped",
    "..\\..\\escaped-win",
    "/absolute/path",
    "C:/Windows/Temp/evil",
    "con",
    "a".repeat(300),
    "with space and 'quote\"",
  ];
  for (const id of evil) {
    const r = runHook(GATE, base({ session_id: id }));
    check(r.code === 0 || r.code === 2, "survives session id " + JSON.stringify(id.slice(0, 24)), "exit " + r.code);
  }
  const escaped = existsSync(join("..", "escaped")) || existsSync(join("..", "..", "escaped")) || existsSync(join("..", "escaped-win"));
  check(!escaped, "no session directory escaped the workspace");
  void before;
}

console.log("\n3. CORRUPTED STATE FILES");
{
  const dir = seed("stress-corrupt");
  const corruptions = [
    ["touched.json is garbage", "touched.json", "{{{not json"],
    ["touched.json is an object", "touched.json", '{"a":1}'],
    ["attempts.json is garbage", "attempts.json", "NaN"],
    ["attempts is negative", "attempts.json", '{"attempts":-5}'],
    ["attempts is enormous", "attempts.json", '{"attempts":999999}'],
    ["claims.json is garbage", "claims.json", "<<<"],
  ];
  for (const [label, file, content] of corruptions) {
    seed("stress-corrupt");
    writeFileSync(join(dir, file), content);
    const r = runHook(GATE, base({ session_id: "stress-corrupt" }), { CRITIQUE_TEST_STUB: "pass" });
    check(r.code === 0 || r.code === 2, label, "exit " + r.code);
  }

  // A corrupted ledger must not brick the gate.
  const led = join(SESSIONS, "stress-ledger.json");
  for (const bad of ["not json", '{"not":"an array"}', "[1,2,3]"]) {
    seed("stress-corrupt");
    writeFileSync(led, bad);
    const r = runHook(GATE, base({ session_id: "stress-corrupt" }), { CRITIQUE_TEST_STUB: "pass" });
    check(r.code === 0 || r.code === 2, "survives ledger: " + bad.slice(0, 18), "exit " + r.code);
  }
  rmSync(led, { force: true });
}

console.log("\n4. LOOP SAFETY (the agent must always escape)");
{
  for (let attempts = 0; attempts <= 5; attempts += 1) {
    seed("stress-loop", ["src/kane.mjs"], attempts);
    const r = runHook(GATE, base({ session_id: "stress-loop", stop_hook_active: attempts > 0 }), {
      CRITIQUE_TEST_STUB: "fail",
    });
    if (attempts >= 3) {
      check(r.code === 0, "attempts=" + attempts + " releases (OWED)", "exit " + r.code);
    } else {
      check(r.code === 2, "attempts=" + attempts + " blocks", "exit " + r.code);
    }
  }
  // and the same with the flag absent entirely
  seed("stress-loop2", ["src/kane.mjs"], 4);
  const r = runHook(GATE, base({ session_id: "stress-loop2", stop_hook_active: undefined }), {
    CRITIQUE_TEST_STUB: "fail",
  });
  check(r.code === 0, "capped attempts release without stop_hook_active", "exit " + r.code);
}

console.log("\n5. EVERY KANE FAILURE MODE FAILS OPEN");
{
  for (const stub of ["throw", "timeout", "error"]) {
    seed("stress-" + stub);
    const r = runHook(GATE, base({ session_id: "stress-" + stub }), { CRITIQUE_TEST_STUB: stub });
    check(r.code === 0, "Kane " + stub + " fails open", "exit " + r.code);
  }
  seed("stress-pass");
  const r = runHook(GATE, base({ session_id: "stress-pass" }), { CRITIQUE_TEST_STUB: "pass" });
  check(r.code === 0, "Kane pass allows the stop", "exit " + r.code);
}

console.log("\n6. CONCURRENCY (8 sessions gating at once)");
{
  const ids = Array.from({ length: 8 }, (_, i) => "stress-conc-" + i);
  ids.forEach((id) => seed(id));
  const results = await Promise.all(
    ids.map(
      (id) =>
        new Promise((resolve) => {
          const child = spawn("node", [GATE], {
            stdio: ["pipe", "ignore", "ignore"],
            env: {
              ...process.env,
              CRITIQUE_TEST_MODE: "1",
              CRITIQUE_TEST_STUB: "fail",
              CRITIQUE_LEDGER_FILE: join(SESSIONS, "stress-ledger.json"),
            },
          });
          child.on("close", (code) => resolve({ code }));
          child.on("error", () => resolve({ code: -1 }));
          child.stdin.end(JSON.stringify(base({ session_id: id })));
        }),
    ),
  );
  check(results.every((r) => r.code === 2), "all 8 concurrent gates blocked cleanly",
    results.map((r) => r.code).join(","));
  const dirs = ids.filter((id) => existsSync(join(SESSIONS, id, "attempts.json")));
  check(dirs.length === 8, "all 8 sessions kept independent state", dirs.length + "/8");
}

console.log("\n7. OBSERVE HOOK");
{
  const cases = [
    ["no file path", { hook_event_name: "PostToolUse", cwd: CWD, session_id: "stress-obs" }],
    ["odd tool input", { hook_event_name: "PostToolUse", cwd: CWD, session_id: "stress-obs", tool_input: { file_path: 12345 } }],
    ["normal edit", { hook_event_name: "PostToolUse", cwd: CWD, session_id: "stress-obs", tool_input: { file_path: "src/kane.mjs" } }],
    ["out of workspace", { hook_event_name: "PostToolUse", cwd: "C:/nowhere", session_id: "stress-obs", tool_input: { file_path: "x.js" } }],
  ];
  for (const [label, payload] of cases) {
    const r = runHook(OBSERVE, payload);
    check(r.code === 0, "observe: " + label, "exit " + r.code);
  }
  const r = runHook(OBSERVE, null, {}, "garbage not json");
  check(r.code === 0, "observe: malformed stdin", "exit " + r.code);
}

console.log("\n8. OUT OF SCOPE STAYS SILENT");
{
  for (const cwd of ["C:/Users/HomePC/Desktop", "C:/", "/tmp", CWD + "-other", ""]) {
    const r = runHook(GATE, base({ cwd }));
    check(r.code === 0 && !r.stderr, "inert at " + JSON.stringify(cwd || "(empty)"), "exit " + r.code);
  }
}

// cleanup
for (const d of readdirSync(SESSIONS).filter((n) => n.startsWith("stress"))) {
  rmSync(join(SESSIONS, d), { recursive: true, force: true });
}
rmSync(join(SESSIONS, "stress-ledger.json"), { force: true });

console.log("\n" + "=".repeat(52));
console.log("STRESS: " + pass + " passed, " + fail + " failed");
console.log("=".repeat(52) + "\n");
process.exit(fail ? 1 : 0);
