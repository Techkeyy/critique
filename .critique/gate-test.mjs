/**
 * Offline gate tests. Drive hooks by piping payloads — no live agent turns.
 * Kane STUB paths are MOCKED and labeled as such. The 3-attempt / no-edit /
 * fail-open logic is the real gate.mjs.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

const HERE = process.cwd();
const OUTSIDE = mkdtempSync(join(tmpdir(), "critique-outside-"));

// Every gate invocation in this file must write to a throwaway ledger.
// Stub verdicts leaking into .critique/ledger.json end up published on the
// dashboard as MOCKED rows, which reads as fabricated evidence.
const TEST_LEDGER_DEFAULT = join(".critique", "sessions", "t-testrun-ledger.json");

const GATE = ".claude/hooks/gate.mjs";
const OBSERVE = ".claude/hooks/observe.mjs";
const SESSION = "t-gate-offline";
const dir = join(".critique", "sessions", SESSION);
const probe = JSON.parse(readFileSync(".critique/probe-log.json", "utf8"));
const captured = probe[0];

function pipe(script, payload, env = {}) {
  const r = spawnSync("node", [script], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { CRITIQUE_LEDGER_FILE: TEST_LEDGER_DEFAULT, ...process.env, CRITIQUE_TEST_MODE: "1", ...env },
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function reset() {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function payload(over = {}) {
  return {
    ...captured,
    session_id: SESSION,
    cwd: HERE,
    stop_hook_active: false,
    last_assistant_message: "I added the dark mode toggle.",
    ...over,
  };
}

let failed = 0;
function check(name, cond, extra) {
  if (!cond) {
    failed += 1;
    console.log("FAIL", name, extra || "");
  } else {
    console.log("ok  ", name);
  }
}

// 1. no-edit turn: missing touched.json → exit 0, fast, no Kane
reset();
const t0 = Date.now();
const noEdit = pipe(GATE, payload());
const noEditMs = Date.now() - t0;
check("no-edit exit 0", noEdit.status === 0, noEdit);
check("no-edit silent stderr", noEdit.stderr.trim() === "", noEdit.stderr);
check("no-edit under 500ms (no Kane)", noEditMs < 500, String(noEditMs));

// 2. observe.mjs records a path and never blocks
reset();
const obs = pipe(OBSERVE, {
  ...payload(),
  hook_event_name: "PostToolUse",
  tool_name: "Edit",
  tool_input: { file_path: "src/kane.mjs" },
});
check("observe exit 0", obs.status === 0);
const touched = JSON.parse(readFileSync(join(dir, "touched.json"), "utf8"));
check("observe recorded path", Array.isArray(touched) && touched[0] === "src/kane.mjs", touched);
check("observe wrote diff.txt", existsSync(join(dir, "diff.txt")));

// 3. MOCKED fail → stderr + exit 2, attempts=1
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));
const fail1 = pipe(GATE, payload(), { CRITIQUE_TEST_STUB: "fail" });
check("fail-1 exit 2 (MOCKED Kane)", fail1.status === 2, fail1);
check("fail-1 stderr names step", /Step 2/.test(fail1.stderr), fail1.stderr);
check("fail-1 attempt 1/3", /Attempt 1\/3/.test(fail1.stderr), fail1.stderr);

// 4. second and third MOCKED fails
const fail2 = pipe(GATE, payload({ stop_hook_active: true }), { CRITIQUE_TEST_STUB: "fail" });
check("fail-2 exit 2", fail2.status === 2);
check("fail-2 attempt 2/3", /Attempt 2\/3/.test(fail2.stderr), fail2.stderr);
const fail3 = pipe(GATE, payload({ stop_hook_active: true }), { CRITIQUE_TEST_STUB: "fail" });
check("fail-3 exit 2", fail3.status === 2, fail3);
check("fail-3 attempt 3/3", /Attempt 3\/3/.test(fail3.stderr), fail3.stderr);

// 5. fourth stop, stop_hook_active, attempts>=3 → OWED exit 0
const release = pipe(GATE, payload({ stop_hook_active: true }), { CRITIQUE_TEST_STUB: "fail" });
check("release exit 0", release.status === 0, release);
const receipt = JSON.parse(readFileSync(join(dir, "receipt.json"), "utf8"));
check("OWED receipt", receipt.status === "OWED" && receipt.reason === "max-attempts", receipt);
const ledger = JSON.parse(readFileSync(".critique/ledger.json", "utf8"));
check(
  "OWED in ledger.json",
  Array.isArray(ledger) && ledger.some((e) => e.status === "OWED" && e.session_id === SESSION),
  ledger.slice(-1),
);

// 5b. Part A: attempts already at cap, user interjects (stop_hook_active false) → still release
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 3 }));
const brokenChain = pipe(GATE, payload({ stop_hook_active: false }), { CRITIQUE_TEST_STUB: "fail" });
check("Part A: attempts=3 stop_hook_active false → exit 0", brokenChain.status === 0, brokenChain);
check("Part A: did not re-block", !/Attempt /.test(brokenChain.stderr), brokenChain.stderr);
const receiptBroken = JSON.parse(readFileSync(join(dir, "receipt.json"), "utf8"));
check(
  "Part A: OWED receipt with stop_hook_active logged false",
  receiptBroken.status === "OWED" &&
    receiptBroken.reason === "max-attempts" &&
    receiptBroken.stop_hook_active === false,
  receiptBroken,
);

// 6. throw → exit 0
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
const boom = pipe(GATE, payload(), { CRITIQUE_TEST_STUB: "throw" });
check("throw fail-open exit 0", boom.status === 0, boom);
const owedErr = JSON.parse(readFileSync(join(dir, "receipt.json"), "utf8"));
check("throw records OWED error", owedErr.status === "OWED" && owedErr.reason === "error", owedErr);

// 7. timeout stub → exit 0
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
const to = pipe(GATE, payload(), { CRITIQUE_TEST_STUB: "timeout" });
check("timeout fail-open exit 0", to.status === 0, to);

// 8. D-11 recorded failure blocks without Kane, under 2s
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));
const recLedger = join(".critique", "tmp-recorded-ledger.json");
writeFileSync(
  recLedger,
  JSON.stringify(
    [
      {
        source: "recorded",
        status: "failed",
        open: true,
        session_id: SESSION,
        failureDetail:
          "Step 1 failed: The test looked at the wrong control on the page. Instead of first finding the actual dark-mode button, it interacted with another toggle in a different page flow, so the checks no longer matched the objective.",
        testUrl: null,
      },
    ],
    null,
    2,
  ),
);
const recT0 = Date.now();
const recBlock = pipe(GATE, payload({ last_assistant_message: "I added the dark mode toggle." }), {
  CRITIQUE_LEDGER_FILE: recLedger,
  CRITIQUE_SKIP_PROSECUTE: "1",
});
const recMs = Date.now() - recT0;
check("D-11 recorded block exit 2", recBlock.status === 2, recBlock);
check("D-11 recorded stderr has failureDetail", /wrong control/.test(recBlock.stderr), recBlock.stderr);
check("D-11 recorded block under 2s", recMs < 2000, String(recMs));
try {
  rmSync(recLedger, { force: true });
} catch {}

// 8b. D-12: recorded failure from a different session must not block this one
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
writeFileSync(join(dir, "attempts.json"), JSON.stringify({ attempts: 0 }));
const isoLedger = join(".critique", "tmp-iso-ledger.json");
writeFileSync(
  isoLedger,
  JSON.stringify(
    [
      {
        source: "recorded",
        status: "failed",
        open: true,
        session_id: "t-prosecution-1",
        failureDetail: "Step 1 failed: wrong control from another session.",
      },
    ],
    null,
    2,
  ),
);
const iso = pipe(GATE, payload({ last_assistant_message: "I added a comment." }), {
  CRITIQUE_LEDGER_FILE: isoLedger,
  CRITIQUE_TEST_STUB: "pass",
  CRITIQUE_SKIP_PROSECUTE: "1",
});
check("D-12 cross-session recorded does not block", iso.status === 0, iso);
check("D-12 no foreign failureDetail in stderr", !/wrong control/.test(iso.stderr), iso.stderr);
try {
  rmSync(isoLedger, { force: true });
} catch {}

// 9. outside cwd never blocks even with touched+fail
reset();
writeFileSync(join(dir, "touched.json"), JSON.stringify(["src/kane.mjs"]));
const outside = pipe(
  GATE,
  payload({ cwd: OUTSIDE }),
  { CRITIQUE_TEST_STUB: "fail" },
);
check("outside cwd exit 0", outside.status === 0, outside);

if (failed) {
  console.error("gate-test failed:", failed);
  process.exit(1);
}
console.log("gate-test passed");
console.log("--- fail-1 stderr ---");
console.log(fail1.stderr);
