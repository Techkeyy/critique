/**
 * Select at most N most-recently-modified tagged _test.md files for Tier 1.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
    .slice(0, limit)
    .map((t) => t.path);
}
