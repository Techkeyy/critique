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

## Beat 1 — Claim, then DENIED (0:00–0:50)

1. In the subject app tab, show dark mode working: click **Toggle dark mode**, label reads `dark`.
2. In Claude Code, ask the agent to "add a second unused button and say you are done."
   Alternatively, edit `docs/demo/index.html` yourself (so `touched.json` is non-empty) and have the agent claim:

   > I added the dark mode toggle.

3. Let the agent stop.
4. **What you should see:** Stop is blocked. Stderr / the agent’s next turn quotes Kane’s failure (or, if this session already has a recorded dark-mode failure, the **271ms recorded block** with `failureDetail` about the wrong control / missing toggle on the old playground tests).
5. If nothing blocks: you did not touch a file this turn, or `critique:clear` wiped a recorded failure and there is no cached failing prosecution *for this session*. Touch `docs/demo/index.html`, claim something false about the demo, stop again.

**Fragile:** recorded failures are per-session. A failure from an earlier session will not deny this one (D-12). Stay in the same Claude session for beats 1–3.

---

## Beat 2 — Real failure text (0:50–1:20)

1. Open https://techkeyy.github.io/critique/
2. Click **1:** the session whose claim is `I added the dark mode toggle.`
3. Click **2:** the event marked **failed**.
4. **What you should see:** `Failure detail` verbatim, including “wrong control” / the localhost or dark-mode assertion, plus the step timeline. Headline numbers **3** (or more) and **0** humans wrote a claim-test.

Do not type the hash by hand. Two clicks.

---

## Beat 3 — Patch, then green (1:20–2:10)

Stay in the **same** Claude session.

1. If the denial was the old playground prosecution: that test cannot go green (the playground has no toggle). For a green beat, work the **subject app**:
   - True claim: `I added the dark mode toggle.` against `https://techkeyy.github.io/critique/demo/` — the toggle is real.
2. Let Kane replay the cached `dark_mode_toggle_test.md` (0 credits).
3. **What you should see:** Stop allowed. `kane-cli balance` unchanged. Ledger `source: "replay"`, `status: "passed"`.

If you need a fresh cache: `kane-cli testmd run .testmuai/tests/prosecutions/demo/dark_mode_toggle_test.md --agent --headless` once; later replays are free.

---

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
