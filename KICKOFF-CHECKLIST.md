# Critique — Kickoff Checklist

Do these in order. Nothing below Hour 1 matters until Hour 1 passes.

## Before the clock starts

- [x] ~~Sign up at testmuai.com — 10,000 credits~~ — **done (Gmail account)**
- [ ] ⚠️ **Verify the TestMu account email is the same one you registered on Luma with.**
      The participant guide requires an exact match. A mismatch = unscoreable entry.
      Takes 30 seconds to check. Do it now.
- [x] ~~`npm install -g @testmuai/kane-cli`~~ — **done, v0.8.4**
- [x] ~~install the agent skill~~ — **done** via `kane-cli install skill` (v0.0.17, 3 targets).
      Note: this is the real installer, *not* `npx @testmuai/kane-cli-skill`.
- [ ] **`kane-cli login`** ← everything below is blocked on this
- [ ] `kane-cli whoami` → `kane-cli balance` (**write the starting number down**)
- [ ] `kane-cli config set-bug-detection continue` — **default is `off`**, turn it on
- [ ] Run one objective against the free playground to warm up:
      `kane-cli run "open the playground and verify the page title" --agent --headless`
      (default_url is already `https://kaneai-playground.lambdatest.io`)
- [ ] Join Slack: <https://join.slack.com/t/kaneai/shared_invite/zt-478cnz1pt-rqvZLRErunBZGyC3QRyoew>
- [ ] Read <https://testmuai.com/kane-cli/agents.md> once, properly. It is the NDJSON contract.

## Hour 1 — resolve the three unknowns

Cheap to check, expensive to guess wrong.

- [ ] **Credits per `generate`** — `kane-cli balance`, run one `generate`, check again.
- [ ] **Seconds per headless `run`** — time it. The gate must feel like seconds.
- [ ] **Does `--save` keep the non-Functional checks?** Docs say it writes *only Functional*
      cases to disk. If Security cases are dropped, the contraband sweep must be
      hand-authored as `_test.md`. Find out now, not on Day 2.

## Hour 2 — the bet the whole project rests on

- [ ] `git init` (legal on/after 19 Aug — they check commit history)
- [ ] Write a `Stop` hook that unconditionally does:
      write a fixed message to **stderr**, `exit 2`
- [ ] Watch Claude Code refuse to stop and keep working with that message in context.

**If this works, build the plan as written.**
**If it doesn't, switch the gate to a `pre-commit` hook (Risk Register, §7) and carry on.**

- [ ] Immediately add the loop guard — max 3 attempts per session, then let it exit.
      Skipping this means an infinite agent loop, probably during filming.

## Daily discipline

- [ ] Commit often. The commit history is evidence of legitimacy — treat it as part of the submission.
- [ ] End of Day 1: record a throwaway screen capture of whatever works. Insurance.
- [ ] Check `kane-cli balance` at the end of each day. DM Slack when low — **not in the last hour**.
- [ ] Feature freeze midday on 21 Aug. Video takes longer than you think.
- [ ] Submit with 3+ hours of margin. Submissions lock hard at 11:59 PM IST.

## Key reference links

| What | Where |
|---|---|
| Agent/NDJSON contract | <https://testmuai.com/kane-cli/agents.md> |
| Docs | <https://www.testmuai.com/support/docs/kane-cli-introduction/> |
| Cookbook (contraband sweep source) | <https://www.testmuai.com/kane-cli-cookbook/> |
| Test-case generation | <https://www.testmuai.com/support/docs/kane-cli-generate/> |
| Repo | <https://github.com/LambdaTest/kane-cli> |
| Claude Code hooks | <https://code.claude.com/docs/en/hooks> |
| Submission form | <https://www.surveymonkey.com/r/kane-cli-hackathon-submission> |
