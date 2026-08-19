import { readFileSync } from "node:fs";
import { extractClaims } from "./claims.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const probe = JSON.parse(readFileSync(new URL("../.critique/probe-log.json", import.meta.url), "utf8"));

const fixtures = [
  {
    name: "probe-log[0] Director (no genuine claims)",
    input: probe[0].last_assistant_message,
    check(out) {
      assert(Array.isArray(out), "probe-0 returns array");
      assert(
        out.length === 0 || out.every((c) => c.confidence === "low"),
        "probe-0 is [] or only low-confidence",
      );
    },
  },
  {
    name: "simple two-claim completion",
    input: "Done — I added the dark mode toggle and fixed the login redirect.",
    check(out) {
      assert(out.length === 2, "two-claim fixture returns 2, got " + out.length);
      assert(
        out.some((c) => c.verb === "added") && out.some((c) => c.verb === "fixed"),
        "two-claim has added + fixed",
      );
      assert(
        out.every((c) => c.confidence === "high"),
        "two-claim verbs are high confidence",
      );
    },
  },
  {
    name: "pure question",
    input: "Did I add the dark mode toggle?",
    check(out) {
      assert(out.length === 0, "question returns []");
    },
  },
  {
    name: "empty string",
    input: "",
    check(out) {
      assert(out.length === 0, "empty returns []");
    },
  },
  {
    name: "future tense / intent",
    input: "I will add the dark mode toggle. I'll fix the login next.",
    check(out) {
      assert(out.length === 0, "future tense returns []");
    },
  },
  {
    name: "If-prefix discarded",
    input: "If you click save, the panel now shows the new theme.",
    check(out) {
      assert(out.length === 0, "If-prefix returns []");
    },
  },
  {
    name: "short fragment discarded",
    input: "I added it.",
    check(out) {
      assert(out.length === 0, "under 15 chars discarded");
    },
  },
  {
    name: "updated is low-confidence",
    input: "I updated the README with the install steps for Kane CLI.",
    check(out) {
      assert(out.length === 1, "updated fixture returns 1");
      assert(out[0].verb === "updated" && out[0].confidence === "low", "updated is low");
    },
  },
];

extractClaims(fixtures[0].input);
const t0 = performance.now();
const outputs = [];
for (const f of fixtures) {
  outputs.push({ name: f.name, output: extractClaims(f.input) });
}
const ms = performance.now() - t0;
for (let i = 0; i < fixtures.length; i++) fixtures[i].check(outputs[i].output);
assert(ms < 50, "runtime under 50ms, was " + ms.toFixed(2));
assert(extractClaims(null).length === 0, "null input returns []");

if (process.exitCode) {
  console.error("claims.selftest failed");
  process.exit(1);
}
console.log("claims.selftest passed in " + ms + "ms");
console.log("--- fixtures ---");
console.log(JSON.stringify(outputs, null, 2));
