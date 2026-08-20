# TASK #9 — Dashboard fixes · Subject app · Demo readiness

Read `LEDGER.md` first. Ground rules and reporting format: `BUILDER-BRIEF.md`.

**Task #8 Part A ACCEPTED — excellent.** 105s → **271ms**, 19 credits → **0**. Requiring
`status === "passed"` rather than `valid === true` was the right call and you found it yourself;
`valid: true` on failed authorings would have silently defeated D-11.

**Part B ACCEPTED WITH CORRECTIONS.** The dashboard is live, renders real data, and the headline
lands. Two defects found in browser verification — Part A below.

**⏱ FEATURE FREEZE: midday 21 Aug.** After that nothing is fixed, only cut.

---

## PART 0 — Session scoping bug (D-12) · DO THIS FIRST · ≤30 min

**Observed live, in production, against the Director's own session.**

`gate.mjs:203` calls `openRecordedFailures()` with **no session filter**, then blocks on the
newest open failure found anywhere in the repo. A failure produced by the `t-prosecution-1` test
session blocked session `74dc74c1…`, which stated no claim and touched nothing related to it.
The stderr even read `Claim: (none stated — verifying baseline)` while quoting a dark-mode
failure from a different session. It then wrote a spurious `source: "recorded"` entry into the
victim session's history, corrupting that session's record.

Your Task #7 assumption — *"Recorded failures are repo-wide, not per session_id"* — is the cause.
You flagged it honestly, which is why it was cheap to find. It is wrong behaviour.

**Fix:** filter open recorded failures by `session_id`. D-10's contract is *turn N gates turn
N+1* **within the same session**. A failure must never block a session that did not produce it.

**Also:** never write a `recorded` entry attributed to a session that merely observed the
failure. Attribute it to the session that produced it.

**Acceptance:** a session with an open recorded failure from a *different* session exits 0 and
runs the normal Tier-1 path. A session with its *own* open recorded failure still blocks in
<2s. `guard-test.mjs` / `gate-test.mjs` pass, with a new case covering cross-session isolation.

**Note:** the Director has manually closed the stale open failure to unblock work. Do not rely
on that state — `critique:clear` (Part C) is still required.

---

## PART A — Dashboard defects (≤60 min)

Verified in a real browser at `https://techkeyy.github.io/critique/`. The data is correct; the
rendering is not.

1. **Failed sessions are not clickable.** The session list emits an `<a>` only for
   `74dc74c1…` (passed). `t-prosecution-1` — the failed prosecution that demonstrates the
   entire product — has no link. The route `#/s/t-prosecution-1` works when typed manually.
   Every session row must be a link.

2. **The detail page never shows `failureDetail` or the steps.** It renders claim, status and
   duration, then stops. The data is present and correct:
   `failureDetail` = *"Step 1 failed: The test looked at the wrong control on the page…"*,
   `steps` = 4 entries.

   **This is the single most important text in the product.** The whole pitch is *Kane tells the
   agent exactly what is wrong*. A judge who clicks through currently cannot see what Kane said.
   Render `failureDetail` verbatim in a readable block, plus the step timeline with per-step
   status.

**Acceptance:** from the landing page, a judge can reach the dark-mode failure text in **two
clicks**, with no manual URL editing. Re-verify in a real browser, not with a text fetcher.

---

## PART B — Subject app (D3), deployed

**Why:** the prosecution currently fails because the Kane playground has no dark-mode toggle. To
demonstrate the loop honestly we need an app that genuinely has the feature, so a **true claim
passes and caches at 0 credits**, and a **broken build fails with real detail**.

**Requirements:**

1. A small real web app — vanilla HTML/CSS/JS, no framework — served from this same repo under
   `docs/demo/` so it inherits the existing GitHub Pages URL. **No local server, no new hosting.**
2. It must have one genuine primary flow worth verifying. A dark-mode toggle plus one form or
   counter that persists to `localStorage` is enough. Real behaviour, no placeholders.
3. Deliberately include **one piece of real contraband** the sweep can catch — e.g. a `fetch()`
   to `http://localhost:4000/api/metrics` left behind, exactly the artifact an agent leaves.
   Leave it genuinely present; do not fake the detection.
4. Author two prosecutions against the deployed URL and confirm they **pass and cache**, so a
   subsequent gate replay is 0 credits.

**DO NOT:** do not point the demo at `localhost` for the video — judges must be able to open the
same URL. Do not stage a fake failure; use the real contraband.

---

## PART C — Submission readiness

1. **README.md** must contain: what Critique is, install steps a stranger can follow, the live
   URL, how to run `critique:verify`, and the known limitations (`testUrl` unavailable on cached
   replays; recorded failures are repo-wide).
2. **Remove `CRITIQUE_KANE_STUB` from production `gate.mjs`** (R14). Move stubs behind a single
   test-mode module that the gate imports only under test. Judges read source, and mock branches
   inside the gate read as fake implementation even though they are honestly labelled.
3. Add `critique:clear` — resets recorded failures and session state. **You will need this
   before filming**; a stale repo-wide recorded failure will block the demo session unexpectedly.
4. Write `DEMO-SCRIPT.md`: the exact sequence to reproduce the full loop on camera, with the
   commands, in order, and what should appear at each beat.

## ACCEPTANCE CRITERIA

1. Two clicks from landing page to the real failure text, verified in a browser.
2. Subject app live under the existing Pages URL, primary flow works.
3. A true claim against it passes and caches; re-running costs 0 credits (show `balance`).
4. The contraband sweep catches the real `localhost` call against the subject app.
5. No `CRITIQUE_KANE_STUB` reachable in `gate.mjs`. `guard-test.mjs` / `gate-test.mjs` still pass.
6. `critique:clear` works. `DEMO-SCRIPT.md` exists and you have followed it once end to end.

## REPORT BACK

The two-click path. Subject app URL. Balance before/after proving the 0-credit replay. The real
contraband failure text. Confirmation the demo script was rehearsed, and where it was fragile.

---

## Note on the video

**The 3-minute video is the user's job, not yours** — it needs a screen recording. Your job is to
make it *reproducible*: `DEMO-SCRIPT.md` must be good enough that someone can hit record, follow
it, and get the whole loop on camera without improvising.

Beat order for the recording (put the best part first — judges stop watching at 3:00):
agent claims done → **DENIED** → real failure text → agent patches → green → suite grew by N,
written by humans: 0 → dashboard live URL.
