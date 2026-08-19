/**
 * Streaming NDJSON parser for kane-cli --agent output.
 * Tolerates interleaved plain-text lines. Never throws on a malformed line.
 */

const TERMINAL_TYPES = new Set([
  "run_end",
  "test_md_done",
  "test_md_summary",
  "testrun_done",
  "testrun_summary",
]);

export function isTerminalEvent(obj) {
  return Boolean(obj && typeof obj === "object" && TERMINAL_TYPES.has(obj.type));
}

/** Preference: done > summary > run_end. Last-seen of the winning rank wins. */
export function selectTerminalEvent(events) {
  let runEnd = null;
  let summary = null;
  let done = null;
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    if (ev.type === "run_end") runEnd = ev;
    else if (ev.type === "test_md_summary" || ev.type === "testrun_summary") summary = ev;
    else if (ev.type === "test_md_done" || ev.type === "testrun_done") done = ev;
  }
  return done || summary || runEnd || null;
}

export function parseNdjsonLine(line) {
  if (typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed || trimmed[0] !== "{") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function parseNdjsonText(text) {
  const events = [];
  if (typeof text !== "string" || text.length === 0) {
    return { events, terminal: null };
  }
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const obj = parseNdjsonLine(line);
    if (obj) events.push(obj);
  }
  return { events, terminal: selectTerminalEvent(events) };
}

/**
 * Consume a Node readable stream of NDJSON (+ plain text).
 * Resolves with { events, terminal } — never rejects for parse errors.
 */
export function parseNdjsonStream(readable) {
  return new Promise((resolve) => {
    let settled = false;
    let buf = "";
    const events = [];

    const takeLine = (line) => {
      const obj = parseNdjsonLine(line);
      if (obj) events.push(obj);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      if (buf.length) takeLine(buf);
      resolve({ events, terminal: selectTerminalEvent(events) });
    };

    readable.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        takeLine(line);
      }
    });
    readable.on("end", finish);
    readable.on("close", finish);
    readable.on("error", finish);

    if (readable.readableEnded) finish();
  });
}

export function creditsFrom(event) {
  if (!event || typeof event !== "object") return 0;
  const n = event.credits_consumed ?? event.credits ?? event.credit_consumed;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export function durationFrom(event) {
  if (!event || typeof event !== "object") return 0;
  const n = event.duration ?? event.duration_s;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export function statusFrom(event, exitCode) {
  if (event && typeof event.status === "string") {
    const s = event.status.toLowerCase();
    if (s === "passed" || s === "failed" || s === "error" || s === "timeout") return s;
    if (s === "cancelled" || s === "canceled" || s === "interrupted") return "timeout";
    if (s === "broken") return "failed";
  }
  if (event && typeof event.overall_status === "string") {
    const s = event.overall_status.toLowerCase();
    if (s === "passed" || s === "failed") return s;
    if (s === "cancelled" || s === "canceled") return "timeout";
  }
  if (exitCode === 0) return "passed";
  if (exitCode === 1) return "failed";
  if (exitCode === 3) return "timeout";
  return "error";
}
