# M004: QOL & Bug Fixes — Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

## Project Description

Family Recipe Vault (Cookbook) — Expo/React Native cross-platform app with AI-powered recipe scanning, cooking walkthrough mode, unit conversions, and family recipe sharing. Three milestones complete (M001–M003). 499 tests, zero TypeScript errors, clean codebase.

## Why This Milestone

Quality-of-life improvements and bug fixes that directly impact the cooking and scanning experience. Users are encountering friction in the cooking walkthrough (no ingredient highlighting), incorrect unit conversions (cups converting to ml instead of staying as cups or converting to grams for dry goods), and scan timeout failures with multiple images. The scanner UI on iOS also needs a UX upgrade from modal to full-screen.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See ingredients mentioned in a cooking step highlighted/called out so they know exactly what they need for that step
- Switch between imperial and metric and see sensible conversions (cups of flour → grams, cups of milk → ml, not all cups → ml)
- Submit multiple images for scanning without false timeout errors at the ~30sec mark
- Use the scanner on iOS as a full-screen experience instead of a cramped modal/popup

### Entry point / environment

- Entry point: Expo app (iOS, Android, web)
- Environment: local dev / iOS simulator / web browser
- Live dependencies involved: Supabase edge functions (scan processing), Claude API (recipe extraction)

## Completion Class

- Contract complete means: tests pass for ingredient highlighting logic, unit conversion logic, timeout handling; TypeScript compiles clean
- Integration complete means: cooking walkthrough visually highlights step ingredients; conversions display sensibly across liquid/dry categories; multi-image scan completes without false timeout; iOS scanner is full-screen
- Operational complete means: verified on web and iOS simulator

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Cooking walkthrough step text highlights mentioned ingredients, verified visually on web and iOS
- Unit conversions correctly distinguish liquid (→ ml/cups) from dry (→ g/oz) for common ingredients
- Multi-image scan (3+ photos) does not falsely report timeout/failure while still processing
- iOS scan screen renders as full-screen (not a modal overlay)

## Risks and Unknowns

- **Ingredient matching in step text** — step text may reference ingredients by partial name, abbreviation, or different form (e.g. "apples" in ingredients but "apple slices" in step). Need fuzzy/substring matching.
- **Liquid vs dry classification** — no existing ingredient metadata flags this. Need a heuristic or known-liquid list. Edge cases (honey, yogurt) exist.
- **Scan timeout** — current 60s timeout in `app/scan/draft/[id].tsx` may not be the issue. Multi-image Claude API calls can take 60-90+ seconds. Need to identify the actual bottleneck.
- **iOS full-screen scanner** — the scan page is already a route (`app/scan/index.tsx`), not a native modal. "Modal/popup" behavior may be caused by Expo Router presentation or platform styling.

## Existing Codebase / Prior Art

- `app/(tabs)/recipes/[id]/cook.tsx` — cooking walkthrough screen; currently shows full ingredient list per step, no per-step highlighting
- `src/features/units/conversions.ts` — unit conversion engine; treats all volume as volume (cups→ml) regardless of ingredient type
- `src/features/units/parser.ts` — ingredient text parser; extracts amount/unit/ingredient
- `src/features/units/types.ts` — UnitSystem type, ParsedIngredient, EnhancedIngredient
- `app/scan/draft/[id].tsx` — draft review screen with 60s timeout, 4s polling fallback
- `app/scan/index.tsx` — scan upload screen
- `app/scan/_layout.tsx` — scan route layout (may control presentation)
- `src/features/scan/scan-service.ts` — scan job CRUD and realtime subscriptions
- `supabase/functions/process-scan-job/index.ts` — edge function that calls Claude API for recipe extraction

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- No formal requirement IDs for these items yet — they are user-reported QOL and bug fixes.

## Scope

### In Scope

- Ingredient highlighting in cooking walkthrough steps
- Smarter unit conversion (liquid vs dry awareness)
- Multi-image scan timeout handling fix
- iOS scanner full-screen presentation

### Out of Scope / Non-Goals

- Subscriptions / paywall (backlogged)
- New scanning features beyond timeout fix
- Step-by-step timer integration
- Ingredient substitution suggestions
- Recipe scaling

## Technical Constraints

- Edge functions run Deno — can't import from `src/`
- Cross-platform: changes must work on iOS, Android, and web
- Design tokens from `src/lib/tokens.ts` must be used for any new UI
- `showAlert`/`confirmAction` from `@/lib/alert` for any alerts
- Pencil designs in `cookbook.pen` for design reference (use mcporter MCP, never direct app)

## Integration Points

- Supabase Edge Functions — scan processing pipeline
- Claude API — recipe extraction (multi-image calls take longer)
- Expo Router — scan route layout/presentation
- Design system — tokens.ts, Pencil designs

## Open Questions

- Should ingredient highlighting be just in the "You'll need" card or also inline in the step text? — Start with step text highlighting, check Pencil design for guidance
- What's the right timeout for multi-image scans? — Need to measure actual Claude API response times for 3-5 image batches
- Is the iOS "modal" issue in the route layout or platform styling? — Investigate `app/scan/_layout.tsx`
