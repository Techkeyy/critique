# Demo video, 2:50

Written from the running system, not from memory. Every number was pulled live.
The verification table is at the bottom; re-run it before you upload.

Narration is about 330 words. At a deliberate 135 words per minute that is
roughly 2:30, which leaves room to slow down on the climax.

Commands are written for **Windows PowerShell 5.1**, which has no `&&`.

---

## Part A, setup, camera off

**1. Free the browser ports.** Kane needs a free debug port in 9222 to 9230.
A full Chrome takes them all, and every check then fails open silently.

```powershell
Get-Process chrome | Stop-Process -Force
```

**2. Open one Claude Code window** on this folder. Send a throwaway message so the
session exists:

> What files are in the docs/demo folder?

**3. Stage the failure.**

```powershell
cd C:\Users\HomePC\Desktop\critique
npm run demo:stage
```

Wait for **READY**. This runs the real check against the live app, finds the
button missing, and records the verdict **against the session you just opened**.
It refuses to proceed if Chrome is still holding the ports.

Do not close that Claude window. Debt is scoped to the session that produced it.

### Tabs, all loaded before the first take

| Tab | What it is | URL |
|---|---|---|
| **A** | The Claude Code window you just staged | `C:\Users\HomePC\Desktop\critique` |
| **B** | The app under test | `https://critique-six.vercel.app/demo/` |
| **C** | The ledger | `https://critique-six.vercel.app/` |
| **D** | A second terminal | same folder |

Switching tabs on camera is fine. Waiting for a page to load is not.

---

## Scene 1 · 0:00 to 0:25 · Tab B

**On screen**
1. Open on the app, not the product. Click the toggle once. It works.
2. Slow scroll while speaking.

**Say**

> "This is a small app an AI coding agent has been working on. Dark mode, a counter, a note field. The agent told me it finished a change here, and it stopped.
>
> Nothing checked that. Every tool that reviews AI code reads the diff. Sonar, CodeRabbit, Qodo. Not one of them opens the browser and watches the thing run. So either you trust the agent, or you go and click through the app yourself."

**Why open here.** The viewer has watched twenty submissions today. Twenty-five
seconds of the problem earns the right to show the product.

---

## Scene 2 · 0:25 to 0:40 · Tab A

**On screen**
1. Paste and send:

> Put the dark mode button label back to "Toggle dark mode" in docs/demo/index.html. Do not commit and do not push, just make the edit.

**Say**

> "So let's watch one lie. The agent says it fixed the toggle, and it tries to end the turn."

**Why the extra words.** Without the path it goes hunting or asks which file.
Without "do not commit" it creates a branch and pushes, which is slow, noisy, and
puts commits on the judged repo mid-take. The block fires on the edit alone.

**Why this line.** It labels the adversarial moment as intentional. Without it,
Scene 3 reads as a live bug rather than the product doing its job.

---

## Scene 3 · 0:40 to 1:20 · Tab A · THE CLIMAX

**On screen**
1. The red block lands in under a second.
2. **Stop moving the mouse completely.** Do not scroll, do not highlight.
3. Say the line, then hold one full second of silence.
4. Only then, slowly scroll the failure text.

**Say**

> "It is not allowed to finish."

*(silence, one second)*

> "That came back in under a second, because a real browser had already caught it. And what the agent gets back is not an exit code. It is Kane's own words: which control it looked at, what it expected, what it found instead. That is a sentence the agent can act on."

**Why stillness matters.** This is the one thing a competitor probably cannot
show. Let the viewer read it. Any mouse movement pulls the eye off the text.

**Longest block in the video, by design.**

---

## Scene 4 · 1:20 to 1:50 · Tab C

**On screen**
1. Scroll the ledger of real runs.
2. Land on the two stat tiles. Hold.

**Say**

> "Every claim that agent made, and what a real browser proved about it. Ten tests in this suite. A human wrote none of them. Kane authored them from the agent's own sentences, so the suite is exhaust. You get a regression suite as a by-product of the agent doing normal work."

**Do not click into a session detail page.** The step timeline renders without
labels on current data and looks broken on camera.

---

## Scene 5 · 1:50 to 2:15 · Tab D

**On screen**
1. Type:

```powershell
kane-cli testmd run .testmuai/tests/prosecutions/demo/localhost_metrics_probe_test.md --agent --headless
```

2. Let it start, then cut. Rejoin on the result.

**Say**

> "Here is Kane running on its own. It drives a real browser at the live app and finds a leftover call to localhost still sitting in the shipped page. No diff reader sees that, because nothing is wrong with the code until something runs it."

**Why this scene exists.** It is the requirement "show Kane running", and it is
the one beat that cannot fail regardless of session state. If Scene 3 misbehaves,
this still carries the submission.

---

## Scene 6 · 2:15 to 2:40 · Tab D

**On screen**
1. Type, on two lines:

```powershell
git clone https://github.com/Techkeyy/critique demo-clone
cd demo-clone; npm test
```

2. Let it scroll. Land on `58 passed`.
3. Type `npm run critique:install`. Show the output.

**Say**

> "Trying it is two commands. Clone it, and the whole suite runs offline. No Kane account, no credits, no network. Fifty eight of those cases are adversarial, and several of them found real bugs in this project.
>
> One more command wires it into Claude Code. It merges into your settings rather than overwriting them, backs them up first, and uninstalls cleanly. Point it at any project you like, and it stays completely inert everywhere else."

**Why typing is right here.** This is the ease-of-use claim, and watching the
commands run is the proof.

---

## Scene 7 · 2:40 to 2:50 · Tab C

**On screen**
1. Scroll to the hero. Hold.
2. Stop on the last word. No outro card, no music sting.

**Say**

> "Your coding agent says it works. Critique makes it prove it."

**Optional, if you want the strongest line you have:**

> "Every bug in this project was found the same way. It blocked the agent that was writing it."

---

## Honesty guardrails

**Do not claim, on camera:**

- Do not say Kane checks console errors or secrets in storage. It cannot. Its
  assertion engine is DOM or visual only, and both of those checks came back
  `broken`. The contraband check that works is the leftover `localhost:4000` probe.
- Do not say the suite is comprehensive. It is ten tests.
- Do not say the block is instant in all cases. It is instant because the verdict
  was already recorded. A first check takes about 53 seconds.
- Do not call the subject app a product. It is a specimen.
- Do not imply the video was one take if it was not.

**If you show `critique:install` on a machine that already has it**, say "already
registered here, so it is a no-op" as it prints. Two seconds, removes the risk.

---

## If it goes wrong mid-take

| Symptom | Cause | Fix |
|---|---|---|
| No block in Scene 3 | Different window than the staged one, or `demo:stage` never printed READY | Re-run `npm run demo:stage`, stay in one window |
| Kane will not launch | No free debug port | `Get-Process chrome | Stop-Process -Force` |
| Gate pauses then allows | Kane timed out, gate failed open by design | Expected, not a bug. Re-stage |
| `&&` errors in the terminal | PowerShell 5.1 | Use separate lines or `;` |
| Scene 3 will not fire at all | Anything | Skip it. Scenes 1, 4, 5, 6 still satisfy every official requirement |

---

## Verification table, re-run before uploading

| Claim in the script | Evidence |
|---|---|
| Blocks in under a second | Measured at 201ms and 331ms from a recorded verdict, in `LEDGER.md` |
| Zero credits on replay | `kane-cli balance` identical before and after |
| Ten tests, none human-written | `find .testmuai/tests -name "*_test.md"` is 10, `suite.humanWroteToVerifyAClaim` is 0 |
| 58 adversarial cases | `node test/stress.test.mjs` prints `58 passed` |
| Several found real bugs | Path traversal, infrastructure block, blocks feeding themselves, prosecutions aimed at the wrong site. All in `LEDGER.md` |
| Offline, no dependencies | `package.json` has zero deps, `npm test` needs no network |
| Static rivals named | Sonar, CodeRabbit, Qodo, named in the README |

**On-screen labels confirmed live:** nav reads `Ledger`, `GitHub`, `App under
test`. Stat tiles read `Tests in suite` and `Written by a human`. Session rows
carry `Kane falsified a claim here`.

**Known staging hazards, already avoided above:** the step timeline renders
without labels, so Scene 4 stays on the tiles; the ledger renders client side, so
load every tab before recording; and Chrome creeps back up as you work, so run
the port check immediately before recording, not an hour before.
