# TASK #6 — Release-condition fix + claim extraction

Read `LEDGER.md` first. Ground rules and reporting format: `BUILDER-BRIEF.md`.

**Tasks #4 and #5 are ACCEPTED.** `guard.mjs` deriving `PROJECT_ROOT` from its own module
location was better than what was specified. The `failureDetail` text is genuinely actionable —
that was the R9 risk and it is now closed. `testrun --agent` was resolved empirically rather
than guessed. Good work.

---

## PART A — Loop-safety bug (do this first, it is a correctness defect)

**In `.claude/hooks/gate.mjs`:**

```js
if (payload.stop_hook_active === true && attempts >= MAX_ATTEMPTS) {
```

The release is gated on `stop_hook_active`. If a Stop arrives with `stop_hook_active === false`
while `attempts` is already at the cap — which happens whenever the user interjects a new prompt
after a block, breaking the continuation chain — the escape never fires. The gate blocks again at
"attempt 4/3", and again at 5, and so on. The counter only resets on a pass, so a session that
never passes can never escape on its own.

**Fix:** release on `attempts >= MAX_ATTEMPTS` **regardless** of `stop_hook_active`.
Keep `stop_hook_active` as useful signal — log it in the receipt — but it must not be a
precondition for escape. A gate that cannot let go is worse than no gate; this is that failure
mode with an extra step.

**Also:** the `main().catch()` handler declares `const payload = {}` and never uses it. Remove it.

**Acceptance:** extend `.critique/gate-test.mjs` with a case that sets `attempts = 3` and sends
`stop_hook_active: false`. It must exit 0 with an OWED receipt, not exit 2.

---

## PART B — Claim extraction

**OBJECTIVE:** Turn the agent's closing message into discrete, verifiable claims.

**CONTEXT:** `claimLine()` currently takes the first non-heading line of
`last_assistant_message`. That is a placeholder. The captured payload in
`.critique/probe-log.json` shows what real messages look like: full markdown, headings, bullets,
bold runs, code spans, and a lot of prose that asserts nothing.

**This is the input to the prosecutor in Task #7**, so its output shape matters more than its
cleverness.

**REQUIRED CHANGES — new `src/claims.mjs`:**

Export `extractClaims(lastAssistantMessage)` → array of at most **3** claim objects:

```js
{ text: string,        // the claim, normalized to one sentence, markdown stripped
  verb: string,        // the past-tense action verb that matched
  confidence: 'high'|'low' }
```

Rules:
- Strip markdown before matching: headings, bold/italic, backticks, link syntax, list bullets.
- Keep only sentences containing a past-tense completion verb: `added`, `fixed`, `implemented`,
  `created`, `wired`, `updated`, `removed`, `renamed`, `enabled`, `disabled`, `now works`,
  `now shows`, `should now`.
- **Discard** sentences that are questions, that start with "If", "Consider", "You can", "Next",
  "I'll", "I will", or that describe intent rather than completion. Future tense is not a claim.
- Discard anything under 15 characters or over 280.
- Rank by verb strength and position (earlier = more likely the headline claim). Return top 3.
- Empty input, or no matches, returns `[]` — **this is a valid and common result, not an error.**

**Wire into `gate.mjs`:** replace `claimLine()`. If `extractClaims()` returns `[]`, the gate
**still runs** the contraband sweep (that check is claim-independent) but the stderr header reads
`Claim: (none stated — verifying baseline)`.

**IMPLEMENTATION REQUIREMENTS:**
- Pure functions, no I/O, no Kane, no dependencies. This module must be trivially testable.
- Deterministic. No LLM call. Regex and heuristics only — an LLM here would be slower, costlier,
  and non-reproducible for something a regex does adequately.

**DO NOT:**
- Do not call Kane from `claims.mjs`.
- Do not attempt semantic understanding. Over-fitting to clever parsing wastes time we need for
  the dashboard. Good enough beats correct here.
- Do not let extraction failure block a stop. Fail toward `[]`.

**ACCEPTANCE CRITERIA:**
1. `src/claims.selftest.mjs` covers at least 8 fixtures, including: the real
   `last_assistant_message` from `.critique/probe-log.json` (a long Director message that
   contains **no** genuine claims — must return `[]` or only low-confidence), a simple
   "Done — I added the dark mode toggle and fixed the login redirect." (must return 2 claims),
   a pure-question message, and an empty string.
2. Runs in under 50ms.
3. `gate.mjs` uses it and still passes `.critique/gate-test.mjs` and `.critique/guard-test.mjs`.

**REPORT BACK:** The `claims.mjs` output for all 8 fixtures, verbatim. Confirmation that Part A's
new test case passes. Nothing else.

---

## Roadmap after this (for your awareness — do not start these)

- **Task #7 — the prosecutor.** `generate --files <diff> --save` → run. This is what makes
  "Verified" real; right now the gate runs one canned test unrelated to what changed, which is
  precisely the "one trivial flow tacked on" failure the hackathon brief calls out by name.
- **Task #8 — D2 dashboard**, deployed, live URL. 25% of the score and currently zero.
