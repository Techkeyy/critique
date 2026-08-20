import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

// Derive every path from the actual checkout. Hardcoding one machine's layout
// made this suite pass only on the author's box.
const HERE = process.cwd();
const OUTSIDE = mkdtempSync(join(tmpdir(), "critique-outside-"));
const LOOKALIKE = HERE + "-other";

// Keep stub verdicts out of the real ledger — they get published otherwise.
const TEST_LEDGER_DEFAULT = join(".critique", "sessions", "t-guardrun-ledger.json");

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
      env: { CRITIQUE_LEDGER_FILE: TEST_LEDGER_DEFAULT, ...process.env, CRITIQUE_TEST_MODE: "1", ...env },
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
  ["OUTSIDE (backslash) ", winPath(OUTSIDE), {}, {}, "ALLOW"],
  ["OUTSIDE (forward)   ", OUTSIDE.split(BS).join("/"), {}, {}, "ALLOW"],
  ["INSIDE  no-edit     ", winPath(HERE), {}, {}, "ALLOW"],
  ["INSIDE  fail-stub   ", winPath(HERE), {}, { CRITIQUE_TEST_STUB: "fail" }, "BLOCK"],
  ["INSIDE  (subdir)    ", winPath(join(HERE, "src")), {}, {}, "ALLOW"],
  ["LOOKALIKE sibling   ", winPath(LOOKALIKE), {}, {}, "ALLOW"],
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
