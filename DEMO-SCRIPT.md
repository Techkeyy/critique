# Demo script — 3 minutes, no improvising

Film in this order. Judges stop at 3:00; put denial first.

**Before you hit record**

```
cd C:\Users\HomePC\Desktop\critique
npm run critique:clear
kane-cli whoami
kane-cli balance
```

Confirm `https://techkeyy.github.io/critique/` and `https://techkeyy.github.io/critique/demo/` load. Confirm `~/.claude/settings.json` Stop hook points at `gate.mjs`.

Use a **new** Claude Code session with cwd = this repo so `session_id` is clean.

---

## The reliable path (verified end to end)

Tier 1 cannot catch a regression: a cached test that now fails takes **185s** to replay versus
53s when it passes, so Tier 1 aborts and fails open by design (D-13). The denial comes from
**Tier 2**, which finds the break in the background, and the **next** Stop blocks in **331ms**.

So the loop is: break it → Tier 2 records → next turn is denied instantly.

---

## Pre-stage (before recording, ~6 min)

```
npm run critique:clear
```

1. In a Claude session in this repo, have the agent break the toggle in
   `docs/demo/index.html` — e.g. change the button label to `Switch appearance` — and claim
   *"I updated the dark mode toggle."*
2. Commit and push. Wait ~45s for Pages, confirm the live demo shows the new label.
3. Let the agent stop. Tier 1 passes or aborts; the agent is allowed to finish. Tier 2 spawns.
4. Wait ~4 minutes. Confirm the regression was recorded:

```
node -e "const l=require('./.critique/ledger.json');console.log(l.filter(e=>e.open===true).length)"
```

Must print `1`. **Stay in this same Claude session** — recorded failures are session-scoped (D-12).

---

## Beat 1 — DENIED, instantly (0:00–0:40)

Hit record here.

1. In the same session, have the agent claim *"I fixed the dark mode toggle."* and stop.
2. **What you see:** the Stop is blocked in well under a second, quoting Kane verbatim:

```
CRITIQUE GATE: verification failed.
Claim: I fixed the dark mode toggle.
Step 2 (Step 2) failed: action_failed: click @ step 1
Driver: click: Clicking Toggle Dark Mode button
Fix the failing step and stop again. Attempt 1/3.
```

Say the line out loud: *the agent is not allowed to finish.*

---

## Beat 2 — Real failure text on the dashboard (0:40–1:10)

1. Open https://techkeyy.github.io/critique/
2. Click the session. Click the event marked **failed**.
3. Full `Failure detail` plus the step timeline. Two clicks, no typing.

---

## Beat 3 — Patch, then green (1:10–2:10)

Same session.

1. Have the agent restore the button label to `Toggle dark mode`. Commit, push, wait for Pages.
2. Stop again. Tier 2 replays the cached test, it passes, the recorded failure clears.
3. **What you see:** Stop allowed. `kane-cli balance` unchanged — **the replay is free.**

Show the balance before and after on screen. 0 credits is the point.

## Beat 4 — Suite grew, humans: 0 (2:10–2:35)

Dashboard landing: **Tests in suite** (generated count) and **Written by humans to verify a claim: 0**. Mention the two demo prosecutions under `.testmuai/tests/prosecutions/demo/`.

---

## Beat 5 — Live URL (2:35–3:00)

Say the URL out loud while it is on screen:

https://techkeyy.github.io/critique/

Subject app:

https://techkeyy.github.io/critique/demo/

Optional: click Increment, reload, count persists. Click Toggle dark mode. That is the real primary flow.

---

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Stop not blocked | No file touch this turn | Edit any file under the repo, stop again |
| Stop blocked with another session’s dark-mode text | Pre-D-12 bug | Update to this commit; `npm run critique:clear` |
| Stop blocked instantly after clear | You are still in a session that has its *own* open recorded failure | `npm run critique:clear` and **new** Claude session |
| Kane 40s pause after a question | Touched files leftover | `npm run critique:clear` |
| Demo 404 | Pages not rebuilt | wait ~30s after push to `docs/` |
| Credits drop on replay | Cache miss / failed authoring | only passed `meta.json` executions are replayed (D-11) |

Do not run `kane-cli generate` on camera. Authoring is 5+ minutes.
