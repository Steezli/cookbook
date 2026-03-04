# Feature: OpenCode Shell Command Rejections (bash/shell tool)

**Created:** 2026-02-03  
**Status:** Investigating / blocked  
**Priority:** High (blocks automated execution + verification workflows)

---

## Incoming Request

**From:** Orchestrator question during interactive session  
**Date:** 2026-02-03  
**Request:** "You have access to bash so why can't you execute commands?"

---

## PM Routing Decision

**Timestamp:** 2026-02-03

### Routing

- **Tech Lead:** Triage tooling/permissions and determine why shell invocations are rejected at runtime.

---

## Tech Lead Triage Notes

**Timestamp:** 2026-02-03

### What we observed

- Shell invocations are rejected by the runner before execution, even for harmless commands like `pwd`.
- Example runtime result in this session: `Rejected:` (no further error message).

### What this implies

- Tool presence in the agent's tool list does not guarantee execution is permitted.
- The denial appears to occur in the execution layer (permission gate / runner), not in the app code.

### Local config checks (repo + user)

- Repo config `./opencode.json` includes:
  - `"permission": { "bash": "allow", "shell": "allow" }`
  - Agent overrides for `gsd-*` agents also allow `bash` and `shell`
- User config `~/.config/opencode/opencode.json` includes:
  - `"permission": { "bash": "allow", "shell": "allow" }`

### Likely causes / next steps

- OpenCode session may need restart so updated permissions are reloaded.
- There may be an agent identifier mismatch (permissions granted to one agent key while the runner uses another).
- If a Cursor/OpenCode bridge is in use (see user config plugin list), the bridge may enforce its own tool allowlist.

### Reference

- Additional background: `.planning/research/OPENCODE_PERMISSIONS.md`

