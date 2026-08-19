import { touchedCode } from "./diff.mjs";

const cases = [
  [["TASK-9.md", "LEDGER.md"], false, "prose only (a Director/notes turn)"],
  [["docs/app.js"], true, "js"],
  [["docs/demo/index.html"], true, "html"],
  [["README.md", "src/kane.mjs"], true, "mixed prose + code"],
  [["styles.css"], true, "css"],
  [["src/App.tsx"], true, "tsx"],
  [["notes.txt"], false, "txt"],
  [[], false, "empty"],
  [null, false, "null"],
  [[null, undefined], false, "junk entries"],
];

let failed = 0;
for (const [input, expected, label] of cases) {
  const got = touchedCode(input);
  const ok = got === expected;
  if (!ok) failed += 1;
  console.log((ok ? "ok  " : "FAIL"), label.padEnd(34), "->", got);
}

if (failed) {
  console.error("diff-selftest failed:", failed);
  process.exit(1);
}
console.log("diff-selftest passed");
