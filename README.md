# Critique

Your coding agent says it works. Critique makes it prove it, in a real browser, before it is allowed to finish.

**[Live dashboard](https://critique-six.vercel.app/)** · **[App under test](https://critique-six.vercel.app/demo/)** · **[Mirror](https://techkeyy.github.io/critique/)** · [Decision log](LEDGER.md)

An AI coding agent writes a feature, tells you it is done, and stops. Nothing checked that. Critique is a Claude Code plugin for developers who build by directing an agent, and it closes that gap: a `Stop` hook intercepts the agent's closing claim, hands it to Kane CLI to falsify in a real browser, and refuses to let the turn end until the claim survives.

> *"It says it added the toggle. Did it? Do I have to go and click it myself?"*

Built for the Kane CLI Hackathon, 19 to 21 August 2026.

## Why this exists

Verifying AI-written code is the bottleneck now, not writing it. Sonar's 2026 survey puts adoption near 84% while only about 3% of developers highly trust the output. A market already exists for checking it: Sonar AI Code Assurance, CodeRabbit, Qodo, Greptile.

Every one of them is **static**. They read the diff. None of them open the browser and watch the thing run.

```
   AGENT WRITES CODE  ---->  "Done!"  ---->  you, clicking around to check
                               |
                               |  static tools stop here (they read the diff)
                               v
                     +----------------------+
                     |  CRITIQUE            |
                     |  real browser        |  <-- the claim is falsified here,
                     |  real failure text   |      or the turn does not end
                     +----------------------+
```

Runtime debris is invisible to a diff reader and ordinary for an agent to leave: a `fetch` still pointing at `localhost`, a token parked in `localStorage`, an error that only fires on click while the page still looks correct.

## What it does

1. **Observes** the turn. A `PostToolUse` hook records which files changed and captures the git diff, capped at 200KB.
2. **Extracts** the claims. The agent's closing message is parsed for past-tense completions. Regex only, no model call, so it is deterministic and costs nothing.
3. **Gates** the exit. A `Stop` hook replays the cached suite. Passing replays cost **0 credits** and take about 53s.
4. **Prosecutes** in the background. A detached process feeds the claim plus the diff to `kane-cli generate`, which authors new browser tests from the agent's own sentence.
5. **Records** regressions. The same background pass replays every cached test and records anything that broke.
6. **Denies** the next exit. A recorded failure blocks the following turn in **331ms** with Kane's verbatim failure text, which the agent then reads and fixes.

Every prosecution that passes seals into a cached `_test.md` that replays free forever. The suite is exhaust: **7 tests, none written by a human to verify a claim.**

## Quickstart

```bash
git clone https://github.com/Techkeyy/critique && cd critique
npm test                    # 58 stress cases + unit suites. No Kane, no credits, no network.
```

To run the gate itself you need [Kane CLI](https://www.npmjs.com/package/@testmuai/kane-cli):

```bash
npm install -g @testmuai/kane-cli
kane-cli login              # then confirm with: kane-cli whoami
npm run critique:install    # registers two hooks in ~/.claude/settings.json
```

Then open Claude Code in this folder, edit a file, and let the agent finish.

### On your own project

The hooks are global but inert until a project opts in, and the opt-in signal is a `.critique/` directory:

```bash
cd ~/your-project
node /path/to/critique/src/init.mjs
```

`npm run critique:uninstall` removes only Critique's own entries and leaves every other hook alone. The installer merges rather than overwrites, backs the file up first, refuses to touch a file it cannot parse, and is safe to run twice.

## Commands

```
npm test                  # everything below plus 58 stress cases, fully offline
npm run stress            # adversarial payloads, concurrency, corrupted state
npm run critique:verify   # the full tagged suite, unbounded, outside the hook
npm run critique:clear    # close recorded failures, wipe session state
npm run critique:publish  # rebuild docs/ledger.json from real state
npm run critique:init     # opt the current project in
npm run critique:install  # register the hooks
```

## Architecture

| Module | Job |
|---|---|
| `.claude/hooks/observe.mjs` | PostToolUse: record edited paths, capture the diff |
| `.claude/hooks/gate.mjs` | Stop: replay the suite, block or allow, never strand the agent |
| `src/guard.mjs` | Workspace discovery by marker, session id sanitising, stdin |
| `src/claims.mjs` | Past-tense claim extraction, deterministic, no model call |
| `src/diff.mjs` | Git diff capture, code versus prose classification |
| `src/kane.mjs` | Kane CLI adapter, spawns with an args array, never a shell string |
| `src/ndjson.mjs` | NDJSON parsing, failure detail, noise and infrastructure classifiers |
| `src/suite.mjs` | Select cached, previously-passing members for the blocking gate |
| `src/prosecute.mjs` | Tier 2: regression pass, then author new tests from the claim |
| `src/publish.mjs` | Derive dashboard data and suite counts from the filesystem |
| `src/install.mjs` | Merge hooks into user settings, back up, uninstall cleanly |
| `src/init.mjs` | Write the `.critique/` opt-in marker for a project |
| `test/` | Hook-level suites: guard scoping, gate behaviour, 58 stress cases |

## Why two tiers, and why that is not a compromise

Measured, not assumed. A cached test that **passes** replays in 53s. The same test **failing** takes **185s**, because the browser waits for something that never appears. The Stop hook's budget is 120s.

So a single-tier gate cannot detect a regression. It would blow the budget and fail open, producing no block at the exact moment a block is warranted.

- **Tier 1** is synchronous and only replays cached, previously-passing tests. 75s ceiling.
- **Tier 2** is detached, has no timeout pressure, and records what it finds.
- A recorded failure blocks the **next** Stop in 331ms, straight from the ledger, with no Kane run at all.

Turn N's mistake is caught before turn N+1 can finish. The denial is near-instant rather than a three-minute stall.

## How I tried to break it

Every row is exercised by `npm test`. Nothing here is hypothetical.

| Input | Result |
|---|---|
| Empty stdin, truncated JSON, bare `null`, 500KB message, null bytes, 200-deep nesting | Survives, exits cleanly, never throws |
| Session id `../../../escaped` | **Found a real bug.** It created a directory outside the workspace. Now sanitised: separators stripped, length capped, Windows reserved names rejected |
| Corrupted `touched.json`, negative and enormous attempt counts, unparseable ledger | Degrades to a safe default, never bricks the gate |
| Kane throws, times out, or errors | Fails open, records OWED, lets the turn finish |
| No free Chrome debug port, network down, expired login, no credits | **Found a real bug.** It used to block. Machinery failures now fail open; only product failures hold the door |
| 8 sessions gating concurrently | All block cleanly, all keep independent session state |
| A failure recorded by a different session | Ignored. Debt is scoped to the session that produced it |
| Three consecutive failures | Released as OWED. The agent can always escape |
| Working directory outside any opted-in project, or a lookalike sibling name | Inert, silent, exit 0 |

**The invariant: the gate never strands the agent.** Every unknown, every crash, every failure of Critique's own machinery resolves to "allowed, with the debt recorded". Only a real product failure blocks, and never more than three times.

## Known limitations

- **The contraband sweep covers one check, not the five planned.** Kane's assertion engine is `dom` or `visual` only, with no console or storage mode, so "no console errors" and "no secret in localStorage" could not be authored as passing checks. Both came back `broken`. The working check is the leftover `localhost:4000` probe. The subject app also carries a real click-triggered `analytics` TypeError and a placeholder token that no test currently covers.
- **Cached replays go brittle when a page is restructured.** Editing markup around an assertion made a passing check fail while the thing it looks for was still present and live. Kane's auto-heal did not recover it. Re-authoring cost about 22 credits and 148s. Treat a failure straight after a layout change as suspect.
- **Claim extraction is regex-based and can fire on prose.** Turns that changed no application code are therefore never prosecuted. One prosecution in this repo predates that filter and is left in place as evidence of the failure mode.
- **Cached replays do not return a Kane dashboard URL.** The dashboard shows that as unavailable rather than inventing a link.
- **The 3-minute demo video is not recorded yet.** The reproducible sequence is in `DEMO-SCRIPT.md`.

## Built by an agent, and gated by itself

Every line here was written by Claude Code. Commit messages carry no AI attribution by house convention, so the provenance is stated here instead.

The hooks were armed in this repo while it was being built, so Critique spent the hackathon gating the agent that was writing it. Session `74dc74c1...` on the [dashboard](https://critique-six.vercel.app/) is a real build session, gated live five times.

Four bugs were found that way rather than in a staged demo: a cross-session failure leak, stderr chatter masquerading as a failure reason, the infrastructure block, and a mislabelled receipt. Each is recorded in [LEDGER.md](LEDGER.md) with the measurement that caught it.

## License

MIT.
