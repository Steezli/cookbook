---
id: T08
parent: S09
milestone: M001
provides:
  - Safe area inset handling on recipe detail sticky header
  - Safe area inset handling on cooking mode top bar
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 3min
verification_result: passed
completed_at: 2026-03-05
blocker_discovered: false
---
# T08: 10-core-screens 07

**## Performance**

## What Happened

## Performance
All must_haves truths satisfied. Both screens import useSafeAreaInsets and apply insets.top to header Views.

## Accomplishments
- Recipe detail sticky header renders below iOS status bar / Dynamic Island with paddingTop: insets.top + 12
- Cooking mode top bar renders below status bar with paddingTop: insets.top + 16
- Start Cooking button visible and tappable, unblocking UAT tests 8, 9, 10
- All early-return states (loading, error, not-found) also clear the status bar

## Task Commits
- fix(10-07): add safe area insets to recipe detail and cooking mode headers
