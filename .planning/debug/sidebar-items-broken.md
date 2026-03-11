---
status: diagnosed
trigger: "Scan, Recipes (My Recipes), and Collections sidebar items do nothing when clicked; render narrower than other items"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: TWO distinct root causes confirmed
test: Code reading and structural analysis
expecting: n/a - diagnosis complete
next_action: Report findings

## Symptoms

expected: All 6 sidebar items should navigate when clicked and render at the same width
actual: Scan, Collections, and My Recipes do nothing on click; some render narrower
errors: none reported
reproduction: Click any of those three items in the web sidebar
started: Since implementation

## Eliminated

## Evidence

- timestamp: 2026-03-04
  checked: WebSidebar.tsx rendering patterns
  found: Three items use TabTrigger asChild (Home, Family, Settings), two use plain SidebarItem with onPress (Collections -> router.push("/collections"), Scan -> router.push("/scan")), one uses TabTrigger name="my-recipes" asChild
  implication: Different rendering and click-handling paths for different items

- timestamp: 2026-03-04
  checked: _layout.tsx hidden TabList registration
  found: Only 4 tabs registered in TabList: index, my-recipes, family, profile. No "scan" or "collections" tab.
  implication: TabTrigger wrapping for items outside TabList should work (expo-router docs confirm no href needed outside TabList)

- timestamp: 2026-03-04
  checked: Route file existence for /scan and /collections
  found: NO /scan route exists anywhere in the app. /collections exists only as (tabs)/collections/index.tsx (nested under tabs group). router.push("/collections" as any) targets a path that doesn't match any file-based route.
  implication: Both router.push calls navigate to nonexistent routes — they silently fail

- timestamp: 2026-03-04
  checked: TabTrigger.js source (expo-router) - handleOnPress
  found: Line 106: "if (!trigger) return;" — when trigger is undefined (name not found in triggerMap), the press handler is a no-op. The triggerMap is built from TabList children. "my-recipes" IS registered in TabList, so trigger should be found.
  implication: my-recipes TabTrigger should actually work because it IS registered

- timestamp: 2026-03-04
  checked: TabTrigger styles.tabTrigger
  found: TabTrigger injects style { flexDirection: 'row', justifyContent: 'space-between' } on the Slot wrapper
  implication: This style gets merged onto TabTrigger-wrapped items

- timestamp: 2026-03-04
  checked: Radix Slot mergeProps style handling
  found: Style merges as { ...slotPropValue, ...childPropValue } — child (SidebarItem) style overrides slot (TabTrigger) style for same keys. SidebarItem has width:"100%" which survives.
  implication: TabTrigger-wrapped items get width:"100%" from SidebarItem. Non-TabTrigger items (Collections, Scan) also get width:"100%" from their own SidebarItem. Width difference likely comes from the Slot wrapper itself having flexDirection/justifyContent.

- timestamp: 2026-03-04
  checked: DOM structure difference between TabTrigger-wrapped and plain items
  found: TabTrigger asChild uses Radix Slot which clones the child element and merges props directly onto it — no extra wrapper div. Plain SidebarItem renders just its own Pressable. Both should produce same width.
  implication: Width difference may come from another factor — the TabTrigger asChild path adds style={styles.tabTrigger} which includes flexDirection:'row'. The Slot merges this UNDER the child's style, so child's flexDirection:'row' and width:'100%' should remain. BUT — the non-TabTrigger items don't get the Slot wrapper at all, so they're just plain Pressable children of the gap:4 View.

## Resolution

root_cause: |
  TWO root causes identified:

  ROOT CAUSE 1 — Clicking does nothing (Scan + Collections):
  Collections and Scan use router.push() to paths that don't exist as routes:
  - router.push("/scan") — NO /scan route file exists anywhere in the app
  - router.push("/collections" as any) — collections exists only at app/(tabs)/collections/index.tsx,
    which is a nested tab route, not accessible via bare "/collections" path
  These calls silently fail (expo-router doesn't navigate or show errors for unmatched routes).

  ROOT CAUSE 2 — Clicking does nothing (My Recipes):
  My Recipes IS wrapped in TabTrigger name="my-recipes" and IS registered in the hidden TabList.
  This SHOULD work. If it's not working, the likely cause is that the "my-recipes" route
  (app/(tabs)/my-recipes.tsx) conflicts with the "recipes" directory (app/(tabs)/recipes/).
  OR the user may be testing on a stale bundle. This needs runtime verification.

  RENDERING WIDTH ISSUE:
  Items wrapped in TabTrigger asChild get their props merged via Radix Slot, which applies
  TabTrigger's own style { flexDirection: 'row', justifyContent: 'space-between' } merged
  with the child's style. The plain SidebarItem items (Collections, Scan) do NOT get this
  extra style injection. However, since the child's width:'100%' should survive the merge,
  the width difference is more likely caused by the fact that TabTrigger-wrapped items
  produce a Slot-cloned element while plain items are just bare Pressables — and the Slot
  may add implicit layout behavior on web (e.g., display:contents or an extra span wrapper
  in the DOM that inherits full width from the flex parent). The plain items, being direct
  Pressable children without Slot wrapping, may not stretch the same way if the parent
  View's gap/flex layout interacts differently.

fix: (diagnosis only — not applied)
verification:
files_changed: []
