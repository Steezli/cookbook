---
status: resolved
trigger: "Recipe detail screen does not respect iOS safe area boundaries. Sticky header renders behind iOS status bar / Dynamic Island, making Start Cooking button untappable."
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: Recipe detail screen uses raw View with no safe area inset padding, while all working screens use PageContainer or useSafeAreaInsets
test: Compare recipe detail ([id].tsx) outer wrapper with recipe list (index.tsx) outer wrapper
expecting: Recipe detail lacks paddingTop: insets.top that PageContainer provides
next_action: Document root cause

## Symptoms

expected: Sticky header (back arrow + "Start Cooking" button) renders below the iOS status bar / Dynamic Island, fully visible and tappable
actual: Sticky header renders behind the iOS status bar / Dynamic Island, overlapping system UI, making "Start Cooking" button untappable
errors: No runtime errors -- purely a layout/positioning issue
reproduction: Open any recipe detail screen on iOS device with Dynamic Island or notch
started: Since the recipe detail screen was first implemented (never worked correctly)

## Eliminated

(none -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-03-04T00:00:00Z
  checked: app/(tabs)/recipes/[id].tsx main render return (lines 1025-1155)
  found: Outer wrapper is `<View style={{ flex: 1, backgroundColor: bgPage }}>` with NO safe area inset padding. The sticky header View (lines 1028-1101) uses paddingVertical: 12 but no top inset offset.
  implication: The entire screen starts at y=0 (behind the status bar / Dynamic Island), so the sticky header is obscured.

- timestamp: 2026-03-04T00:00:00Z
  checked: app/(tabs)/recipes/index.tsx (recipe list -- passes safe area tests)
  found: Uses `<PageContainer>` as its root wrapper (line 148)
  implication: PageContainer applies `paddingTop: insets.top` (confirmed in src/components/nav/PageContainer.tsx line 36), which is why recipe list respects safe areas.

- timestamp: 2026-03-04T00:00:00Z
  checked: src/components/nav/PageContainer.tsx (lines 30-40)
  found: `const insets = useSafeAreaInsets()` then applies `paddingTop: insets.top` to the outer View
  implication: This is the established safe area pattern in the codebase. Recipe detail does not use it.

- timestamp: 2026-03-04T00:00:00Z
  checked: app/(tabs)/recipes/_layout.tsx
  found: Stack navigator with `headerShown: false` -- so there is no native header providing safe area offset
  implication: Each screen in the recipes stack is responsible for its own safe area handling. [id].tsx does not handle it.

- timestamp: 2026-03-04T00:00:00Z
  checked: app/(tabs)/profile.tsx (another screen that handles safe areas directly)
  found: Uses `const insets = useSafeAreaInsets()` directly (line 19), applies insets.top as padding
  implication: Even screens not using PageContainer follow the same pattern -- recipe detail is the outlier.

## Resolution

root_cause: The recipe detail screen (`app/(tabs)/recipes/[id].tsx`) renders its content starting at y=0 with no safe area inset padding. The Stack navigator layout has `headerShown: false`, so there is no native header to push content below the status bar. Unlike the recipe list screen (which uses `<PageContainer>` providing `paddingTop: insets.top`) and the profile screen (which uses `useSafeAreaInsets()` directly), the recipe detail screen's outer `<View>` applies zero top padding for the safe area. This causes the sticky header (back arrow + "Start Cooking" button) to render behind the iOS status bar / Dynamic Island, making the Start Cooking button untappable and blocking access to cooking mode.

fix: Import `useSafeAreaInsets` from `react-native-safe-area-context` and apply `paddingTop: insets.top` to the sticky header View (the first child View inside the outer wrapper). This pushes the header below the status bar / Dynamic Island while keeping the background color extending behind the status bar for visual continuity.

verification: (awaiting implementation and human verification)

files_changed:
- app/(tabs)/recipes/[id].tsx
