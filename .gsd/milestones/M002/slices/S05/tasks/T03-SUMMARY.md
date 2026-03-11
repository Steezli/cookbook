---
id: T03
parent: S05
milestone: M002
provides:
  - DraftEditor fully migrated from TouchableOpacity to Pressable with pressed opacity feedback
  - ScanPhotoUpload fully migrated from TouchableOpacity to Pressable (bonus cleanup)
  - 46 accessibilityLabel attributes across nav, scan flow, draft management, public browse, and recipe card components
key_files:
  - src/features/scans/DraftEditor.tsx
  - src/components/nav/TabButton.tsx
  - src/components/nav/MobileTabBar.tsx
  - src/components/nav/SidebarItem.tsx
  - src/components/public/PublicNavHeader.tsx
  - src/features/scan/ScanPhotoUpload.tsx
  - src/features/scans/DraftReview.tsx
  - src/features/scans/DraftListView.tsx
  - src/components/recipes/RecipeCard.tsx
  - app/(public)/index.tsx
key_decisions:
  - Also migrated ScanPhotoUpload from TouchableOpacity to Pressable — it had 10 occurrences and was touched anyway for accessibility labels, so cleaning it up was zero-cost
patterns_established:
  - Pressable with pressed opacity feedback — `style={({ pressed }) => [existingStyle, { opacity: pressed ? 0.7 : 1 }]}` replaces TouchableOpacity across the app
  - accessibilityState for selected/focused elements — tabs, sidebar items, filter chips use `accessibilityState={{ selected: isFocused }}` alongside role and label
  - Dynamic accessibility labels — labels that include dynamic content (recipe titles, step numbers, photo indices) for screen reader context
observability_surfaces:
  - none — accessibility labels are static markup with no runtime signals
duration: ~20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Migrated DraftEditor to Pressable and added accessibility labels across 10 core screen files

**Replaced all TouchableOpacity with Pressable + pressed feedback in DraftEditor and ScanPhotoUpload, and added accessibilityRole/accessibilityLabel to 46 interactive elements across navigation, scan flow, draft management, and public browse screens.**

## What Happened

Migrated DraftEditor.tsx from TouchableOpacity (21 occurrences) to Pressable with `({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })` style callbacks preserving the press feedback UX. Also migrated ScanPhotoUpload.tsx (10 occurrences) since it was already being touched for accessibility labels.

Added accessibility attributes to the highest-impact interactive elements:
- **Navigation**: TabButton now accepts a `label` prop and sets `accessibilityRole="tab"` + `accessibilityState={{ selected }}`. MobileTabBar passes labels ("Home", "My Recipes", "Family", "Profile") and the scan button has `accessibilityRole="button"`. SidebarItem gets `accessibilityRole="link"` with the item label.
- **Public nav**: SignInButton, GetStartedButton, filter chips, and back buttons all have `accessibilityRole="button"` and descriptive labels. Filter chips also use `accessibilityState={{ selected }}`.
- **Scan flow**: ScanPhotoUpload upload area, photo preview, remove/reorder buttons, clear all, upload, and close preview all labeled. DraftReview action buttons (Edit Draft, Back to Scans, Save as Recipe, Discard Draft) and photo thumbnails labeled.
- **Draft list**: Draft cards get `accessibilityLabel` with the draft title, batch save and close buttons labeled.
- **Recipe cards**: RecipeCard and public browse recipe cards/rows get `accessibilityRole="link"` with recipe title.
- **Public browse**: Web filter chips get labels and selected state.

## Verification

- `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` — **zero matches** ✓
- `rg 'TouchableOpacity' src/features/scan/ScanPhotoUpload.tsx` — **zero matches** ✓
- `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` — **46 lines** (up from ~4) ✓
- `npx tsc --noEmit` — **zero TypeScript errors** ✓
- `npx jest --passWithNoTests` — **483 tests passed, zero failures** ✓

### Slice-level verification status

- ✅ `npx jest --passWithNoTests` — 483 passing, zero failures
- ✅ `npx tsc --noEmit` — zero errors
- ✅ `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` — zero matches
- ✅ `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` — 46 (significantly above baseline)
- ✅ Browser: GdprConsentBanner (T01 — verified in T01)
- ✅ Browser: +not-found.tsx design tokens (T02 — verified in T02)
- ✅ Browser: ErrorBoundary fallback (T02 — verified in T02)

## Diagnostics

None — accessibility labels are static markup. Inspect with:
- `rg 'accessibilityLabel' -g '*.tsx' src/ app/` — lists all labeled elements
- Screen readers will announce labels at runtime

## Deviations

- Also migrated ScanPhotoUpload.tsx from TouchableOpacity to Pressable (not in plan, but was already being edited for accessibility and had 10 TouchableOpacity instances)

## Known Issues

- 2 files still use TouchableOpacity: `DraftManager.tsx` and `ScanJobList.tsx` — these were not in scope for this task

## Files Created/Modified

- `src/features/scans/DraftEditor.tsx` — replaced 21 TouchableOpacity with Pressable + pressed opacity + accessibility labels
- `src/features/scan/ScanPhotoUpload.tsx` — replaced 10 TouchableOpacity with Pressable + pressed opacity + accessibility labels
- `src/components/nav/TabButton.tsx` — added `label` prop, `accessibilityRole="tab"`, `accessibilityState`
- `src/components/nav/MobileTabBar.tsx` — passes label props to all TabButton instances, scan button labeled
- `src/components/nav/SidebarItem.tsx` — added `accessibilityRole="link"`, `accessibilityLabel`, `accessibilityState`
- `src/components/public/PublicNavHeader.tsx` — labeled SignIn, GetStarted, filter chips, back buttons
- `src/features/scans/DraftReview.tsx` — labeled action buttons and photo thumbnails
- `src/features/scans/DraftListView.tsx` — labeled draft cards, batch save, close, back buttons
- `src/components/recipes/RecipeCard.tsx` — added `accessibilityRole="link"` and label with recipe title
- `app/(public)/index.tsx` — labeled PublicListRow, PublicRecipeCard, web filter chips
