# Critique — Project Ledger

Maintained by the Director Agent. **This file, not chat history, is the project memory.**
Update after every Builder task.

Last updated: 19 Aug 2026, ~21:10 IST · **~50 hours to deadline** (21 Aug 23:59 IST)

---

## Product

- **What:** A Claude Code plugin that intercepts the coding agent at the moment it claims to be
  finished, hands that claim to an adversarial prosecutor backed by Kane CLI, and refuses to let
  the agent stop until the claim survives a real browser.
- **User:** Developers who write code by directing an AI coding agent.
- **Core problem:** The agent marks its own homework. "Done" is an unverified assertion.
- **Success criteria:** The agent is observably denied exit on a false claim, self-corrects from
  Kane's failure text, and the repo accretes a replayable test suite no human wrote.

## Deliverables (all three are required — see BUILD_PLAN §3)

| ID | Deliverable | Rubric dimension | Status |
|----|---|---|---|
| D1 | Critique plugin (hooks + prosecutor + ledger) | Verified, Closed loop, Craft | MISSING |
| D2 | Critique Dashboard — deployed web app, live URL | **Ships** | MISSING |
| D3 | Subject app built live on camera | demo | MISSING |

---

## Current implementation

| Component | Status | Evidence |
|---|---|---|
| Kane CLI v0.8.4 installed + authenticated (OAuth, user `israelolawale891`) | **COMPLETE** | `kane-cli whoami` ✓ |
| Kane agent skill v0.0.17 | **COMPLETE** | `install skill` → 3 targets |
| `BUILD_PLAN.md`, `KICKOFF-CHECKLIST.md` | **COMPLETE** | on disk |
| Stop-hook probe **script logic** | **VERIFIED WORKING (offline)** | 6/6 cases in `.critique/guard-test.mjs`: blocks in-project w/ stderr+exit 2, inert outside, one-shot holds, no lookalike false-positive |
| Stop-hook **invocation by Claude Code** | **VERIFIED WORKING** | Fired on a live agent turn. `exit 2` blocked the stop; stderr text reached the model verbatim. Registration: `~/.claude/settings.json` (rung 1). Captured payload: `.critique/probe-log.json` |
| `_test.md` schema | **COMPLETE (partial)** | `tags` + `url` valid; `name` is **rejected** |
| Kane authoring run | **VERIFIED WORKING** | 373s wall, 6.66 credits, passed |
| Kane cached replay | **NEEDS VERIFICATION** | **never measured — architecturally decisive** |
| Git repository | **MISSING** | not a repo — eligibility risk |
| D1 / D2 / D3 | **MISSING** | no application code exists |

---

## Measured facts (do not re-derive)

| Fact | Value | Source |
|---|---|---|
| Starting credits | **11,200** (not 10,000) | `kane-cli balance` |
| Credits after 2 runs | 11,185.37 | `kane-cli balance` |
| Cost, trivial 3-step `run` | **7.34 credits** | `run_end.credits_consumed` |
| Cost, 2-step `testmd` authoring | **6.66 credits** | balance delta |
| **Wall clock, `run`** | **248s** (Kane self-reported `duration`: 50.3s) | stopwatch |
| **Wall clock, `testmd` authoring** | **373s** (self-reported 203s) | stopwatch |
| Kane's reported duration is **~2x optimistic** vs wall clock | — | both runs |
| **Cached replay wall clock** | **39.5s / 41.6s** standalone (self-reported 29–31s) | Task #1, 2 runs |
| **Gate wall clock in a REAL hook** | **63.4s** — ~50% slower than standalone. Breaches the 45s D-05 budget. | live Director turn, `.critique/ledger.json` |
| Live end-to-end gate run | **VERIFIED** — fired on a real agent turn, passed, ledger appended, `touched.json` cleared | `.critique/ledger.json` |
| **Cached replay cost** | **0.0000 credits — free, not merely cheap** | balance delta, both runs |
| Replay decisions | `replay_decisions: 2, author_decisions: 0` both runs | `test_md_summary` |
| Inner per-step `run_end.duration` on replay | ~1.4s and ~2.4s (rest is browser/session overhead) | Task #1 |
| `testmd`/`testrun` terminal events | `test_md_summary` + `test_md_done` — **NOT** `run_end`. Status field is `overall_status`. Per-step `run_end`s are also emitted. | Task #1 |
| Replay `run_end` is thin | **lacks** `credits_consumed`, `one_liner`, `test_url`, `session_dir` | Task #1/#2 |
| `commit.reason` on replays | `readonly_fallback`, `committed: false` (uploads still succeeded) | Task #1 |
| `testrun run` has **no `--agent` flag** | not in `--help`; passing it may error | `--help` + Task #2 |
| **`Stop` payload top-level keys (REAL)** | `session_id` · `transcript_path` · `cwd` · `prompt_id` · `permission_mode` · `effort` · `hook_event_name` · **`stop_hook_active`** · **`last_assistant_message`** · `background_tasks` · `session_crons` | `.critique/probe-log.json` |
| **`stop_hook_active` EXISTS** (docs claimed it does not) — `false` on a normal stop. Built-in re-entry flag: true when the agent is continuing *because* a Stop hook blocked it. **Use it as the primary loop guard.** | — | captured payload |
| `last_assistant_message` | full raw markdown of the agent's closing message — exactly what claim extraction needs | captured payload |
| Settings changes load **without a session restart** | hook fired on an already-running session | observed |
| `~/.claude/settings.json` | was absent; **now created** by Director with the Stop registration | Director |
| Project `.claude/settings.json` | valid JSON, single `hooks` key | Director inspection |
| **A cached test that now FAILS takes ~185s to replay** | 185s wall / 160s internal, `replay_decisions: 2, author_decisions: 0`, ~4 credits. It does *not* re-author — the failing assertion just burns time. **Exceeds any viable hook budget.** | Builder, measured |
| Passing replay of the demo test | **53s wall / 41s internal, 0 credits** | Builder, measured |
| Tier-1 Kane timeout | **75s** — above the 53s passing case, below the 120s hook timeout | D-13 |
| Tier-2 regression pass (broken app) | 221s detached, caught the break, recorded it | Builder, measured |
| **Block from a recorded regression** | **331ms**, exit 2, real Kane failure text | Builder, measured |
| **Failed authoring does NOT cache** | re-run shows `author_decisions: 1`, ~19 credits, ~105s each time | Task #7 |
| **Prosecution cost** (generate + save + author) | **51.88 credits**, 340s (background) | Task #7 |
| `generate` rejects `--files` together with `--save` | `--files` is new/refine only; `--save` needs `--req` → two-step flow | Task #7 |
| `generate --save` does **not** preserve custom tags | must inject `tags:` post-save (R7 open) | Task #7 |
| Detached Tier-2 spawn parent return | **16ms** — hook runtime unaffected | Task #7 |
| Credits remaining | ~11,100 | Task #7 |
| Cache location | `<test-dir>/output-<stem>/.internal/` | on disk |
| Cache contains resolved driver actions (`OPEN`, etc.) | yes, `execution.json` `v4`, `auto_heal_version: AH2` | inspected |
| `run_end` fields confirmed | `status`, `summary`, `one_liner`, `final_state`, `duration`, `credits_consumed`, `session_dir`, `test_url`, `result_code`, `reason_code` | live NDJSON |
| Free practice target | `https://kaneai-playground.lambdatest.io` | config `default_url` |

## Hidden CLI surface (absent from `--help`, verified present)

`generate` · `balance` · `cover` · `maintain` · `install skill`
`generate` flags: `--files` (≤10, ≤50MB) · `--memory` · `--scenario-limit` · `--per-scenario-limit` · `--refine --req` · `--save --out`
`testrun run` flags: `--tags` · `--match` · `--parallel` · `--on-failure` · `--retry` · **`--bug-detection off|stop|continue`** (config default: **off**)
`testmd run` has **no** `--dry-run`.

---

## Risks

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | Replay latency unknown | ~~CRITICAL~~ | **CLOSED** — 39–42s, free |
| R2 | **Stop-hook blocking unproven.** Whole product rests on it. **Two failed attempts.** A live session in-project was NOT intercepted; debug reported `Hooks: Found 0 total hooks in registry`. Cause is registration, not auth. | **CRITICAL** | OPEN — Task #3, **hard pivot deadline 20 Aug 09:00 IST** |
| R9 | **Cached-replay verdict is too thin to feed the loop.** No `summary`, `test_url`, or `one_liner` on replay terminals. On a FAILED gate we currently have nothing useful to tell the agent — which is the entire product. | **CRITICAL** | OPEN — Task #4 |
| R10 | `testrun run` has no `--agent` flag; adapter passes it untested. | MEDIUM | OPEN — Task #4 |
| R11 | Gate budget is ~40s per turn and the contraband sweep will exceed 2 steps. Sum of two sequential Kane calls is unacceptable. | MEDIUM | Mitigated by D-05: parallel spawn + scope caps |
| R3 | OAuth token shows `Expires 2026-08-19` (today). Non-interactive hook runs may fail mid-demo. | HIGH | OPEN — mitigate with `--username`/`--access-key` |
| R4 | ~50h remain and zero product code exists. | HIGH | OPEN |
| R5 | `kane-cli` crashes on Windows teardown (`libuv` assertion, exit 9) after `balance`/`testmd list`. Exit codes are unreliable for those commands. | MEDIUM | OPEN — parse stdout, never trust exit code except on `run`/`testrun` |
| R6 | Not a git repo. Rules require init on/after 19 Aug + commit history check. | MEDIUM | OPEN — Task #1 |
| R7 | `generate --save` may write only Functional-category cases, dropping the security/contraband checks. | MEDIUM | OPEN |
| R8 | D2 (deployed web app) is 25% of score and has no owner yet. | MEDIUM | OPEN |

---

## Decisions

- **D-01** Gate lives at Claude Code's `Stop` hook, not on file save. Rationale: differentiates
  from the converging field; the brief names save-watchers explicitly.
- **D-02** `stderr` + `exit 2` is the channel that reaches the model on `Stop`. Plain stdout is
  debug-log only for that event.
- **D-03** The contraband sweep is authored once as tagged `_test.md`, then replayed. Replay is
  the affordability mechanism for gating every turn.
- **D-04** Never trust `kane-cli` exit codes on `balance`/`testmd list` (see R5).
- **D-05 RULED — SYNCHRONOUS GATE.** Replay measured 39–42s wall, 0 credits. Within the 45s rule,
  and the async design's complexity is a bigger risk than 40s of latency with ~46h left.
  Mandatory mitigations: (a) the two Kane invocations run **in parallel**, so gate cost is
  `max()` not `sum()`; (b) contraband sweep capped at ~4 steps; (c) gate only fires when code
  was actually touched this turn.
- **D-06** Register hooks in **`~/.claude/settings.json`** (user level, implicitly trusted), and
  scope behavior inside the script with a cwd guard so it is inert outside this project.
  Rationale: project-level hooks appear to require a trust/approval step we cannot drive
  non-interactively. Product install (`npx critique init`) can still write project settings later.
- **D-07** The Kane adapter must retain **per-step `run_end` events**, not just the terminal event.
  Failure detail is the payload the whole loop depends on (R9).
- **D-10 — TWO-TIER GATE (supersedes part of D-05).** Forced by measurement: the gate takes
  **63s** inside a real hook against a **120s** hook timeout, and *authoring* a new test measured
  **373s**. Synchronous authoring inside the Stop hook is therefore impossible — two sequential
  Kane calls (126s) already exceed the timeout.
  - **Tier 1 (synchronous, blocking):** cached-suite replay only. ~63s. This is what denies exit.
  - **Tier 2 (asynchronous, background):** `generate --files <diff> --save` authors new
    prosecutions after the turn, promotes them into the suite, and they gate **subsequent** turns.
  This keeps the denial moment fast, stays inside the timeout, and makes the "suite accretes as
  exhaust" story literal rather than aspirational. Turn N's claim gates turn N+1.
- **D-11 — TIER 1 REPLAYS CACHED TESTS ONLY; FAILURES GATE FROM THE LEDGER.**
  Forced by Task #7's AC-3 failure. A test that fails during authoring **does not cache**
  (`author_decisions: 1` on every re-run, ~19 credits and ~105s each time). Since authoring
  ~105s exceeds the 90s Kane timeout inside a 120s hook, **any uncached member in Tier 1 will
  time out**, silently OWED every turn while burning credits. Therefore:
  - Tier 1 selects **only members with a valid cached execution**. Uncached ones are skipped.
  - A prosecution that failed in Tier 2 blocks the **next** Stop by reading its **recorded
    verdict from the ledger** — no Kane re-run. Blocking becomes near-instant instead of 63s.
  - The failure is cleared when a later Tier 2 run of that test passes (and therefore caches).
  This is what D-10's "turn N's claim gates turn N+1" actually requires. It also makes the
  denial moment faster on camera.
- **D-12 — RECORDED FAILURES ARE SCOPED TO THEIR SESSION.** Observed live: a recorded failure
  from session `t-prosecution-1` blocked the unrelated Director session `74dc74c1…`, which
  stated no claim and touched nothing related to the failing test. `gate.mjs:203` calls
  `openRecordedFailures()` with no session filter and blocks on the newest open failure from
  anywhere in the repo. It also wrote a spurious `source: "recorded"` entry into the victim
  session's history. Fix: filter by `session_id`. Turn N gates turn N+1 **of the same session**.
- **D-13 — TIER 1 NEVER WAITS FOR A FAILURE; TIER 2 FINDS REGRESSIONS.**
  Measured: a cached test that now fails takes **185s** to replay, versus **53s** when it passes.
  Tier 1 therefore cannot detect a regression — it would blow the hook budget and fail open,
  producing *no block at all* precisely when a block is warranted.
  - Tier-1 Kane timeout set to **75s**: comfortably above the 53s passing case, far below 185s.
    A regression makes Tier 1 abort quickly and fail open, which is now the intended behaviour.
  - `prosecute.mjs` runs a **regression pass** first and unconditionally (detached, 400s budget),
    replaying every cached previously-passing member and recording failures.
  - The prosecutor is now spawned whenever **code** changed, not only when a claim was extracted —
    otherwise a silent regression is never caught.
  - Net effect, verified: break → Tier 2 records in 221s → **next Stop blocks in 331ms** with real
    Kane text. The denial is near-instant on camera instead of a 3-minute stall.
- **D-08** All Windows path comparisons normalize to **forward slashes, lowercased**, on both
  sides. Backslash escaping is corrupted silently by shells, heredocs, and JSON round-trips.
- **D-09 (tooling)** **Do not use Bash heredocs to write files containing backslashes** on this
  machine — `\\` collapses to `\`, and unknown JS escapes (`\U`, `\H`) silently vanish, producing
  wrong strings rather than errors. Use the Write/Edit tools for such files. This burned one
  debugging cycle; it is a trap, not a preference.

## Assumptions

- **A-01** Cached replay is materially faster and cheaper than authoring.
  *Impact if wrong:* synchronous gate is impossible; switch to async design (D-05).
- **A-02** Claude Code reloads project hook settings for a newly started session in that directory.
  *Impact if wrong:* probe must move to `~/.claude/settings.json`.

## Verification needed

- Replay wall-clock + credit delta (Task #1)
- Stop hook blocks; stderr reaches model; real payload field names (Task #1)

---

## Task log

| # | Task | Status | Blocks |
|---|---|---|---|
| 1 | Verification spike | **ACCEPTED w/ failure** — git ✓, replay ✓, Stop hook ✗ (AC-4/5 failed) | — |
| 2 | Kane adapter + scaffold | **ACCEPTED w/ corrections** — AC-1 `ok:true`; defects → Task #4 | — |
| 3 | **Prove or kill the Stop hook** | **ISSUED — highest priority** | all gate work |
| 4 | Adapter corrections: `steps[]`, `failureDetail`, `sessionDir`, `testrun --agent` | **ISSUED** | the feedback loop |
| 4 | Adapter corrections | **ACCEPTED** — `failureDetail` real and actionable; R9 CLOSED; R10 resolved (`testrun` rejects `--agent`) | — |
| 5 | Gate skeleton | **ACCEPTED w/ correction** — fail-open ✓, OWED release ✓, no-edit skip ✓, single registration site ✓. Bug → Task #6 Part A | — |
| 6 | Release-condition fix + claim extraction | **ACCEPTED** — R12 closed; claims regex-only, 2.76ms, Director msg → `[]` | — |
| 7 | **Prosecutor** (two-tier, D-10) | **ACCEPTED w/ correction** — Tier 2 works, spawn 16ms, real claim-derived tests. AC-3 failed → D-11 | R13 closed |
| 8 | Tier-1 cache rule (D-11) + D2 dashboard | **ACCEPTED w/ corrections** — block 105s→**271ms**, 19cr→**0**; dashboard **LIVE**. 2 render defects → Task #9A | Ships no longer zero |
| 9 | Dashboard fixes · subject app · submission readiness — `TASK-9.md` | **ISSUED** | submission |

**Live URL:** https://techkeyy.github.io/critique/ · **Repo:** github.com/Techkeyy/critique (public, 8 commits, all 19 Aug+)
| 9 | Subject app + demo video | HELD | submission |

### Open defects

- **R12 (fixed in Task #6A)** Gate release was gated on `stop_hook_active`; a Stop with that flag
  false while `attempts >= 3` re-blocks forever, since the counter only resets on a pass.
- **R13** The gate currently runs **one canned contraband test unrelated to what the agent
  changed**. The hackathon brief names this exact failure mode: *"one trivial flow tacked on at
  the end to qualify"* does not count. Task #7 is therefore **not optional** — it is what makes
  the Verified dimension real.
- **R14** `CRITIQUE_KANE_STUB` mock paths ship inside production `gate.mjs`. Env-gated and
  labelled, acceptable for now, but move behind one test-mode flag before submission — judges
  read source.

Full task text: `BUILDER-BRIEF.md` — self-contained, hand this to a cold Builder.
