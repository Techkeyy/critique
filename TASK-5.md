# TASK #5 — The gate skeleton (synchronous)

Read `LEDGER.md` and `BUILDER-BRIEF.md` (ground rules) first. This supersedes the probe.

**STATUS UNBLOCK:** R2 is closed. A `Stop` hook fired on a live agent turn, `exit 2` blocked the
stop, and the stderr text reached the model verbatim. The captured payload is in
`.critique/probe-log.json`. Build against **that** schema, not the published docs — they are wrong
about `stop_hook_active`.

---

**OBJECTIVE:** Replace the one-shot probe with the real gate. When the agent finishes a turn in
which it edited code, Kane runs, and a failure denies the agent its exit with actionable text.

**CONTEXT:** This is the product's spine. Everything after this task — claim extraction,
prosecution, the ledger, the dashboard — hangs off it. Keep the prosecution stubbed for now:
one cached contraband replay. It is free and takes ~40s. Claim extraction is Task #6.

**CURRENT STATE:**
- `~/.claude/settings.json` registers a `Stop` hook → `.claude/hooks/gate-probe.mjs` (the probe).
- `.claude/settings.json` (project) registers the same probe. **Redundant — remove the project one.**
- `.claude/hooks/gate-probe.mjs` holds the working cwd guard (D-08, forward-slash normalized) and
  a one-shot flag. Keep the guard, discard the one-shot behaviour.
- `src/kane.mjs` / `src/ndjson.mjs` exist. Task #4 corrections may still be in flight.
- `.critique/guard-test.mjs` is the guard's regression test — 6 cases, keep it passing.

---

## REQUIRED CHANGES

### 1. `.claude/hooks/observe.mjs` — new, registered on `PostToolUse`, matcher `Edit|Write`

Appends the edited file path to `.critique/sessions/<session_id>/touched.json` (deduped array).
Must **never** block and must **never** throw — `PostToolUse` cannot block, and a crash here
poisons every turn. Wrap the whole body in try/catch and always `process.exit(0)`.

Include the same cwd guard as the gate.

### 2. `.claude/hooks/gate.mjs` — new, replaces the probe on `Stop`

Execution order is mandatory:

```
1. cwd guard (reuse D-08 forward-slash normalization) ................. else exit 0
2. if payload.stop_hook_active === true  → we are already inside a
   gate-induced continuation. Read attempts.json; if attempts >= 3,
   write a receipt marked OWED and exit 0. .......................... hard escape
3. read .critique/sessions/<session_id>/touched.json
   if empty or missing → no code was touched this turn → exit 0 ...... scope check
4. run the contraband suite via src/kane.mjs (cached replay)
5. verdict:
   pass → append to .critique/ledger.json, clear touched.json, exit 0
   fail → increment attempts.json,
          write failureDetail + test_url to STDERR,
          exit 2
```

**Use `stop_hook_active` as the primary loop guard** — it is Claude Code's own re-entry signal
and is more reliable than counting. Keep the attempts counter as the backstop; both must be
present. Max 3 attempts, then release with an OWED receipt. A gate that cannot release is worse
than no gate.

### 3. Register both hooks in `~/.claude/settings.json`

`Stop` → `gate.mjs`. `PostToolUse` matcher `Edit|Write` → `observe.mjs`. Absolute paths.
Delete the project-level `.claude/settings.json` hook block so there is exactly one registration
site. Retire `gate-probe.mjs` (delete it; the guard logic moves into a shared `src/guard.mjs`
imported by both hooks — do not copy-paste it twice).

---

## IMPLEMENTATION REQUIREMENTS

- **Timeout the gate.** Set `timeout: 120` in the hook registration and pass `--timeout` to Kane.
  If Kane exceeds it, **exit 0** (allow the stop) and record the turn as OWED. Never strand the
  user because Kane was slow.
- **Any unexpected exception in `gate.mjs` must exit 0**, not 2. Fail open. A crashing gate that
  fails closed makes the agent unusable.
- stderr text must be self-contained and actionable: what was claimed, what failed, the failing
  step, and the `test_url` when present. The agent sees only this string.
- Keep zero runtime dependencies.
- `.critique/sessions/` is gitignored; `.critique/ledger.json` is **not** — it is a deliverable.

## DO NOT

- Do not implement claim extraction, `kane-cli generate`, prosecution, or the dashboard.
- Do not author new Kane tests. Replay the existing cached contraband test only — it is free.
- Do not remove or weaken the cwd guard or the max-attempts backstop.
- Do not let the gate fire on turns with no code edits. That is the difference between a tool
  people keep and one they uninstall in an hour.

## ACCEPTANCE CRITERIA

1. A turn that edits **no** files → gate exits 0 silently, no Kane run, no perceptible delay.
2. A turn that edits a file → Kane replay runs, agent is allowed to stop on pass.
3. **Forced failure** (point the gate at a deliberately failing copy of the test) → the agent is
   blocked, and the stderr it receives names the failing step in language a developer could act on.
4. After 3 blocked attempts the gate releases and records an OWED receipt. Demonstrate this.
5. `node .critique/guard-test.mjs` still passes (update it to target `gate.mjs`).
6. Killing Kane mid-run, or a thrown exception, results in exit 0 — never a stuck agent.

## TESTING

Drive the hooks offline by piping captured payloads (`.critique/probe-log.json` has a real one)
rather than burning live agent turns. Only the final end-to-end check needs a real session.
**Write test fixtures with the Write tool, not Bash heredocs — see D-09.**

## REPORT BACK

Files created/changed · the exact stderr string produced on a forced failure · proof of the
3-attempt release · confirmation that a no-edit turn costs nothing · which registration site is
now authoritative.
