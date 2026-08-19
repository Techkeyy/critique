#!/usr/bin/env node
/**
 * Stop hook. Fail open. Max 3 attempts then OWED. Never strand the agent.
 *
 * Order: cwd guard → attempts ≥ 3 (OWED, regardless of stop_hook_active) → touched? → Kane → verdict.
 * Unexpected exceptions and Kane timeout/error → exit 0 + OWED.
 */

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { inProject, payloadCwd, PROJECT_ROOT, readStdinPayload } from "../../src/guard.mjs";
import { extractClaims } from "../../src/claims.mjs";
import { touchedCode, writeSessionDiff } from "../../src/diff.mjs";
import { hasPassedCache, openRecordedFailures } from "../../src/suite.mjs";

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

function ledgerFile() {
  return process.env.CRITIQUE_LEDGER_FILE || join(PROJECT_ROOT, ".critique", "ledger.json");
}

function appendLedger(entry) {
  const file = ledgerFile();
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
  if (process.env.CRITIQUE_TEST_MODE === "1") {
    const { stubVerdict } = await import("../../src/gate-test-stubs.mjs");
    const stub = stubVerdict(process.env.CRITIQUE_TEST_STUB);
    if (stub) return stub;
  }

  const { runSuite, runTestMd } = await import("../../src/kane.mjs");
  const { selectGateMembers } = await import("../../src/suite.mjs");
  const testsRoot = join(PROJECT_ROOT, ".testmuai", "tests");
  const paths = selectGateMembers(testsRoot, 3);
  if (!paths.length) {
    const fallback = process.env.CRITIQUE_TEST_MD || DEFAULT_TEST;
    if (hasPassedCache(fallback)) {
      return runTestMd(fallback, { timeout: Number(process.env.CRITIQUE_KANE_TIMEOUT || 55), cwd: PROJECT_ROOT });
    }
    return { ok: true, status: "passed", failureDetail: null, testUrl: null, durationWallClock: 0, skipped: true };
  }
  return runSuite(
    { tags: "critique-gate", paths, parallel: 2 },
    { cwd: PROJECT_ROOT, timeout: Number(process.env.CRITIQUE_KANE_TIMEOUT || 55) },
  );
}

function persistClaims(dir, payload) {
  let claims = [];
  try {
    claims = extractClaims(payload?.last_assistant_message);
    if (!Array.isArray(claims)) claims = [];
  } catch {
    claims = [];
  }
  writeJson(join(dir, "claims.json"), claims);
  return claims;
}

function spawnProsecutor(sessionId, dir, claims) {
  try {
    if (process.env.CRITIQUE_TEST_MODE === "1") return;
    if (process.env.CRITIQUE_SKIP_PROSECUTE === "1") return;
    let diff = "";
    try {
      diff = readFileSync(join(dir, "diff.txt"), "utf8");
    } catch {
      diff = "";
    }
    if (!diff.trim()) return;
    // Only prosecute turns that changed application code. A turn that edited
    // only prose (docs, task files, notes) has no browser behaviour to falsify,
    // and prosecuting it costs ~52 credits and pollutes the suite with tests
    // derived from narration rather than from the product.
    if (!touchedCode(readJson(join(dir, "touched.json"), []))) return;
    if (existsSync(join(dir, "prosecute.lock"))) return;
    const child = spawn(process.execPath, [join(PROJECT_ROOT, "src", "prosecute.mjs"), sessionId], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    /* fire-and-forget — never block the hook */
  }
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

  writeSessionDiff(dir);
  const claims = persistClaims(dir, payload);
  const t0 = Date.now();

  const recorded = openRecordedFailures(readJson(ledgerFile(), []), sessionId);
  if (recorded.length) {
    const rec = recorded[recorded.length - 1];
    const next = attempts + 1;
    writeAttempts(dir, next);
    const verdict = {
      ok: false,
      status: "failed",
      failureDetail: rec.failureDetail,
      testUrl: rec.testUrl || null,
      durationWallClock: (Date.now() - t0) / 1000,
    };
    appendLedger({
      at: new Date().toISOString(),
      session_id: rec.session_id || sessionId,
      observer_session_id: sessionId,
      status: "failed",
      phase: "tier1",
      source: "recorded",
      durationWallClock: verdict.durationWallClock,
      failureDetail: rec.failureDetail || null,
      testUrl: rec.testUrl || null,
    });
    process.stderr.write(formatFailStderr({ payload, verdict, attempts: next }));
    process.exit(2);
  }

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
      durationWallClock: verdict?.durationWallClock,
    });
    process.exit(0);
  }

  if (verdict.ok) {
    appendLedger({
      at: new Date().toISOString(),
      session_id: sessionId,
      status: "passed",
      phase: "tier1",
      source: "replay",
      durationWallClock: verdict.durationWallClock,
      testUrl: verdict.testUrl || null,
    });
    writeJson(join(dir, "touched.json"), []);
    writeAttempts(dir, 0);
    spawnProsecutor(sessionId, dir, claims);
    process.exit(0);
  }

  const next = attempts + 1;
  writeAttempts(dir, next);
  appendLedger({
    at: new Date().toISOString(),
    session_id: sessionId,
    status: "failed",
    phase: "tier1",
    source: "replay",
    durationWallClock: verdict.durationWallClock,
    failureDetail: verdict.failureDetail || null,
    testUrl: verdict.testUrl || null,
  });
  process.stderr.write(formatFailStderr({ payload, verdict, attempts: next }));
  spawnProsecutor(sessionId, dir, claims);
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
