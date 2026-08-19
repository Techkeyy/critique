/**
 * Select at most N most-recently-modified tagged _test.md files for Tier 1.
 * D-11: only members with a passed, valid cached execution.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const TAG = "critique-gate";

function walkMd(dir, acc) {
  let ents;
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("output-") || e.name.startsWith(".") || e.name === "node_modules") continue;
      walkMd(p, acc);
    } else if (e.isFile() && e.name.endsWith("_test.md")) {
      acc.push(p);
    }
  }
}

function frontmatter(text) {
  if (!text.startsWith("---")) return "";
  const end = text.indexOf("\n---", 3);
  if (end < 0) return "";
  return text.slice(3, end);
}

function hasTag(fm, tag) {
  return fm.toLowerCase().includes(tag.toLowerCase());
}

export function cacheMetaPath(testPath) {
  const stem = basename(testPath).replace(/_test\.md$/i, "");
  return join(dirname(testPath), `output-${stem}`, ".internal", "meta.json");
}

/** Replay-safe: valid cache AND a passed execution. Failed authorings still mark valid:true. */
export function hasPassedCache(testPath) {
  try {
    const meta = JSON.parse(readFileSync(cacheMetaPath(testPath), "utf8"));
    const ex = meta && Array.isArray(meta.executions) ? meta.executions : [];
    return ex.some((e) => e && e.valid === true && String(e.status).toLowerCase() === "passed");
  } catch {
    return false;
  }
}

export function listTaggedTests(testsRoot, tag = TAG) {
  const files = [];
  walkMd(testsRoot, files);
  const out = [];
  for (const p of files) {
    let text = "";
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    if (!hasTag(frontmatter(text), tag)) continue;
    let mtime = 0;
    try {
      mtime = statSync(p).mtimeMs;
    } catch {
      mtime = 0;
    }
    out.push({ path: p, mtime });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

export function selectGateMembers(testsRoot, limit = 3) {
  return listTaggedTests(testsRoot)
    .filter((t) => hasPassedCache(t.path))
    .slice(0, limit)
    .map((t) => t.path);
}

export function openRecordedFailures(entries, sessionId) {
  const list = Array.isArray(entries) ? entries : [];
  const sid = sessionId == null || sessionId === "" ? null : String(sessionId);
  return list.filter((e) => {
    if (!e || e.source !== "recorded" || e.status !== "failed" || e.open === false) return false;
    if (sid == null) return true;
    return String(e.session_id || "") === sid;
  });
}

export function clearRecordedForFiles(entries, files) {
  const set = new Set((files || []).map((f) => String(f).replace(/\\/g, "/").toLowerCase()));
  if (!set.size) return Array.isArray(entries) ? entries : [];
  return (Array.isArray(entries) ? entries : []).map((e) => {
    if (!e || e.source !== "recorded" || e.open === false) return e;
    const hits = (e.files || []).some((f) => set.has(String(f).replace(/\\/g, "/").toLowerCase()));
    if (!hits) return e;
    return { ...e, open: false, clearedAt: new Date().toISOString() };
  });
}
