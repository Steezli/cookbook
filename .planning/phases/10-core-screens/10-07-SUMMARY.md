---
phase: 10-core-screens
plan: "07"
subsystem: ui
tags: [react-native, safe-area, ios, expo-router]

# Dependency graph
requires:
  - phase: 10-core-screens/10-06
    provides: Stack navigator layout with headerShown false for recipes tab
provides:
  - Safe area inset handling on recipe detail sticky header
  - Safe area inset handling on cooking mode top bar
affects: [10-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useSafeAreaInsets for screens inside headerShown:false Stack navigators

key-files:
  created: []
  modified:
    - app/(tabs)/recipes/[id].tsx
    - app/(tabs)/recipes/[id]/cook.tsx

key-decisions:
  - "10-07 Safe area via useSafeAreaInsets hook: both recipe detail and cooking mode apply paddingTop: insets.top to their header Views rather than wrapping in PageContainer, since both screens have custom layouts incompatible with PageContainer"
  - "10-07 Outer View keeps flex:1 only: background color extends behind status bar for visual continuity; only the first interactive child (header) gets inset padding"

patterns-established:
  - "Safe area inset on custom headers: screens with headerShown:false that build their own sticky header apply paddingTop: insets.top + contentPadding to the header View"

requirements-completed: [SCREEN-03, SCREEN-04a]

# Metrics
duration: 3min
completed: 2026-03-05
---

## Performance
All must_haves truths satisfied. Both screens import useSafeAreaInsets and apply insets.top to header Views.

## Accomplishments
- Recipe detail sticky header renders below iOS status bar / Dynamic Island with paddingTop: insets.top + 12
- Cooking mode top bar renders below status bar with paddingTop: insets.top + 16
- Start Cooking button visible and tappable, unblocking UAT tests 8, 9, 10
- All early-return states (loading, error, not-found) also clear the status bar

## Task Commits
- fix(10-07): add safe area insets to recipe detail and cooking mode headers
