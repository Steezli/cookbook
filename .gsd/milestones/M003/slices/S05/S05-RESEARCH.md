# S05: Full App Audit & Cross-Platform Verification — Research

**Date:** 2026-03-12

## Summary

S05 owns requirements QA-04 (supporting — RecipeForm focus chaining), QA-08 (primary — button/interaction audit), QA-09 (primary — error handling audit), and QA-10 (primary — cross-platform verification). Research uncovered one critical cross-platform bug and several medium-severity issues.

**Critical finding: `Alert.alert` is a silent no-op on react-native-web 0.21.** The implementation is literally `static alert() {}`. This means 41 `Alert.alert` calls across 15 unguarded files silently swallow all error messages, validation feedback, and confirmations on web. Users see nothing when errors occur — the app just stops responding or behaves unexpectedly. Only 3 files (`family/[id].tsx`, `collections/[id].tsx`, `reset-password.tsx`) have proper web-compatible wrappers (`showAlert`/`confirmAction` using `window.alert`/`window.confirm`).

Secondary findings: 23 hardcoded hex colors remain across `app/` and `src/` files (outside DraftEditor/DraftManager which were cleaned in S03), RecipeForm title/description TextInputs lack focus chaining (QA-04 gap), the Home screen silently swallows load errors with an empty catch block, and cook mode has no error UI when recipe loading fails.

## Recommendation

Structure the slice into 3 tasks:

**T01: Alert.alert web compatibility** — Extract the `showAlert`/`confirmAction` pattern from `family/[id].tsx` into a shared utility (e.g., `src/lib/alert.ts`). Replace all 41 raw `Alert.alert` calls in 15 files with the cross-platform wrapper. This is the highest-impact fix — it restores error feedback to web users across every authenticated screen.

**T02: Screen-by-screen error handling and interaction audit** — Walk through every screen's code, fix specific error handling issues (Home screen's empty catch, cook mode's missing error state, collections/index hardcoded error color), verify all Pressable/Link targets are functional, and complete RecipeForm focus chaining for QA-04.

**T03: Cross-platform verification on web and iOS simulator** — Start the dev server, exercise key flows on web at multiple breakpoints (login, create recipe, browse, scan upload, collections, family, profile), verify error feedback shows via the new alert utility, then launch iOS simulator and verify the same flows. Document what was verified vs. what needs real device testing.

Skip hex color cleanup in scan/auth files — those are cosmetic and can be a future polish pass. Focus on behavioral correctness.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Cross-platform alert/confirm | `showAlert`/`confirmAction` in `app/(tabs)/family/[id].tsx` | Already proven pattern; branches on `Platform.OS === 'web'` to use `window.alert`/`window.confirm` |
| Design tokens for colors | `src/lib/tokens.ts` | 15+ semantic tokens already exist for error/warning/status states; use instead of hex |
| Focus chaining pattern | `app/(auth)/login.tsx` | `useRef<TextInputType>(null)` + `returnKeyType` + `onSubmitEditing` pattern established in S02 |

## Existing Code and Patterns

- `app/(tabs)/family/[id].tsx` lines 58-89 — **Reusable pattern**: `showAlert()` and `confirmAction()` functions that branch on `Platform.OS === 'web'` to use `window.alert`/`window.confirm` vs native `Alert.alert`. Extract to shared utility.
- `app/(tabs)/collections/[id].tsx` lines 44-60 — **Same pattern** duplicated (identical implementation). Confirms both should import from a shared module.
- `app/(auth)/reset-password.tsx` lines 35-41 — **Same pattern** (showAlert only, no confirmAction). Third copy.
- `app/(auth)/login.tsx` — **Focus chaining reference**: shows the `TextInput as TextInputType` alias + `useRef` + `returnKeyType` + `onSubmitEditing` pattern that RecipeForm needs.
- `src/components/ErrorBoundary.tsx` — Root-level error boundary already in place wrapping the Stack navigator. No per-screen boundaries needed.
- `src/lib/tokens.ts` — Has `errorBg`, `errorBorder`, `errorTitle`, `errorText`, `warningBg`, `warningBorder`, `warningTitle`, `warningText` tokens available for replacing hardcoded error hex colors.

## Constraints

- **`Alert.alert` is literally empty on react-native-web 0.21** — `class Alert { static alert() {} }`. Not "partially working" — completely silent. Every unguarded call is a swallowed error.
- **RecipeForm has list-builder TextInputs, not sequential form fields** — The ingredient/step/tag inputs use `returnKeyType="done"` + `onSubmitEditing={addItem}` to add items to a list. This is correct behavior (not a focus-chaining gap). Only the Title → Description chain is missing.
- **Description is multiline** — Per S02 pattern, multiline TextInputs get ref but NO `onSubmitEditing` (Enter inserts newlines). So Title can chain to Description via ref focus, but Description cannot chain to the next section.
- **Test count is 499** (down from 502 after S04 dead code removal) — this is the baseline, not a regression.
- **iOS simulator can't test camera or real OAuth** — Document these as "needs real device" in the audit report.
- **`as any` route type casts** — 11 `router.push`/`replace` calls use `as any` for route paths. These are TypeScript type workarounds, not broken links — the routes exist.

## Common Pitfalls

- **Replacing Alert.alert with window.alert on native** — `window` doesn't exist on native. The wrapper MUST check `Platform.OS === 'web'` first. The existing pattern in `family/[id].tsx` handles this correctly.
- **Forgetting Alert.alert with buttons/callbacks** — Some `Alert.alert` calls use a third argument for action buttons (e.g., confirm delete with Cancel/Delete buttons). On web, `window.confirm` handles the two-button case, but multi-button alerts need a different approach. The `confirmAction` helper in `family/[id].tsx` handles the common two-button (Cancel/Confirm) case.
- **onSubmitEditing on multiline TextInputs** — Adding `onSubmitEditing` to multiline inputs would prevent Enter from inserting newlines. S02 explicitly documented this as a pattern to avoid.
- **Visual verification of DraftEditor/DraftManager** — These require authenticated session + real scan data. S03 noted this gap. May need to limit to code-level audit if no scan data is available.

## Open Risks

- **Alert.alert calls with 3+ buttons** — `window.confirm` only supports OK/Cancel (2 buttons). If any `Alert.alert` call uses 3 buttons (e.g., Delete/Archive/Cancel), the web wrapper needs a different solution. Quick scan shows recipe detail screen's delete confirmation and collection delete use 2-button patterns — should be fine with `confirmAction`.
- **RecipeForm is a shared component** — Changes to RecipeForm affect both create and edit screens. Focus chaining changes need to work correctly in both contexts.
- **iOS simulator dialog blocks** — S03 noted the "Open in Expo Go?" dialog blocked deeper testing. May recur in S05.

## Audit Scope — Complete Screen Inventory

### Auth screens (5)
| File | Alert.alert | Web guard | Error states |
|------|------------|-----------|-------------|
| `login.tsx` | 2 | ❌ | ✅ shows error text |
| `signup.tsx` | 4 | ❌ | ✅ shows error text |
| `forgot-password.tsx` | 2 | ❌ | ✅ shows error text |
| `reset-password.tsx` | 1 | ✅ showAlert | ✅ |
| `logout.tsx` | 1 | ❌ | minimal |

### Tab screens (11)
| File | Alert.alert | Web guard | Error states |
|------|------------|-----------|-------------|
| `(tabs)/index.tsx` | 0 | n/a | ❌ empty catch |
| `recipes/index.tsx` | 0 | n/a | ❌ silent catch |
| `recipes/[id].tsx` | 5 | ❌ | ✅ has error UI |
| `recipes/[id]/edit.tsx` | 3 | ❌ | uses Alert only |
| `recipes/[id]/cook.tsx` | 0 | n/a | ❌ no error UI |
| `recipes/create.tsx` | 1 | ❌ | uses Alert only |
| `collections/index.tsx` | 0 | n/a | ✅ has error UI (hardcoded color) |
| `collections/[id].tsx` | 2 | ✅ | ✅ |
| `collections/create.tsx` | 1 | ❌ | ✅ error text |
| `family/index.tsx` | 2 | ❌ | uses Alert only |
| `family/[id].tsx` | 3 | ✅ | ✅ |
| `profile.tsx` | 3 | ❌ | ✅ has error UI |
| `invite/[token].tsx` | 0 | n/a | ✅ state machine |

### Scan screens (2)
| File | Alert.alert | Web guard | Error states |
|------|------------|-----------|-------------|
| `scan/index.tsx` | 3 | ❌ | ✅ has error UI |
| `scan/draft/[id].tsx` | 0 | n/a | ✅ has error UI (hardcoded colors) |

### Public screens (3)
| File | Alert.alert | Web guard | Error states |
|------|------------|-----------|-------------|
| `(public)/index.tsx` | 0 | n/a | ✅ |
| `(public)/recipe/[id].tsx` | 0 | n/a | ✅ |
| `(public)/privacy.tsx` | 0 | n/a | ✅ static |

### Other (3)
| File | Alert.alert | Web guard | Error states |
|------|------------|-----------|-------------|
| `index.tsx` | 0 | n/a | n/a (redirect) |
| `auth/callback.tsx` | 0 | n/a | ✅ redirects to login |
| `+not-found.tsx` | 0 | n/a | ✅ |

### Shared components with Alert.alert (3)
| File | Alert.alert | Web guard |
|------|------------|-----------|
| `RecipeForm.tsx` | 4 | ❌ |
| `CommentInput.tsx` | 1 | ❌ |
| `CommentThread.tsx` | 3 | ❌ |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo Router | none found | No dedicated skill available |
| React Native | none checked | Built-in knowledge sufficient |
| Supabase | none checked | Not relevant to audit work |

## Sources

- react-native-web 0.21.2 Alert source at `node_modules/react-native-web/src/exports/Alert/index.js` — confirms `static alert() {}` is empty
- S02 Summary — focus chaining pattern (TextInput as TextInputType alias, useRef, returnKeyType, onSubmitEditing)
- S03 Summary — DraftEditor/DraftManager visual verification gap noted
- S04 Summary — console.log cleanup complete, 499 tests baseline
- `app/(tabs)/family/[id].tsx` — showAlert/confirmAction reference implementation
