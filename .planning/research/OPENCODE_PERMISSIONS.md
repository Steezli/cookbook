# OpenCode tool permissions (fixing rejected `bash`)

**Date:** 2026-02-02

## Incoming issue

During plan execution, all shell commands via the `bash` tool were rejected (even `pwd` / `git status`), blocking automated execution.

## Findings

- The project contains a repo-local `opencode.json` at `./opencode.json` that is **empty** (invalid JSON).
- The user-level OpenCode config at `~/.config/opencode/opencode.json` contains a `permission` block that allows `read`/`external_directory` but does **not** mention `bash`.

From OpenCode SDK types, tool permissions are configurable via `permission.bash` (values: `"ask" | "allow" | "deny"`), optionally as pattern rules.

## Update (2026-02-03): subagent name mismatch can still block shell

Even with repo-level `"permission": { "bash": "allow" }`, shell calls can still be rejected if you grant permissions to the wrong agent identifier.

- In this repo, there are two similarly named agents: `Gsd-Executor` and `gsd-executor`.
- If `opencode.json` only grants tool permissions under `agent.Gsd-Executor`, then runs invoked as `gsd-executor` may still inherit a default-deny tool policy (depending on your global config / OpenCode defaults).

Recommended fix: grant `bash` (and `shell` if used) to both keys under `"agent"`, and restart the OpenCode session so config reloads.

## Recommended fix

### Option A (recommended): enable `bash` for this project

Make `./opencode.json` valid JSON and allow `bash`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "allow"
  }
}
```

Restart OpenCode session after changes.

### Option B: enable `bash` globally

Add `"bash": "allow"` under the `permission` block in `~/.config/opencode/opencode.json`.

### Option C: prompt every time

Use `"bash": "ask"` to have OpenCode prompt you to allow/reject each time.

## Specialist routing log

- **PM**: triaged as tooling/permissions blocker; routed to **Tech Lead** for fastest unblock.
- **Tech Lead**: confirmed permission keys include `bash` and empty `opencode.json` is invalid JSON (likely causing hard rejection).

