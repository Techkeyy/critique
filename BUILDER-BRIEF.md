# Builder Brief — Critique

You are the **Builder Agent**. A Director Agent owns architecture and decides what happens next.
You implement, run, measure, and report evidence. You do not make architectural decisions —
if you believe one is wrong, report it with evidence and a recommendation, then wait.

**Read `LEDGER.md` before doing anything.** It is the project memory and holds every measured
fact. Do not re-derive what it already records. Update nothing in it — the Director maintains it.

---

## Project in one paragraph

**Critique** is a Claude Code plugin. When the coding agent finishes a turn, a `Stop` hook
intercepts its closing claim ("added the dark mode toggle"), compiles that claim into adversarial
browser flows via **Kane CLI**, and **blocks the agent from exiting** until the claim survives in
a real browser — feeding Kane's failure text back so the agent self-corrects. Every prosecution
seals into a cached `_test.md`, so the repo accretes a regression suite nobody wrote.

Built for the Kane CLI Hackathon. **Deadline 21 Aug 23:59 IST.** Judged on Ships / Verified /
Closed loop / Craft, equally weighted.

## Environment (already done — do not redo)

- Kane CLI **v0.8.4**, installed globally, OAuth-authenticated as `israelolawale891`.
- Kane agent skill v0.0.17 installed.
- Working directory: `C:\Users\HomePC\Desktop\critique`
- Windows 11, PowerShell primary, Bash available. Node v24.14.0, npm 11.9.0.
- ~11,185 Kane credits remain. A trivial run costs ~7.

## Ground rules

1. **Evidence over claims.** "It works" is not a report. Paste commands and real output.
2. **Never trust `kane-cli` exit codes** on `balance` and `testmd list` — they crash on Windows
   teardown with a libuv assertion and exit 9 *after* printing correct output. Parse stdout.
   `run` and `testrun run` exit codes ARE reliable: `0` passed · `1` failed · `2` error · `3` timeout.
3. **Parse only `run_end`** from `kane-cli run --agent` NDJSON. It is the sole event with a schema
   stable across versions. `testmd run` emits `test_md_summary` / `test_md_done` instead.
4. **Commits: terse, single-line, no AI attribution or co-author trailers.**
5. Report blockers immediately rather than working around them silently.
6. No mocks presented as real. If you stub something, label it `MOCKED` in your report.

---

# TASK #1 — Verification spike (BLOCKING, do first)

**OBJECTIVE:** Produce hard numbers for cached-replay latency and cost, and observable proof that
a Claude Code `Stop` hook can block the agent and deliver text back to the model. Initialize git.

**CONTEXT:** The gate runs on every agent turn. Measured Kane *authoring* latency is 373s wall
clock — far too slow for a blocking gate. The design assumes cached *replay* is dramatically
faster. That assumption is unverified and decides between a synchronous and asynchronous
architecture. **Write no product code in this task.**

**CURRENT STATE:**
- `.testmuai/tests/contraband/console_clean_test.md` — authored once, passed, cache at
  `output-console_clean/.internal/`.
- `.claude/settings.json` registers a `Stop` hook running `.claude/hooks/gate-probe.mjs`.
  That probe blocks exactly once (flag file `.critique/probe-blocked-once`), then allows.
- Not a git repo.

**REQUIRED CHANGES:**

**1. Git init.** `.gitignore` must exclude `output-*/`, `*.evidence`, `node_modules/`,
`.critique/sessions/`. Commit `BUILD_PLAN.md`, `KICKOFF-CHECKLIST.md`, `LEDGER.md`,
`BUILDER-BRIEF.md`, `.claude/`, and the `_test.md`. Commit dated 19 Aug or later — this is a
hackathon eligibility rule and they check commit history.

**2. Benchmark replay.** Run the existing test **twice more**, timing each, capturing
`kane-cli balance` before and after each:

```bash
kane-cli testmd run ".testmuai/tests/contraband/console_clean_test.md" --agent --headless
```

Record per run: wall-clock seconds · `test_md_summary.duration_s` ·
`steps.replay_decisions` vs `steps.author_decisions` · credit delta · exit code.

**3. Prove the Stop hook.** Start a **new** Claude Code session with cwd
`C:\Users\HomePC\Desktop\critique`, send any trivial message, observe what happens.
Capture `.critique/probe-log.json` verbatim.

**DO NOT:**
- Do not modify `console_clean_test.md` between runs — editing invalidates the cache and forces
  expensive re-authoring.
- Do not delete `output-console_clean/` — it is the cache under test.
- Do not run `kane-cli generate` yet.
- Do not remove the probe's flag-file guard. Without it you get an infinite agent loop.
- Do not write prosecutor, ledger, dashboard, or claim-extraction code.

**ACCEPTANCE CRITERIA:**
1. `git log` shows ≥1 commit dated on/after 19 Aug 2026.
2. Two replay runs completed, each reporting `replay_decisions: 2, author_decisions: 0`.
3. Wall-clock seconds and credit delta reported for both.
4. `.critique/probe-log.json` exists with ≥1 captured `Stop` payload.
5. Definitive yes/no: did the agent visibly refuse to stop, and did the stderr text reach it?

**REPORT BACK:**
- Replay numbers table (wall clock · self-reported duration · replay/author counts · credit delta · exit code).
- Exact top-level keys in the `Stop` payload; state whether `last_assistant_message` and
  `stop_hook_active` are present.
- Verbatim: what the agent did when blocked.
- Which settings file the hook loaded from (project `.claude/settings.json` or `~/.claude/settings.json`).
- Anything contradicting `LEDGER.md`.

---

# TASK #2 — Kane adapter + repo scaffold (run during Task #1's waits)

**OBJECTIVE:** A hardened, tested module that spawns Kane CLI, parses its NDJSON, and returns a
typed verdict. Plus the repo skeleton.

**CONTEXT:** Every part of Critique talks to Kane through this one module. It is
**architecture-neutral** — identical in both the synchronous and asynchronous gate designs — so it
is safe to build before the Director rules on Task #1's numbers.

**REQUIRED CHANGES:**

1. `package.json` (ESM, `"type": "module"`, no build step, zero runtime dependencies).
2. Directory skeleton: `src/`, `.critique/`.
3. `src/kane.mjs` exporting:
   - `runObjective(objective, opts)` → wraps `kane-cli run "<objective>" --agent --headless`
   - `runTestMd(path, opts)` → wraps `kane-cli testmd run <path> --agent --headless`
   - `runSuite({ tags, paths }, opts)` → wraps `kane-cli testrun run --agent --headless`
   Each resolves to a normalized verdict:
   ```js
   { ok: boolean, status: 'passed'|'failed'|'error'|'timeout',
     summary: string, oneLiner: string|null, credits: number,
     durationSelfReported: number, durationWallClock: number,
     testUrl: string|null, sessionDir: string|null, raw: object }
   ```
4. `src/ndjson.mjs` — streaming line parser. Tolerates non-JSON lines (Kane interleaves plain
   text such as `Running on: Desktop · Chrome` and the `evidence:` hint). Selects the terminal
   event: `run_end` for `run`, `test_md_done`/`test_md_summary` for `testmd`/`testrun`.

**IMPLEMENTATION REQUIREMENTS:**
- Always pass `--agent --headless`. Support `--timeout` and `--max-steps` passthrough.
- Measure wall clock yourself. **Kane's self-reported `duration` is ~2x optimistic** — both
  numbers must be surfaced separately.
- Never let a malformed line throw. A stream with no terminal event → `status: 'error'`, `ok: false`.
- Spawn via `child_process.spawn` with an args array — **never** string interpolation into a shell.
  Objectives contain quotes and user text.
- On Windows, `kane-cli` is a `.cmd` shim; handle this so spawning works (`shell: true` with an
  args array is acceptable here, or resolve the shim path).

**DO NOT:**
- Do not add TypeScript, a bundler, a test framework, or any runtime dependency.
- Do not implement the gate, hooks, prosecutor, or claim extraction — different task.
- Do not call Kane in a loop while testing. Credits are finite.

**ACCEPTANCE CRITERIA:**
1. `node -e "import('./src/kane.mjs').then(m => m.runTestMd('.testmuai/tests/contraband/console_clean_test.md').then(v => console.log(v)))"`
   returns a populated verdict object with `ok: true`.
2. Feeding the parser a captured NDJSON fixture with interleaved plain-text lines yields the
   correct terminal event and throws nothing.
3. A stream with no terminal event returns `ok: false, status: 'error'` rather than throwing.
4. `durationWallClock` and `durationSelfReported` differ and both are populated.

**TESTING:** Reuse the NDJSON already captured at `%TEMP%\kane-run1.ndjson` as a fixture — it
contains real interleaved plain-text lines. Do not spend credits on parser testing.

**REPORT BACK:** Files created · the verdict object printed by AC-1 · how you handled the Windows
`.cmd` shim · any Kane output shape that broke the parser.

---

## Reporting format (both tasks)

```
IMPLEMENTATION SUMMARY   — what changed
FILES CHANGED            — created / modified / removed
TECHNICAL DETAILS        — anything the Director needs to know
COMMANDS RUN             — exact commands
RESULTS                  — real output, passed and failed
REMAINING ISSUES         — anything incomplete
ASSUMPTIONS              — decisions made without direction
RECOMMENDED NEXT STEP    — advisory only
```
