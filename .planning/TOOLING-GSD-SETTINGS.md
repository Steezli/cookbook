# Feature: Interactive GSD Settings (model profile + workflow toggles)

## Incoming Request

Allow users to toggle workflow agents on/off and select model profile via interactive settings.

Updates `.planning/config.json` with workflow preferences and model profile selection.

Timestamp: 2026-02-03

## PM Assessment

- **Scope**: Tooling (GSD workflow configuration), not product functionality.
- **Constraints**: Terminal execution is currently rejected in this session, so implementation must be file-based and verifiable by inspection.
- **Primary success**: Provide an interactive mechanism that writes the requested keys to `.planning/config.json`, and ensure config supports `git.branching_strategy`.

Timestamp: 2026-02-03

## PM Routing Decision

Route to **Tech Lead** (tooling/config + lightweight CLI UX).

Timestamp: 2026-02-03

## Tech Lead Implementation

### What changed

- Extended `.planning/config.json` to include:
  - `git.branching_strategy` with default `"none"`
- Added a lightweight interactive Node script:
  - `.planning/gsd-settings.mjs`
  - Prompts for:
    - `model_profile`: `quality | balanced | budget`
    - `workflow.research`: boolean
    - `workflow.plan_check`: boolean
    - `workflow.verifier`: boolean
    - `git.branching_strategy`: `none | phase | milestone`
  - Merges updates into existing config and preserves unrelated keys.

### Files modified / added

- **Modified**: `.planning/config.json`
- **Added**: `.planning/gsd-settings.mjs`

### How to use

Run:

```bash
node .planning/gsd-settings.mjs
```

Timestamp: 2026-02-03

