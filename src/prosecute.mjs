#!/usr/bin/env node
/**
 * Tier 2 prosecutor. Detached. Never runs inside the Stop hook.
 * Usage: node src/prosecute.mjs <sessionId>
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ROOT } from "./guard.mjs";
import { generateSave, runGenerate, runTestMd } from "./kane.mjs";

const PLAY_URL = "https://kaneai-playground.lambdatest.io";
const OUT_DIR = join(PROJECT_ROOT, ".testmuai", "tests", "prosecutions");
const LEDGER = join(PROJECT_ROOT, ".critique", "ledger.json");

const sessionId = process.argv[2] || "unknown";
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

    for (const f of files) {
      await runTestMd(f, { cwd: PROJECT_ROOT, timeout: 400 });
    }

    status = files.length ? "authored" : "error";
    message = files.length ? `wrote ${files.length} test(s)` : "save wrote no _test.md";
  } catch (err) {
    status = "error";
    message = String(err?.message || err);
  } finally {
    appendLedger({
      at: new Date().toISOString(),
      phase: "prosecution",
      session_id: sessionId,
      status,
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
