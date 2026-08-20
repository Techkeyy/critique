# TASK #8 — Tier-1 cache rule (Part A) + D2 Dashboard (Part B)

Read `LEDGER.md` first. Ground rules and reporting format: `BUILDER-BRIEF.md`.

**Task #7 ACCEPTED.** Two-tier works, detached spawn returns in 16ms, and the generated
`_test.md` is recognizably derived from the claim rather than a template. Three findings you
surfaced are now permanent ledger facts: `generate` rejects `--files` with `--save`, tags are not
preserved through `--save`, and a prosecution costs ~52 credits.

**Your AC-3 failure was the most valuable thing in that report.** Read Part A.

---

## PART A — Tier-1 cache rule (D-11) · ⏱ 90 MINUTES MAX

**The problem you found.** A test that fails during authoring never caches — every re-run is
`author_decisions: 1`, ~19 credits, ~105s. But authoring at ~105s exceeds the 90s Kane timeout
inside a 120s hook. So **any uncached member in Tier 1 times out.** In a live demo that means:
the agent makes a false claim, the gate tries to prove it, times out, goes OWED, and **fails to
block** — while quietly burning credits every turn. That is the demo dying on camera.

**The fix (D-11):**

1. **Tier 1 selects only members with a valid cached execution.** Read
   `output-<stem>/.internal/meta.json` and require an entry in `executions[]` with
   `valid: true`. Skip everything else — do not run it, do not time out on it.
2. **Failed prosecutions gate from the ledger, not from Kane.** When Tier 2 records a failure,
   the next Stop reads that recorded verdict and blocks on it **without running Kane at all**.
   The stderr is built from the stored `failureDetail`. Blocking becomes near-instant.
3. **Clear the failure** when a later Tier 2 run of that test passes (and therefore caches).
4. Mark ledger entries so the two paths are distinguishable: `source: "replay"` vs
   `source: "recorded"`.

**Acceptance:** a session with one recorded prosecution failure blocks on the next Stop in
**under 2 seconds**, with the real `failureDetail` in stderr, and `kane-cli balance` unchanged.
`guard-test.mjs` and `gate-test.mjs` still pass.

**If Part A runs past 90 minutes, stop and report.** Part B matters more.

---

## PART B — D2 Dashboard (the rest of your time)

**This is 25% of the total score and currently zero.** The rubric's first dimension is *Ships: a
working app with a real flow that runs end-to-end. Not slides.* Judges must see it working in
**under 30 seconds**.

### What it is

A deployed web app that renders Critique's ledger: what the agent claimed, what Kane proved,
what it falsified, and what is still owed — plus the suite growing over time.

### Requirements

1. **Deployed, with a public URL.** GitHub Pages from this repo is the shortest path and needs no
   new accounts. Vercel/Netlify acceptable. It must load for a stranger with no local setup.
2. **A real primary flow**, not a static poster. At minimum: land on a session list → open a
   session → see its claims with verdicts → expand one to read the actual `failureDetail` and
   step timeline.
3. **Seeded with real captured data.** Commit a `public/ledger.json` snapshot built from actual
   runs — including the genuine dark-mode prosecution and its real failure text. **Never invent
   data.** If a field is empty on cached replays (`testUrl` is), show it as unavailable rather
   than fabricating a link.
4. **The headline number, prominent:** tests in suite, and how many a human wrote (zero).
   That is the pitch — *the suite is the exhaust of the agent's own work.*
5. Responsive enough not to break on a judge's laptop. No horizontal scroll.
6. Vanilla HTML/CSS/JS reading a JSON file. **No React, no build step, no framework, no
   dependencies.** You have hours, not days.

### DO NOT

- Do not fabricate ledger entries, screenshots, or metrics. Real data or an honest empty state.
- Do not build an API, a database, or a backend. Static file + fetch.
- Do not start a redesign loop. Legible and honest beats beautiful and late.
- Do not break the gate while doing this — the hooks stay armed and must keep passing.

### ACCEPTANCE CRITERIA

1. A public URL that loads the dashboard with real data, verified in a private/incognito window.
2. The primary flow works end-to-end: session list → session → claim → failure detail.
3. Suite count and "written by humans: 0" are visible without scrolling.
4. Page works with `ledger.json` empty (honest empty state, no crash).
5. `guard-test.mjs` and `gate-test.mjs` still pass afterwards.
6. The URL is recorded in `README.md`.

### REPORT BACK

The live URL. A screenshot or description of the landing view. Confirmation it was tested in a
private window. Part A's before/after block timing. Anything you had to stub, labelled `MOCKED`.

---

## After this

Task #9 is the subject app + the 3-minute video. **Feature freeze is midday 21 Aug.**
Everything not working by then is cut, not fixed.
