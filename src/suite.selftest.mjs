import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selectGateMembers, hasPassedCache, openRecordedFailures, clearRecordedForFiles } from "./suite.mjs";

const root = join(".critique", "tmp-suite");
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

function seedMeta(testPath, executions) {
  const stem = testPath.replace(/_test\.md$/i, "").split(/[/\\]/).pop();
  const dir = join(root, `output-${stem}`, ".internal");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ executions }));
}

const now = Date.now();
for (let i = 0; i < 5; i++) {
  const p = join(root, `case${i}_test.md`);
  writeFileSync(
    p,
    `---\ntags: [critique-gate]\nurl: https://kaneai-playground.lambdatest.io\n---\n\n## Step 1\nGo\n`,
  );
  const t = new Date(now - (4 - i) * 60_000);
  utimesSync(p, t, t);
  if (i >= 2) {
    seedMeta(p, [{ valid: true, status: "passed", run_kind: "replay" }]);
  } else {
    seedMeta(p, [{ valid: true, status: "failed", run_kind: "author" }]);
  }
}
writeFileSync(
  join(root, "untagged_test.md"),
  `---\ntags: [other]\n---\n\n## Step 1\nGo\n`,
);

const members = selectGateMembers(root, 3);
const names = members.map((p) => p.replace(/\\/g, "/").split("/").pop());
if (members.length !== 3) {
  console.error("expected 3 cached-passed members, got", names, members);
  process.exit(1);
}
if (names[0] !== "case4_test.md" || names[2] !== "case2_test.md") {
  console.error("expected newest passed caches case4,case3,case2 got", names);
  process.exit(1);
}
if (hasPassedCache(join(root, "case0_test.md"))) {
  console.error("failed authoring must not count as passed cache");
  process.exit(1);
}

const rec = openRecordedFailures([
  { source: "recorded", status: "failed", open: true, files: ["a_test.md"] },
  { source: "replay", status: "failed", open: true },
  { source: "recorded", status: "failed", open: false },
]);
if (rec.length !== 1) {
  console.error("openRecordedFailures", rec);
  process.exit(1);
}
const cleared = clearRecordedForFiles(
  [{ source: "recorded", status: "failed", open: true, files: ["C:/x/a_test.md"] }],
  ["C:\\x\\a_test.md"],
);
if (cleared[0].open !== false) {
  console.error("clearRecordedForFiles failed", cleared);
  process.exit(1);
}

rmSync(root, { recursive: true, force: true });
console.log("ok: D-11 cache filter + recorded helpers", names);
