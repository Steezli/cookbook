# Phase 7: Native Compatibility for Scan UI - Research

**Researched:** 2026-03-03
**Domain:** React Native component conversion (web HTML/Tailwind to RN primitives)
**Confidence:** HIGH

## Summary

Phase 7 is a mechanical conversion phase. Three components in `src/features/scans/` (DraftReview.tsx, DraftEditor.tsx, DraftManager.tsx) are written with web HTML elements (`div`, `span`, `button`, `input`, `textarea`, `pre`, `label`, `h1`-`h3`, `ul`, `li`) and Tailwind CSS `className` strings. These must be replaced with React Native primitives (`View`, `Text`, `ScrollView`, `TouchableOpacity`, `TextInput`, `ActivityIndicator`, `Modal`) and `StyleSheet.create()`. One component (AIAssistant.tsx) is dead code to delete entirely. Additional cleanup includes removing the orphaned `ScanDraft` type and `getScanDraft` function in `scan-service.ts`, fixing `window.history.back()` to use `router.back()`, and removing a dead "Review Draft" button in the scan hub.

The project already has well-established React Native patterns in `app/(scan)/index.tsx`, `src/features/scan/ScanJobList.tsx`, and `src/features/scan/ScanPhotoUpload.tsx` that serve as direct templates for the conversion. The conversion is straightforward because the business logic (hooks, state, service calls) stays identical -- only the JSX rendering layer changes.

**Primary recommendation:** Convert each component file by file, replacing HTML elements with RN equivalents and Tailwind classes with StyleSheet objects, using existing RN components in the project as the style reference.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Standard React Native TextInput with basic styling (border, padding, focus color) -- follows platform defaults
- Numeric fields (servings, prep time, cook time) use `keyboardType='numeric'` -- no stepper controls
- Instruction editing uses fixed-height multiline TextInput (3 rows) -- no auto-expanding
- Drop undo/redo buttons -- keep auto-save indicator only
- Ingredient reordering and deletion via swipe gestures (swipe left to delete, long-press to reorder)
- "Add Ingredient" and "Add Step" as floating action buttons at bottom of their respective sections
- Ingredient fields (amount, unit, name) stay in a single horizontal row using flexbox
- Functional parity only -- make components render and work on iOS/Android without crash
- No visual design polish in this phase -- the cookbook.pen design system drives a future milestone
- Basic StyleSheet styling that works on native, nothing fancy
- Match existing RN patterns in the app (e.g., scan hub screen) for consistency
- Convert DraftReview.tsx, DraftEditor.tsx, AND DraftManager.tsx to RN components
- Delete AIAssistant.tsx entirely -- there is no AI assistant feature in this app (AI is backend OCR/parsing only)
- Remove AIAssistant import and usage from DraftEditor.tsx
- Remove all dead code per success criteria: orphaned ScanDraft type, getScanDraft in scan-service.ts, dead "Review Draft" button in app/(scan)/index.tsx

### Claude's Discretion
- Exact StyleSheet values (padding, margins, font sizes) -- functional, not polished
- Swipe gesture implementation approach (react-native-gesture-handler or similar)
- ScrollView vs FlatList choice for ingredient/instruction lists
- Error state and loading state component structure
- How to handle the confidence indicator badges (keep functional, basic styling)

### Deferred Ideas (OUT OF SCOPE)
- Full visual design overhaul using cookbook.pen design system -- next milestone
- Potential consolidation of `src/features/scan/` and `src/features/scans/` directories -- future cleanup
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-03 | User can review and edit any field in the draft before saving as a normal recipe | DraftReview.tsx and DraftEditor.tsx conversion enables native rendering of the review/edit UI. All business logic (load draft, edit fields, auto-save, convert to recipe) is preserved; only the rendering layer changes from HTML to RN components. |
| SCAN-04 | User can see scan status and retry failed scans | DraftManager.tsx conversion enables native rendering of draft status, save/discard/share actions, and the save-as-recipe dialog. The scan job list (ScanJobList.tsx) already works natively; this phase makes the draft management UI match. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | 0.76.0 | Core UI primitives (View, Text, TextInput, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, StyleSheet) | Already installed; all target components must use only RN primitives |
| expo-router | 4.0.22 | Navigation (`router.back()`, `router.replace()`, `router.push()`, `useLocalSearchParams`) | Already the navigation standard in this project |
| expo-linking | 7.0.5 | URL generation for share functionality | Already used in DraftManager.tsx |
| react-native (Share) | 0.76.0 | Native share sheet | Already used in DraftManager.tsx |

### Not Needed
| Library | Reason Not Needed |
|---------|-------------------|
| react-native-gesture-handler | NOT installed. Swipe gestures can be implemented with RN's built-in `PanResponder` or `Pressable` for this phase. Adding a new dependency for basic swipe-to-delete is overkill for functional parity. **Recommendation:** Use TouchableOpacity delete buttons instead of swipe gestures for this phase, since gesture handler is not installed and adding it requires native module linking. Swipe gestures can be added in the design polish milestone. |
| nativewind / tailwind-rn | Tailwind is NOT installed in this project. All Tailwind `className` usage in `src/features/scans/` is dead code that does nothing. Convert to StyleSheet. |
| @react-native-community/slider | Stepper controls explicitly excluded by user decision |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Swipe gestures (react-native-gesture-handler) | TouchableOpacity delete/reorder buttons | No new dependency; functional parity achieved; swipe UX deferred to design milestone. The user specified swipe gestures but `react-native-gesture-handler` is not installed. Recommend explicit delete buttons as interim. |
| FlatList for ingredient/instruction lists | ScrollView | Ingredient and instruction lists are typically < 30 items. ScrollView is simpler and matches existing patterns (ScanJobList uses ScrollView). FlatList benefits (virtualization) not needed at this scale. |
| Custom modal overlay (current inline style approach) | React Native `Modal` component | `Modal` is built into RN, handles proper z-indexing, backdrop, and accessibility. The current DraftManager already uses inline styles for overlays -- convert to proper `Modal`. |

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. Files stay in place:
```
src/features/scans/
  DraftReview.tsx      # Convert HTML->RN
  DraftEditor.tsx      # Convert HTML->RN, remove AIAssistant
  DraftManager.tsx     # Convert HTML->RN, convert overlays to Modal
  AIAssistant.tsx      # DELETE entirely
  ScanJobProgress.tsx  # NOT in scope (not in success criteria)
  ScanPhotoUpload.tsx  # NOT in scope (not in success criteria)
  scan-upload.ts       # NOT in scope (service layer, no UI)

src/features/scan/
  scan-service.ts      # Remove dead ScanDraft type + getScanDraft function

app/(scan)/
  index.tsx            # Remove dead "Review Draft" button
  draft/[id].tsx       # No changes needed (just renders DraftReview/DraftEditor)
```

### Pattern 1: HTML Element to RN Component Mapping
**What:** Direct substitution table for converting web elements to RN.
**When to use:** Every element in the three target files.

| HTML Element | RN Component | Notes |
|-------------|-------------|-------|
| `<div>` | `<View>` | Direct replacement |
| `<span>` | `<Text>` | All text must be in `<Text>` |
| `<p>` | `<Text>` | Add marginBottom in style for paragraph spacing |
| `<h1>`, `<h2>`, `<h3>` | `<Text style={styles.heading}>` | Use fontSize/fontWeight in style |
| `<button>` | `<TouchableOpacity>` | `onClick` becomes `onPress` |
| `<input type="text">` | `<TextInput>` | `onChange` becomes `onChangeText`, `value` stays |
| `<input type="number">` | `<TextInput keyboardType="numeric">` | Returns string, needs parseInt on use |
| `<textarea>` | `<TextInput multiline numberOfLines={3}>` | Fixed 3 rows per user decision |
| `<pre>` | `<Text style={{ fontFamily: 'monospace' }}>` | Monospace text |
| `<label>` | `<Text>` | Label styling, no `htmlFor` needed |
| `<ul>` / `<li>` | `<View>` / `<View style={styles.listItem}>` | Manual bullet with Text |
| `<img>` | `<Image>` | Already used in ScanJobList pattern |
| `<div className="grid ...">` | `<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>` | Flexbox layout |
| `<div className="space-y-N">` | `<View style={{ gap: N*4 }}>` or margin on children | RN 0.76 supports `gap` |

### Pattern 2: Event Handler Mapping
**What:** Web event handlers to RN equivalents.

| Web | RN | Notes |
|-----|-----|-------|
| `onClick` | `onPress` | On TouchableOpacity or Pressable |
| `onChange={(e) => fn(e.target.value)}` | `onChangeText={(text) => fn(text)}` | TextInput passes string directly |
| `disabled={bool}` | `disabled={bool}` on TouchableOpacity | Style opacity manually for visual feedback |
| `window.history.back()` | `router.back()` | Import from expo-router |

### Pattern 3: Tailwind to StyleSheet Conversion
**What:** Convert Tailwind utility classes to StyleSheet objects.
**When to use:** All 310+ `className` usages across the three files.

Reference color mapping from existing RN components in the project:
```typescript
// Colors already used in app/(scan)/index.tsx and ScanJobList.tsx
const colors = {
  background: '#f3f4f6',     // gray-100
  cardBg: '#ffffff',          // white
  textPrimary: '#111827',     // gray-900
  textSecondary: '#6b7280',   // gray-500
  textMuted: '#9ca3af',       // gray-400
  border: '#e5e7eb',          // gray-200
  borderLight: '#d1d5db',     // gray-300
  blue: '#3b82f6',            // blue-500
  blueDark: '#2563eb',        // blue-600
  green: '#10b981',           // green-500
  red: '#ef4444',             // red-500
  amber: '#f59e0b',           // amber-500
  errorBg: '#fef2f2',         // red-50
  errorBorder: '#fca5a5',     // red-300
  warningBg: '#fefce8',       // yellow-50
  warningBorder: '#fde68a',   // yellow-200
};
```

### Pattern 4: Modal Dialog Replacement
**What:** Replace inline-styled overlay divs with RN `Modal` component.
**When to use:** DraftManager save dialog and discard confirmation dialog.

```typescript
// Source: React Native Modal API (built-in)
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

<Modal
  visible={showSaveDialog}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setShowSaveDialog(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      {/* Dialog content */}
    </View>
  </View>
</Modal>

// In StyleSheet:
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 16,
},
modalContent: {
  backgroundColor: '#fff',
  borderRadius: 8,
  maxWidth: 448,
  width: '100%',
  padding: 24,
},
```

### Pattern 5: Confidence Badge (RN Version)
**What:** Convert Tailwind confidence badges to RN styled components.
**When to use:** DraftReview confidence indicators.

```typescript
const getConfidenceStyle = (confidence: number) => {
  if (confidence >= 0.85) return { bg: '#dcfce7', text: '#166534' }; // green
  if (confidence >= 0.65) return { bg: '#fef9c3', text: '#854d0e' }; // yellow
  return { bg: '#fef2f2', text: '#991b1b' }; // red
};

// Usage:
<View style={[styles.badge, { backgroundColor: getConfidenceStyle(confidence).bg }]}>
  <Text style={[styles.badgeText, { color: getConfidenceStyle(confidence).text }]}>
    {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
  </Text>
</View>
```

### Pattern 6: Existing RN Reference Pattern (from app/(scan)/index.tsx)
**What:** The established styling pattern to follow.

```typescript
// Source: app/(scan)/index.tsx (already working on native)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
});
```

### Anti-Patterns to Avoid
- **Using `className` on RN components:** className does nothing on View/Text. It silently fails, producing unstyled components. Always use `style` prop with StyleSheet.
- **Nested Text rendering without Text wrapper:** In RN, all text strings MUST be inside `<Text>`. A bare string inside `<View>` will crash on native.
- **Using `<div>` or `<span>` directly:** These render as web elements only. On native, they cause crashes or render nothing.
- **Using `e.target.value` with TextInput:** RN TextInput's `onChangeText` passes the string directly, not an event object. Using `onChange` with event extraction is wrong.
- **Using `window.*` APIs:** `window.history.back()`, `window.location`, `document.*` do not exist in RN. Use expo-router and RN APIs.
- **Forgetting `disabled` visual feedback:** RN's TouchableOpacity does not automatically style disabled state. Apply `opacity: 0.5` manually when `disabled`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom overlay with position/zIndex inline styles | RN `Modal` component | Handles z-index, backdrop touch, Android back button, accessibility |
| Loading indicators | Animated div placeholders | RN `ActivityIndicator` | Platform-native spinner, already used in ScanJobList |
| Navigation back | `window.history.back()` | `router.back()` from expo-router | Works on all platforms, integrates with navigation stack |
| Share functionality | Custom share UI | RN `Share.share()` | Already implemented in DraftManager, platform-native share sheet |
| Numeric keyboard | Custom number input | `TextInput keyboardType="numeric"` | Platform-native numeric keyboard |
| Scrollable content | Custom scroll handling | `ScrollView` with `contentContainerStyle` | Established project pattern, handles keyboard avoidance |

**Key insight:** This phase is purely a rendering-layer conversion. All business logic (draft loading, auto-save, draft conversion, status management) stays identical. Only JSX elements and styling change.

## Common Pitfalls

### Pitfall 1: Text Outside Text Component
**What goes wrong:** Bare strings or string expressions inside `<View>` crash on native with "Text strings must be rendered within a <Text> component."
**Why it happens:** Web allows text nodes anywhere. RN requires explicit Text wrappers.
**How to avoid:** Every string literal, every `{variable}`, every template literal must be inside `<Text>`.
**Warning signs:** TypeScript won't catch this; only runtime native rendering reveals the crash.

### Pitfall 2: TextInput onChange vs onChangeText
**What goes wrong:** Using `onChange={(e) => fn(e.target.value)}` pattern from web. In RN, `onChange` exists but the event shape is different.
**Why it happens:** Copy-pasting web patterns.
**How to avoid:** Always use `onChangeText={(text) => fn(text)}` for TextInput in RN. The callback receives the string directly.
**Warning signs:** `e.target.value` will be `undefined`, causing silent data loss.

### Pitfall 3: Inline Style Objects Recreated on Every Render
**What goes wrong:** Defining style objects inline (`style={{ padding: 16 }}`) causes new object allocation on every render, preventing RN's style diffing optimization.
**Why it happens:** Quick conversion from className strings to inline objects.
**How to avoid:** Use `StyleSheet.create()` for all static styles. Only use inline for truly dynamic values (e.g., conditional background color).
**Warning signs:** Performance issues on long lists (ingredient/instruction editing).

### Pitfall 4: ScrollView Inside ScrollView
**What goes wrong:** Nesting ScrollViews in the same direction causes unpredictable scroll behavior on native.
**Why it happens:** The web version has overflow-y-auto on multiple nested containers.
**How to avoid:** Use a single outer ScrollView for the page. Inner lists use `View` with fixed height, or use `nestedScrollEnabled={true}` if absolutely necessary. For this phase, ingredient and instruction lists should use a plain View since they are within a ScrollView page.
**Warning signs:** Scroll jumping, inability to scroll past certain sections on iOS/Android.

### Pitfall 5: Missing Keyboard Avoidance
**What goes wrong:** On iOS, the keyboard covers TextInput fields, making it impossible to see what you're typing.
**Why it happens:** Web handles this automatically; RN does not.
**How to avoid:** Wrap the DraftEditor in `KeyboardAvoidingView` with `behavior="padding"` (iOS) or use `ScrollView` with `keyboardShouldPersistTaps="handled"`.
**Warning signs:** Users cannot see the input field they are editing when keyboard is open.

### Pitfall 6: Dead Code References After AIAssistant Deletion
**What goes wrong:** Deleting AIAssistant.tsx but forgetting to remove its import and usage in DraftEditor.tsx causes a build error.
**Why it happens:** Missing cleanup step.
**How to avoid:** After deleting AIAssistant.tsx, also remove: (1) the import line, (2) the `<AIAssistant ... />` JSX block, (3) the `handleIngredientUpdate` and `handleInstructionsUpdate` callbacks that were only used by AIAssistant, (4) the undo/redo functions and history state (per user decision to drop undo/redo).
**Warning signs:** TypeScript import errors, unused variable warnings.

### Pitfall 7: ScanDraft Type Confusion Between Two Modules
**What goes wrong:** `src/features/scan/scan-service.ts` exports a `ScanDraft` type with different fields (DB column names like `job_id`, `raw_text`) while `src/lib/scan/scan-draft-service.ts` exports a `ScanDraft` interface with camelCase fields (`jobId`, `rawText`). These are NOT the same type.
**Why it happens:** Duplicate type definitions across the codebase.
**How to avoid:** Only remove the `ScanDraft` type and `getScanDraft` from `src/features/scan/scan-service.ts`. The `ScanDraft` in `src/lib/scan/scan-draft-service.ts` is actively used by DraftReview, DraftEditor, and DraftManager.
**Warning signs:** Removing the wrong ScanDraft type breaks the entire draft flow.

## Code Examples

### DraftReview Loading State (RN Version)
```typescript
// Source: Pattern from ScanJobList.tsx (already native)
if (loading) {
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading draft...</Text>
      </View>
    </View>
  );
}
```

### TextInput for Recipe Title (RN Version)
```typescript
// Source: RN TextInput API
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Recipe Title</Text>
  <TextInput
    style={styles.textInput}
    value={recipe.title || ''}
    onChangeText={(text) => updateRecipe({ title: text })}
    placeholder="Enter recipe title"
    placeholderTextColor="#9ca3af"
  />
</View>

// StyleSheet:
textInput: {
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 16,
  color: '#111827',
},
```

### Numeric Input (RN Version)
```typescript
// Per user decision: keyboardType='numeric', no stepper
<TextInput
  style={styles.textInput}
  value={recipe.servings?.toString() || ''}
  onChangeText={(text) => updateRecipe({ servings: text ? parseInt(text) || undefined : undefined })}
  keyboardType="numeric"
  placeholder="4"
  placeholderTextColor="#9ca3af"
/>
```

### Ingredient Row (Horizontal Flexbox, RN Version)
```typescript
// Per user decision: amount, unit, name in single horizontal row
<View style={styles.ingredientRow}>
  <TextInput
    style={[styles.textInput, styles.ingredientAmount]}
    value={ingredient.amount || ''}
    onChangeText={(text) => updateIngredient(index, { amount: text })}
    placeholder="Amt"
    placeholderTextColor="#9ca3af"
  />
  <TextInput
    style={[styles.textInput, styles.ingredientUnit]}
    value={ingredient.unit || ''}
    onChangeText={(text) => updateIngredient(index, { unit: text })}
    placeholder="Unit"
    placeholderTextColor="#9ca3af"
  />
  <TextInput
    style={[styles.textInput, styles.ingredientName]}
    value={ingredient.name || ''}
    onChangeText={(text) => updateIngredient(index, { name: text })}
    placeholder="Ingredient"
    placeholderTextColor="#9ca3af"
  />
</View>

// StyleSheet:
ingredientRow: {
  flexDirection: 'row',
  gap: 8,
},
ingredientAmount: {
  flex: 1,
},
ingredientUnit: {
  flex: 1,
},
ingredientName: {
  flex: 2,
},
```

### Back Navigation Fix
```typescript
// BEFORE (broken on native):
onClick={() => window.history.back()}

// AFTER (works everywhere):
import { router } from 'expo-router';
onPress={() => router.back()}
```

### Multiline Instruction Input (Fixed 3 Rows)
```typescript
// Per user decision: fixed-height multiline, 3 rows, no auto-expanding
<TextInput
  style={[styles.textInput, styles.multilineInput]}
  value={instruction}
  onChangeText={(text) => updateInstruction(index, text)}
  multiline
  numberOfLines={3}
  placeholder="Enter instruction step..."
  placeholderTextColor="#9ca3af"
  textAlignVertical="top"
/>

// StyleSheet:
multilineInput: {
  height: 80,
  textAlignVertical: 'top',
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web HTML elements in RN project | React Native primitives only | Always was the correct approach | Components currently don't render on native |
| Tailwind className on RN components | StyleSheet.create() | Tailwind was never installed | className has zero effect; all styling is missing |
| window.history.back() | router.back() from expo-router | Was always wrong for RN | Back navigation crashes on native |
| Inline style overlays | RN Modal component | Available since RN 0.x | Proper modal behavior, Android back button support |

**Deprecated/outdated:**
- `src/features/scans/AIAssistant.tsx`: Dead code; no AI assistant feature exists in this app. Delete.
- `ScanDraft` type in `scan-service.ts`: Orphaned; the active type lives in `scan-draft-service.ts`. Delete.
- `getScanDraft` in `scan-service.ts`: Orphaned; `scanDraftService.getDraftByJobId()` is the active implementation. Delete.
- "Review Draft" button in `app/(scan)/index.tsx`: Dead UI; navigates nowhere (has `console.log` placeholder). Delete the entire `navigation` View block.

## Scope Clarification: What NOT to Convert

The CONTEXT.md and success criteria define the scope as DraftReview.tsx, DraftEditor.tsx, and DraftManager.tsx. Two other files in `src/features/scans/` also have web HTML:

- **ScanPhotoUpload.tsx** (web-only file input with `HTMLInputElement`, `document.createElement('canvas')`, `Image()` constructor) -- NOT in scope. This is a web upload implementation. The native equivalent already exists at `src/features/scan/ScanPhotoUpload.tsx`.
- **ScanJobProgress.tsx** (web HTML/Tailwind) -- NOT in scope. The native equivalent functionality is in `src/features/scan/ScanJobList.tsx`.

Do not convert these files. They are the web versions that coexist with native versions already in `src/features/scan/`.

## Open Questions

1. **Swipe Gesture Implementation Without react-native-gesture-handler**
   - What we know: User wants swipe left to delete, long-press to reorder for ingredients. `react-native-gesture-handler` is NOT installed in the project.
   - What's unclear: Whether to add the dependency or use a simpler approach.
   - Recommendation: Use explicit delete buttons (TouchableOpacity with trash icon) and up/down reorder buttons for this phase. This matches the existing pattern in the web version (which has up/down arrow buttons and X delete button). The swipe gesture UX can be added in the design polish milestone when `react-native-gesture-handler` can be properly installed and linked. Functional parity is achieved without swipe.

2. **ScanJobProgress.tsx and ScanPhotoUpload.tsx in scans/ directory**
   - What we know: These files also have web HTML, but native equivalents already exist in `src/features/scan/`.
   - What's unclear: Whether they should be cleaned up in this phase.
   - Recommendation: Out of scope for Phase 7. The success criteria only mention DraftReview, DraftEditor, and DraftManager. Directory consolidation is explicitly deferred.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 + ts-jest 29.4.6 |
| Config file | `jest.config.js` |
| Quick run command | `npx jest --testPathPattern scan` |
| Full suite command | `npx jest` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-03 | DraftReview renders without web HTML | manual-only | Manual: run on iOS/Android simulator | N/A -- rendering test requires device/simulator |
| SCAN-03 | DraftEditor renders without web HTML, fields editable | manual-only | Manual: run on iOS/Android simulator | N/A |
| SCAN-03 | DraftEditor auto-save works | unit | `npx jest --testPathPattern scan-draft-service -x` | /Users/elinicholson/development/cookbook/src/lib/scan/__tests__/scan-draft-service.test.ts |
| SCAN-04 | DraftManager renders without web HTML | manual-only | Manual: run on iOS/Android simulator | N/A |
| SCAN-04 | DraftManager convertToRecipe data transform | unit | `npx jest --testPathPattern scan-draft-service -x` | /Users/elinicholson/development/cookbook/src/lib/scan/__tests__/scan-draft-service.test.ts |
| SCAN-04 | Dead code removed (no ScanDraft in scan-service.ts) | static | `grep -c "ScanDraft" src/features/scan/scan-service.ts` returns 0 | N/A |
| SCAN-04 | No window.history usage | static | `grep -r "window.history" src/features/scans/` returns 0 | N/A |
| SCAN-04 | No className usage on non-overlay elements | static | `grep -c "className" src/features/scans/DraftReview.tsx src/features/scans/DraftEditor.tsx src/features/scans/DraftManager.tsx` returns 0 | N/A |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern scan -x` (existing scan service tests still pass)
- **Per wave merge:** `npx jest` (full suite green)
- **Phase gate:** Full suite green + static analysis checks (grep for web-only patterns) + TypeScript compilation (`npx tsc --noEmit`)

### Wave 0 Gaps
- None -- existing test infrastructure covers service-layer behavior. Component rendering is verified manually on simulators (standard for RN UI conversions). Static analysis (grep for web-only HTML elements, className, window.*) serves as automated verification that the conversion is complete.

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- Direct examination of all source files in `src/features/scans/`, `src/features/scan/`, `app/(scan)/`, `src/lib/scan/`
- **Existing RN patterns** -- `app/(scan)/index.tsx`, `src/features/scan/ScanJobList.tsx` provide verified, working RN component patterns
- **package.json** -- Confirmed exact versions of react-native (0.76.0), expo-router (4.0.22), expo-linking (7.0.5)
- **React Native 0.76 API** -- View, Text, TextInput, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, StyleSheet, Share are all stable core APIs

### Secondary (MEDIUM confidence)
- **`gap` property support** -- RN 0.71+ supports `gap` in flexbox. Project uses 0.76.0, so `gap` is available for spacing.

### Tertiary (LOW confidence)
- **Swipe gesture alternatives without react-native-gesture-handler** -- PanResponder exists in core RN but is complex for reliable swipe-to-delete. Recommend deferring swipe UX.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use in the project
- Architecture: HIGH - Direct mechanical conversion following existing proven patterns in the same codebase
- Pitfalls: HIGH - Based on direct code examination showing exact issues (310 className usages, window.history.back(), web HTML elements)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- core RN APIs don't change frequently)
