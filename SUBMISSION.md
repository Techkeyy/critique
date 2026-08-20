# Submission — Kane CLI Hackathon

Form: https://www.surveymonkey.com/r/kane-cli-hackathon-submission
Deadline: **21 August, 11:59 PM IST**. Submissions lock; no pushes after.

---

## 1. GitHub repo

https://github.com/Techkeyy/critique — public. README includes setup steps.
Initialized 19 August 2026; full commit history on `master`.

## 2. Demo video

**TODO — record before submitting.** Follow `DEMO-SCRIPT.md` exactly.
YouTube **Unlisted** (not Private), or a Drive link set to "anyone with the link can view".
Test the link in an incognito window before pasting it into the form.

## 3. One paragraph

> Critique is a Claude Code plugin that stops an AI coding agent from marking its own homework.
> When the agent finishes a turn, a Stop hook intercepts its closing claim — "I added the dark
> mode toggle" — and refuses to let it exit until Kane CLI has tried to prove that claim wrong in
> a real browser. It is for developers who build by directing an agent and have no cheap way to
> check what they were just handed. The agent is Claude Code. Kane does two jobs: synchronously it
> replays the cached suite to decide whether the agent may finish, and asynchronously it authors
> new prosecutions from the agent's own words via `kane-cli generate`, feeding the diff in as
> context. Anything Kane falsifies comes back to the agent as its failure text, so it fixes the
> problem and tries again. Every prosecution seals into a cached `_test.md` that replays at zero
> credits, so the repo accretes a regression suite as a by-product of the agent doing normal work
> — seven tests so far, none written by a human to verify a claim. The whole repo was written by
> Claude Code, and the hooks were armed while it was being built, so Critique spent the hackathon
> gating the very agent that was writing it; the dashboard ledger includes those live build-session
> runs, and one real bug (cross-session failure leakage) was found that way rather than in a demo.

## 4. Live URL

- Dashboard: **https://critique-six.vercel.app/**
- Mirror (fallback): https://techkeyy.github.io/critique/
- Subject app under test: **https://critique-six.vercel.app/demo/**

Runnable in under 30 seconds, no setup:
```
git clone https://github.com/Techkeyy/critique && cd critique && npm test
```
`npm test` exercises the parser, claim extraction, suite selection, the cwd guard, and the gate
itself — fail-open, the 3-attempt release, D-11 recorded blocking and D-12 session isolation.
No Kane account, no credits, no network.

## Judge notes

- Nothing is behind a login. No credentials needed.
- **Third-party fallback (per the rules):** running the *live* gate needs a Kane CLI account, which
  judges may not have. The recorded run is the video; the dashboard carries 53 real ledger entries
  from actual Kane runs; `npm test` proves the gate logic offline with no Kane dependency.
- Known limits are listed honestly in the README, including the contraband sweep covering one
  check rather than the five originally planned.

## Pre-flight

- [x] TestMu AI signup, same email as Luma registration
- [x] Kane CLI run (10,811 credits remaining of 11,200)
- [x] Repo public, initialized on/after 19 Aug
- [x] README with setup steps
- [x] Live URL working
- [x] `npm test` green
- [ ] **Video recorded and set to Unlisted**
- [ ] **Form submitted**
