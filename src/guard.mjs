/**
 * Shared cwd guard (D-06, D-08). Inert outside this project.
 * Normalize BOTH sides to lowercased forward slashes — never compare raw Windows paths.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function normPath(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase()
    .replace(/\/+$/, "");
}

export function inProject(cwd) {
  const here = normPath(cwd);
  const project = normPath(PROJECT_ROOT);
  return here === project || here.startsWith(project + "/");
}

export function readStdinPayload() {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    return {};
  }
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

export function payloadCwd(payload) {
  return payload?.cwd || process.cwd();
}
