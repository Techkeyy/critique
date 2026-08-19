import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SESSION = "t-force-fail";
const dir = join(".critique", "sessions", SESSION);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));

const probe = JSON.parse(readFileSync(".critique/probe-log.json", "utf8"));
const payload = {
  ...probe[0],
  session_id: SESSION,
  cwd: "C:/Users/HomePC/Desktop/critique",
  stop_hook_active: false,
  last_assistant_message: "I added the dark mode toggle.",
};

const r = spawnSync("node", [".claude/hooks/gate.mjs"], {
  input: JSON.stringify(payload),
  encoding: "utf8",
  env: {
    ...process.env,
    CRITIQUE_TEST_MD: ".testmuai/tests/contraband/console_clean_fail_test.md",
    CRITIQUE_KANE_TIMEOUT: "400",
  },
});

console.log("exit=" + r.status);
console.log("--- stderr ---");
console.log(r.stderr || "");
console.log("--- stdout ---");
console.log(r.stdout || "");
writeFileSync(join(dir, "force-fail-stderr.txt"), r.stderr || "");
writeFileSync(join(dir, "force-fail-meta.json"), JSON.stringify({ status: r.status }, null, 2));
