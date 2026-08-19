/**
 * Kane CLI adapter. Spawns kane-cli with an args array (never a shell string)
 * and returns a normalized verdict. Architecture-neutral.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  parseNdjsonStream,
  parseNdjsonText,
  creditsFrom,
  durationFrom,
  statusFrom,
  selectTerminalEvent,
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
  const flags = ["--agent", "--headless"];
  if (opts.timeout != null) flags.push("--timeout", String(opts.timeout));
  if (opts.maxSteps != null) flags.push("--max-steps", String(opts.maxSteps));
  return flags;
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

function verdictFrom({ parsed, exitCode, wallClockMs, stderr }) {
  const events = parsed?.events || [];
  const terminal = pickTerminal(events);
  const durationWallClock = wallClockMs / 1000;

  if (!terminal) {
    return {
      ok: false,
      status: "error",
      summary: (stderr && stderr.trim()) || "no terminal event in Kane NDJSON stream",
      oneLiner: null,
      credits: 0,
      durationSelfReported: 0,
      durationWallClock,
      testUrl: null,
      sessionDir: null,
      raw: { events, stderr, exitCode },
    };
  }

  const status = statusFrom(terminal, exitCode);
  const summary =
    (typeof terminal.summary === "string" && terminal.summary) ||
    (typeof terminal.message === "string" && terminal.message) ||
    "";
  return {
    ok: status === "passed",
    status,
    summary,
    oneLiner: typeof terminal.one_liner === "string" ? terminal.one_liner : null,
    credits: creditsFrom(terminal),
    durationSelfReported: durationFrom(terminal),
    durationWallClock,
    testUrl: terminal.test_url ?? terminal.share_url ?? null,
    sessionDir: terminal.session_dir ?? terminal.session_id ?? null,
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

export async function runSuite({ tags, paths } = {}, opts = {}) {
  const args = ["testrun", "run"];
  if (Array.isArray(paths)) {
    for (const p of paths) args.push(String(p));
  }
  if (Array.isArray(tags) && tags.length) args.push("--tags", tags.join(","));
  else if (typeof tags === "string" && tags) args.push("--tags", tags);
  args.push(...passthroughFlags(opts));
  return runArgs(args, opts);
}

export { parseNdjsonText, parseNdjsonStream };
