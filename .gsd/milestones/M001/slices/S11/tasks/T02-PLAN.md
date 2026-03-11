# T02: 11.1-audit-cleanup 02

**Slice:** S11 — **Milestone:** M001

## Description

Fix three small tech debt items from the v1.1 audit: correct a stale comment, remove an unnecessary type assertion, and unify scan navigation methods.

Purpose: Close remaining audit items that are independent of the token extraction work.
Output: Three files with targeted single-line fixes.

## Must-Haves

- [ ] "Stale comment in (tabs)/_layout.tsx correctly says 4 tab routes, not 5"
- [ ] "The as any type assertion in (public)/index.tsx is removed and TypeScript compiles"
- [ ] "MobileTabBar and WebSidebar both use router.navigate for scan navigation"

## Files

- `app/(tabs)/_layout.tsx`
- `app/(public)/index.tsx`
- `src/components/nav/MobileTabBar.tsx`
