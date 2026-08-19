# Critique

A Claude Code plugin that intercepts the coding agent at `Stop`, prosecutes its closing claim in a real browser via Kane CLI, and refuses to let it exit until the claim survives. Every prosecution seals into a cached `_test.md`. The suite is exhaust — a human did not write the claim-verification cases.

## Live

- Dashboard: **https://techkeyy.github.io/critique/**
- Subject app: **https://techkeyy.github.io/critique/demo/**
- Repo: https://github.com/Techkeyy/critique

## Install (stranger)

1. Install [Kane CLI](https://www.npmjs.com/package/@testmuai/kane-cli) and sign in (`kane-cli whoami`).
2. Clone this repo. Working directory must be the clone root.
3. Node 20+ (`type: module`, no install: zero runtime dependencies).
4. Register the Stop / PostToolUse hooks in `~/.claude/settings.json` pointing at absolute paths:

```
node C:/path/to/critique/.claude/hooks/observe.mjs
node C:/path/to/critique/.claude/hooks/gate.mjs
```

See this repo's user-level pattern: Stop timeout 120, PostToolUse matcher `Edit|Write`.
5. Open Claude Code with cwd = this repo. Edit a file, stop. The gate runs.

## Commands

```
npm test                  # all unit + hook tests (no Kane, no credits, ~2s)
npm run critique:verify   # full tagged suite, unbounded, outside the hook
npm run critique:clear    # close recorded failures + wipe .critique/sessions
npm run critique:publish  # rebuild docs/ledger.json from real state
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

## Demo

Follow `DEMO-SCRIPT.md` to film the loop. Run `npm run critique:clear` immediately before recording.
