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
npm run critique:verify   # full tagged suite, unbounded, outside the hook
npm run critique:clear    # close recorded failures + wipe .critique/sessions
node .critique/gate-test.mjs
node .critique/guard-test.mjs
```

## Known limitations

- Cached Kane replays do not return `testUrl`. The dashboard shows that as unavailable rather than inventing a link.
- Recorded failures (D-11) are **scoped to the session that produced them** (D-12). A stale recorded failure in *this* session will still block until `npm run critique:clear` or a later passing prosecution of the same files.
- `generate --save` does not keep custom tags; the prosecutor injects `tags: [critique-gate]` after save.
- `generate` cannot take `--files` together with `--save`; prosecution is two Kane turns.

## Demo

Follow `DEMO-SCRIPT.md` to film the loop. Run `npm run critique:clear` immediately before recording.
