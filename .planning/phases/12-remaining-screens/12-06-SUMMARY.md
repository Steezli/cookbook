---
phase: 12-remaining-screens
plan: "06"
subsystem: auth
tags: [supabase, session, scan, navigation, ios, expo-router]

requires:
  - phase: 12-remaining-screens
    provides: scan upload flow and profile/settings screen (plans 04, 05)

provides:
  - Scan auth check reads local session cache instead of making server-side JWT validation call
  - Sign-out has exactly one navigation path (reactive Redirect in _layout.tsx)

affects: [scan, profile, logout, auth-flow]

tech-stack:
  added: []
  patterns:
    - "getSession() over getUser() for auth checks in service layer — local cache read, auto-refreshes expired access tokens"
    - "Reactive Redirect pattern — session null triggers _layout.tsx redirect, explicit router.replace after signOut is redundant and causes double-navigation on iOS"

key-files:
  created: []
  modified:
    - src/features/scan/scan-service.ts
    - app/(tabs)/profile.tsx
    - app/(auth)/logout.tsx

key-decisions:
  - "12-06 getSession() in scan-service: getSession() reads locally cached session and auto-refreshes expired access tokens; getUser() makes a server call that fails when the access token is expired but session exists locally"
  - "12-06 Single sign-out navigation path: reactive Redirect in (tabs)/_layout.tsx is the sole navigation path on sign-out; explicit router.replace after signOut causes two rapid navigations on iOS producing a visible flash"

patterns-established:
  - "Service layer auth pattern: use getSession() not getUser() for auth checks in async service functions"

requirements-completed: [SCREEN-07, SCREEN-09]

duration: 10min
completed: 2026-03-10
---

# Phase 12 Plan 06: Auth/Session Fix Summary

**Scan upload auth fixed by reading local session cache (getSession) instead of server-side JWT validation (getUser), and iOS sign-out flash eliminated by removing duplicate explicit navigation alongside the existing reactive Redirect.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced all 4 `getUser()` calls in scan-service.ts with `getSession()`, fixing "Not authenticated" errors when access tokens expire mid-session
- Removed `router.replace("/(auth)/login")` from `profile.tsx` handleSignOut — reactive Redirect in `_layout.tsx` already handles this, double navigation caused iOS flash
- Removed `router.replace("/")` from `logout.tsx` finally block for the same reason, and removed now-unused `router` imports from both files

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace getUser() with getSession() in scan-service.ts** - `6ecdaab` (fix)
2. **Task 2: Fix sign-out double navigation flash on iOS** - `9e1555f` (fix)

## Files Created/Modified

- `src/features/scan/scan-service.ts` - All 4 getUser() calls replaced with getSession() pattern; user variable extracted from session.user for backward-compatible function bodies
- `app/(tabs)/profile.tsx` - Removed explicit router.replace to auth/login after signOut; removed now-unused router import
- `app/(auth)/logout.tsx` - Removed router.replace('/') from finally block; removed now-unused router import

## Decisions Made

- `getSession()` reads the locally cached session and auto-refreshes expired access tokens via the Supabase SDK; `getUser()` makes a network call that fails when the access token is expired even if a valid session exists locally
- The reactive `<Redirect href="/(auth)/login" />` in `(tabs)/_layout.tsx` is the correct single navigation path after sign-out; any additional explicit `router.replace` calls race with it and cause double navigation on iOS native, producing a visible flash

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unused `router` import from profile.tsx and logout.tsx**
- **Found during:** Task 2 (Fix sign-out double navigation)
- **Issue:** After removing the explicit router.replace calls, the `router` import became unused — TypeScript would flag it and it's dead code
- **Fix:** Removed `import { router } from "expo-router"` from both files
- **Files modified:** app/(tabs)/profile.tsx, app/(auth)/logout.tsx
- **Verification:** TypeScript compiles cleanly with `npx tsc --noEmit`
- **Committed in:** 9e1555f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — unused import cleanup)
**Impact on plan:** Minor cleanup required by the planned change. No scope creep.

## Issues Encountered

None — both fixes applied cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scan upload "Not authenticated" blocker resolved — scan-to-draft flow should work even after 1+ hour sessions
- iOS sign-out double flash resolved — clean single transition to login screen
- UAT gaps SCREEN-07 and SCREEN-09 closed
- Ready to proceed with remaining UAT gap closure plans (07, 08, 09)

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
