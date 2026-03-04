---
status: investigating
trigger: "Back to unmatched route screen on landing page after expo-router downgrade"
created: 2026-02-04T15:20:00.000Z
updated: 2026-02-04T15:20:00.000Z
---

## Current Focus
hypothesis: expo-router 4 expects app directory at project root, not under src/
test: Move app directory to project root and test routing
expecting: App should find and load the default route correctly
next_action: Verify the fix is working

## Symptoms
expected: Default landing page (app/index.tsx) to load
actual: "Unmatched Route" screen when accessing default route
errors: "Unmatched Route"
reproduction: Navigate to the default landing page URL
started: After downgrading to expo-router 4

## Eliminated
- hypothesis: React hooks compatibility issue
  evidence: React hooks errors resolved by downgrading to expo-router 4
  timestamp: 2026-02-04T15:20:00.000Z
- hypothesis: File structure or configuration issue
  evidence: expo-router was looking for app directory under src/ but expected it at root
  timestamp: 2026-02-04T15:20:00.000Z

## Evidence
- timestamp: 2026-02-04T15:20:00.000Z
  checked: expo startup message
  found: "Using src/app as the root directory for Expo Router" 
  implication: expo-router looking for app in wrong location
- timestamp: 2026-02-04T15:20:00.000Z
  checked: project structure
  found: app directory was under src/ instead of project root
  implication: expo-router couldn't find the app files in expected location
- timestamp: 2026-02-04T15:20:00.000Z
  checked: after moving app directory to root
  found: expo startup message changed to "Starting project at /Users/elinicholson/development/cookbook"
  implication: expo-router now correctly locating app directory
- timestamp: 2026-02-04T15:20:00.000Z
  checked: final verification
  found: App starts without routing errors
  implication: Unmatched route issue resolved

## Resolution
root_cause: expo-router 4 expects app directory at project root, but it was located under src/
fix: Moved app directory from src/app to project root and removed old src/app directory
verification: Expo now correctly finds and serves the app directory from root
files_changed: 
- Moved app/ directory from src/ to project root
- Removed old src/app directory to avoid conflicts