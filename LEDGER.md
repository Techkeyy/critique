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
| Stop-hook probe (`.claude/hooks/gate-probe.mjs` + `settings.json`) | **NEEDS VERIFICATION** | written, **never executed** |
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
| R1 | **Replay latency unknown.** If replay is minutes, the synchronous gate is dead. | **CRITICAL** | OPEN — Task #1 |
| R2 | **Stop-hook blocking unproven in practice.** Whole product rests on it. | **CRITICAL** | OPEN — Task #1 |
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
- **D-05 (pending Task #1)** Gate is synchronous if replay ≤45s, otherwise asynchronous.

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
| 1 | Verification spike: git init, Stop-hook proof, replay benchmark | **ISSUED** | D-05, all gate work |
| 2 | Kane adapter (`src/kane.mjs`, `src/ndjson.mjs`) + repo scaffold | **ISSUED** | nothing — architecture-neutral |
| 3 | Gate skeleton (sync or async — decided by Task #1 numbers) | HELD | Task #1 |

Full task text: `BUILDER-BRIEF.md` — self-contained, hand this to a cold Builder.
