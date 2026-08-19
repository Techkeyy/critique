import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BS = String.fromCharCode(92);
const winPath = (p) => p.split("/").join(BS);
const GATE = ".claude/hooks/gate.mjs";
const SESSION = "t-guard";
const dir = join(".critique", "sessions", SESSION);

rmSync(dir, { recursive: true, force: true });

function run(cwd, extra = {}, env = {}) {
  const payload = JSON.stringify({
    hook_event_name: "Stop",
    cwd,
    session_id: SESSION,
    last_assistant_message: "I added the toggle.",
    stop_hook_active: false,
    ...extra,
  });
  try {
    execFileSync("node", [GATE], {
      input: payload,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CRITIQUE_TEST_MODE: "1", ...env },
    });
    return "exit 0 ALLOWED";
  } catch (e) {
    const err = e.stderr ? String(e.stderr).replace(/\s+/g, " ").slice(0, 60) : "";
    return "exit " + e.status + " BLOCKED :: " + err;
  }
}

function seedTouched() {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
  writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));
}

const cases = [
  ["OUTSIDE (backslash) ", winPath("C:/Users/HomePC/Desktop/other"), {}, {}, "ALLOW"],
  ["OUTSIDE (forward)   ", "C:/Users/HomePC/Desktop/other", {}, {}, "ALLOW"],
  ["INSIDE  no-edit     ", winPath("C:/Users/HomePC/Desktop/critique"), {}, {}, "ALLOW"],
  ["INSIDE  fail-stub   ", winPath("C:/Users/HomePC/Desktop/critique"), {}, { CRITIQUE_TEST_STUB: "fail" }, "BLOCK"],
  ["INSIDE  (subdir)    ", winPath("C:/Users/HomePC/Desktop/critique/src"), {}, {}, "ALLOW"],
  ["LOOKALIKE sibling   ", winPath("C:/Users/HomePC/Desktop/critique-other"), {}, {}, "ALLOW"],
];

let failed = 0;
for (const [label, cwd, extra, env, expect] of cases) {
  rmSync(dir, { recursive: true, force: true });
  if (expect === "BLOCK") seedTouched();
  const got = run(cwd, extra, env);
  const ok =
    expect === "BLOCK"
      ? got.startsWith("exit 2")
      : got.startsWith("exit 0");
  if (!ok) failed += 1;
  console.log(label.padEnd(22), "expect:", expect.padEnd(10), "got:", got, ok ? "OK" : "FAIL");
}

if (failed) {
  console.error("guard-test failed:", failed);
  process.exit(1);
}
console.log("guard-test passed");
