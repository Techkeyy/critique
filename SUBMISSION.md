# Submission, Kane CLI Hackathon

Form: https://www.surveymonkey.com/r/kane-cli-hackathon-submission
Deadline: **21 August, 11:59 PM IST**. Submissions lock, no pushes after.

---

## The rubric, with evidence

Four dimensions, weighted equally. Ties break on Verified, then Closed loop.
Every line below is checkable by a stranger in under five minutes.

| Dimension | Evidence |
|---|---|
| **Ships** | Two deployed apps, no setup: the [dashboard](https://critique-six.vercel.app/) and the [app under test](https://critique-six.vercel.app/demo/). Real primary flows, real data, 20 genuine ledger entries. `git clone` then `npm test` passes on a virgin clone with zero dependencies. |
| **Verified** | Kane authored 7 of the 10 suite tests from the agent's own sentences. It falsified a real dark-mode claim, caught a real regression when the subject app broke, and detects live contraband (a leftover `localhost:4000` probe). Failure text is rendered verbatim on the dashboard, two clicks from the landing page. |
| **Closed loop** | Not "a hook fired Kane". The agent is **denied exit**. Break the app, Tier 2 records it in 221s, the next Stop blocks in **331ms** with Kane's failure text, the agent reads it and fixes it. Measured end to end, numbers in [LEDGER.md](LEDGER.md). |
| **Craft** | One-command install that merges into `~/.claude/settings.json` rather than overwriting, backs up first, and uninstalls cleanly. Works on any project via a `.critique/` marker. 58 adversarial stress cases. Honest limitations section. Fails open on its own machinery failing. |

## Eligibility

- [x] TestMu AI signup, same email as the Luma registration
- [x] Kane CLI run for real (about 425 credits spent of 11,200)
- [x] Repo public, first commit 19 August 2026, full history on `master`
- [x] README with setup steps a stranger can follow
- [x] Live URL, working, no login
- [ ] **Demo video recorded and set to Unlisted**
- [ ] **Form submitted**

---

## 1. GitHub repo

https://github.com/Techkeyy/critique, public, initialized 19 August 2026.

## 2. Demo video

**Not recorded yet.** Follow `DEMO-SCRIPT.md`, which contains the verified sequence
including the pre-stage. YouTube **Unlisted** (not Private), or a Drive link set to
"anyone with the link can view". Test it in an incognito window before pasting it in.

Close spare Chrome windows first. Kane needs a free CDP port in 9222 to 9230, and
running out of them is what triggered the infrastructure bug during the build.

## 3. One paragraph

> Critique is a Claude Code plugin that stops an AI coding agent from marking its own homework.
> When the agent finishes a turn, a Stop hook intercepts its closing claim, "I added the dark
> mode toggle", and refuses to let it exit until Kane CLI has tried to prove that claim wrong in
> a real browser. It is for developers who build by directing an agent and have no cheap way to
> check what they were just handed. Kane does two jobs. Synchronously it replays the cached suite
> to decide whether the agent may finish, in about 53 seconds at zero credits. Asynchronously it
> authors new tests from the agent's own sentence via `kane-cli generate`, with the diff fed in as
> context, and replays the whole suite to catch regressions. Anything it falsifies comes back to
> the agent as Kane's verbatim failure text, so the agent fixes it and tries again; that block
> lands in 331 milliseconds because the verdict is already on record. Every prosecution that
> passes seals into a cached `_test.md` that replays free forever, so the repo accretes a
> regression suite as exhaust: ten tests, none written by a human to verify a claim. The whole
> repo was written by Claude Code with the hooks armed, so Critique spent the hackathon gating the
> agent that was writing it, and four real bugs were found that way rather than in a staged demo.

## 4. Live URL

- Dashboard: **https://critique-six.vercel.app/**
- App under test: **https://critique-six.vercel.app/demo/**
- Mirror, in case Vercel has a bad day: https://techkeyy.github.io/critique/

Under 30 seconds, no setup:

```bash
git clone https://github.com/Techkeyy/critique
cd critique
npm test
```

Zero dependencies, no Kane account, no network. 58 stress cases plus the unit suites.

## Judge notes

- Nothing is behind a login. No credentials needed.
- **Third-party fallback, per the rules.** Running the live gate needs a Kane account judges may
  not have. The recorded run is the video, the dashboard carries genuine ledger entries from real
  Kane runs, and `npm test` proves the gate logic offline with no Kane dependency at all.
- Limitations are stated plainly in the README, including the contraband sweep covering one check
  rather than the five originally planned, and replay brittleness after a layout change.
- Build scaffolding lives in `notes/`. [LEDGER.md](LEDGER.md) is the decision log: every
  architectural choice with the measurement that forced it.
