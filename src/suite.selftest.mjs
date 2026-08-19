import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selectGateMembers } from "./suite.mjs";

const root = join(".critique", "tmp-suite");
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

const now = Date.now();
for (let i = 0; i < 5; i++) {
  const p = join(root, `case${i}_test.md`);
  writeFileSync(
    p,
    `---\ntags: [critique-gate]\nurl: https://kaneai-playground.lambdatest.io\n---\n\n## Step 1\nGo\n`,
  );
  const t = new Date(now - (4 - i) * 60_000);
  utimesSync(p, t, t);
}
writeFileSync(
  join(root, "untagged_test.md"),
  `---\ntags: [other]\n---\n\n## Step 1\nGo\n`,
);

const members = selectGateMembers(root, 3);
const names = members.map((p) => p.replace(/\\/g, "/").split("/").pop());
if (members.length !== 3) {
  console.error("expected 3 members, got", members);
  process.exit(1);
}
if (names[0] !== "case4_test.md" || names[2] !== "case2_test.md") {
  console.error("expected newest-first case4,case3,case2 got", names);
  process.exit(1);
}
rmSync(root, { recursive: true, force: true });
console.log("ok: selectGateMembers bounds to 3 newest", names);
