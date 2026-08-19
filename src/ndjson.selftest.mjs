import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { parseNdjsonText, parseNdjsonStream, statusFrom } from "./ndjson.mjs";

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

if (process.exitCode) {
  console.error("selftest failed");
  process.exit(1);
}
console.log("selftest passed");
