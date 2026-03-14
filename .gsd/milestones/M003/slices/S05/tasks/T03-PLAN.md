---
estimated_steps: 5
estimated_files: 1
---

# T03: Cross-platform verification on web and iOS simulator

**Slice:** S05 — Full App Audit & Cross-Platform Verification
**Milestone:** M003

## Description

Exercise key flows on web (browser tools) and iOS simulator (mac-tools) to verify T01 and T02 changes work at runtime. Produces the final audit report documenting what was verified, what needs real device testing, and the final state of all M003 success criteria.

## Steps

1. **Start dev server**: Use `bg_shell` to run `npx expo start --web --port 8081` (or appropriate Expo web command). Wait for the server to be ready. Navigate to `http://localhost:8081` with browser tools.

2. **Web verification — auth and main screens**: Verify login page renders (form fields visible, no console errors). Navigate to scan upload page — verify drag-and-drop zone renders. Check that no `Alert.alert` related errors appear in console. Verify collections page renders. Use `browser_assert` for key checks.

3. **Web verification — error handling**: Verify home screen renders without errors. Check that the new error state UI elements exist in the page source for key screens (inspect that error handling code is wired, even if we can't trigger real errors without breaking the backend). Verify RecipeForm renders on create recipe page if accessible.

4. **iOS simulator verification**: Launch Simulator via `open -a Simulator`. Start Expo for iOS or verify Metro connection. Confirm app launches and renders without crashes. Document what screens were visible and what was blocked by the Expo Go dialog or auth requirements.

5. **Write audit report**: Create `.gsd/milestones/M003/slices/S05/AUDIT-REPORT.md` documenting: (a) all screens verified on web with results, (b) all screens verified on iOS with results, (c) what needs real device testing (camera, real OAuth, push notifications, ATT prompt), (d) final checklist of all M003 success criteria with pass/fail/partial status.

## Must-Haves

- [ ] Dev server started and at least 3 web pages loaded without critical errors
- [ ] iOS simulator launched and app connected to Metro bundler
- [ ] Audit report written with screen-by-screen results
- [ ] Audit report includes "needs real device" section
- [ ] Audit report includes M003 success criteria checklist

## Verification

- `test -f .gsd/milestones/M003/slices/S05/AUDIT-REPORT.md` — audit report exists
- Web dev server ran and pages were loaded (verified via browser tools)
- iOS simulator was launched (verified via mac-tools)
- Audit report contains sections for web verification, iOS verification, real device gaps, and success criteria

## Observability Impact

- Signals added/changed: None — verification task, no code changes
- How a future agent inspects this: Read `AUDIT-REPORT.md` for the definitive record of what was verified
- Failure state exposed: None

## Inputs

- T01 output: `src/lib/alert.ts` deployed, all `Alert.alert` calls replaced
- T02 output: error handling gaps fixed, RecipeForm focus chaining wired, hardcoded color replaced
- S03 Summary: DraftEditor/DraftManager visual verification gap noted
- S04 Summary: 499 test baseline, console.log cleanup complete

## Expected Output

- `.gsd/milestones/M003/slices/S05/AUDIT-REPORT.md` — comprehensive audit report with:
  - Web verification results (screen-by-screen)
  - iOS simulator verification results
  - Real device testing gaps
  - M003 success criteria final checklist
