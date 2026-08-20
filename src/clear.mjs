#!/usr/bin/env node
/**
 * critique:clear — close recorded failures and wipe session state.
 * Use before filming so a stale recorded failure cannot block the demo session.
 */

import { existsSync, readdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findWorkspace, INSTALL_ROOT } from "./guard.mjs";

const PROJECT_ROOT = findWorkspace(process.cwd()) || INSTALL_ROOT;

const ledgerPath = join(PROJECT_ROOT, ".critique", "ledger.json");
const sessions = join(PROJECT_ROOT, ".critique", "sessions");

if (existsSync(ledgerPath)) {
  let data;
  try {
    data = JSON.parse(readFileSync(ledgerPath, "utf8"));
  } catch {
    data = [];
  }
  const list = Array.isArray(data) ? data : [];
  const next = list.map((e) => {
    if (e && e.source === "recorded" && e.open !== false) {
      return { ...e, open: false, clearedAt: new Date().toISOString(), clearedBy: "critique:clear" };
    }
    return e;
  });
  writeFileSync(ledgerPath, JSON.stringify(next, null, 2));
  const n = list.filter((e) => e && e.source === "recorded" && e.open !== false).length;
  console.log("closed " + n + " recorded failure(s) in " + ledgerPath);
} else {
  console.log("no ledger at " + ledgerPath);
}

if (existsSync(sessions)) {
  for (const name of readdirSync(sessions)) {
    rmSync(join(sessions, name), { recursive: true, force: true });
  }
  console.log("wiped " + sessions);
} else {
  console.log("no sessions dir");
}
