---
status: diagnosed
trigger: "Investigate 3 UAT gaps in the scan draft flow — draft/[id] route only renders DraftReview with no way to reach DraftEditor"
created: 2026-03-02T00:00:00Z
updated: 2026-03-02T00:00:00Z
---

## Current Focus

hypothesis: All three gaps share a single root cause — the route mounts only DraftReview and passes no onEdit handler, making DraftEditor and DraftManager permanently unreachable
test: Confirmed by direct code read of all four files
expecting: n/a — diagnosis complete
next_action: Hand structured diagnosis to fix planner

## Symptoms

expected: From draft/[id], user can convert draft to recipe, discard draft, and share draft
actual: User sees a read-only DraftReview with an "Edit Draft" button and a "Continue Editing" button that do nothing; no convert, discard, or share actions exist on screen
errors: No runtime errors — silent no-ops (onEdit is called but is undefined)
reproduction: Navigate to /(scan)/draft/[id] — all action buttons are dead
started: Always broken — route was created without wiring DraftEditor or DraftManager

## Eliminated

- hypothesis: DraftEditor or DraftManager have internal bugs preventing their actions from working
  evidence: Both components are fully implemented and functional; the problem is they are never mounted
  timestamp: 2026-03-02

- hypothesis: onEdit is wired somewhere up the tree and just silently ignored
  evidence: app/(scan)/draft/[id].tsx passes only draftId to DraftReview — no onEdit prop is passed at all, so onEdit is undefined at both call sites in DraftReview (line 150, line 369)
  timestamp: 2026-03-02

## Evidence

- timestamp: 2026-03-02
  checked: app/(scan)/draft/[id].tsx (lines 1-8)
  found: Route renders exactly `<DraftReview draftId={id!} />` with no other props
  implication: onEdit is never provided; DraftEditor is never imported or mounted; DraftManager is never imported or mounted

- timestamp: 2026-03-02
  checked: DraftReview.tsx lines 148-155 and 362-374 (two "Edit Draft" / "Continue Editing" buttons)
  found: Both buttons call `onClick={onEdit}` — onEdit comes from props, type `(() => void) | undefined`
  implication: With onEdit undefined, both buttons are silent no-ops. No navigation, no mode switch, no DraftEditor mount.

- timestamp: 2026-03-02
  checked: DraftReview.tsx full interface (lines 7-11)
  found: Props are `{ draftId, onDraftUpdated?, onEdit? }` — onEdit is optional, component does not guard against it being undefined
  implication: Component is designed to receive onEdit from parent but parent never provides it

- timestamp: 2026-03-02
  checked: DraftEditor.tsx lines 1-15, 600-608
  found: DraftEditor imports and renders DraftManager internally (lines 601-608). DraftManager provides convert, discard, and share.
  implication: Mounting DraftEditor is sufficient to get all three missing actions; DraftManager does not need to be wired separately at route level

- timestamp: 2026-03-02
  checked: DraftEditor.tsx lines 158-164
  found: handleDraftConverted calls `router.replace('/recipes/${recipeId}')` and handleDraftDiscarded calls `router.replace('/(scan)')` — both navigation outcomes are correct
  implication: DraftEditor's post-action routing is already correct; no changes needed there

- timestamp: 2026-03-02
  checked: DraftManager.tsx lines 62-88 (saveAsRecipe), 90-106 (discardDraft), 108-119 (shareDraft)
  found: All three actions are fully implemented — convert calls scanDraftService.convertToRecipe, discard calls scanDraftService.deleteDraft, share uses expo-linking + RN Share API
  implication: Implementation is complete; it is purely a mounting problem

- timestamp: 2026-03-02
  checked: DraftEditor.tsx grid layout (line 338 — `grid-cols-1 xl:grid-cols-3`)
  found: DraftEditor renders three columns but only declares two column sections in JSX (left xl:col-span-2, right for ingredients/instructions). The AI Assistant column (lines 589-597) is a third child div with no col-span set, and DraftManager (lines 600-608) uses `col-span-full` but is placed outside the grid div.
  implication: Minor layout issue in DraftEditor — DraftManager is rendered after the closing `</div>` of the grid, which is correct structurally. No bug here, just confirming structure.

## Resolution

root_cause: |
  The route file app/(scan)/draft/[id].tsx renders only DraftReview with no onEdit callback and
  does not mount DraftEditor or DraftManager. This single omission causes all three UAT gaps:

  Gap 1 (Convert): DraftManager.saveAsRecipe is unreachable — DraftManager is inside DraftEditor,
  which is never mounted.

  Gap 2 (Discard): DraftManager.discardDraft is unreachable — same reason.

  Gap 3 (Share): DraftManager.shareDraft is unreachable — same reason.

  The "Edit Draft" and "Continue Editing" buttons in DraftReview call onEdit, which is undefined
  because the route never passes it. No mode switching, no component mounting — just silent no-ops.

fix: |
  The route needs to manage an `isEditing` boolean. When false, render DraftReview with a real
  onEdit callback that flips isEditing to true. When true, render DraftEditor (which internally
  mounts DraftManager and provides convert/discard/share). DraftEditor's onCancel flips back to
  review mode.

  This is a two-state toggle in the route file — no new sub-routes needed.

verification: not yet verified
files_changed:
  - app/(scan)/draft/[id].tsx
