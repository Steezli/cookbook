---
estimated_steps: 4
estimated_files: 12
---

# T03: Migrate DraftEditor to Pressable and add accessibility labels across core screens

**Slice:** S05 — UX Polish
**Milestone:** M002

## Description

DraftEditor is the sole file using TouchableOpacity (21 occurrences) — every other screen uses Pressable. This inconsistency should be cleaned up. Additionally, only 2 files in the entire app have accessibility labels (GdprConsentBanner and AdBanner). This task migrates DraftEditor to Pressable and adds accessibilityRole/accessibilityLabel to the highest-impact interactive elements across navigation and core flow screens.

## Steps

1. Read `src/features/scans/DraftEditor.tsx`. Replace all `TouchableOpacity` imports and usages with `Pressable`. For each replacement, add `style={({ pressed }) => [existingStyle, { opacity: pressed ? 0.7 : 1 }]}` to preserve the opacity press feedback that TouchableOpacity provided. If any TouchableOpacity had `activeOpacity` prop, translate that value to the pressed opacity. Add `accessibilityRole="button"` and descriptive `accessibilityLabel` to each Pressable (e.g., "Save recipe", "Edit title", "Add ingredient").

2. Add accessibility labels to navigation components — these are the highest-impact targets since they appear on every screen:
   - `src/components/nav/MobileTabBar.tsx` — add `accessibilityRole="tab"` and `accessibilityLabel` to each tab
   - `src/components/nav/TabButton.tsx` — add `accessibilityRole="tab"` and `accessibilityLabel` from tab name
   - `src/components/nav/SidebarItem.tsx` — add `accessibilityRole="link"` and `accessibilityLabel` from item title
   - `src/components/public/PublicNavHeader.tsx` — add labels to Sign In, Get Started buttons

3. Add accessibility labels to core flow screens:
   - `src/features/scan/ScanPhotoUpload.tsx` — add labels to upload button, camera button
   - `src/features/scans/DraftReview.tsx` — add labels to action buttons (save, edit, delete)
   - `src/features/scans/DraftListView.tsx` — add labels to draft cards, batch save button
   - `src/components/recipes/RecipeCard.tsx` — add `accessibilityRole="link"` and label with recipe title
   - `app/(public)/index.tsx` — add labels to filter chips, search input

4. Run `npx tsc --noEmit` to verify zero TypeScript errors. Run `npx jest --passWithNoTests` to verify all tests pass. Verify: `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` returns zero matches. `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` shows ≥20 (up from ~4 in the 2 existing files).

## Must-Haves

- [ ] Zero `TouchableOpacity` imports or usages in `DraftEditor.tsx`
- [ ] All former TouchableOpacity elements use Pressable with pressed opacity feedback
- [ ] accessibilityLabel on DraftEditor interactive elements
- [ ] accessibilityRole + accessibilityLabel on MobileTabBar tabs, TabButton, SidebarItem
- [ ] accessibilityLabel on PublicNavHeader buttons
- [ ] accessibilityLabel on ScanPhotoUpload, DraftReview, DraftListView action elements
- [ ] accessibilityRole + accessibilityLabel on RecipeCard
- [ ] Zero TypeScript errors
- [ ] All existing tests pass

## Verification

- `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` — zero matches
- `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` — ≥20 lines (up from ~4)
- `npx tsc --noEmit` — zero errors
- `npx jest --passWithNoTests` — all tests pass, no regressions

## Observability Impact

- Signals added/changed: None (accessibility labels are static markup, not runtime signals)
- How a future agent inspects this: `rg 'accessibilityLabel' -g '*.tsx' src/ app/` lists all labeled elements; screen readers will announce labels
- Failure state exposed: None — accessibility improvements are additive and don't change runtime behavior

## Inputs

- `src/features/scans/DraftEditor.tsx` — 925 lines, 21 TouchableOpacity occurrences to migrate
- `src/components/nav/MobileTabBar.tsx`, `TabButton.tsx`, `SidebarItem.tsx` — nav components needing labels
- `src/components/public/PublicNavHeader.tsx` — public nav needing labels
- `src/features/scan/ScanPhotoUpload.tsx`, `src/features/scans/DraftReview.tsx`, `DraftListView.tsx` — core flow screens
- `src/components/recipes/RecipeCard.tsx` — shared recipe card component
- S05 Research: "Only GdprConsentBanner.tsx and AdBanner.tsx have accessibilityRole/accessibilityLabel"
- S05 Research common pitfall: "When migrating, add `style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}` to maintain visual feedback"

## Expected Output

- `src/features/scans/DraftEditor.tsx` — migrated from TouchableOpacity to Pressable with pressed feedback and accessibility labels
- ~10 additional files with new accessibilityRole and accessibilityLabel attributes on interactive elements
- No new files created; no new dependencies
