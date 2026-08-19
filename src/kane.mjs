/**
 * Kane CLI adapter. Spawns kane-cli with an args array (never a shell string)
 * and returns a normalized verdict. Architecture-neutral.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  parseNdjsonStream,
  parseNdjsonText,
  creditsFrom,
  durationFrom,
  statusFrom,
  selectTerminalEvent,
  collectStepEvents,
  buildFailureDetail,
} from "./ndjson.mjs";

function resolveKaneInvocation() {
  if (process.platform === "win32") {
    const cjs = join(
      process.env.APPDATA || "",
      "npm",
      "node_modules",
      "@testmuai",
      "kane-cli",
      "bin",
      "kane-cli.cjs",
    );
    if (existsSync(cjs)) {
      return { command: process.execPath, prefix: [cjs], shell: false };
    }
    const shim = join(process.env.APPDATA || "", "npm", "kane-cli.cmd");
    if (existsSync(shim)) return { command: shim, prefix: [], shell: true };
    return { command: "kane-cli.cmd", prefix: [], shell: true };
  }
  return { command: "kane-cli", prefix: [], shell: false };
}

function passthroughFlags(opts = {}) {
  const flags = [];
  if (opts.agent !== false) flags.push("--agent");
  if (opts.headless !== false) flags.push("--headless");
  if (opts.timeout != null) flags.push("--timeout", String(opts.timeout));
  if (opts.maxSteps != null) flags.push("--max-steps", String(opts.maxSteps));
  return flags;
}

function sessionIdFrom(terminal, events) {
  if (terminal && typeof terminal.session_id === "string" && terminal.session_id) {
    return terminal.session_id;
  }
  for (const ev of events || []) {
    if (ev && typeof ev.session_id === "string" && ev.session_id) return ev.session_id;
  }
  return null;
}

function lookLikePath(p) {
  if (typeof p !== "string" || !p) return false;
  if (p.includes("/") || p.includes("\\")) return true;
  if (/^[a-zA-Z]:/.test(p)) return true;
  return false;
}

function sessionRootFromPath(p) {
  if (typeof p !== "string") return null;
  const m = /(?:^|[/\\])sessions[/\\]([^/\\]+)/i.exec(p);
  if (!m) return null;
  return p.slice(0, m.index + m[0].length);
}

/** Real directory or null — never a bare UUID (Task #4). */
export function resolveSessionDir(terminal, events) {
  const id = sessionIdFrom(terminal, events);
  if (id && !lookLikePath(id)) {
    const guessed = join(homedir(), ".testmuai", "kaneai", "sessions", id);
    if (existsSync(guessed)) return guessed;
  }
  const candidates = [];
  if (terminal?.session_dir) candidates.push(terminal.session_dir);
  for (const ev of events || []) {
    if (ev?.session_dir) candidates.push(ev.session_dir);
    if (ev?.run_dir) candidates.push(ev.run_dir);
    if (ev?.screenshot_path) candidates.push(ev.screenshot_path);
  }
  for (const c of candidates) {
    const root = sessionRootFromPath(c);
    if (root && existsSync(root)) return root;
    if (lookLikePath(c) && existsSync(c)) return c;
  }
  if (id && lookLikePath(id) && existsSync(id)) return id;
  return null;
}

function spawnKane(args, opts = {}) {
  const { command, prefix, shell } = resolveKaneInvocation();
  const env = { ...process.env, ...(opts.env || {}) };
  if (!env.KANE_CLI_USER_AGENT) env.KANE_CLI_USER_AGENT = "grok";
  return spawn(command, [...prefix, ...args], {
    cwd: opts.cwd,
    env,
    shell,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitChild(child) {
  let stderr = "";
  if (child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
  }

  const parsedP = child.stdout
    ? parseNdjsonStream(child.stdout)
    : Promise.resolve({ events: [], terminal: null });

  const exitP = new Promise((resolve) => {
    child.once("error", (err) => {
      stderr += (stderr && !stderr.endsWith("\n") ? "\n" : "") + String(err?.message || err);
      try {
        child.stdout?.destroy();
      } catch {
        /* ignore */
      }
      resolve(2);
    });
    child.once("close", (code) => resolve(code == null ? 2 : code));
  });

  const [parsed, exitCode] = await Promise.all([parsedP, exitP]);
  return { parsed, exitCode, stderr };
}

function pickTerminal(events) {
  const terminal = selectTerminalEvent(events);
  if (!terminal) return null;
  const summary = [...events]
    .reverse()
    .find((e) => e && (e.type === "test_md_summary" || e.type === "testrun_summary"));
  if (summary && terminal !== summary) return { ...summary, ...terminal };
  return terminal;
}

export function verdictFrom({ parsed, exitCode, wallClockMs, stderr }) {
  const events = parsed?.events || [];
  const terminal = pickTerminal(events);
  const durationWallClock = wallClockMs / 1000;
  const steps = collectStepEvents(events);
  const sessionId = sessionIdFrom(terminal, events);
  const sessionDir = resolveSessionDir(terminal, events);

  if (!terminal) {
    const summary = (stderr && stderr.trim()) || "no terminal event in Kane NDJSON stream";
    return {
      ok: false,
      status: "error",
      summary,
      oneLiner: null,
      credits: 0,
      durationSelfReported: 0,
      durationWallClock,
      testUrl: null,
      sessionDir,
      sessionId,
      steps,
      failureDetail: buildFailureDetail(events, null, stderr),
      events,
      raw: { events, stderr, exitCode },
    };
  }

  const status = statusFrom(terminal, exitCode);
  const ok = status === "passed";
  const summary =
    (typeof terminal.summary === "string" && terminal.summary) ||
    (typeof terminal.message === "string" && terminal.message) ||
    "";
  return {
    ok,
    status,
    summary,
    oneLiner: typeof terminal.one_liner === "string" ? terminal.one_liner : null,
    credits: creditsFrom(terminal),
    durationSelfReported: durationFrom(terminal),
    durationWallClock,
    testUrl: terminal.test_url ?? terminal.share_url ?? null,
    sessionDir,
    sessionId,
    steps,
    failureDetail: ok ? null : buildFailureDetail(events, terminal, stderr),
    events,
    raw: terminal,
  };
}

async function runArgs(args, opts = {}) {
  const t0 = Date.now();
  const child = spawnKane(args, opts);
  const result = await waitChild(child);
  return verdictFrom({ ...result, wallClockMs: Date.now() - t0 });
}

export async function runObjective(objective, opts = {}) {
  return runArgs(["run", String(objective), ...passthroughFlags(opts)], opts);
}

export async function runTestMd(path, opts = {}) {
  return runArgs(["testmd", "run", String(path), ...passthroughFlags(opts)], opts);
}

export async function runSuite({ tags, paths, parallel } = {}, opts = {}) {
  const args = ["testrun", "run"];
  if (Array.isArray(paths)) {
    for (const p of paths) args.push(String(p));
  }
  if (Array.isArray(tags) && tags.length) args.push("--tags", tags.join(","));
  else if (typeof tags === "string" && tags) args.push("--tags", tags);
  if (parallel != null) args.push("--parallel", String(parallel));
  // testrun has no --agent flag (R10) and no --timeout. NDJSON still flows when stdout is piped.
  args.push(...passthroughFlags({ ...opts, agent: false, timeout: undefined }));
  return runArgs(args, opts);
}

/** Low-level spawn for generate / other subcommands. */
export async function runKane(args, opts = {}) {
  return runArgs(args, opts);
}

export async function runGenerate(objective, opts = {}) {
  const args = ["generate", String(objective)];
  if (opts.files) {
    const files = Array.isArray(opts.files) ? opts.files.join(",") : String(opts.files);
    args.push("--files", files);
  }
  if (opts.scenarioLimit != null) args.push("--scenario-limit", String(opts.scenarioLimit));
  if (opts.perScenarioLimit != null) args.push("--per-scenario-limit", String(opts.perScenarioLimit));
  if (opts.memory) args.push("--memory");
  if (opts.name) args.push("--name", String(opts.name));
  if (opts.refine && opts.req) args.push("--refine", "--req", String(opts.req));
  args.push(...passthroughFlags({ ...opts, agent: true, headless: false, timeout: undefined }));
  return runArgs(args, opts);
}

export async function generateSave(req, opts = {}) {
  const args = ["generate", "--save", "--req", String(req)];
  if (opts.out) args.push("--out", String(opts.out));
  if (opts.name) args.push("--name", String(opts.name));
  args.push(...passthroughFlags({ ...opts, agent: true, headless: false, timeout: undefined }));
  return runArgs(args, opts);
}

export { parseNdjsonText, parseNdjsonStream };
