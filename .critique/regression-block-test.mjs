import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HERE = process.cwd().split(String.fromCharCode(92)).join("/");

const SESSION = "t-regression";
const dir = join(".critique", "sessions", SESSION);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "touched.json"), JSON.stringify(["docs/demo/index.html"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));

const payload = JSON.stringify({
  hook_event_name: "Stop",
  cwd: HERE,
  session_id: SESSION,
  last_assistant_message: "I fixed the dark mode toggle.",
  stop_hook_active: false,
});

const t0 = Date.now();
let exitCode = 0;
let stderr = "";
try {
  execFileSync("node", [".claude/hooks/gate.mjs"], {
    input: payload,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, CRITIQUE_SKIP_PROSECUTE: "1" },
  });
} catch (e) {
  exitCode = e.status;
  stderr = String(e.stderr);
}
const ms = Date.now() - t0;

console.log("exit:", exitCode, "(2 = blocked)");
console.log("wall:", ms + "ms");
console.log("---- stderr ----");
console.log(stderr);
console.log("----------------");
console.log("BLOCKED FAST:", exitCode === 2 && ms < 3000 ? "YES" : "NO");
