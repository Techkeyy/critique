#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): record the edited path for this session.
 * Must never block and must never throw — always exit 0.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inProject, payloadCwd, PROJECT_ROOT, readStdinPayload } from "../../src/guard.mjs";
import { writeSessionDiff } from "../../src/diff.mjs";

function editedPath(payload) {
  const input = payload?.tool_input || payload?.toolInput || {};
  const p =
    input.file_path ||
    input.filePath ||
    input.path ||
    payload?.tool_response?.filePath ||
    payload?.tool_response?.file_path ||
    null;
  return typeof p === "string" && p.trim() ? p.trim() : null;
}

try {
  const payload = readStdinPayload();
  if (!inProject(payloadCwd(payload))) process.exit(0);

  const sessionId = payload.session_id || payload.sessionId || "unknown";
  const path = editedPath(payload);
  if (!path) process.exit(0);

  const dir = join(PROJECT_ROOT, ".critique", "sessions", sessionId);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "touched.json");
  let list = [];
  try {
    list = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  if (!list.includes(path)) list.push(path);
  writeFileSync(file, JSON.stringify(list, null, 2));
  writeSessionDiff(dir);
} catch {
  // swallow — PostToolUse must not poison the turn
}
process.exit(0);
