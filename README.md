# Critique

A Claude Code plugin that intercepts the coding agent at `Stop`, prosecutes its closing claim in a real browser via Kane CLI, and refuses to let it exit until the claim survives. Every prosecution seals into a cached `_test.md`. The suite is exhaust — a human did not write the claim-verification cases.

## Live

- Dashboard: **https://critique-six.vercel.app/**
- Mirror: https://techkeyy.github.io/critique/
- Subject app: **https://critique-six.vercel.app/demo/**
- Repo: https://github.com/Techkeyy/critique

## Built by an agent, and gated by itself

Every line of this repo was written by **Claude Code**. No file here was hand-authored; the
human set direction and made the calls, the agent did the engineering. Commit messages carry no
AI attribution by house convention, so the provenance is stated here instead.

The part worth looking at: **Critique was running against the agent that was building it.**
The hooks were armed in this repo from early on, so the build sessions were themselves gated —
the agent had to get past its own tool to finish a turn.

The published ledger contains those runs. Session `74dc74c1-…` on
[the dashboard](https://techkeyy.github.io/critique/) is a real Claude Code build session, gated
live, five times. `LEDGER.md` records the moment the gate blocked that session with another
session's failure — a genuine scoping bug (D-12) found because the tool was pointed at its own
authors, not at a staged demo.

The suite grew the same way. Nobody wrote a claim-verification test; Kane authored them from the
agent's own sentences.

## Install

1. Install [Kane CLI](https://www.npmjs.com/package/@testmuai/kane-cli) and sign in. Check with `kane-cli whoami`.
2. Clone this repo. Node 20 or newer. There are no dependencies to install.
3. Register the hooks once, from the clone root:

```
npm run critique:install
```

That writes two entries into `~/.claude/settings.json`. It merges rather than
overwrites, backs the file up first, refuses to touch a file it cannot parse, and
is safe to run twice. `npm run critique:uninstall` removes only Critique's own
entries and leaves every other hook alone.

## Using it on your own project

The hooks are registered globally but do nothing until a project opts in. The
opt-in signal is a `.critique/` directory, so from any repo you want gated:

```
node /path/to/critique/src/init.mjs
```

That creates `.critique/` and `.testmuai/tests/`, and adds the runtime state to
your `.gitignore`. Open Claude Code there and the gate is live. To opt back out,
delete the `.critique` folder.

Projects that never opted in are untouched: the hooks fire, find no marker, and
exit immediately. A sibling directory with a similar name is not a match either,
which `npm test` checks explicitly.

## Commands

```
npm test                  # all unit + hook tests (no Kane, no credits, ~2s)
npm run critique:verify   # full tagged suite, unbounded, outside the hook
npm run critique:clear    # close recorded failures + wipe .critique/sessions
npm run critique:publish  # rebuild docs/ledger.json from real state
npm run critique:init     # opt the current project in
```

`npm test` covers the NDJSON parser, claim extraction, suite selection, the code/prose
filter, the cwd guard, and the gate itself — including the fail-open path, the 3-attempt
release, the D-11 recorded-failure block, and D-12 cross-session isolation. It spends no
credits and needs no network.

## Known limitations

- Cached Kane replays do not return `testUrl`. The dashboard shows that as unavailable rather than inventing a link.
- Recorded failures (D-11) are **scoped to the session that produced them** (D-12). A stale recorded failure in *this* session will still block until `npm run critique:clear` or a later passing prosecution of the same files.
- `generate --save` does not keep custom tags; the prosecutor injects `tags: [critique-gate]` after save.
- `generate` cannot take `--files` together with `--save`; prosecution is two Kane turns.
- Claim extraction is regex-based and can fire on prose. Turns that changed **no application
  code** are therefore never prosecuted — a docs-only turn has no browser behaviour to falsify.
  One prosecution in this repo (`prosecutions/and-i-ve-added-part-0-…`) predates that filter and
  is left in place rather than deleted, because it is real evidence of the failure mode.
- Suite counts on the dashboard are derived from the filesystem by `critique:publish`, never
  hand-maintained.
- **The contraband sweep covers one check, not the five originally planned.** Kane's assertion
  engine is `dom` or `visual` only — there is no console/storage assertion mode — so
  "no console errors" and "no secret in localStorage" could not be authored as passing checks
  (both came back `broken`). The working check is the leftover `localhost:4000` probe, which
  asserts against page source. The subject app also carries a real click-triggered
  `window.analytics` TypeError and a placeholder token in `localStorage`; both are genuine
  agent debris, and neither is currently covered by a test. Called out rather than hidden.

## Demo

Follow `DEMO-SCRIPT.md` to film the loop. Run `npm run critique:clear` immediately before recording.
