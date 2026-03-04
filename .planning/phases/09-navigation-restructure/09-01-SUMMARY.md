---
phase: 09-navigation-restructure
plan: 01
subsystem: ui
tags: [lucide-react-native, jest, tsx, react-native, breakpoint, navigation, components]

# Dependency graph
requires:
  - phase: 08-design-foundation
    provides: useBreakpoint hook, tokens, font loading

provides:
  - lucide-react-native icon library installed
  - jest configured for .tsx component test files
  - src/components/nav/types.ts with TabDestination, SidebarDestination, PageContainerVariant, PADDING_BY_BREAKPOINT, MAX_WIDTH_BY_VARIANT
  - PageContainer component with breakpoint-aware padding and max-width variants
  - __mocks__/react-native.js for node test environment
  - getContainerStyle pure function exported for unit testing

affects:
  - 09-02 (MobileTabBar uses TabDestination type, lucide icons)
  - 09-03 (WebSidebar uses SidebarDestination type, lucide icons)
  - all future nav component tests (jest tsx config, react-native mock)

# Tech tracking
tech-stack:
  added:
    - lucide-react-native (^0.576.0)
  patterns:
    - Pure function extraction for testability in node environment (getContainerStyle exported separately from PageContainer)
    - __mocks__/react-native.js stub pattern for component tests without renderer
    - ts-jest transform with jsx:react override for tsx files

key-files:
  created:
    - src/components/nav/types.ts
    - src/components/nav/PageContainer.tsx
    - src/components/nav/__tests__/PageContainer.test.tsx
    - __mocks__/react-native.js
  modified:
    - jest.config.js
    - package.json
    - package-lock.json

key-decisions:
  - "tsx test config: ts-jest transform with jsx:react override (not react-native) for node test environment compatibility"
  - "react-native mock: __mocks__/react-native.js with moduleNameMapper rather than per-test jest.mock() — applies globally to all nav component tests"
  - "getContainerStyle pure function exported from PageContainer for direct unit testing without React renderer"

patterns-established:
  - "Node-environment TSX testing: ts-jest transform jsx:react + __mocks__/react-native.js stub"
  - "Pure function extraction: complex component logic extracted to exported pure function for testability"

requirements-completed: [NAV-05]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 9 Plan 01: Foundation — Icons, Test Infrastructure, Types, PageContainer Summary

**lucide-react-native installed, jest configured for .tsx files, nav type contracts created, PageContainer with 7 unit tests covering all breakpoints and variants**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T06:58:30Z
- **Completed:** 2026-03-04T07:02:11Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- lucide-react-native (^0.576.0) installed — provides Home, BookOpen, Camera, Heart, User, LayoutGrid, Folder, Settings, Bell, Search icons for Plans 02 and 03
- jest configured to handle .tsx test files with ts-jest JSX transform and react-native mock stub
- Shared nav type contracts in `src/components/nav/types.ts` — TabDestination, SidebarDestination, PageContainerVariant, PADDING_BY_BREAKPOINT, MAX_WIDTH_BY_VARIANT
- PageContainer component with breakpoint-aware padding (20/32/40px mobile/tablet/web) and max-width variants (form: 600px, content: 960px) — 7 unit tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install lucide, fix jest config, create nav type contracts** - `61a03c5` (chore)
2. **Task 2 RED: failing tests for PageContainer** - `3b2f1ce` (test)
3. **Task 2 GREEN: implement PageContainer with 7 passing tests** - `5161292` (feat)

_Note: TDD task 2 has two commits (test RED → feat GREEN)_

## Files Created/Modified

- `src/components/nav/types.ts` - Shared nav type contracts and constants for all Phase 9 components
- `src/components/nav/PageContainer.tsx` - Screen wrapper with breakpoint padding and max-width variants; exports getContainerStyle pure function
- `src/components/nav/__tests__/PageContainer.test.tsx` - 7 unit tests for getContainerStyle (3 breakpoints, 2 variants, style merging, default variant)
- `__mocks__/react-native.js` - Minimal react-native stub for Jest node environment
- `jest.config.js` - Added .test.tsx to testMatch, ts-jest tsx transform with jsx:react, react-native mock moduleNameMapper
- `package.json` - Added lucide-react-native dependency
- `package-lock.json` - Updated lock file

## Decisions Made

- **tsx test config:** Used ts-jest transform with `jsx: 'react'` override. The tsconfig extends `expo/tsconfig.base` which sets `jsx: react-native`, but that requires the react-native renderer. For a node test environment testing pure functions, `jsx: react` is the correct choice — it compiles JSX to `React.createElement` calls without a native renderer.
- **react-native mock via moduleNameMapper:** Added `__mocks__/react-native.js` mapped in jest config rather than requiring each test file to call `jest.mock('react-native')`. This applies globally to all nav component tests — cleaner and consistent.
- **getContainerStyle exported:** The pure logic function is exported from PageContainer.tsx enabling direct unit testing in a node environment without React rendering infrastructure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added jest tsx transform config and react-native mock**
- **Found during:** Task 2 (GREEN phase — running tests after creating PageContainer.tsx)
- **Issue:** ts-jest couldn't parse JSX in PageContainer.tsx. Error: `SyntaxError: Unexpected token '<'`. The jest config had no transform specified for `.tsx` files, and `expo/tsconfig.base` uses `jsx: react-native` which doesn't work in a node environment.
- **Fix:** Added `transform` config to jest.config.js with `ts-jest` jsx:react override. Added `moduleNameMapper` for react-native pointing to `__mocks__/react-native.js`. Created minimal `__mocks__/react-native.js` stub.
- **Files modified:** jest.config.js, `__mocks__/react-native.js` (new)
- **Verification:** `npx jest PageContainer` — 7 tests pass. Full suite: 149 passing (was 142 before, +7 new).
- **Committed in:** `5161292` (Task 2 feat commit)

---

**Total deviations:** 1 auto-fixed (1 blocking infrastructure issue)
**Impact on plan:** Required fix — jsx:react transform is the only way to test tsx component files in a node environment. No scope creep; this is exactly the kind of test infrastructure needed.

## Issues Encountered

- Pre-existing test failures in `src/lib/scan/__tests__/scan-draft-service.test.ts` (2 failures). Verified these existed before our changes by stashing and running baseline. Not related to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 02 and 03 can now import from `src/components/nav/types.ts` for type contracts
- lucide-react-native available for icon usage in MobileTabBar and WebSidebar
- Jest tsx testing pattern established — future nav component tests follow the same pattern
- PageContainer ready to wrap all screens in Phase 9 route restructure

---
*Phase: 09-navigation-restructure*
*Completed: 2026-03-04*
