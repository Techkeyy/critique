/**
 * Capture git diff for the prosecutor. Never throws. Cap 200KB.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "./guard.mjs";

const CAP = 200 * 1024;

function gitOut(args) {
  try {
    return execFileSync("git", args, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      maxBuffer: CAP + 64 * 1024,
      timeout: 8000,
      windowsHide: true,
    });
  } catch (err) {
    return String(err?.stdout || "");
  }
}

// Extensions that can change what a browser does. Everything else is prose.
const CODE_EXT = /\.(m?[jt]sx?|html?|css|scss|vue|svelte|astro|php|py|rb|go|rs|java|cs)$/i;

/**
 * True when a turn changed application code. A turn that edited only prose
 * (docs, task files, notes) has no browser behaviour to falsify — prosecuting
 * it costs ~52 credits and pollutes the suite with tests derived from
 * narration rather than from the product.
 */
export function touchedCode(touched) {
  if (!Array.isArray(touched)) return false;
  return touched.some((f) => CODE_EXT.test(String(f || "")));
}

export function captureDiffText() {
  try {
    let text = gitOut(["diff", "HEAD"]);
    if (!text.trim()) text = gitOut(["diff"]);
    if (text.length > CAP) text = text.slice(0, CAP);
    return text;
  } catch {
    return "";
  }
}

export function writeSessionDiff(sessionDir) {
  let text = "";
  try {
    text = captureDiffText();
  } catch {
    text = "";
  }
  try {
    writeFileSync(join(sessionDir, "diff.txt"), text);
  } catch {
    try {
      writeFileSync(join(sessionDir, "diff.txt"), "");
    } catch {
      /* ignore */
    }
  }
  return text;
}
