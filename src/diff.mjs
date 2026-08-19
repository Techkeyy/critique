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
