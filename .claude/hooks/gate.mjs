#!/usr/bin/env node
/**
 * Stop hook. Fail open. Max 3 attempts then OWED. Never strand the agent.
 *
 * Order: cwd guard → attempts ≥ 3 (OWED, regardless of stop_hook_active) → touched? → Kane → verdict.
 * Unexpected exceptions and Kane timeout/error → exit 0 + OWED.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { inProject, payloadCwd, PROJECT_ROOT, readStdinPayload } from "../../src/guard.mjs";
import { extractClaims } from "../../src/claims.mjs";

const MAX_ATTEMPTS = 3;
const DEFAULT_TEST = join(
  PROJECT_ROOT,
  ".testmuai",
  "tests",
  "contraband",
  "console_clean_test.md",
);

function sessionDir(sessionId) {
  return join(PROJECT_ROOT, ".critique", "sessions", sessionId || "unknown");
}

function readJson(path, fallback) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function readAttempts(dir) {
  const data = readJson(join(dir, "attempts.json"), { attempts: 0 });
  const n = Number(data?.attempts);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function writeAttempts(dir, n) {
  writeJson(join(dir, "attempts.json"), { attempts: n, at: new Date().toISOString() });
}

function appendLedger(entry) {
  const file = join(PROJECT_ROOT, ".critique", "ledger.json");
  const list = readJson(file, []);
  const arr = Array.isArray(list) ? list : [];
  arr.push(entry);
  mkdirSync(join(PROJECT_ROOT, ".critique"), { recursive: true });
  writeJson(file, arr);
}

function writeOwed(dir, reason, extra) {
  const receipt = {
    status: "OWED",
    reason,
    at: new Date().toISOString(),
    ...extra,
  };
  mkdirSync(dir, { recursive: true });
  writeJson(join(dir, "receipt.json"), receipt);
  appendLedger(receipt);
}

function claimHeader(payload) {
  try {
    const claims = extractClaims(payload?.last_assistant_message);
    if (!Array.isArray(claims) || claims.length === 0) {
      return "Claim: (none stated — verifying baseline)";
    }
    return "Claim: " + claims.map((c) => c.text).join(" | ");
  } catch {
    return "Claim: (none stated — verifying baseline)";
  }
}

function formatFailStderr({ payload, verdict, attempts }) {
  const detail = (verdict?.failureDetail || "").trim() || "Kane reported a failure with no step detail.";
  const url = verdict?.testUrl ? String(verdict.testUrl) : "(none)";
  return (
    "CRITIQUE GATE: verification failed.\n" +
    `${claimHeader(payload)}\n` +
    `${detail}\n` +
    `Dashboard: ${url}\n` +
    `Fix the failing step and stop again. Attempt ${attempts}/${MAX_ATTEMPTS}.`
  );
}

async function prosecute() {
  if (process.env.CRITIQUE_KANE_STUB === "fail") {
    return {
      ok: false,
      status: "failed",
      failureDetail:
        "Step 2 (Verify the page title is exactly ZZZ_CRITIQUE_FORCE_FAIL) failed: assert: expected title ZZZ_CRITIQUE_FORCE_FAIL, got KaneAI – Getting Started",
      testUrl: "https://test-manager.lambdatest.com/MOCKED",
      durationWallClock: 0,
      MOCKED: true,
    };
  }
  if (process.env.CRITIQUE_KANE_STUB === "pass") {
    return { ok: true, status: "passed", failureDetail: null, testUrl: null, durationWallClock: 0, MOCKED: true };
  }
  if (process.env.CRITIQUE_KANE_STUB === "throw") {
    throw new Error("CRITIQUE_KANE_STUB=throw");
  }
  if (process.env.CRITIQUE_KANE_STUB === "timeout") {
    return { ok: false, status: "timeout", failureDetail: "Kane timed out", testUrl: null, durationWallClock: 0, MOCKED: true };
  }
  if (process.env.CRITIQUE_KANE_STUB === "error") {
    return { ok: false, status: "error", failureDetail: "Kane error", testUrl: null, durationWallClock: 0, MOCKED: true };
  }

  const testPath = process.env.CRITIQUE_TEST_MD || DEFAULT_TEST;
  const timeout = Number(process.env.CRITIQUE_KANE_TIMEOUT || 90);
  const { runTestMd } = await import("../../src/kane.mjs");
  return runTestMd(testPath, { timeout, cwd: PROJECT_ROOT });
}

async function main() {
  const payload = readStdinPayload();
  if (!inProject(payloadCwd(payload))) process.exit(0);

  const sessionId = payload.session_id || payload.sessionId || "unknown";
  const dir = sessionDir(sessionId);
  mkdirSync(dir, { recursive: true });

  const attempts = readAttempts(dir);
  if (attempts >= MAX_ATTEMPTS) {
    writeOwed(dir, "max-attempts", {
      session_id: sessionId,
      attempts,
      stop_hook_active: payload.stop_hook_active === true,
    });
    process.exit(0);
  }

  const touched = readJson(join(dir, "touched.json"), []);
  if (!Array.isArray(touched) || touched.length === 0) process.exit(0);

  let verdict;
  try {
    verdict = await prosecute();
  } catch (err) {
    writeOwed(dir, "error", {
      session_id: sessionId,
      message: String(err?.message || err),
    });
    process.exit(0);
  }

  if (!verdict || verdict.status === "timeout" || verdict.status === "error") {
    writeOwed(dir, verdict?.status === "timeout" ? "timeout" : "error", {
      session_id: sessionId,
      status: verdict?.status || "error",
    });
    process.exit(0);
  }

  if (verdict.ok) {
    appendLedger({
      at: new Date().toISOString(),
      session_id: sessionId,
      status: "passed",
      durationWallClock: verdict.durationWallClock,
      testUrl: verdict.testUrl || null,
    });
    writeJson(join(dir, "touched.json"), []);
    writeAttempts(dir, 0);
    process.exit(0);
  }

  const next = attempts + 1;
  writeAttempts(dir, next);
  process.stderr.write(formatFailStderr({ payload, verdict, attempts: next }));
  process.exit(2);
}

main().catch((err) => {
  try {
    writeOwed(sessionDir("unknown"), "error", { message: String(err?.message || err) });
  } catch {
    /* still fail open */
  }
  process.exit(0);
});
