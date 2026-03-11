# Phase 11.1: Audit Cleanup - Research

**Researched:** 2026-03-08
**Domain:** Tech debt cleanup (design tokens, type safety, documentation)
**Confidence:** HIGH

## Summary

Phase 11.1 is a focused tech debt cleanup phase driven by the v1.1 Milestone Audit (`v1.1-MILESTONE-AUDIT.md`). All items are concrete, file-level fixes with no new features, no new dependencies, and no architectural changes. The work falls into four categories: (1) extracting hardcoded hex colors and font strings into design tokens, (2) removing a stale comment and unnecessary type assertion, (3) unifying scan navigation between MobileTabBar and WebSidebar, and (4) REQUIREMENTS.md documentation fixes (already completed in commit 151982d).

**Primary recommendation:** This is purely mechanical refactoring -- each item has an exact file, line, and fix. No research into external libraries or patterns needed. The planner should create a single plan with clearly sequenced tasks: token additions first (since other files depend on them), then consumer file updates, then doc fixes.

## Standard Stack

No new libraries. All changes use existing project infrastructure:

| Library | Already Installed | Purpose in This Phase |
|---------|-------------------|----------------------|
| `src/lib/tokens.ts` | Yes | Add `fontFamilyDisplayBold`, `noPhotoBg`, `noPhotoIcon` tokens |
| Expo Router typed routes | Yes | Remove `as any` -- typed route already exists in `.expo/types/router.d.ts` |

## Architecture Patterns

### Token System (Established in Phase 8)

All design values live in `src/lib/tokens.ts` as flat named exports. Consumer files import individual tokens:

```typescript
import { textPrimary, fontFamilyDisplay, white } from '@/lib/tokens';
```

**Existing font family tokens (for reference):**
- `fontFamilyDisplay` = `'BricolageGrotesque_600SemiBold'`
- `fontFamilyBody` = `'DMSans_400Regular'`
- `fontFamilyBodyMedium` = `'DMSans_500Medium'`
- `fontFamilyBodyBold` = `'DMSans_700Bold'`

**Missing token (to add):**
- `fontFamilyDisplayBold` = `'BricolageGrotesque_700Bold'` -- used in 8 places across 2 files

### No-Photo Placeholder Colors

These colors (`#E8E0D8` background, `#8B7355` icon) are specified in cookbook.pen but were deliberately kept as local constants during Phase 10 (see STATE.md: "10-02 noPhotoBg '#E8E0D8' local constant"). The audit now flags them as tech debt to extract into tokens. This is a decision reversal from the original Phase 10 approach, which is fine -- the audit has authority to reclassify.

**Files using these colors:**
- `src/components/recipes/RecipeCard.tsx` (lines 67, 72)
- `app/(public)/recipe/[id].tsx` (lines 39, 168)
- `app/(public)/index.tsx` (lines 52, 53)
- `app/(tabs)/recipes/[id].tsx` (line 71)

**Proposed token names** (following flat-with-category-prefix convention):
- `noPhotoBg` = `'#E8E0D8'`
- `noPhotoIcon` = `'#8B7355'`

## Inventory of All Changes

### 1. Token additions in `src/lib/tokens.ts`

| Token | Value | Section |
|-------|-------|---------|
| `fontFamilyDisplayBold` | `'BricolageGrotesque_700Bold'` | Font family constants |
| `noPhotoBg` | `'#E8E0D8'` | Background colors (or new "Placeholder" section) |
| `noPhotoIcon` | `'#8B7355'` | Text/icon colors (or same placeholder section) |

### 2. Hardcoded color fixes

| File | Line | Current | Replace With |
|------|------|---------|--------------|
| `app/(tabs)/index.tsx` | 186 | `color: '#FFFFFF'` | `color: white` (already exported from tokens.ts) |
| `src/components/recipes/RecipeCard.tsx` | 67 | `backgroundColor: '#E8E0D8'` | `backgroundColor: noPhotoBg` |
| `src/components/recipes/RecipeCard.tsx` | 72 | `color="#8B7355"` | `color={noPhotoIcon}` |
| `app/(public)/recipe/[id].tsx` | 39 | `const noPhotoBg = '#E8E0D8'` | Remove local const, import from tokens |
| `app/(public)/recipe/[id].tsx` | 168 | `color="#8B7355"` | `color={noPhotoIcon}` |
| `app/(public)/index.tsx` | 52-53 | Local `noPhotoBg`/`noPhotoIcon` consts | Remove, import from tokens |
| `app/(tabs)/recipes/[id].tsx` | 71 | `const noPhotoBg = '#E8E0D8'` | Remove local const, import from tokens |

### 3. Raw font string replacements

| File | Lines | Current | Replace With |
|------|-------|---------|--------------|
| `src/components/public/PublicNavHeader.tsx` | 102, 344, 386 | `fontFamily: 'BricolageGrotesque_700Bold'` | `fontFamily: fontFamilyDisplayBold` |
| `app/(public)/recipe/[id].tsx` | 328, 359, 415, 490, 546 | `fontFamily: 'BricolageGrotesque_700Bold'` | `fontFamily: fontFamilyDisplayBold` |

### 4. Stale comment fix

| File | Line | Current | Correct |
|------|------|---------|---------|
| `app/(tabs)/_layout.tsx` | 26 | `"5 tab routes"` | `"4 tab routes"` (only index, my-recipes, family, profile are registered) |

### 5. Type assertion removal

| File | Line | Current | Fix |
|------|------|---------|-----|
| `app/(public)/index.tsx` | 458 | `pathname: '/(public)/recipe/[id]' as any` | `pathname: '/(public)/recipe/[id]'` (typed route exists in `.expo/types/router.d.ts`) |

### 6. Scan navigation unification

| File | Line | Current | Unify To |
|------|------|---------|----------|
| `src/components/nav/MobileTabBar.tsx` | 41 | `router.push("/scan")` | `router.navigate("/scan")` |
| `src/components/nav/WebSidebar.tsx` | 75 | `router.navigate("/scan")` | (keep as-is) |

**Rationale for `navigate` over `push`:** Per Phase 9 decision (09-04), `router.navigate()` resolves from root navigator on all platforms and prevents duplicate stack entries. `router.push()` adds to the stack, so repeated taps would stack multiple scan screens. `navigate` is the correct method for cross-navigator routing.

### 7. REQUIREMENTS.md documentation fixes

**Already completed** in commit `151982d`:
- DESIGN-04 checkbox: `[ ]` changed to `[x]` -- verified in current file (line 15)
- SCREEN-04a traceability row: exists at line 101

No action needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Token naming | New naming convention | Existing flat-with-category-prefix pattern from Phase 8 |
| Route type fixes | Manual type declarations | Expo Router's auto-generated `router.d.ts` |

## Common Pitfalls

### Pitfall 1: Missing token imports after adding to tokens.ts
**What goes wrong:** Adding tokens to `tokens.ts` but forgetting to update the import statement in consumer files.
**How to avoid:** Each file that gets a color/font fix must also have its import line updated. Grep for remaining hardcoded values after all changes.

### Pitfall 2: Breaking the `as any` removal
**What goes wrong:** Removing `as any` but the typed route string doesn't exactly match what's in `router.d.ts`.
**How to avoid:** The exact string `'/(public)/recipe/[id]'` is in the generated types. Use that exact string. If the app has been rebuilt since adding the route, types should be current.

### Pitfall 3: Changing router method breaks scan on a platform
**What goes wrong:** Switching MobileTabBar from `push` to `navigate` could change behavior if scan screen relies on push-specific navigation state.
**How to avoid:** Test scan navigation on both mobile and web after the change. The scan route is a root-level modal (`/scan`), so `navigate` is the correct approach (matches WebSidebar which already works).

### Pitfall 4: noPhotoBg token name collision
**What goes wrong:** Files like `app/(public)/recipe/[id].tsx` already define a local `const noPhotoBg`. If you add the import without removing the local const, you get a redeclaration error.
**How to avoid:** Remove the local const declaration AND add the token import in the same edit.

## Scope Boundaries

The audit lists additional items that are explicitly OUT OF SCOPE for this phase:

| Item | Why Out of Scope |
|------|-----------------|
| Pre-existing TypeScript errors in scan/confidence-scoring (3 files, 14 errors) | Pre-existing, not introduced by Phases 8-11 |
| Pre-existing screens using hardcoded colors (profile, family, collections, scan) | "Outside milestone scope" per audit |
| Public browse local card components vs shared RecipeCard | "Deliberate design choice" per audit |
| NAV-02 stale requirement text ("Home, Search, Scan, Favorites, Profile") | Not listed in Phase 11.1 success criteria |

## Validation Architecture

> `workflow.nyquist_validation` not explicitly set to false in config.json -- including this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via ts-jest) |
| Config file | `jest.config.js` |
| Quick run command | `npx jest --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements -> Test Map

This phase has no formal requirement IDs. All changes are mechanical refactoring. The appropriate validation is:

| Check | Behavior | Test Type | Command |
|-------|----------|-----------|---------|
| No hardcoded hex in target files | Zero `#FFFFFF`, `#E8E0D8`, `#8B7355` in modified files | grep-based | `grep -rn '#FFFFFF\|#E8E0D8\|#8B7355' app/(tabs)/index.tsx src/components/recipes/RecipeCard.tsx app/(public)/recipe/[id].tsx app/(public)/index.tsx` |
| No raw font strings | Zero `BricolageGrotesque_700Bold` string literals (except `_layout.tsx` font loading) | grep-based | `grep -rn "fontFamily.*BricolageGrotesque" app/ src/components/public/` |
| TypeScript compiles | No type errors after `as any` removal | tsc | `npx tsc --noEmit` |
| Token exports exist | `fontFamilyDisplayBold`, `noPhotoBg`, `noPhotoIcon` exported | unit | Import check in existing test or manual |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (catches type regressions)
- **Per wave merge:** `npx jest && npx tsc --noEmit`
- **Phase gate:** Full suite green + grep confirms zero hardcoded values in target files

### Wave 0 Gaps
None -- no new test files needed. This is refactoring validated by type-checking and grep.

## Sources

### Primary (HIGH confidence)
- `src/lib/tokens.ts` -- current token inventory verified by direct file read
- `.expo/types/router.d.ts` -- typed route `/(public)/recipe/[id]` confirmed present
- `v1.1-MILESTONE-AUDIT.md` -- authoritative list of tech debt items
- Direct grep of all affected files -- line numbers and current values verified

### Secondary (MEDIUM confidence)
- Phase 9 decisions in STATE.md re: `router.navigate()` vs `router.push()` for cross-navigator routing

## Metadata

**Confidence breakdown:**
- All changes: HIGH -- every file, line number, and current value verified by direct inspection
- Scope boundaries: HIGH -- audit document is explicit about in-scope vs out-of-scope
- Navigation unification: HIGH -- Phase 9 decisions document the rationale for `navigate` over `push`

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies)