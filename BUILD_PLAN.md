# Critique — Full Build Plan

**Kane CLI Online Hackathon · TestMu AI · 19–21 August 2026**
Deadline: **21 August, 11:59 PM IST** (11:29 AM PT). Submissions lock — no pushes after.
Winners announced **28 August** on the winner stream (the Luma page said 25 Aug; the official
participant guide says 28 — trust the guide).

⚠️ **Eligibility trap:** the guide says sign up at testmuai.com **"with the same email you
registered for the hackathon with."** Confirm the TestMu account email matches the Luma
registration email exactly. A mismatch is an unscoreable entry.

---

## 0. The one-liner

> **Your AI coding agent is an intern who marks their own homework. Critique takes the red pen.**

Critique is a Claude Code plugin that intercepts the agent at the moment it claims to be
finished, hands that claim to a hostile prosecutor, and refuses to let the agent stop until
Kane CLI has tried to prove it wrong in a real browser. Every prosecution seals into a
cached test that replays free forever — so the repo accretes a regression suite nobody wrote.

**Positioning sentence (the moat):** Everyone at this hackathon will build save → Kane → fix.
We are the only ones who prosecute the agent *at the moment it claims done*, and the only ones
where the repo walks away with a test suite it never asked for.

---

## 1. Why this idea (research trail, compressed)

Derived via the `idea-research` skill. Keep this section — it becomes the submission paragraph.

**Phase 0 — what Kane already ships (do not rebuild):** the entire Lane 4 assurance pipeline
(`context ingest/extract/review`, `design tests`, `cover`, `maintain reconcile`), evidence packs,
`_test.md` with caching and `@import`, CI recipes, mobile targets, variables/secrets, code export,
and an official agent skill. **Not built, and therefore the whitespace:** no watch mode, no hook
system, no MCP server.

**The trap:** `kane-watch`, "an MCP server with a `verify_with_kane` tool", and `gh kane` are all
named *in the brief*. They will be the three most duplicated submissions of the weekend. The
mechanic is never the moat.

**Phase 1/2 — the pain is real and priced:** Sonar's 2026 survey — ~84% AI-coding adoption,
~3% who highly trust the output, ~half actively distrusting. 96% won't ship AI code without manual
intervention. Sonar AI Code Assurance, CodeRabbit, Qodo and Greptile all *charge money* for
"verify what the AI wrote" — and **every one of them is static**. None open a browser. That is the gap.

**Phase 2 — adjacent-winner patterns (mapped from five comparable events):**

| Pattern | Evidence | How Critique uses it |
|---|---|---|
| **A. Meta layer beats the app** | Observee won 1st at the World's Biggest MCP Hackathon (235 builders, YC) — observability *for* agents. Solo.io 2026 winners: governance scoring + OTel agent tracing. | Critique watches agents; it isn't one. |
| **B. Adversarial spectacle + by-product asset** | **Browser Brawl** won overall at Browser Use / YC Web Agents Hackathon (78 projects, $180k) — two browser agents fight on a live site, *and every run emits traces usable for eval*. | Prosecutor vs builder on screen; every run emits a `_test.md`. |
| **C. A gate that withholds permission is a product** | **Maieutic** placed 3rd at Anthropic's Built with Opus 4.7 (500 of 20,000+) — students must justify their work *before being allowed to write code*. | Denial-of-exit is the core mechanic. |
| **D. ⚠️ Negative signal** | *TestBrain* ("intelligent testing automation") and *Lumen* (browser test framework) took **mid-tier $1,000 prizes**, not grand prizes, at the Global Agent Hackathon. Browser Use *advertised* "QA test your website generations" as a theme — and it did not win. | **A better QA tool places; it does not win.** This is why Critique is adversarial and emits an asset, not just a verifier. |

**Phase 5 — adoption test:** the user changes nothing about their day. Same agent, same editor.
The gate appears exactly where the lie used to be.

---

## 2. Load-bearing bets — STATUS

Rule: never build past an unverified assumption. All four were checked against real docs
before this plan was written.

| # | Bet | Status | Evidence |
|---|---|---|---|
| 1 | Claude Code `Stop` hook can block and feed text back to the model | ✅ **VERIFIED** | Stop fires when Claude finishes responding, **can block**, and receives `last_assistant_message` + `transcript_path`. Block via **exit code 2 with the reason on stderr** (`hookSpecificOutput.decision: "deny"` also documented). |
| 2 | Kane replay is free, so gating is affordable | ✅ **VERIFIED** | "the first run authors each step and every later run replays from a cache with **no model cost**". Only fresh authoring spends credits. |
| 3 | Kane can generate falsification cases from a one-line claim | ✅ **VERIFIED** | `kane-cli generate "<text>" --files <paths> --save` produces **Positive / Negative / Edge** cases as `_test.md` under `.testmuai/tests/<suite>/<scenario>/<case>_test.md`. `--files` accepts up to 10 local context files — **feed it the diff**. |
| 4 | The suite can accrete and re-run cheaply | ✅ **VERIFIED** | `kane-cli testrun run --tags smoke --parallel 4`; `testmd list`, `testmd export`, `testmd sync`. |

### 2.1 Verified against the installed CLI (v0.8.4) — corrections to the docs

Installed and probed on 19 Aug. The docs and the shipped binary disagree in places. **Trust this table.**

- ✅ `generate`, `balance`, `cover`, `maintain` **all exist** but are **hidden from `--help`**.
  Don't conclude a command is missing because the top-level help omits it.
- ✅ `generate --files <paths>` — comma-separated, **≤10 files, ≤50MB each, new/refine only**.
  This is the diff-feeding mechanism. Confirmed present.
- ✅ Also real: `--memory`, `--scenario-limit <1-20>`, `--per-scenario-limit <1-20>`,
  `--refine --req <id>`, `--save --out <dir>`.
- 🔥 **`testrun run --bug-detection off|stop|continue`** — "detect product bugs while authoring
  member steps". **Default is `off` in config.** Turn it on. This is free Verified-dimension score
  and it was in neither the docs page nor the brief.
- 🔥 **`kane-cli install skill`** is the official installer (v0.0.17, installs to 3 targets) —
  use this, **not** `npx @testmuai/kane-cli-skill`. Already installed on this machine.
- Config defaults worth changing: `bug_detection: "off"`, `final_validation: false`,
  `assertion_mode: "dom"`, `model: "v16-alpha"`, `mode: "testing"`.
- `--max-steps` default is **50**, not 30 as the docs page states.
- `testrun run` extras: `--tags`, `--match <regex>`, `--parallel <n>`, `--on-failure fail-fast`,
  `--dry-run`, `--retry` (shrinking replay window), `--retry-count`, `--from-context <ids>`.
- `testmd export <path> --language py|js` — the Playwright export.
- `kane-cli run` **rejects `.md` paths**. Use `testmd run` for those.
- TUI sessions auto-save to `<cwd>/.testmuai/tests/<name>_test.md`.
- Free practice target before your app exists: `https://kaneai-playground.lambdatest.io`
  (it's the configured `default_url`).

### 2.2 Still blocked — needs your login

`kane-cli config show` reports `auth: "not configured"`. These three need an authenticated
account and are the first thing to do after `kane-cli login`:

- [ ] **Credit cost** of one `generate` and one fresh `run` — `kane-cli balance` before/after.
- [ ] **Wall-clock latency** of a headless `run`. The gate must feel like seconds.
      Reference point from the official guide: `kane-cli run "verify checkout flow on staging"`
      → *"12 tests generated, 12 passed (41s)"*. If ~40s is typical for a whole suite, the gate
      is comfortably viable — but measure it on your own machine before designing around it.
- [ ] **Does `--save` drop non-Functional cases?** The docs say it writes *only Functional*
      category to disk. If Security cases are dropped, hand-author the contraband sweep as
      `_test.md` instead. Decide before Day 2.

---

## 3. ⚠️ The requirement that is easiest to fail

The brief says: **"Build a working web app with an AI coding agent."** The rubric's first
dimension is **Ships: a working app with a real flow that runs end-to-end. Not slides.**

A plugin alone does **not** satisfy this. Three deliverables, not one:

| # | Deliverable | Satisfies | Notes |
|---|---|---|---|
| **D1** | **Critique** — the plugin + CLI | Verified, Closed loop, Craft | The centrepiece. |
| **D2** | **Critique Dashboard** — a real deployed web app showing the live ledger, claim timeline, verdicts, embedded evidence video | **Ships** | Must have a live URL and a real primary flow. Kane verifies *this* app too — the recursion is a good story and lands squarely in Lane 1. |
| **D3** | **The subject app** — a tiny throwaway app built live on camera under Critique's supervision | the demo | A prop. Keep it small. Its job is to let the agent introduce contraband *organically*. |

Do not let D2 slip. It is 25% of the score on its own.

---

## 4. Architecture

```
critique/
├─ .claude/
│  ├─ settings.json            # hook registration
│  └─ hooks/
│     ├─ observe.mjs           # PostToolUse: Edit|Write  → record touched files
│     └─ gate.mjs              # Stop: the prosecutor + denial-of-exit
├─ src/
│  ├─ claims.mjs               # last_assistant_message → discrete claims
│  ├─ prosecute.mjs            # claim + diff → kane-cli generate → run
│  ├─ contraband.mjs           # the cached runtime-forensics sweep
│  ├─ ndjson.mjs               # parse Kane's stream, pull run_end
│  └─ ledger.mjs               # claims made / proven / falsified / owed
├─ .critique/
│  ├─ sessions/<id>/           # touched.json, attempts.json, diff.txt
│  ├─ suite/                   # accreted _test.md — the exhaust
│  └─ ledger.json
├─ dashboard/                  # D2 — the deployed web app
├─ RECEIPTS.md                 # human-readable, committed
└─ README.md
```

### 4.1 The two hooks

**`PostToolUse` — matcher `Edit|Write`** (cheap, no Kane, never blocks)
Appends changed file paths and a running diff to `.critique/sessions/<session_id>/`.
`PostToolUse` cannot block, which is correct — observation only.

**`Stop` — the gate.** Fires when Claude finishes responding. Receives on stdin:
`session_id`, `transcript_path`, `cwd`, `last_assistant_message`, `permission_mode`.

```
1. LOOP GUARD (do this first, it is not optional)
   read .critique/sessions/<id>/attempts.json
   if attempts >= 3 → exit 0, write receipt marked OWED ("gave up after 3")
   The docs list no stop_hook_active field — you own the guard. Without it you
   have an infinite agent loop live on camera.

2. SCOPE CHECK
   if touched.json is empty → exit 0
   Never gate a conversation the agent didn't write code in.

3. EXTRACT CLAIMS from last_assistant_message
   v1: split on sentence/bullet boundaries, keep lines with a past-tense action verb
       (added / fixed / implemented / wired / created / now works).
   Do not over-engineer. 3 claims max per turn.

4. PROSECUTE — in parallel
   a) CLAIM PROSECUTION (spends credits)
      kane-cli generate "<claim>" --files .critique/sessions/<id>/diff.txt \
        --save --out .critique/suite --scenario-limit 2 --per-scenario-limit 3 --memory
      kane-cli testrun run .critique/suite/<new> --agent --headless --timeout 180
      Note --memory: reuses existing cases, cuts duplicates and credit burn.
   b) CONTRABAND SWEEP (free after first authoring)
      kane-cli testrun run --tags contraband --agent --headless

5. PARSE NDJSON → the run_end event only.
   run_end is the only event with a schema stable across versions. Build on nothing else.
   Fields: status, summary, final_state, session_dir, test_url.
   Exit codes: 0 passed · 1 failed · 2 error · 3 timeout.

6. VERDICT
   all passed → append to ledger + RECEIPTS.md, promote _test.md into .critique/suite, exit 0
   any failed → increment attempts,
                write the verdict to STDERR,
                exit 2
```

**The single most important mechanical detail:** for `Stop`, plain stdout goes to the debug log
only. **stderr on exit 2 is what reaches the model.** Get this wrong and the agent is blocked
but blind — it will retry the identical code forever. Write the failing claim, the Kane summary,
and the `test_url` to stderr.

### 4.2 The contraband sweep — where the real bugs come from

This is Kane's sharpest edge and almost nobody will read the cookbook page it lives on. These
are runtime facts that **no static tool — not Sonar, not CodeRabbit — can see**, and AI agents
produce them constantly. Author once as tagged `_test.md`, then replay free on every gate:

| Check | Why agents trip it |
|---|---|
| Console errors that only fire on click | Agent tested render, never interaction |
| API failure behind a green page | Page looks perfect, the fetch 500s |
| Calls to `localhost` / staging / debug endpoints | Agent hardcoded its dev URL |
| Secrets in `localStorage` | Agent's default auth pattern |
| Cookies missing `Secure` / `HttpOnly` | Agent never sets flags |

This is what makes "Kane caught something meaningful" effortless and *honest*. You will not need
to stage a bug. The agent will hand you one.

### 4.3 The ledger — the by-product asset

`RECEIPTS.md`, committed, human-readable:

```markdown
## Session 4a2f · 2026-08-20 14:31
**Claimed:** "Added the dark mode toggle and fixed the login redirect."

| Claim | Verdict | Evidence |
|---|---|---|
| dark mode toggle works | ✅ PROVEN (attempt 2) | [run](test_url) · 0:14 |
| login redirect fixed | ✅ PROVEN | [run](test_url) · 0:09 |
| contraband sweep | ❌ FALSIFIED → fixed | XHR to localhost:4000 in prod build |

**Still owed:** toggle unverified on mobile viewport.
Suite grew by 3 tests. Total: 19 tests, 0 written by a human.
```

That last line is the pitch. Say it out loud in the video.

---

## 5. Schedule

Building opens 19 Aug 07:30 GMT+1. Deadline 21 Aug 11:59 PM IST. Roughly three working days —
plan to be **feature-frozen by midday on the 21st** and spend the rest on the video.

### Day 0 — before you write code (~90 min)
- [ ] Sign up at testmuai.com/register → claim 10,000 credits (**eligibility requirement**, separate from Luma)
- [ ] `npm install -g @testmuai/kane-cli` → `kane-cli login` → `kane-cli whoami` → `kane-cli balance`
- [ ] Run one example from the docs end to end. Ten minutes now saves an hour on day one.
- [ ] `npx @testmuai/kane-cli-skill` — install the official agent skill so Claude Code knows Kane's rules
- [ ] **Resolve the three residual unknowns in §2.** Record credits-per-generate and seconds-per-run.
- [ ] `git init` — **legal only on or after 19 Aug; they check commit history**
- [ ] Join the Slack. Ask about credit costs early, not at hour 60.

### Day 1 — make the gate real
- **Morning:** hardest thing first. A `Stop` hook that unconditionally exits 2 with a fixed stderr
  message. Confirm with your own eyes that Claude Code refuses to stop, shows the reason, and
  keeps working. **Nothing else matters until this works.** If it fails → fallback in §7.
- **Midday:** loop guard + scope check. Prove you can escape after 3 attempts.
- **Afternoon:** `PostToolUse` diff capture. NDJSON parser against a real `run_end`.
- **Evening:** wire one hardcoded `kane-cli run` into the gate. **Milestone: the loop closes once,
  on anything.** Commit. Record a throwaway screen capture as insurance — you now have something
  to submit no matter what happens next.

### Day 2 — the substance (protect this day)
- **Morning:** claim extraction from `last_assistant_message`. Keep it dumb and robust.
- **Midday:** the prosecutor — `generate --files <diff> --save` → `testrun run`. Verify Negative
  and Edge cases actually appear.
- **Afternoon:** author the contraband sweep as tagged `_test.md`. Confirm second run is free.
- **Evening:** ledger + `RECEIPTS.md`. Suite promotion. **Milestone: full loop, unassisted.**

### Day 3 — ship and film
- **Morning:** D2 dashboard. Deploy it. Get a live URL. Point Kane at it and let it verify itself.
- **Midday:** **FEATURE FREEZE.** README with setup steps. Judge credentials if anything is gated.
- **Afternoon:** film. Expect 4–6 takes.
- **Evening:** submit with ≥3 hours of margin. Submissions lock hard.

---

## 6. The 3-minute video

Judges stop watching at 3:00. Lead with the interesting part — the brief says so explicitly.

| Time | Beat |
|---|---|
| **0:00–0:10** | No preamble. Agent prints "Done — I've added the dark mode toggle." Screen flashes **DENIED**. |
| **0:10–0:40** | Split screen: prosecutor working the real browser. It finds the counterexample the builder never considered. |
| **0:40–1:10** | Agent reads the failure, patches, resubmits. Verified green. This is the Closed-loop score, on camera. |
| **1:10–1:40** | Contraband sweep catches the `localhost:4000` call the agent left behind. Say plainly: *no static tool can see this.* |
| **1:40–2:10** | `RECEIPTS.md` writes itself. Then the line: **"19 tests. Zero written by a human. They're the exhaust of the agent's own work."** |
| **2:10–2:40** | D2 dashboard, live URL, ledger over time. |
| **2:40–3:00** | One sentence on what it is and who it's for. Stop talking. |

Rules: **Unlisted, not Private.** Test the link in an incognito window before submitting.

---

## 7. Risk register

| Risk | Likelihood | Fallback |
|---|---|---|
| Stop-hook blocking behaves differently in practice | Low (verified in docs) | Move the gate to a **`pre-commit` hook** that rejects the commit with the Kane verdict attached. Still a hard gate, marginally less magical, idea survives intact. |
| Kane gate too slow to feel good | Medium | Contraband sweep is cached/free; run claim prosecution async and block only on the *next* Stop. Cap with `--timeout 120 --max-steps 20`. |
| Credits burn out | Medium | `--memory` to dedupe, bound with `--scenario-limit`/`--per-scenario-limit`, cache aggressively. **DM Slack the moment you're low — not in the last hour.** |
| `generate --save` drops the non-Functional checks | Medium | Hand-author the contraband sweep as `_test.md` directly. Half a day's insurance, worth taking on Day 2. |
| Infinite loop live on camera | **High if guard is skipped** | The §4.1 loop guard. Build it Day 1, not Day 3. |
| Judge can't run it | Low | Live URL + recorded run + credentials in the README. The rules require a fallback for third-party dependencies. |

---

## 8. Submission package (all through one form)

`https://www.surveymonkey.com/r/kane-cli-hackathon-submission`

- [ ] **GitHub repo** — public or judge-invited, initialized **on or after 19 Aug**, README with setup steps
- [ ] **3-min video** — YouTube **Unlisted** (not Private), or a Drive link set to
      **"anyone with the link can view"**. Test it in an incognito window before submitting.
- [ ] **Paragraph** — what you built, who it's for (developers who code with AI agents),
      which agent (Claude Code), what Kane does in the flow (the prosecutor + the accreting suite)
- [ ] **Live URL or one runnable command** — judges must see it working in under 30 seconds
- [ ] Credentials for anything gated
- [ ] Confirm the testmuai.com signup is live on the submitting account

---

## 9. Self-score against the rubric

Four dimensions, equally weighted. Ties break on **Verified**, then **Closed loop**.

| Dimension | How Critique scores |
|---|---|
| **Ships** | D2 dashboard, deployed, live URL, real flow. *The failure mode is shipping only the plugin.* |
| **Verified** | Contraband sweep finds genuine agent-generated bugs, not staged ones. Strongest dimension — and it's the first tiebreak. |
| **Closed loop** | Maximum available. Not "a hook fired Kane" but **"the agent was denied permission to finish."** Second tiebreak. |
| **Craft** | Denial-of-exit as a primitive, free cached replays by design, honest proven-vs-owed ledger, suite as exhaust. Answers "would a developer install this tonight?" — yes. |

---

## 10. Rules that will disqualify you if ignored

- Repo initialized **on or after 19 August**. They check commit history. No pre-written code.
- **testmuai.com signup required, using the same email as your Luma registration** —
  Luma registration alone does not make you eligible.
- Kane CLI must actually have been run.
- One submission per team. Teams up to four; one captain receives the prize.
- Submissions lock at the deadline. No post-deadline fixes.
- Ship a fallback (recorded run or backup deploy) for anything depending on a third-party service.
