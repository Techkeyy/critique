#!/usr/bin/env node
/**
 * Opt the current project into Critique.
 *
 * The hooks are registered once, globally, but they stay inert everywhere that
 * has not opted in. The opt-in signal is simply a `.critique/` directory, so
 * this is deliberately tiny and easy to undo: delete the folder and the gate
 * stops touching this project.
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findWorkspace } from "./guard.mjs";

const cwd = process.cwd();
const existing = findWorkspace(cwd);

if (existing) {
  console.log(`critique: this project is already opted in (${existing}).`);
  process.exit(0);
}

mkdirSync(join(cwd, ".critique"), { recursive: true });
mkdirSync(join(cwd, ".testmuai", "tests"), { recursive: true });

const gitignore = join(cwd, ".gitignore");
const rules = [
  "",
  "# Critique runtime state. The ledger is worth committing; sessions are not.",
  ".critique/sessions/",
  "output-*/",
  "*.evidence",
  "",
].join("\n");
try {
  const current = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
  if (!current.includes(".critique/sessions/")) {
    writeFileSync(gitignore, current + rules);
    console.log("updated    .gitignore");
  }
} catch {
  /* a missing or unwritable .gitignore is not worth failing over */
}

console.log(`created    ${join(cwd, ".critique")}`);
console.log(`created    ${join(cwd, ".testmuai", "tests")}`);
console.log("\nThis project is now gated. Open Claude Code here, edit a file, and let it finish.");
console.log("To opt back out, delete the .critique folder.\n");
