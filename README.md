# Critique

A Claude Code plugin that intercepts the coding agent at `Stop`, prosecutes its closing claim in a real browser via Kane CLI, and refuses to let it exit until the claim survives. Every prosecution seals into a cached `_test.md`. The suite is exhaust — a human did not write it.

## Dashboard

Live: **https://techkeyy.github.io/critique/**

Vanilla HTML/CSS/JS reading `docs/ledger.json` (snapshot also at `public/ledger.json`). No build step.

## Local

```
node .critique/gate-test.mjs
node .critique/guard-test.mjs
```
