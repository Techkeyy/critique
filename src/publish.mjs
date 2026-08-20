#!/usr/bin/env node
/**
 * Build docs/ledger.json (the published dashboard snapshot) from real state.
 *
 * Suite counts are DERIVED from the filesystem, never hand-maintained — a
 * hand-edited count drifts the moment a prosecution lands, and a headline stat
 * that disagrees with the repo is worse than no stat.
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTS_DIR = join(ROOT, ".testmuai", "tests");

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    // output-<stem>/ holds Kane's cache, not test sources.
    if (st.isDirectory()) {
      if (name.startsWith("output-")) continue;
      out.push(...walk(full));
    } else if (name.endsWith("_test.md")) {
      out.push(full);
    }
  }
  return out;
}

function classify(path) {
  const rel = path.slice(TESTS_DIR.length + 1).replace(/\\/g, "/");
  if (rel.startsWith("contraband/")) return "seededBaseline";
  if (rel.startsWith("prosecutions/demo/")) return "subjectAppHarness";
  if (rel.startsWith("prosecutions/")) return "generatedFromClaims";
  return "other";
}

const files = walk(TESTS_DIR);
const counts = { seededBaseline: 0, subjectAppHarness: 0, generatedFromClaims: 0, other: 0 };
for (const f of files) counts[classify(f)] += 1;

const suite = {
  tests: files.length,
  // Nobody hand-wrote a claim-verification case. The seeded baseline and the
  // subject-app harness are ours; the prosecutions are Kane's, from the agent's words.
  humanWroteToVerifyAClaim: 0,
  generatedFromClaims: counts.generatedFromClaims,
  subjectAppHarness: counts.subjectAppHarness,
  seededBaseline: counts.seededBaseline,
};
if (counts.other) suite.unclassified = counts.other;

const ledgerPath = join(ROOT, ".critique", "ledger.json");
let entries = [];
try {
  const raw = JSON.parse(readFileSync(ledgerPath, "utf8"));
  entries = Array.isArray(raw) ? raw : raw.entries || [];
} catch {
  entries = [];
}

// Never publish stub-generated rows. Test runs use MOCKED verdicts; if one of
// those reaches the dashboard it reads as fabricated evidence, which is worse
// than showing nothing. Real Kane rows only.
// Publish only rows from a real gate phase. Offline fail-open tests emit OWED /
// timeout rows with no phase; 44 of them buried the genuine runs and read as the
// product failing constantly.
const REAL_PHASES = new Set(["tier1", "prosecution", "regression", "gate"]);
const isStub = (e) =>
  !e ||
  e.MOCKED === true ||
  (typeof e.testUrl === "string" && e.testUrl.includes("MOCKED")) ||
  (typeof e.failureDetail === "string" && e.failureDetail.includes("ZZZ_CRITIQUE_FORCE_FAIL")) ||
  !REAL_PHASES.has(e.phase);
const dropped = entries.filter(isStub).length;
entries = entries.filter((e) => !isStub(e));
if (dropped) console.log(`publish: dropped ${dropped} stub entr${dropped === 1 ? "y" : "ies"}`);

const snapshot = { generatedAt: new Date().toISOString(), suite, entries };
writeFileSync(join(ROOT, "docs", "ledger.json"), JSON.stringify(snapshot, null, 2) + "\n");

// Bust the asset cache on every publish. GitHub Pages serves app.js/styles.css
// with a cache lifetime long enough that a returning visitor can see a fresh
// ledger.json rendered by stale JS — which shows a breakdown that disagrees
// with the headline total. Stamping the query string makes that impossible.
const stamp = Date.now().toString(36);
const indexPath = join(ROOT, "docs", "index.html");
let html = readFileSync(indexPath, "utf8");
html = html
  .replace(/(href="\.\/styles\.css)(\?v=[^"]*)?"/, `$1?v=${stamp}"`)
  .replace(/(src="\.\/app\.js)(\?v=[^"]*)?"/, `$1?v=${stamp}"`);
writeFileSync(indexPath, html);

const sum = counts.seededBaseline + counts.subjectAppHarness + counts.generatedFromClaims + counts.other;
if (sum !== files.length) {
  console.error("publish: breakdown does not reconcile with total");
  process.exit(1);
}

console.log(`published docs/ledger.json — ${files.length} tests, ${entries.length} ledger entries`);
console.log(JSON.stringify(suite));
