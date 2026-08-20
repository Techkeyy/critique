/**
 * Scoping and stdin handling for the hooks.
 *
 * Two different roots, which used to be conflated:
 *
 *   INSTALL_ROOT  where Critique's own code lives. Used to spawn src/prosecute.mjs.
 *                 Fixed at the clone location.
 *
 *   workspace     the project being gated. Discovered by walking up from the
 *                 agent's cwd looking for a `.critique/` marker directory.
 *                 This is where sessions, the ledger and the test suite live.
 *
 * Separating them is what lets one installation gate any number of projects,
 * while staying completely inert in projects that never opted in.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

export const INSTALL_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Retained name so existing imports keep working. It means the install location. */
export const PROJECT_ROOT = INSTALL_ROOT;

export const MARKER = ".critique";

export function normPath(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase()
    .replace(/\/+$/, "");
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Walk up from `startDir` looking for a directory containing `.critique/`.
 * Returns the workspace root, or null when this project never opted in.
 */
export function findWorkspace(startDir) {
  let dir = String(startDir || process.cwd());
  const { root } = parse(dir);
  // Bounded by the filesystem root; the guard clause stops runaway loops.
  for (let i = 0; i < 64; i += 1) {
    if (isDir(join(dir, MARKER))) return dir;
    if (normPath(dir) === normPath(root)) return null;
    const up = dirname(dir);
    if (!up || up === dir) return null;
    dir = up;
  }
  return null;
}

/** True when the agent is working inside a project that opted in. */
export function inProject(cwd) {
  return findWorkspace(cwd) !== null;
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

/** The workspace for this hook invocation, or null when out of scope. */
export function workspaceFor(payload) {
  return findWorkspace(payloadCwd(payload));
}

export { existsSync };
