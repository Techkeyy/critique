import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { parseNdjsonText, parseNdjsonStream, statusFrom, isNoiseLine } from "./ndjson.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const fixturePath = new URL("../fixtures/kane-run1.ndjson", import.meta.url);
const text = readFileSync(fixturePath, "utf8");

const parsed = parseNdjsonText(text);
assert(parsed.terminal && parsed.terminal.type === "run_end", "fixture terminal is run_end");
assert(parsed.terminal.status === "passed", "fixture status passed");
assert(typeof parsed.terminal.duration === "number", "fixture duration present");
assert(parsed.events.some((e) => e.type === "bifurcation"), "fixture captured typed events among plain text");

const noTerminal = parseNdjsonText("Running on: Desktop · Chrome\nnot json\n{bad\n{\"step\":1,\"status\":\"passed\"}\n");
assert(noTerminal.terminal === null, "no terminal event yields null");
assert(statusFrom(null, 2) === "error", "missing terminal + exit 2 → error");

const stream = Readable.from([text]);
const streamed = await parseNdjsonStream(stream);
assert(streamed.terminal && streamed.terminal.type === "run_end", "stream parser selects run_end");
assert(streamed.events.length === parsed.events.length, "stream and text parsers agree on event count");

const empty = await parseNdjsonStream(Readable.from(["hello world\nnot-json\n"]));
assert(empty.terminal === null && empty.events.length === 0, "plain-text-only stream: no throw, no terminal");

const failText = readFileSync(new URL("../fixtures/kane-fail.ndjson", import.meta.url), "utf8");
const failParsed = parseNdjsonText(failText);
assert(failParsed.terminal && failParsed.terminal.type === "test_md_done", "fail fixture terminal is test_md_done");
const { collectStepEvents, buildFailureDetail } = await import("./ndjson.mjs");
const steps = collectStepEvents(failParsed.events);
assert(steps.length >= 2, "fail fixture collected run_end/test_md_step_end steps");
assert(
  steps.some((s) => s.type === "test_md_step_end" && s.status === "failed"),
  "fail fixture has a failed test_md_step_end",
);
const detail = buildFailureDetail(failParsed.events, failParsed.terminal, "");
assert(typeof detail === "string" && detail.length > 0, "failureDetail non-empty");
assert(/Step 2/.test(detail), "failureDetail names step 2");
assert(/ZZZ_CRITIQUE_FORCE_FAIL/.test(detail), "failureDetail names the assertion");

if (process.exitCode) {
  console.error("selftest failed");
  process.exit(1);
}
console.log("selftest passed");
console.log("failureDetail:\n" + detail);

// --- stderr noise must never masquerade as a failure reason (regression) ---
{
  const noise = [
    "Evidence — view locally:",
    "evidence: view locally with kane-cli evidence serve /tmp/x.evidence",
    "Running on: Desktop · Chrome",
    "Skill update available: 0.0.17",
  ];
  const real = ["assert: expected title X, got Y", "action_failed: click @ step 1"];
  for (const n of noise) assert(isNoiseLine(n), "noise rejected: " + n.slice(0, 28));
  for (const r of real) assert(!isNoiseLine(r), "diagnosis kept: " + r.slice(0, 28));

  const { buildFailureDetail: bfd } = await import("./ndjson.mjs");
  const fromNoise = bfd([], null, noise.join("\n"));
  assert(!/view locally/i.test(fromNoise), "pure noise does not become the failure reason");
  assert(fromNoise.length > 40, "pure noise falls back to an honest message");

  const fromMixed = bfd([], null, "Running on: Desktop\nassert: expected title X, got Y");
  assert(/assert:/.test(fromMixed), "the diagnostic line wins over chatter");
}
