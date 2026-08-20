import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findWorkspace, inProject, INSTALL_ROOT, normPath } from "./guard.mjs";

const tmp = mkdtempSync(join(tmpdir(), "critique-guard-"));
const optedIn = join(tmp, "some-users-project");
const nested = join(optedIn, "src", "components");
const stranger = join(tmp, "unrelated-project");
const lookalike = join(tmp, "some-users-project-other");

mkdirSync(join(optedIn, ".critique"), { recursive: true });
mkdirSync(nested, { recursive: true });
mkdirSync(join(stranger, "src"), { recursive: true });
mkdirSync(lookalike, { recursive: true });

const cases = [
  ["a project that opted in", optedIn, optedIn],
  ["a nested dir inside it", nested, optedIn],
  ["a project that never opted in", join(stranger, "src"), null],
  ["a lookalike sibling name", lookalike, null],
  ["the Critique install itself", INSTALL_ROOT, INSTALL_ROOT],
];

let failed = 0;
for (const [label, cwd, expected] of cases) {
  const got = findWorkspace(cwd);
  const ok = expected === null ? got === null : normPath(got) === normPath(expected);
  if (!ok) failed += 1;
  console.log(
    (ok ? "ok  " : "FAIL"),
    label.padEnd(30),
    "->",
    got === null ? "not a workspace" : normPath(got).split("/").slice(-2).join("/"),
  );
}

// inProject must agree with findWorkspace
if (inProject(optedIn) !== true || inProject(join(stranger, "src")) !== false) {
  console.log("FAIL inProject disagrees with findWorkspace");
  failed += 1;
} else {
  console.log("ok   inProject agrees with findWorkspace");
}

rmSync(tmp, { recursive: true, force: true });

if (failed) {
  console.error("guard-selftest failed:", failed);
  process.exit(1);
}
console.log("guard-selftest passed");
