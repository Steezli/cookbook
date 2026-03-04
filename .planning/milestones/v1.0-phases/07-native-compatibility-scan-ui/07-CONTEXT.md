# Phase 7: Native Compatibility for Scan UI (Gap Closure) - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all web-only HTML elements and Tailwind CSS in DraftReview.tsx, DraftEditor.tsx, and DraftManager.tsx with React Native components and StyleSheet. Fix `window.history.back()` navigation. Remove dead code (AIAssistant.tsx, orphaned ScanDraft type, getScanDraft, dead "Review Draft" button). This is a functional compatibility phase — visual design polish comes in a future milestone driven by cookbook.pen.

</domain>

<decisions>
## Implementation Decisions

### Input components
- Standard React Native TextInput with basic styling (border, padding, focus color) — follows platform defaults
- Numeric fields (servings, prep time, cook time) use `keyboardType='numeric'` — no stepper controls
- Instruction editing uses fixed-height multiline TextInput (3 rows) — no auto-expanding
- Drop undo/redo buttons — keep auto-save indicator only
- Ingredient reordering and deletion via swipe gestures (swipe left to delete, long-press to reorder)
- "Add Ingredient" and "Add Step" as floating action buttons at bottom of their respective sections
- Ingredient fields (amount, unit, name) stay in a single horizontal row using flexbox

### Visual approach
- Functional parity only — make components render and work on iOS/Android without crash
- No visual design polish in this phase — the cookbook.pen design system drives a future milestone
- Basic StyleSheet styling that works on native, nothing fancy
- Match existing RN patterns in the app (e.g., scan hub screen) for consistency

### Scope of conversion
- Convert DraftReview.tsx, DraftEditor.tsx, AND DraftManager.tsx to RN components
- Delete AIAssistant.tsx entirely — there is no AI assistant feature in this app (AI is backend OCR/parsing only)
- Remove AIAssistant import and usage from DraftEditor.tsx
- Remove all dead code per success criteria: orphaned ScanDraft type, getScanDraft in scan-service.ts, dead "Review Draft" button in app/(scan)/index.tsx

### Claude's Discretion
- Exact StyleSheet values (padding, margins, font sizes) — functional, not polished
- Swipe gesture implementation approach (react-native-gesture-handler or similar)
- ScrollView vs FlatList choice for ingredient/instruction lists
- Error state and loading state component structure
- How to handle the confidence indicator badges (keep functional, basic styling)

</decisions>

<specifics>
## Specific Ideas

- "There is no AI assistant intended for this app" — AIAssistant.tsx is misnamed/unintended dead code, remove it
- The cookbook.pen design file in the project root contains the design system (colors, typography, components) that will drive the NEXT milestone — do not try to match it in this phase
- Two versions of scan features exist: `src/features/scan/` (RN-native) vs `src/features/scans/` (web-style) — Phase 7 converts the web-style ones to RN

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(scan)/index.tsx`: Already uses proper RN components (View, Text, StyleSheet, ScrollView, TouchableOpacity) — good reference pattern for conversions
- `src/features/scan/ScanPhotoUpload.tsx`: RN-native version of scan upload — reference for RN patterns
- `src/features/scan/ScanJobList.tsx`: RN-native scan job list — reference for list patterns

### Established Patterns
- Navigation: expo-router with `router.replace()` for post-action navigation, `router.back()` for back navigation
- Styling: React Native StyleSheet.create() with color values, shadow properties, borderRadius
- Auth: `useSession()` hook from `@/features/auth/session` with `session!.user.id` after null check
- Layout: ScrollView with contentContainerStyle for padded scrollable content

### Integration Points
- `app/(scan)/draft/[id].tsx`: Route that renders DraftReview — uses useLocalSearchParams
- DraftEditor renders DraftManager as a child — both must be RN-compatible
- DraftEditor renders AIAssistant — this import/usage will be removed
- `scan-draft-service.ts`: ScanDraft type and getScanDraft are dead code to remove

</code_context>

<deferred>
## Deferred Ideas

- Full visual design overhaul using cookbook.pen design system — next milestone
- Potential consolidation of `src/features/scan/` and `src/features/scans/` directories — future cleanup

</deferred>

---

*Phase: 07-native-compatibility-scan-ui*
*Context gathered: 2026-03-03*
