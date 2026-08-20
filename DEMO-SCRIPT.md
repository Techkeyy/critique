# Demo video, 2:50

Written from the running system, not from memory. Every number and label below
was pulled live before this script was written. The verification table is at the
bottom; re-run it before you upload.

Narration is 372 words. At a deliberate ~135 words per minute that is about 2:45,
which leaves room to slow down on the climax.

---

## Staging: every tab, before the first take

| Tab | What it is | URL, complete | Pre-state |
|---|---|---|---|
| **A** | Claude Code terminal, this repo | `C:\Users\HomePC\Desktop\critique` | The session that produced the recorded failure. Do not open a new one. |
| **B** | The app under test | `https://critique-six.vercel.app/demo/` | Loaded, light theme, toggle label currently broken |
| **C** | The ledger | `https://critique-six.vercel.app/` | Loaded and scrolled to top |
| **D** | Second terminal, this repo | same folder | Cleared, ready to type |

**Switching tabs on camera is fine. Waiting for a page to load is not.** Load all
four before you record.

### Checks that would ruin a take

Run these immediately before Scene 1.

```bash
# 1. Kane needs a free debug port in 9222-9230. Close spare Chrome windows.
# 2. A recorded verdict must exist, or the block will not fire:
node -e "const l=require('./.critique/ledger.json');console.log(l.filter(e=>e.open===true).length)"
```

That must print `1`. If it prints `0`, re-stage: have the agent break the toggle
label in `docs/demo/index.html`, claim it fixed something, commit, push, wait 45
seconds for the deploy, let it stop, then wait about four minutes for the
background pass to record the failure. **Stay in that same session.** Debt is
scoped to the session that produced it.

### Preload, do not type

Everything except the two install commands in Scene 6. Typing a command reads as
real; typing a URL reads as a stall.

---

## Scene 1 · 0:00–0:22 · Tab B, the app under test

**On screen**
1. Open on the app, not the product. Click the toggle once. It works.
2. Slow scroll down the page while speaking.

**Say**

> "This is a small app an AI coding agent has been working on. Dark mode, a counter, a note field. The agent just told me it finished a change here, and it stopped.
>
> Nothing checked that. Every tool that reviews AI code reads the diff. Sonar, CodeRabbit, Qodo. Not one of them opens the browser and watches the thing actually run. So either you trust the agent, or you go and click through the app yourself."

**Why open here.** The viewer has watched twenty submissions today. Twenty-two
seconds of the problem earns the right to show the product.

---

## Scene 2 · 0:22–0:38 · Tab A, the terminal

**On screen**
1. Type the claim into Claude Code: `I fixed the dark mode toggle.`
2. Press enter. Let the agent move to finish its turn.

**Say**

> "So let's watch one lie. The agent says it fixed the toggle, and it tries to end the turn."

---

## Scene 3 · 0:38–1:20 · Tab A · THE CLIMAX

**On screen**
1. The red block lands.
2. **Stop moving the mouse completely.** Do not scroll. Do not highlight.
3. Say the climax line, then stay silent for one full second.
4. Only then, slowly scroll the failure text.

**Say**

> "It is not allowed to finish."

*(silence, one second)*

> "That came back in three hundred and thirty one milliseconds, because a real browser had already caught it. And what the agent gets back is not an exit code. It is Kane's own words: which control it looked at, what it expected, what it found instead. That is a sentence the agent can act on, and it does."

**Why stillness matters.** This block is the one thing a competitor probably
cannot show. Let the viewer read it themselves. Any mouse movement pulls the eye
off the text and the moment is gone.

**This is the longest block in the video by design.**

---

## Scene 4 · 1:20–1:42 · Tab A, then Tab B

**On screen**
1. The agent reads the failure and patches the label.
2. Switch to Tab B, reload, click the toggle. It works.
3. Back to Tab A. The stop is allowed.

**Say**

> "It reads that, fixes the code, and tries again. No human in the middle. Now the claim survives, and the turn is allowed to end."

---

## Scene 5 · 1:42–2:05 · Tab D, then Tab C

**On screen**
1. Tab D: run `kane-cli balance`. Hold on the number for two seconds.
2. Tab C: scroll to the two stat tiles. Hold.

**Say**

> "That verification cost zero credits. The test was already cached, so it replays free, forever.
>
> Seven tests in this suite. A human wrote none of them. Kane authored them from the agent's own sentences, so the suite is exhaust. You get a regression suite as a by-product of the agent doing normal work."

**Do not click into a session detail page.** The step timeline renders without
labels on the current data, and it looks broken on camera.

---

## Scene 6 · 2:05–2:38 · Tab D

**On screen**
1. Type `git clone https://github.com/Techkeyy/critique && cd critique && npm test`
2. Let it scroll. Land on `58 passed`.
3. Type `npm run critique:install`. Show the output.

**Say**

> "Trying it is one command. Clone it, and the whole suite runs offline. No Kane account, no credits, no network. Fifty eight of those cases are adversarial, and two of them found real bugs in this project.
>
> One more command wires it into Claude Code. It merges into your settings rather than overwriting them, backs them up first, and uninstalls cleanly. Point it at any project you like, and it stays completely inert everywhere else."

**Why typing is right here.** This is the ease-of-use claim. Watching two
commands run is the proof.

---

## Scene 7 · 2:38–2:50 · Tab C, the hero

**On screen**
1. Scroll to the top of the ledger site. Hold on the hero.
2. Stop on the last word. No outro card.

**Say**

> "Your coding agent says it works. Critique makes it prove it."

---

## Honesty guardrails

**Disclosure line, spoken in Scene 6** if you show the install on a machine that
already had it: say "already registered here, so it is a no-op" as it prints. It
costs two seconds and removes the risk.

**Do not claim, on camera:**

- Do not say Kane checks for console errors or secrets in storage. It cannot.
  Its assertion engine is DOM or visual only, and those checks came back `broken`.
  The one contraband check that works is the leftover `localhost:4000` probe.
- Do not say the suite is comprehensive. It is seven tests.
- Do not say the block is instant in all cases. It is instant because the verdict
  was already recorded. A first-time check takes about 53 seconds.
- Do not call the subject app a product. It is a specimen.
- Do not imply the video was recorded in one take if it was not.

**Label the adversarial moment as intentional.** In Scene 2, "let's watch one
lie" does that work. Without it, Scene 3 reads as a live bug rather than the
product doing its job.

---

## Verification table, re-run before uploading

| Claim in the script | Evidence | Verified |
|---|---|---|
| 331 milliseconds | `LEDGER.md`, measured block from a recorded verdict | yes |
| Zero credits on replay | `kane-cli balance` identical before and after, 10775.3742 | yes |
| Seven tests, none human-written | `find .testmuai/tests -name '*_test.md'` = 7, `suite.humanWroteToVerifyAClaim` = 0 | yes |
| 58 adversarial cases | `node test/stress.test.mjs` prints `58 passed` | yes |
| Two found real bugs | Path traversal via session id, infrastructure block. Both in `LEDGER.md` | yes |
| Offline, no dependencies | `package.json` has zero deps, `npm test` needs no network | yes |
| Static rivals named | Sonar, CodeRabbit, Qodo. Named in the README | yes |
| Dashboard URL | `https://critique-six.vercel.app/` returns 200 | yes |
| App under test URL | `https://critique-six.vercel.app/demo/` returns 200 | yes |
| Repo URL | `https://github.com/Techkeyy/critique` returns 200 | yes |

**On-screen labels confirmed live:** nav reads `Ledger`, `GitHub`, `App under
test`. Hero buttons read `See it in action` and `View on GitHub`. Stat tiles read
`Tests in suite` and `Written by a human`. Session rows carry the hint `Kane
falsified a claim here`.

**Known staging hazards, already avoided in the script:** the step timeline
renders without step labels on current data, so Scene 5 stays on the stat tiles;
and the ledger renders client side, so every tab must be loaded before recording.
