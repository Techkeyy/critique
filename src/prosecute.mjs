#!/usr/bin/env node
/**
 * Tier 2 prosecutor. Detached. Never runs inside the Stop hook.
 * Usage: node src/prosecute.mjs <sessionId>
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findWorkspace, INSTALL_ROOT } from "./guard.mjs";
import { generateSave, runGenerate, runTestMd } from "./kane.mjs";
import { clearRecordedForFiles } from "./suite.mjs";

const PLAY_URL = "https://kaneai-playground.lambdatest.io";

const sessionId = process.argv[2] || "unknown";
// The gate passes the workspace explicitly; discovery is the standalone fallback.
const PROJECT_ROOT = process.argv[3] || findWorkspace(process.cwd()) || INSTALL_ROOT;

const OUT_DIR = join(PROJECT_ROOT, ".testmuai", "tests", "prosecutions");
const LEDGER = join(PROJECT_ROOT, ".critique", "ledger.json");
const sessionDir = join(PROJECT_ROOT, ".critique", "sessions", sessionId);
const lockPath = join(sessionDir, "prosecute.lock");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function appendLedger(entry) {
  const list = readJson(LEDGER, []);
  const arr = Array.isArray(list) ? list : [];
  arr.push(entry);
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(arr, null, 2));
}

function slug(text) {
  const s = String(text || "claim")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return s || "claim";
}

function pickClaim(claims) {
  if (!Array.isArray(claims) || !claims.length) return null;
  const high = claims.filter((c) => c && c.confidence === "high");
  return high[0] || claims[0] || null;
}

function listTestMd(dir) {
  const acc = [];
  function walk(d) {
    let ents;
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith("output-")) continue;
        walk(p);
      } else if (e.isFile() && e.name.endsWith("_test.md")) acc.push(p);
    }
  }
  walk(dir);
  return acc;
}

function ensureFrontmatter(file) {
  let s = readFileSync(file, "utf8");
  let injected = false;
  if (!s.startsWith("---")) {
    s = `---\ntags: [critique-gate]\nurl: ${PLAY_URL}\n---\n\n` + s;
    injected = true;
    writeFileSync(file, s);
    return { injected, tagsPreserved: false };
  }
  const end = s.indexOf("\n---", 3);
  const fm = end >= 0 ? s.slice(0, end + 4) : s.slice(0, 80);
  const hadTag = /critique-gate/i.test(fm);
  const hadTags = /^tags:/m.test(fm);
  const hadUrl = /^url:/m.test(fm);
  let fmBlock = end >= 0 ? s.slice(0, end) : "---";
  if (!hadTags) {
    fmBlock += "\ntags: [critique-gate]";
    injected = true;
  } else if (!hadTag) {
    fmBlock = fmBlock.replace(/tags:\s*\[/, "tags: [critique-gate, ");
    injected = true;
  }
  if (!hadUrl) {
    fmBlock += `\nurl: ${PLAY_URL}`;
    injected = true;
  }
  if (injected) {
    const rest = end >= 0 ? s.slice(end) : "\n---\n" + s;
    writeFileSync(file, fmBlock + rest);
  }
  return { injected, tagsPreserved: hadTag };
}

function requestIdFrom(verdict) {
  const raw = verdict?.raw || {};
  if (raw.request_id) return String(raw.request_id);
  const events = verdict?.raw?.events || [];
  for (const ev of events) {
    if (ev && ev.request_id) return String(ev.request_id);
  }
  return null;
}

/**
 * Replay every already-cached, previously-passing suite member and record any
 * that now fail. This is what catches a regression the agent introduced into
 * code an earlier test already covered.
 */
async function verifyExistingSuite() {
  const { selectGateMembers } = await import("./suite.mjs");
  const testsRoot = join(PROJECT_ROOT, ".testmuai", "tests");
  const members = selectGateMembers(testsRoot, 10);
  if (!members.length) return;

  const open = new Set(
    readJson(LEDGER, [])
      .filter((e) => e && e.open === true && Array.isArray(e.files))
      .flatMap((e) => e.files),
  );

  for (const file of members) {
    if (open.has(file)) continue; // already recorded, do not re-run
    const v = await runTestMd(file, { cwd: PROJECT_ROOT, timeout: 400 });
    if (v && v.ok === false && v.status === "failed") {
      appendLedger({
        at: new Date().toISOString(),
        phase: "regression",
        status: "failed",
        source: "recorded",
        open: true,
        session_id: sessionId,
        claim: null,
        files: [file],
        failureDetail: v.failureDetail || v.summary || "regression detected",
        steps: v.steps || [],
        testUrl: v.testUrl || null,
        durationWallClock: v.durationWallClock,
      });
    }
  }
}

async function main() {
  mkdirSync(sessionDir, { recursive: true });
  try {
    writeFileSync(lockPath, String(Date.now()), { flag: "wx" });
  } catch {
    return;
  }

  const started = Date.now();
  let status = "error";
  let files = [];
  let claimText = null;
  let tagsInjected = null;
  let message = null;

  // Regression pass first, and unconditionally. Tier 1 cannot catch a broken
  // cached test: a failing replay takes ~185s (measured) against a 55s Tier-1
  // budget, so it aborts and fails open. Tier 2 has no timeout pressure, so it
  // replays the existing cached suite here and records any failure — which the
  // NEXT Stop then blocks on in ~271ms straight from the ledger (D-11).
  try {
    await verifyExistingSuite();
  } catch {
    /* regression pass must never break prosecution */
  }

  try {
    const claims = readJson(join(sessionDir, "claims.json"), []);
    const claim = pickClaim(claims);
    if (!claim || !claim.text) {
      status = "skipped";
      message = "no claim";
      return;
    }
    claimText = claim.text;
    let diff = "";
    try {
      diff = readFileSync(join(sessionDir, "diff.txt"), "utf8");
    } catch {
      diff = "";
    }
    if (!diff.trim()) {
      status = "skipped";
      message = "empty diff";
      return;
    }

    mkdirSync(OUT_DIR, { recursive: true });
    const name = slug(claim.text);
    const objective =
      `Verify in a real browser at ${PLAY_URL}: ${claim.text} ` +
      `Use only this claim. Prefer a short functional flow.`;

    const before = new Set(listTestMd(OUT_DIR));
    const gen = await runGenerate(objective, {
      files: join(sessionDir, "diff.txt"),
      scenarioLimit: 1,
      perScenarioLimit: 2,
      memory: true,
      name,
      cwd: PROJECT_ROOT,
    });

    let req = requestIdFrom(gen);
    if (!req && gen.raw && gen.raw.request_id) req = String(gen.raw.request_id);

    const events = gen.events || gen.raw?.events || (gen.raw?.type ? [gen.raw] : []);
    const clarification = events.find((e) => e && e.type === "generate_clarification");
    if (clarification && req) {
      const refine = await runGenerate(
        `The app under test is ${PLAY_URL}. Proceed with functional browser checks of the stated claim. No more questions.`,
        { refine: true, req, cwd: PROJECT_ROOT, headless: false },
      );
      req = requestIdFrom(refine) || req;
    }

    if (!req) {
      status = "error";
      message = "no request_id from generate";
      return;
    }

    const saved = await generateSave(req, { out: OUT_DIR, name, cwd: PROJECT_ROOT });
    const after = listTestMd(OUT_DIR);
    files = after.filter((p) => !before.has(p));
    if (!files.length) {
      const suiteDir = saved.raw?.suite_dir;
      if (suiteDir) files = listTestMd(join(PROJECT_ROOT, suiteDir));
    }
    if (!files.length) files = after;

    let anyInject = false;
    let anyPreserved = false;
    for (const f of files) {
      const r = ensureFrontmatter(f);
      if (r.injected) anyInject = true;
      if (r.tagsPreserved) anyPreserved = true;
    }
    tagsInjected = files.length ? (anyPreserved && !anyInject ? false : anyInject) : null;

    const verdicts = [];
    for (const f of files) {
      const v = await runTestMd(f, { cwd: PROJECT_ROOT, timeout: 400 });
      verdicts.push({ file: f, v });
    }

    const failed = verdicts.filter((x) => x.v && x.v.ok === false);
    if (!files.length) {
      status = "error";
      message = "save wrote no _test.md";
    } else if (failed.length) {
      status = "failed";
      message = `${failed.length}/${files.length} test(s) failed`;
      for (const x of failed) {
        appendLedger({
          at: new Date().toISOString(),
          phase: "prosecution",
          status: "failed",
          source: "recorded",
          open: true,
          session_id: sessionId,
          claim: claimText,
          files: [x.file],
          failureDetail: x.v.failureDetail || x.v.summary || "prosecution failed",
          steps: x.v.steps || [],
          testUrl: x.v.testUrl || null,
          durationWallClock: x.v.durationWallClock,
        });
      }
    } else {
      status = "authored";
      message = `wrote ${files.length} test(s)`;
      const current = readJson(LEDGER, []);
      const next = clearRecordedForFiles(
        current,
        files,
      );
      writeFileSync(LEDGER, JSON.stringify(next, null, 2));
    }
  } catch (err) {
    status = "error";
    message = String(err?.message || err);
  } finally {
    appendLedger({
      at: new Date().toISOString(),
      phase: "prosecution",
      session_id: sessionId,
      status,
      source: status === "failed" ? "recorded" : "replay",
      claim: claimText,
      files,
      tagsInjected,
      message,
      durationWallClock: (Date.now() - started) / 1000,
    });
    try {
      unlinkSync(lockPath);
    } catch {
      /* ignore */
    }
  }
}

main();
