# TASK #7 — The prosecutor (two-tier, per D-10)

Read `LEDGER.md` first. Ground rules and reporting format: `BUILDER-BRIEF.md`.

**Task #6 ACCEPTED.** Part A verified. Claim extraction is correct where it counts: the real
Director message returns `[]`. That was the fixture that mattered — a false positive there would
have had the gate prosecuting prose.

**⏱ HARD TIMEBOX: 6 hours.** If Tier 2 is not working end-to-end by then, stop and report. The
Director will cut it and move you to the dashboard. A shipped app with an honest Tier-1 gate beats
a half-built prosecutor with nothing to demo. Do not let this task eat the deadline.

---

## Why this task exists

The gate currently runs **one canned test unrelated to whatever the agent changed**. The
hackathon brief names this exact failure: *"one trivial flow tacked on at the end to qualify"*
does not count toward the Verified score. Task #7 is what makes verification real.

## The constraint that dictates the design (D-10)

Measured, not assumed:

| Thing | Measured |
|---|---|
| Stop hook timeout | **120s** (configured) |
| Tier-1 gate today | **63s** in a real hook |
| Two sequential Kane calls | ~126s → **exceeds timeout** |
| Authoring a new test | **373s** → 3× the entire timeout |

**Authoring cannot happen inside the Stop hook.** Any design that calls `kane-cli generate`
synchronously in the gate will time out on every run. Do not attempt it.

- **Tier 1 — synchronous, blocking.** Cached-suite replay only. This denies exit. Must stay <90s.
- **Tier 2 — asynchronous, detached.** Authors new prosecutions *after* the turn. They gate
  **subsequent** turns. Turn N's claim gates turn N+1.

---

## REQUIRED CHANGES

### 1. Diff capture — `observe.mjs`

`touched.json` records paths. The prosecutor needs content. The repo is a git repo, so use it:
write `.critique/sessions/<id>/diff.txt` from `git diff HEAD` (fall back to `git diff` if HEAD
is unborn). Cap at **200KB** — `generate --files` accepts ≤50MB but a huge diff wastes credits
and dilutes the prompt. If git fails for any reason, write an empty diff and continue. **Never
let diff capture break a turn.**

### 2. Prosecutor — new `src/prosecute.mjs`

Runs as a **detached background process**, never inside the hook's lifetime.

Entry: `node src/prosecute.mjs <sessionId>`. It:

1. Reads the session's claims (written by the gate) and `diff.txt`.
2. For the **single highest-confidence claim only** — not all three — runs:
   ```
   kane-cli generate "<claim text>" --files .critique/sessions/<id>/diff.txt \
     --save --out .testmuai/tests/prosecutions --name <slug> \
     --scenario-limit 1 --per-scenario-limit 2 --memory
   ```
3. Ensures every generated `_test.md` carries `tags: [critique-gate]` in its frontmatter — add it
   if `generate` does not. **The `tags` and `url` keys are valid; `name` is rejected** (ledger).
4. Runs the newly generated tests **once** to author and cache them, so future gates replay fast
   and free.
5. Appends the outcome to `.critique/ledger.json` with `phase: "prosecution"`.

### 3. Gate wiring — `gate.mjs`

- After the Tier-1 verdict is written and **immediately before `process.exit()`**, spawn the
  prosecutor detached: `spawn(..., { detached: true, stdio: 'ignore' }).unref()`. The hook must
  return without waiting. Verify the hook's own wall time does not increase.
- Skip spawning when: no claims extracted, the diff is empty, or a prosecution for this session
  is already running (use a lockfile).
- **Tier 1 now runs the suite, not one file:** `testrun run --tags critique-gate`.

### 4. ⚠️ Bound the gate — this is mandatory, not an optimization

As the suite accretes, Tier 1's runtime grows and **will eventually exceed the 120s hook
timeout**, at which point every turn silently goes OWED and the product looks broken.

- Select at most the **3 most recently added** members for the blocking gate.
- Pass `--parallel 2`.
- Keep `CRITIQUE_KANE_TIMEOUT` at 90s, under the 120s hook timeout.
- Add an npm script `critique:verify` that runs the **entire** suite unbounded, for use outside
  the gate. The bounded subset is the gate; the full suite is the artifact.

Log the Tier-1 wall time to the ledger on every run so we can watch this trend.

---

## DO NOT

- Do not call `kane-cli generate` synchronously in the gate. It will time out. This is measured.
- Do not pass `--agent` to `testrun run` — the flag does not exist (R10). NDJSON appears when
  stdout is piped.
- Do not let a failed or slow prosecution affect the current turn. Tier 2 is fire-and-forget.
- Do not remove the fail-open path, the OWED release, or the cwd guard.
- Do not author tests during unit testing. Replay is free; authoring is not.
- Do not exceed the timebox to make this elegant.

## ACCEPTANCE CRITERIA

1. A turn that edits a file and states a claim produces, **after the turn ends**, at least one new
   `_test.md` under `.testmuai/tests/prosecutions/` whose content is recognizably derived from the
   claim — not a generic template.
2. Gate wall time on that turn is **unchanged** (~63s). Prove it from `.critique/ledger.json`.
3. The next gated turn runs the new test as part of Tier 1, replaying at **0 credits**.
4. With 5+ tests in the suite, Tier 1 still completes in <90s (bounding works).
5. `guard-test.mjs` and `gate-test.mjs` still pass.
6. Credits spent on this task reported from `kane-cli balance` before/after.

## REPORT BACK

- The generated `_test.md`, verbatim, and the claim it came from.
- Tier-1 wall time before and after the suite grew.
- Credit cost of one prosecution.
- Whether `generate --save` preserved your tags, or you had to inject them (R7 — still open).
- Confirmation the detached spawn did not extend the hook's runtime.
