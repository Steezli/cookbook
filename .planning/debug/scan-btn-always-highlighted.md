---
status: diagnosed
trigger: "Scan button in mobile tab bar is always highlighted/focused regardless of which tab is active"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — Scan button hardcodes accentWarm, looks identical to an active tab
test: complete
expecting: n/a
next_action: Report diagnosis

## Symptoms

expected: Scan button icon should appear in the inactive/unfocused color (textDisabled = #D1D5DB) when another tab is selected
actual: Scan button Camera icon is always rendered in accentWarm (#E8784E) — the same color used for focused/active tabs
errors: none (visual bug, not a crash)
reproduction: Open any tab (Home, My Recipes, Family, Profile) — the Scan button always appears highlighted
started: Since initial implementation

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-04T00:01:00Z
  checked: MobileTabBar.tsx line 47
  found: Camera icon hardcodes color={accentWarm} — no conditional logic based on focus state
  implication: Scan button always appears in the "active" color

- timestamp: 2026-03-04T00:01:30Z
  checked: TabButton.tsx line 17
  found: TabButton uses `isFocused ? accentWarm : textDisabled` for icon color — proper conditional
  implication: Regular tabs correctly dim when inactive; Scan button lacks this logic entirely

- timestamp: 2026-03-04T00:02:00Z
  checked: MobileTabBar.tsx lines 43-48 vs lines 32-34
  found: Scan is a plain Pressable (not wrapped in TabTrigger), so it never receives isFocused prop
  implication: Even if color logic were added, there is no TabTrigger to provide focus state

## Resolution

root_cause: The Scan button (MobileTabBar.tsx line 47) hardcodes `color={accentWarm}` on the Camera icon. Unlike the other four tabs which use TabButton (which conditionally switches between accentWarm and textDisabled based on isFocused), the Scan Pressable has no focus-awareness at all. It always renders in the warm accent color — the same color that TabButton uses to indicate the *active* tab. This makes the Scan button permanently appear "focused." The 09-03-PLAN itself prescribed this hardcoded color, intending it as a "visually distinguished" treatment, but the implementation chose a solid accentWarm icon color that is indistinguishable from the "active tab" indicator.
fix: (not applied — diagnosis only)
suggested_fix_direction: The Scan button should use textDisabled for the icon color (matching inactive tabs) and differentiate itself via shape/size instead — e.g., a subtle background circle with accentWarm at 10% opacity, or a slightly larger icon (size 28 vs 24). This way it stands out as "special action" without looking "active." Alternatively, keep accentWarm but wrap it in a visible container (rounded background, ring, etc.) so the color reads as "brand accent on a button" rather than "this tab is focused."
verification: (not applied — diagnosis only)
files_changed: []
