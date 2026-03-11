# Phase 10: Core Screens - Research

**Researched:** 2026-03-04
**Domain:** React Native / Expo Router screen rebuilds — responsive layout, FlatList grids, cooking mode walkthrough
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Home Screen**
- Follow cookbook.pen layout exactly: greeting + search + featured recipes + recent recipes
- Override greeting text: use "Welcome back, [name]" instead of .pen's "Good morning, [name]"
- Featured recipes section shows most recent recipes (not curated/algorithmic)
- Keep both "Featured Recipes" and "Recent Recipes" sections as designed in .pen (may differentiate later)
- No quick-action buttons — rely on tab bar / sidebar for feature navigation
- Layout adaptation per breakpoint follows cookbook.pen exactly (vertical stack mobile/tablet, sidebar + main on web)

**Recipe Card Design**
- Follow cookbook.pen RecipeCard component: 180px image area, title, time + servings metadata, visibility badge pill
- Photo aspect ratio and card structure match .pen spec exactly
- No-photo state: use .pen placeholder color (#E8E0D8) but add a subtle utensil icon or recipe first letter so cards don't look broken
- Visibility badge (private/family/public) included per .pen spec

**Recipe List**
- Responsive grid: 1-column mobile, 2-column tablet, 3-column web (per SCREEN-02 requirement)
- Photo thumbnails on each card

**Recipe Detail**
- Layout follows cookbook.pen exactly per breakpoint (hero image mobile, two-column tablet/web)
- Photo display, section ordering, and typography per .pen spec
- Ratings section: star display with average + count, placed after story section
- Comments section: comment items (avatar, name, date, text) + input field, placed after ratings
- Comments and ratings inline below recipe content (single scrollable page)
- Sticky header with action buttons (edit, share) — always accessible while scrolling
- Ingredients remain static (not checkable) — cooking mode handles the interactive experience

**Cooking Mode (new)**
- Triggered by "Start Cooking" button on recipe detail action bar
- Full-screen focused experience showing one step at a time
- Each step shows: step number badge, instruction text, "You'll need" card with ingredients for that step only
- Progress bar at top showing position in recipe
- Previous / Next navigation at bottom
- X button to exit back to recipe detail
- Mobile: centered vertical layout, clean and readable
- Tablet: same layout with more padding
- Web: sidebar with step nav list (clickable steps) + main content area
- Route: new route, likely app/(tabs)/recipes/[id]/cook.tsx

**Create/Edit Form UX**
- Photo upload area at top of form (photo-first)
- Ingredient input: single input + Add button as default, with "Bulk add" toggle for pasting multiple ingredients
- Steps input: same single-add pattern
- Reordering: up/down arrow buttons for ingredients and steps (not drag-and-drop)
- No live preview — standard form, submit to save
- Form uses PageContainer variant="form" (600px max-width centered)

### Claude's Discretion
- Exact empty state designs (no recipes, no comments, etc.)
- Loading skeleton patterns
- Error state handling
- Search bar behavior on home screen
- How "See all" links on home screen navigate (to recipe list with filter?)
- Ingredient-to-step mapping logic for cooking mode (how to determine which ingredients belong to which step)

### Deferred Ideas (OUT OF SCOPE)
- Checkable ingredients (tap to strike through while cooking) — cooking mode handles the guided experience instead
- Recipe sharing / social features — separate phase
- Recipe print view — future phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCREEN-01 | Home screen rebuilt to cookbook.pen spec at all 3 breakpoints with feature navigation (greeting, search, featured recipes, quick actions) | useBreakpoint + FlatList grid + searchRecipes API already proven |
| SCREEN-02 | Recipe list screen rebuilt with responsive grid (1-col mobile, 2-col tablet, 3-col web) and photo thumbnails | FlatList numColumns + key={numColumns} pattern + getRecipeThumbnailUrlMap already in codebase |
| SCREEN-03 | Recipe detail screen rebuilt to cookbook.pen spec at all 3 breakpoints | StarRating + CommentThread components already exist; need responsive two-column layout on tablet/web |
| SCREEN-04 | Create/Edit recipe screens rebuilt to cookbook.pen spec at all 3 breakpoints | Full form logic exists; needs photo-first layout, bulk-add toggle, up/down reorder, PageContainer form variant |
| SCREEN-04a | Cooking Mode walkthrough screen at all 3 breakpoints — step-by-step guided cooking with per-step ingredients | New route needed; ingredient-to-step mapping is Claude's discretion; progress bar + prev/next nav pattern is straightforward |
</phase_requirements>

---

## Summary

Phase 10 is a screen rebuild phase, not a feature-addition phase. The underlying data layer (recipes API, photos, ratings, comments, search) is fully implemented. All five screens have functional but unstyled implementations — the job is to apply cookbook.pen layouts, integrate design tokens, and make each screen responsive across mobile/tablet/web breakpoints.

The most architecturally new item is Cooking Mode (SCREEN-04a): a new route `app/(tabs)/recipes/[id]/cook.tsx` that presents a full-screen step-by-step walkthrough. It consumes the existing `Recipe` type (steps array, ingredients array) with no database changes required. The "ingredient-to-step mapping" challenge is left to Claude's discretion — the simplest valid approach is to show all recipe ingredients on every step as a "You'll need" card, since the data model has no per-step ingredient assignments.

The key technical discipline for all screens: **all dimension-sensitive styles must be computed inline using `useBreakpoint()`** — never in `StyleSheet.create`. This is an established project constraint that existing nav components already follow.

**Primary recommendation:** Rebuild screens in dependency order (RecipeCard component first, then Home, then List, then Detail, then Create/Edit, then Cooking Mode) so the card component is available to both Home and List screens.

---

## Standard Stack

### Core (all already installed — no new packages required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~6.0.23 | File-based routing, Stack.Screen, Link | Already in use for all routes |
| react-native FlatList | (built-in) | Responsive grids, virtualized lists | Required for numColumns grid pattern on web |
| react-native ScrollView | (built-in) | Detail screen scrolling content | Standard for long-form content |
| useBreakpoint (internal) | project hook | Breakpoint-aware inline styles | Established project pattern |
| tokens.ts (internal) | project constants | Colors, fonts, radii, shadows | All .pen tokens extracted |
| PageContainer (internal) | project component | Responsive padding + max-width | Already built: default/form/content variants |
| lucide-react-native | ^0.577.0 | Icons (utensil placeholder, X close, chevrons) | Already installed for nav components |
| StarRating (internal) | project component | Interactive + display-only star ratings | Already in src/features/ratings/ |
| CommentThread (internal) | project component | Comment list + reply + input | Already in src/features/comments/ |
| searchRecipes (internal) | project API | Recipe search with filters | Already in src/features/recipes/search.ts |
| getRecipeThumbnailUrlMap | project API | Batch thumbnail URL fetch | Already in src/features/recipes/photos.ts |

### No New Packages Needed

All required functionality is already in the codebase. Do not install additional libraries for this phase.

---

## Architecture Patterns

### Recommended File Structure

New files needed for this phase:

```
app/(tabs)/
├── index.tsx                    # REBUILD: home screen (currently Phase 1 placeholder)
├── recipes/
│   ├── index.tsx                # REBUILD: recipe list with responsive grid
│   ├── [id].tsx                 # REBUILD: recipe detail with .pen layout
│   ├── create.tsx               # REBUILD: form with photo-first + reorder
│   └── [id]/
│       ├── edit.tsx             # REBUILD: same as create with prefill
│       └── cook.tsx             # NEW: cooking mode walkthrough

src/components/
└── recipes/                     # NEW FOLDER: shared recipe UI components
    ├── RecipeCard.tsx           # NEW: card matching .pen spec (180px image, badge, meta)
    └── RecipeCardPlaceholder.tsx # (can be inline in RecipeCard, not a separate file)
```

### Pattern 1: Responsive Grid with FlatList

The recipe list uses FlatList with `numColumns` driven by breakpoint. Critically, the `key` prop must change when `numColumns` changes or React Native will crash.

```typescript
// Source: STATE.md "For v1.1" notes + Phase 9 accumulated context
const { breakpoint } = useBreakpoint();
const numColumns = breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3;

<FlatList
  data={recipes}
  numColumns={numColumns}
  key={numColumns}                       // REQUIRED: forces remount on column change
  keyExtractor={(item) => item.id}
  contentContainerStyle={{ flexGrow: 1 }}
  columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
  renderItem={({ item }) => (
    <RecipeCard recipe={item} style={{ flex: 1 }} />
  )}
/>
```

**Why `key={numColumns}`:** FlatList cannot dynamically change its `numColumns` prop. Changing the `key` forces a remount, which resets the column count cleanly. This is the established pattern from STATE.md.

**Why `flexGrow: 1` not `flex: 1`:** Inside flex containers on web, `flexBasis: 0` + `flexGrow: 1` is required. Established pattern from STATE.md.

### Pattern 2: Breakpoint-Responsive Two-Column Detail Layout

Recipe detail and cooking mode (web) both need a two-column layout. The correct pattern:

```typescript
// Source: project conventions — inline styles from useBreakpoint()
const { breakpoint } = useBreakpoint();
const isWideLayout = breakpoint === 'tablet' || breakpoint === 'web';

// Two-column layout for tablet/web
return (
  <ScrollView>
    <View style={{
      flexDirection: isWideLayout ? 'row' : 'column',
      gap: isWideLayout ? 32 : 0,
    }}>
      {/* Left column: hero image or step content */}
      <View style={{ flex: isWideLayout ? 1 : undefined }}>
        {/* ... */}
      </View>
      {/* Right column: ingredients, metadata */}
      <View style={{ flex: isWideLayout ? 1 : undefined }}>
        {/* ... */}
      </View>
    </View>
  </ScrollView>
);
```

### Pattern 3: Cooking Mode as New Route (not Modal)

Route: `app/(tabs)/recipes/[id]/cook.tsx`

The "Start Cooking" button on the recipe detail action bar navigates to this route. The X button calls `router.back()`. This avoids Modal complexity (and `position:fixed` which does not work in React Native) while keeping the focused experience.

```typescript
// In recipe detail action bar:
<Pressable onPress={() => router.push(`/recipes/${recipe.id}/cook`)}>
  <Text>Start Cooking</Text>
</Pressable>

// In cook.tsx:
import { router, useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

**Why not Modal:** STATE.md explicitly documents that `position:fixed` does not work in React Native. The Modal component adds complexity and its dismissal behavior varies cross-platform. A dedicated route is simpler and more predictable.

### Pattern 4: Inline Style Objects (NOT StyleSheet.create for breakpoint-sensitive values)

```typescript
// CORRECT: compute breakpoint-dependent values inline
const { breakpoint } = useBreakpoint();
const cardPadding = breakpoint === 'mobile' ? 16 : 24;

return <View style={{ padding: cardPadding, backgroundColor: bgCard }} />;

// WRONG: never put breakpoint-dependent values in StyleSheet.create
const styles = StyleSheet.create({
  card: { padding: 24 }  // This ignores breakpoint — forbidden by project convention
});
```

**Token usage:**
```typescript
import { bgCard, textPrimary, textSecondary, fontFamilyDisplay, fontFamilyBody,
         radiusMd, shadowMd, accentBlue, accentWarm, borderDefault,
         fontSizeSm, fontSizeBase, fontSizeLg, fontSize2xl } from '@/lib/tokens';
```

### Pattern 5: Ingredient-to-Step Mapping (Claude's Discretion)

The `Recipe` data model has no per-step ingredient assignments. The recommended approach: show **all recipe ingredients** in the "You'll need" card on every step. This is honest (all ingredients are needed for the full recipe) and requires no data model changes.

Alternative (if steps mention ingredient names): a simple keyword-match heuristic. This is fragile and not recommended.

**Recommendation:** All ingredients on every step. Add a note: "Full ingredient list" in the card header.

### Pattern 6: Up/Down Reordering for Ingredients and Steps

```typescript
function moveItem<T>(arr: T[], fromIndex: number, direction: 'up' | 'down'): T[] {
  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= arr.length) return arr;
  const result = [...arr];
  [result[fromIndex], result[toIndex]] = [result[toIndex], result[fromIndex]];
  return result;
}

// Usage in form:
<Pressable onPress={() => setIngredients(moveItem(ingredients, index, 'up'))}>
  <Text>↑</Text>
</Pressable>
<Pressable onPress={() => setIngredients(moveItem(ingredients, index, 'down'))}>
  <Text>↓</Text>
</Pressable>
```

### Pattern 7: Bulk Add Toggle for Ingredients

```typescript
const [bulkMode, setBulkMode] = useState(false);
const [bulkText, setBulkText] = useState('');

function applyBulkAdd() {
  const lines = bulkText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  setIngredients([...ingredients, ...lines.map(text => ({ text }))]);
  setBulkText('');
  setBulkMode(false);
}
```

The "Bulk add" toggle shows a multiline TextInput. Pressing "Add" splits by newline and appends to the ingredient list.

### Anti-Patterns to Avoid

- **Dimension in StyleSheet.create:** `StyleSheet.create({ card: { padding: 24 } })` for values that should vary by breakpoint. Use inline computed styles instead.
- **Using `flex: 1` directly on FlatList inside flex containers on web:** Use `flexGrow: 1, flexBasis: 0` instead.
- **Missing `key={numColumns}` on FlatList:** This causes a crash when numColumns changes at runtime (e.g., browser resize). Always include it.
- **`position: 'fixed'`:** Does not work in React Native. Use dedicated routes or `SafeAreaView` for sticky headers instead.
- **Importing `Dimensions.get('window')` for layout:** `Dimensions` is not reactive on web. Use `useWindowDimensions()` via `useBreakpoint()` instead.
- **Hardcoding colors:** Always use tokens.ts constants. The screens being rebuilt use raw hex colors (`"#007AFF"`, `"#f5f5f5"`) — replace all of these with tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Breakpoint detection | Custom window listener | `useBreakpoint()` from `@/lib/hooks/useBreakpoint` | Already exists, tested, re-renders on resize |
| Responsive padding/max-width | Per-screen margin logic | `PageContainer` with `variant="form"` or `"content"` | Already built with correct values |
| Star rating UI | Custom star Pressable grid | `StarRating` from `@/features/ratings/StarRating` | Already handles half-stars, interactive/readonly modes |
| Comment thread + input | Custom comment UI | `CommentThread` + `CommentInput` from `@/features/comments/` | Already handles nesting, real-time, edit/delete |
| Thumbnail batch fetch | Per-recipe photo queries | `getRecipeThumbnailUrlMap()` from `@/features/recipes/photos` | Single query for all recipes, already in list screen |
| Recipe CRUD | Direct Supabase queries | `createRecipe`, `updateRecipe`, `getRecipeById` from `@/features/recipes/api` | RLS-aware, type-safe |
| Photo upload | Direct storage API calls | `uploadRecipePhoto` from `@/features/recipes/photos` | Handles web vs native blob differences |
| Search + filter | Custom Supabase query builder | `searchRecipes()` from `@/features/recipes/search` | Already handles query, tags, visibility, family filters |
| Icon rendering | Text-based fallbacks | `lucide-react-native` (already installed) | `UtensilsCrossed`, `ChevronLeft`, `ChevronRight`, `X` icons available |

**Key insight:** This phase is almost entirely a UI/layout rebuild. The business logic layer is complete. The biggest risk is accidentally duplicating API logic that already exists in the feature layer.

---

## Common Pitfalls

### Pitfall 1: StyleSheet.create with Breakpoint-Dependent Values

**What goes wrong:** Developer puts card width, padding, or column count in `StyleSheet.create`. On web, the stylesheet is computed once at startup and never updates when the window resizes.

**Why it happens:** StyleSheet.create is the familiar React Native pattern; it's tempting to put all styles there.

**How to avoid:** Only use `StyleSheet.create` for truly static values (colors, font sizes, border radii that do not change with breakpoint). Compute any dimension-sensitive value inline using `useBreakpoint()`.

**Warning signs:** A style object containing numeric padding/margin/width that should differ between mobile and web.

### Pitfall 2: FlatList Column Change Without key Prop

**What goes wrong:** When the window is resized on web (or orientation changes on tablet), `numColumns` changes but the FlatList doesn't re-mount. This causes a React Native warning and broken layout.

**Why it happens:** numColumns is a static prop; FlatList doesn't support changing it after mount.

**How to avoid:** Always set `key={numColumns}` on any FlatList that uses numColumns. The key change forces a remount.

**Warning signs:** Layout breaks when resizing browser window on the recipe list screen.

### Pitfall 3: Cooking Mode Route vs Modal Confusion

**What goes wrong:** Implementing cooking mode as a React Native Modal or using `position: 'fixed'` for the overlay.

**Why it happens:** "Full-screen focused experience" sounds like a Modal.

**How to avoid:** Use a dedicated Expo Router route (`app/(tabs)/recipes/[id]/cook.tsx`). Exit via `router.back()`. This works correctly cross-platform.

**Warning signs:** `position: 'fixed'` in any style object, or importing `Modal` from react-native.

### Pitfall 4: Photo Placeholder Color Mismatch

**What goes wrong:** Using `bgCard` (#F6F7F8) for the no-photo placeholder instead of the specified warm placeholder (#E8E0D8).

**Why it happens:** Developer reaches for an existing token instead of checking the spec.

**How to avoid:** The no-photo placeholder color is `#E8E0D8` (warm beige per CONTEXT.md decision). This is not currently in tokens.ts — it must be used as a literal or added as a token (`bgPhotoPlaceholder`). Pair it with a `UtensilsCrossed` icon from lucide-react-native.

**Warning signs:** Recipe cards with photo placeholder look identical to normal card backgrounds.

### Pitfall 5: Forgetting to Replace Hardcoded Colors

**What goes wrong:** The existing screens use many hardcoded colors: `"#007AFF"`, `"#f5f5f5"`, `"#333"`, `"#666"`, `"white"`. Rebuilding to .pen spec means ALL colors must come from tokens.ts.

**Why it happens:** It's easy to copy existing code patterns and keep the hardcoded values.

**How to avoid:** Treat hardcoded hex values as a linting signal during review. The token equivalents: `#007AFF` → `accentBlue`, `#1A1A1A` → `textPrimary`, `#6B7280` → `textSecondary`, `#FFFFFF` → `white`, `#F6F7F8` → `bgCard`.

### Pitfall 6: Progress Bar as View Width Calculation

**What goes wrong:** Using `Dimensions.get('window').width` to calculate the progress bar fill width in cooking mode.

**Why it happens:** Natural reach when you need pixel-based width.

**How to avoid:** Use `onLayout` to get the container width, or use a percentage-based flex approach: `<View style={{ flex: stepIndex / totalSteps }} />` for the fill portion.

### Pitfall 7: Home Screen Fetching Recipes with N+1 Photo Queries

**What goes wrong:** Home screen loads featured recipes, then fires a separate photo query per card in the render loop.

**Why it happens:** Naively calling `getRecipePhotos(recipe.id)` inside each RecipeCard.

**How to avoid:** Use `getRecipeThumbnailUrlMap(recipeIds)` after loading the recipe list — one batch query for all thumbnails. This pattern is already used in the current recipe list screen.

---

## Code Examples

Verified patterns from existing codebase:

### RecipeCard Component (New — follows .pen spec)

```typescript
// To be created: src/components/recipes/RecipeCard.tsx
import { Pressable, View, Text, Image } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import { bgCard, textPrimary, textSecondary, fontFamilyDisplay, fontFamilyBody,
         radiusMd, shadowSm, accentBlue, accentGreen, accentWarm,
         fontSizeSm, fontSizeBase } from '@/lib/tokens';
import type { Recipe } from '@/features/recipes/types';

const PHOTO_PLACEHOLDER = '#E8E0D8'; // From CONTEXT.md spec — not yet in tokens

type RecipeCardProps = {
  recipe: Recipe;
  thumbnailUrl?: string;
  onPress: () => void;
  style?: object;
};

export function RecipeCard({ recipe, thumbnailUrl, onPress, style }: RecipeCardProps) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const visibilityColor = recipe.visibility === 'private' ? accentWarm
    : recipe.visibility === 'family' ? accentBlue : accentGreen;

  return (
    <Pressable onPress={onPress} style={[{ backgroundColor: bgCard, borderRadius: radiusMd, overflow: 'hidden', ...shadowSm }, style]}>
      {/* 180px image area per .pen spec */}
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 180, backgroundColor: PHOTO_PLACEHOLDER, alignItems: 'center', justifyContent: 'center' }}>
          <UtensilsCrossed size={32} color="#8B7355" />
        </View>
      )}
      <View style={{ padding: 12 }}>
        {/* Visibility badge pill */}
        <View style={{ alignSelf: 'flex-start', backgroundColor: `${visibilityColor}20`, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 }}>
          <Text style={{ fontSize: fontSizeSm, color: visibilityColor, fontFamily: fontFamilyBody }}>{recipe.visibility}</Text>
        </View>
        <Text style={{ fontSize: fontSizeBase, fontFamily: fontFamilyDisplay, color: textPrimary }} numberOfLines={2}>{recipe.title}</Text>
        <Text style={{ fontSize: fontSizeSm, color: textSecondary, fontFamily: fontFamilyBody, marginTop: 4 }}>
          {totalTime > 0 ? `${totalTime} min` : ''}
          {totalTime > 0 && recipe.servings ? ' · ' : ''}
          {recipe.servings ? `${recipe.servings} servings` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
```

### FlatList Responsive Grid (Recipe List)

```typescript
// From: STATE.md established patterns + existing recipes/index.tsx
const { breakpoint } = useBreakpoint();
const numColumns = breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3;
const gap = 16;

<FlatList
  data={recipes}
  numColumns={numColumns}
  key={numColumns}                          // Forces remount on column change
  keyExtractor={(item) => item.id}
  contentContainerStyle={{ padding: 20, gap }}
  columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
  renderItem={({ item }) => (
    <RecipeCard
      recipe={item}
      thumbnailUrl={thumbnailByRecipeId[item.id]}
      onPress={() => router.push(`/recipes/${item.id}`)}
      style={{ flex: 1 }}
    />
  )}
/>
```

### Cooking Mode Progress Bar

```typescript
// Pattern: flex-based progress fill (no Dimensions.get needed)
const progress = (currentStepIndex + 1) / recipe.steps.length;

<View style={{ height: 4, backgroundColor: borderDefault, borderRadius: 2 }}>
  <View style={{ height: 4, backgroundColor: accentBlue, borderRadius: 2, width: `${progress * 100}%` as any }} />
</View>
```

### Home Screen Data Loading (Two-section approach)

```typescript
// Featured = most recent N recipes; Recent = next N after that
// Uses existing searchRecipes() API — no new API needed
const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);

useEffect(() => {
  async function load() {
    const all = await searchRecipes({}); // Returns created_at DESC already
    setFeaturedRecipes(all.slice(0, 3));
    setRecentRecipes(all.slice(3, 9));
    // Batch thumbnail fetch
    const ids = all.slice(0, 9).map(r => r.id);
    const thumbs = await getRecipeThumbnailUrlMap(ids, 300);
    setThumbnails(thumbs);
  }
  void load();
}, []);
```

### Sticky Action Header (Recipe Detail)

```typescript
// React Native ScrollView with stickyHeaderIndices is unreliable across platforms.
// Pattern: render the action bar ABOVE the ScrollView, not inside it.
<View style={{ flex: 1 }}>
  {/* Sticky header — always visible */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: borderDefault }}>
    <Pressable onPress={() => router.back()}><ChevronLeft /></Pressable>
    {isOwner && (
      <Pressable onPress={() => router.push(`/recipes/${recipe.id}/edit`)}>
        <Text>Edit</Text>
      </Pressable>
    )}
  </View>
  {/* Scrollable content */}
  <ScrollView style={{ flex: 1 }}>
    {/* recipe content */}
  </ScrollView>
</View>
```

Note: The cooking mode "Start Cooking" button lives in this action bar area.

### Cooking Mode Web Sidebar Layout

```typescript
// Web: sidebar (step nav) + main (step content)
const { breakpoint } = useBreakpoint();
const isWeb = breakpoint === 'web';

<View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
  {isWeb && (
    <View style={{ width: 200, borderRightWidth: 1, borderRightColor: borderDefault }}>
      {recipe.steps.map((step, i) => (
        <Pressable key={i} onPress={() => setCurrentStep(i)}
          style={{ padding: 16, backgroundColor: i === currentStep ? bgCard : 'transparent' }}>
          <Text>Step {i + 1}</Text>
        </Pressable>
      ))}
    </View>
  )}
  <View style={{ flex: 1, padding: isWeb ? 40 : 24 }}>
    {/* Current step content */}
  </View>
</View>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded colors in screens | tokens.ts design tokens | Phase 8 | All screens in this phase must use tokens |
| Flat navigation structure | Expo Router file-based routing with (tabs)/(auth)/(scan) groups | Phase 9 | New cook.tsx route lives in (tabs)/recipes/[id]/ |
| `flex: 1` on FlatList inside web flex containers | `flexGrow: 1, flexBasis: 0` | Phase 9 established | Critical for recipe grid not collapsing on web |
| `StyleSheet.create` for all styles | Inline computed styles for breakpoint-sensitive values | Phase 8-9 | Must be followed for every rebuilt screen |

**Deprecated/outdated in current screens:**
- `StyleSheet.create` with hardcoded colors (`"#007AFF"`, `"#f5f5f5"`, etc.) — all five screens use these and need replacement
- `Dimensions.get("window").width` in recipe detail (line 712) — not reactive on web; already flagged
- The current recipe detail photo gallery uses `Dimensions.get("window").width * 0.7` for photo width — replace with `useWindowDimensions` via `useBreakpoint`
- `Stack.Screen options={{ title }}` — the Phase 9 tab layout uses `TabSlot` not `Stack`, so Stack.Screen headers may not render. Verify header approach works with the new layout or remove Stack.Screen usage.

---

## Open Questions

1. **Stack.Screen usage in rebuilt screens**
   - What we know: Current screens use `<Stack.Screen options={{ title: "..." }} />`. Phase 9 introduced the `TabSlot` layout which may suppress stack headers.
   - What's unclear: Whether Stack.Screen still works for setting screen titles in the new Tabs + TabSlot navigation structure.
   - Recommendation: Test during Plan 01 implementation. If headers don't render, titles should be set via the Stack navigator in the parent layout or rendered manually in the screen.

2. **"See all" link navigation from home screen**
   - What we know: Home screen has "Featured Recipes" and "Recent Recipes" sections with "See all" links (per .pen design). CONTEXT.md leaves this to Claude's discretion.
   - What's unclear: Whether "See all" should navigate to `/recipes` (all recipes) or a filtered view.
   - Recommendation: Navigate to `/recipes` (existing recipe list screen) without filters. The recipe list already supports search/filter once the user is there.

3. **User display name for home screen greeting**
   - What we know: The greeting is "Welcome back, [name]". The session object has `session.user.email`. The `profiles` table exists (from session.tsx `ensureProfile`).
   - What's unclear: Whether `profiles` stores a `display_name` field distinct from email.
   - Recommendation: Fall back to the portion of the email before `@` if no display name is available. E.g., `user@example.com` → "Welcome back, User".

---

## Validation Architecture

Note: `workflow.nyquist_validation` key is absent from `.planning/config.json`, so validation architecture is included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + ts-jest |
| Config file | `jest.config.js` (exists) |
| Quick run command | `npx jest --testPathPattern="src/" --passWithNoTests` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCREEN-01 | Home screen loads and displays greeting | manual-only | — | n/a |
| SCREEN-02 | Recipe list responsive grid (numColumns logic) | unit (pure fn) | `npx jest --testPathPattern="RecipeCard"` | ❌ Wave 0 |
| SCREEN-03 | Recipe detail renders ratings + comments sections | manual-only | — | n/a |
| SCREEN-04 | Create/edit forms submit with correct payload shape | manual-only | — | n/a |
| SCREEN-04a | Cooking mode step navigation (prev/next/progress) | unit (pure fn) | `npx jest --testPathPattern="cookingMode"` | ❌ Wave 0 |

**Why manual-only for most:** These are screen-level layout verifications (responsive breakpoints, visual .pen spec match) that require visual inspection and cannot be automated in a node Jest environment without a React renderer (which this project explicitly avoids per its jest config strategy).

Pure functions that CAN be unit tested:
- `numColumns(breakpoint)` — the column count calculation
- `formatCookingTime(prepMin, cookMin)` — time display formatting
- `getCookingProgress(currentStep, totalSteps)` — progress percentage

### Sampling Rate

- **Per task commit:** `npx jest` (full suite is fast — only pure function tests exist)
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/recipes/__tests__/RecipeCard.test.ts` — covers numColumns logic and time formatting
- [ ] `src/features/cooking/__tests__/cookingMode.test.ts` — covers progress calculation and step navigation pure functions

*(No framework installation needed — jest.config.js and ts-jest already configured)*

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — all file readings above constitute ground truth for current state
- `src/lib/tokens.ts` — all design tokens confirmed
- `src/lib/hooks/useBreakpoint.ts` — breakpoint thresholds confirmed (mobile <640, tablet 640-1279, web 1280+)
- `src/components/nav/types.ts` — PageContainer variants confirmed (form=600px, content=960px)
- `.planning/STATE.md` — established Phase 8/9 patterns and v1.1 constraints confirmed
- `.planning/phases/10-core-screens/10-CONTEXT.md` — all user decisions confirmed

### Secondary (MEDIUM confidence)

- React Native FlatList `numColumns` + `key` pattern — confirmed in STATE.md + React Native docs behavior
- `flexGrow: 1, flexBasis: 0` on web — confirmed in STATE.md "For v1.1" section

### Tertiary (LOW confidence)

- `position: 'fixed'` not working in React Native — documented in STATE.md as established project learning
- Progress bar `width` as percentage string (`'50%' as any`) — works in React Native on web; TypeScript requires cast since ViewStyle width accepts `DimensionValue` which includes percentage strings

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json and codebase
- Architecture: HIGH — patterns derived from existing working code (nav components, Phase 9 implementations)
- Pitfalls: HIGH — derived from STATE.md documented learnings + code inspection
- Cooking Mode specifics: MEDIUM — new feature; route approach is correct but step UX details are Claude's discretion

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; Expo SDK and react-native-web not changing rapidly)