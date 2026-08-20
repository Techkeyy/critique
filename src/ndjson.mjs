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
  "generate_done",
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
    else if (ev.type === "test_md_done" || ev.type === "testrun_done" || ev.type === "generate_done") done = ev;
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

export function isFailedStatus(value) {
  const s = String(value || "").toLowerCase();
  return s === "failed" || s === "error" || s === "broken" || s === "timeout";
}

/** Per-step events the feedback loop needs (D-07). Terminal-only is not enough. */
export function collectStepEvents(events) {
  const out = [];
  for (const ev of events || []) {
    if (!ev || typeof ev !== "object") continue;
    if (ev.type === "run_end" || ev.type === "test_md_step_end") out.push(ev);
  }
  return out;
}

function stepIndexOf(ev) {
  if (typeof ev.step_index === "number") return ev.step_index;
  if (typeof ev.index === "number") return ev.index;
  if (typeof ev.run_id === "string") {
    const m = /run-(\d+)/i.exec(ev.run_id);
    if (m) return Number(m[1]) + 1;
  }
  return null;
}

function headingFor(events, stepIndex) {
  if (stepIndex == null) return null;
  for (const ev of events || []) {
    if (ev && ev.type === "test_md_step_start" && ev.step_index === stepIndex) {
      return ev.heading || ev.ref || null;
    }
  }
  return null;
}

function firstFailedDriver(events) {
  for (const ev of events || []) {
    if (!ev || typeof ev !== "object") continue;
    if (ev.type === "step_end" && isFailedStatus(ev.status)) return ev;
    if (ev.type === "step_event" && ev.event === "assertion" && ev.passed === false) return ev;
    if (!ev.type && ev.status === "failed" && ev.remark) return ev;
  }
  return null;
}

/**
 * Human-readable failure string for the agent. Must be non-empty on ok:false
 * and usable without opening any other file (R9).
 */
/**
 * Lines Kane writes to stderr that carry no diagnostic value. Surfacing one of
 * these as a failure reason is worse than silence: the agent gets blocked and
 * told "Evidence, view locally" with no idea what actually broke.
 */
const NOISE = [
  /^evidence\b/i,
  /view locally/i,
  /^running on\b/i,
  /^skill update/i,
  /kane-cli evidence serve/i,
  /^warning: /i,
];

export function isNoiseLine(line) {
  return NOISE.some((re) => re.test(String(line || "").trim()));
}

/**
 * Failures of the verification machinery itself, as opposed to failures of the
 * software under test. No free Chrome debug port, no network, a dead session:
 * none of these say anything about the agent's claim.
 *
 * Blocking on one of these is the same defect as a gate that cannot let go.
 * The agent would be held hostage by the machine being busy, with a failure it
 * has no way to fix. These must fail open.
 */
const INFRASTRUCTURE = [
  /cdp ports?/i,
  /chrome slot/i,
  /close other chrome/i,
  /failed to launch/i,
  /browser (launch|start|connect)/i,
  /econnrefused|enotfound|etimedout|econnreset|socket hang up/i,
  /net::err_/i,
  /not authenticated|unauthori[sz]ed|401|403/i,
  /insufficient credits|quota exceeded|rate limit/i,
  /session (expired|not found)/i,
];

export function isInfrastructureFailure(text) {
  const s = String(text || "");
  return s ? INFRASTRUCTURE.some((re) => re.test(s)) : false;
}

export function buildFailureDetail(events, terminal, stderr) {
  const lines = [];
  const steps = collectStepEvents(events);
  const failing = steps.find((s) => isFailedStatus(s.status) || isFailedStatus(s.overall_status));

  if (failing) {
    const idx = stepIndexOf(failing);
    const heading = headingFor(events, idx);
    const why =
      (typeof failing.summary === "string" && failing.summary.trim()) ||
      (typeof failing.reason === "string" && failing.reason.trim()) ||
      (typeof failing.detail === "string" && failing.detail.trim()) ||
      "";
    const label = idx != null ? `Step ${idx}` : "A step";
    const head = heading ? ` (${heading})` : "";
    lines.push(`${label}${head} failed${why ? `: ${why}` : "."}`);
  }

  const driver = firstFailedDriver(events);
  if (driver) {
    const bit =
      driver.summary ||
      driver.detail ||
      driver.remark ||
      driver.reason ||
      "";
    if (bit && !lines.some((l) => l.includes(bit))) {
      lines.push(`Driver: ${bit}`);
    }
  }

  if (terminal) {
    const tWhy =
      (typeof terminal.summary === "string" && terminal.summary.trim()) ||
      (typeof terminal.reason === "string" && terminal.reason.trim()) ||
      "";
    if (tWhy && !lines.some((l) => l.includes(tWhy))) lines.push(tWhy);
    if (terminal.test_url) lines.push(`Dashboard: ${terminal.test_url}`);
    if (terminal.share_url && terminal.share_url !== terminal.test_url) {
      lines.push(`Share: ${terminal.share_url}`);
    }
  }

  const err = typeof stderr === "string" ? stderr.trim() : "";
  if (!lines.length && err) {
    const useful = err
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !isNoiseLine(l));
    // Prefer a line that reads like a diagnosis over the first line, which is
    // usually chatter. Kane writes evidence hints and progress notes to stderr,
    // and one of those masquerading as a failure tells the agent nothing, which
    // defeats the whole point of having blocked it.
    const diagnostic = useful.find((l) => /fail|error|assert|timeout|refus|denied|not found/i.test(l));
    const pick = diagnostic || useful[0];
    if (pick) lines.push(pick.slice(0, 500));
  }

  if (!lines.length) {
    return "Kane reported a failure but provided no step detail. Re-run the failing _test.md and inspect the evidence pack.";
  }
  return lines.join("\n");
}
