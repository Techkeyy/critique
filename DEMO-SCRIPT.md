# Demo video, 3 minutes

Pitch tone, not a code walkthrough. The viewer is a judge who will stop at 3:00.
Voiceover is about 420 words, which is a measured pace with room to breathe.

Every number quoted below is measured and recorded in `LEDGER.md`. Do not round
them up on camera.

---

## Before you hit record

**Close every spare Chrome window.** Kane needs a free debug port in 9222 to 9230.
Running out is what caused the infrastructure bug during the build, and while the
gate now degrades gracefully, a demo where Kane cannot launch shows nothing.

```
cd C:\Users\HomePC\Desktop\critique
npm run critique:clear
kane-cli whoami
kane-cli balance
```

Confirm both URLs load: the dashboard and `/demo/`.

### Pre-stage the denial, about 6 minutes

The instant block reads a verdict that is already on record, so one has to exist.

1. In a Claude Code session in this repo, have the agent change the toggle label in
   `docs/demo/index.html` from `Toggle dark mode` to something else, and claim
   *"I updated the dark mode toggle."*
2. Commit, push, wait about 45 seconds for the deploy. Confirm the live demo shows
   the new label.
3. Let the agent stop. Tier 1 passes or aborts, the agent finishes, Tier 2 spawns.
4. Wait about 4 minutes, then confirm the regression was recorded:

```
node -e "const l=require('./.critique/ledger.json');console.log(l.filter(e=>e.open===true).length)"
```

Must print `1`. **Stay in this same Claude session for the whole recording.** Debt
is scoped to the session that produced it.

### Tabs, in order

- **A** Claude Code terminal, this repo
- **B** https://critique-six.vercel.app/demo/
- **C** https://critique-six.vercel.app/
- **D** a second terminal for `kane-cli balance`

---

## The shot list

| Time | Screen | Voiceover |
|---|---|---|
| **0:00** | Tab A. Agent mid-turn, cursor blinking. | "Your coding agent just told you it's done. Nothing checked that. You either trust it, or you go and click through the app yourself." |
| **0:12** | Type the claim, hit enter. | "So let's watch one lie." |
| **0:18** | **The block lands.** Hold on the red stderr block. Do not scroll. | "It said it fixed the dark mode toggle. Critique won't let it finish. That verdict came back in three hundred and thirty one milliseconds, because a real browser had already caught it." |
| **0:35** | Zoom the stderr text. Read the first line aloud. | "And this isn't a status code. It's Kane's own words: which control it looked at, what it expected, what it found." |
| **0:50** | Tab C. Click the failed session, then the failed event. | "Two clicks from the dashboard to the same failure. Every claim the agent ever made, and what a real browser proved about it." |
| **1:05** | Scroll to the step timeline. | "Step by step. Which one broke." |
| **1:15** | Tab A. Agent reads the failure and patches the label. | "The agent reads that text and fixes it. No human in the loop." |
| **1:30** | Tab B. Reload, toggle works. Then Tab A: the stop is allowed. | "Now the claim survives, and the turn is allowed to end." |
| **1:45** | Tab D. `kane-cli balance` before and after. Same number. | "That verification cost zero credits. The test was already cached, so it replays free, forever." |
| **1:58** | Tab C. The two stat tiles. | "Seven tests in this suite. A human wrote none of them to verify a claim. Kane authored them from the agent's own sentences. The suite is exhaust." |
| **2:15** | Terminal: `git clone`, `npm test` scrolling green. | "Trying it is one command. Clone it and the whole suite runs offline. No Kane account, no credits, no network. Fifty eight of those are adversarial." |
| **2:30** | Type `npm run critique:install`. Show the output. | "One more command wires it into Claude Code. It merges into your settings rather than overwriting them, backs them up first, and uninstalls cleanly. Point it at any project and it stays inert everywhere else." |
| **2:45** | Tab C, the hero. | "Your coding agent says it works. Critique makes it prove it." |
| **2:55** | Hold on the URL. | Silence. Let it sit. |

---

## What to actually say if you deviate

The pitch in one sentence, if you fumble and need to recover:

> "Every tool that checks AI code reads the diff. This one opens the browser."

The differentiator, if you have a spare five seconds:

> "It gated the agent that built it. Four real bugs came out of that, not a staged demo."

---

## Rules for the take

- **Do not run `kane-cli generate` on camera.** Authoring is five minutes.
- **Do not wait out a Tier 1 pass in real time.** It is about 53 seconds. Cut, or
  talk over it.
- **Do not scroll while reading the stderr.** The block is the money shot. Hold it.
- Speak slower than feels natural. Two and a half clean minutes beats three rushed.
- If the block does not fire: you are in a different Claude session than the one
  that recorded the failure, or `critique:clear` wiped it. Re-stage.

## If it goes wrong mid-take

| Symptom | Cause | Fix |
|---|---|---|
| No block on stop | Wrong session, or nothing recorded | Re-run the pre-stage, stay in one session |
| Kane will not launch | No free CDP port | Close Chrome windows, retry |
| Gate hangs then allows | Kane timed out, gate failed open by design | Expected behaviour, not a bug. Re-stage |
| Dashboard looks stale | Deploy still building | Wait 45s after a push |
