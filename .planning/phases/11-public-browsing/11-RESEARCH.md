# Phase 11: Public Browsing - Research

**Researched:** 2026-03-04
**Domain:** React Native / Expo Router — unauthenticated public content surface with cursor-based pagination
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Follow cookbook.pen exactly — NOT the same as the authenticated recipe list
- Mobile: list layout with circular photo thumbnails + text (title, metadata, author)
- Tablet: card grid (from .pen spec)
- Web: card grid, 4 columns (from .pen spec)
- Filter chips: "All", "Dinner", "Baking", "Dessert", "Quick" per .pen spec
- Sort: "Popular" as default and only option — no dropdown picker
- Result count shown ("248 public recipes")
- Public navigation header follows cookbook.pen exactly at all 3 breakpoints
- Mobile: Logo (icon + "Cookbook") left, "Sign In" pill button right. Scrolls away with content.
- Tablet: Logo left, search + Sign In right
- Web: Logo (icon + "Cookbook") left, search bar center, "Sign In" text + "Get Started" orange button right. Full viewport width, content constrained inside.
- Header has bottom border ($border-subtle)
- Search bar always visible (not collapsed behind icon) — per .pen spec
- Author attribution follows cookbook.pen exactly: Avatar circle with initials + display name + "Public recipe" label
- Shown on both browse list items and recipe detail
- Uses profiles table display_name (not raw email)
- Recipe detail (public): read-only view per .pen spec
- Mobile: back arrow + "Cookbook" + Sign In in nav bar, hero image, title, author card, description, metadata stats (time, servings, temp), ingredients (truncated with "+N more" link), sign-up CTA card
- Web: two-column layout — recipe content left, ingredients + sign-up CTA right
- "Want to save this recipe?" CTA card with "Create Free Account" button
- No ratings, comments, or edit actions on public view
- Header "Sign In" button on all breakpoints (per .pen)
- "Get Started" CTA button on web header (per .pen)
- "Want to save this recipe?" inline CTA card on recipe detail (per .pen)
- No aggressive gating — users can freely browse and read full recipes
- Cursor-based pagination (PUB-04 requirement)
- Auto-load next page when user scrolls near the bottom
- Spinner at bottom while loading next batch
- Ad slot: Sponsored banner placeholder positioned between recipe results (per .pen)
- Render as empty/hidden placeholder in Phase 11 — actual AdMob integration is Phase 13

### Claude's Discretion
- Loading states and skeletons for browse and detail screens
- Empty state design (no results found)
- Error handling for failed fetches
- Exact cursor pagination implementation (keyset vs offset-based cursor)
- How to handle the Supabase client for unauthenticated reads (anon key with RLS)
- Search debounce timing
- Mobile list item exact spacing and typography (derive from .pen)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUB-01 | Public recipe browse screen with search bar and filter chips (unauthenticated) | Design specs extracted from cookbook.pen; unauthenticated Supabase reads work with existing RLS policy; new `searchPublicRecipes()` with cursor pagination needed |
| PUB-02 | Public recipe detail screen with read-only view and author attribution | Design specs extracted; profiles SELECT policy blocks anon reads — requires Supabase RPC with SECURITY DEFINER to fetch display_name for recipe owner |
| PUB-03 | Public navigation header with logo, Sign In, and Get Started CTA | Full specs extracted from cookbook.pen for all 3 breakpoints; `PublicNavHeader` is a new shared component used by both browse and detail layouts |
| PUB-04 | Cursor-based pagination for public recipe listing | Supabase `.range()` or `.gt('created_at', cursor)` pattern; FlatList `onEndReached` triggers next page load |
</phase_requirements>

---

## Summary

Phase 11 creates two new screens inside the existing `app/(public)/` route group — a public browse screen (`index.tsx`) and a public recipe detail screen (`recipe/[id].tsx`) — both for unauthenticated users. The route group stub exists; it only needs a `PublicNavHeader` wrapper and the two screen files.

The biggest implementation risk is **author attribution**: the current `profiles_select_own` RLS policy only lets authenticated users read their own profile row. Unauthenticated requests cannot join profiles for display_name. The solution is a Supabase RPC function with `SECURITY DEFINER` that returns display_name and initials for a given recipe owner — the same pattern used for comments today but inverted to serve public (anon) callers.

The design system is fully specified in cookbook.pen for all 6 screens (2 screens × 3 breakpoints). No design ambiguity. The browse layout is a horizontal list row on mobile (72×72px rounded thumbnail + text), a 2-column card grid on tablet, and a 4-column card grid on web — all meaningfully different from the authenticated `RecipeCard` grid. Cursor-based pagination is straightforward with Supabase `.range()` keyed by page index, triggered by FlatList `onEndReached`.

**Primary recommendation:** Build `PublicNavHeader` as a shared component consumed by both public screens, implement a `getPublicAuthorName()` Supabase RPC for safe anon display_name access, and extend `searchRecipes()` with a `cursor`/`pageSize` parameter using Supabase `.range()` for offset-based cursor pagination.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~6.0.23 | File-based routing, `app/(public)/` route group | Already in use; `(public)/_layout.tsx` stub exists |
| @supabase/supabase-js | ^2.49.1 | Data fetching with anon key for public reads | Already in use; RLS allows anon `visibility = 'public'` reads |
| react-native FlatList | built-in | Infinite scroll list, `onEndReached` pagination | Project standard for all lists |
| lucide-react-native | ^0.577.0 | Icons (ArrowLeft, BookOpen, Search, Megaphone) | Project icon set |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-safe-area-context | ~5.6.0 | Safe area insets for public nav header | Same pattern as authenticated screens |
| useBreakpoint() | src/lib/hooks | Drives layout switching between mobile/tablet/web | Mandatory for all dimension-sensitive styles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase `.range()` offset cursor | Keyset cursor (`gt('created_at', cursor)`) | Keyset is more correct for infinite feeds but `.range()` is simpler and consistent — no duplicate/skip risk on a "Popular" sort that is static |

**Installation:** No new packages needed. All dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure
```
app/(public)/
├── _layout.tsx          # Existing Stack stub — no changes needed
├── index.tsx            # NEW: public browse screen
└── recipe/
    └── [id].tsx         # NEW: public recipe detail screen

src/features/recipes/
├── search.ts            # EXTEND: add searchPublicRecipes() with cursor pagination
└── public.ts            # NEW: getPublicRecipeWithAuthor() RPC call

src/components/public/
└── PublicNavHeader.tsx  # NEW: shared nav header for all public screens

supabase/migrations/
└── YYYYMMDD_public_author_rpc.sql  # NEW: get_public_recipe_author() RPC
```

### Pattern 1: Unauthenticated Supabase Reads (Existing RLS)

**What:** The existing `supabase` client uses the anon key. The `recipes_select_visibility` RLS policy already passes for `visibility = 'public'` without `auth.uid()` being set. No special client or config needed.

**When to use:** All public recipe list queries.

**Example:**
```typescript
// src/features/recipes/search.ts — add to existing file
export type PublicBrowseCursor = {
  page: number;  // zero-indexed
};

export type PublicBrowseFilters = {
  query?: string;
  tag?: string;  // one tag at a time (chip selection)
  cursor?: PublicBrowseCursor;
  pageSize?: number;
};

export type PublicBrowsePage = {
  recipes: Recipe[];
  hasMore: boolean;
  nextCursor: PublicBrowseCursor | null;
};

export async function searchPublicRecipes(
  filters: PublicBrowseFilters = {}
): Promise<PublicBrowsePage> {
  const pageSize = filters.pageSize ?? 20;
  const page = filters.cursor?.page ?? 0;
  const from = page * pageSize;
  const to = from + pageSize; // Supabase range is inclusive, returns pageSize+1 if available

  let query = supabase
    .from('recipes')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize); // fetch pageSize+1 to detect hasMore

  if (filters.query?.trim()) {
    query = query.ilike('title', `%${filters.query.trim()}%`);
  }
  if (filters.tag && filters.tag !== 'All') {
    query = query.overlaps('tags', [filters.tag]);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data as Recipe[]) || [];
  const hasMore = items.length > pageSize;
  const recipes = hasMore ? items.slice(0, pageSize) : items;

  return {
    recipes,
    hasMore,
    nextCursor: hasMore ? { page: page + 1 } : null,
  };
}
```

### Pattern 2: Author Attribution via SECURITY DEFINER RPC

**What:** The `profiles` table has `profiles_select_own` policy (only `user_id = auth.uid()`). Anon callers cannot read profile rows. A Postgres function with `SECURITY DEFINER` runs as the function owner (postgres), bypassing RLS, and can safely return only the display_name for a given recipe owner.

**When to use:** Fetching author display_name + initials for public recipe cards and detail view.

**Migration:**
```sql
-- supabase/migrations/YYYYMMDD_public_author_rpc.sql
create or replace function public.get_public_recipe_author(p_recipe_id uuid)
returns table(display_name text, initials text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_user_id uuid;
  v_display_name text;
  v_initials text;
begin
  -- Only works for public recipes
  select owner_user_id into v_owner_user_id
  from recipes
  where id = p_recipe_id and visibility = 'public';

  if v_owner_user_id is null then
    return;
  end if;

  select p.display_name into v_display_name
  from profiles p
  where p.user_id = v_owner_user_id;

  -- Derive initials from display_name or fall back to 'U'
  v_initials := coalesce(
    upper(substring(split_part(v_display_name, ' ', 1) from 1 for 1) ||
          substring(split_part(v_display_name, ' ', 2) from 1 for 1)),
    'U'
  );

  return query select v_display_name, v_initials;
end;
$$;

-- Grant execute to anon role
grant execute on function public.get_public_recipe_author(uuid) to anon;
```

**App call:**
```typescript
// src/features/recipes/public.ts
import { supabase } from '@/lib/supabase';

export type PublicAuthor = {
  display_name: string | null;
  initials: string;
};

export async function getPublicRecipeAuthor(
  recipeId: string
): Promise<PublicAuthor> {
  const { data, error } = await supabase
    .rpc('get_public_recipe_author', { p_recipe_id: recipeId });
  if (error) throw error;
  const row = data?.[0];
  return {
    display_name: row?.display_name ?? null,
    initials: row?.initials ?? 'U',
  };
}
```

**Alternative — bulk author fetch for list view:**
```sql
-- For browse list: fetch author names for a batch of recipe IDs in one RPC call
create or replace function public.get_public_recipe_authors(p_recipe_ids uuid[])
returns table(recipe_id uuid, display_name text, initials text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select r.id, p.display_name,
    coalesce(
      upper(substring(split_part(p.display_name, ' ', 1) from 1 for 1) ||
            substring(split_part(p.display_name, ' ', 2) from 1 for 1)),
      'U'
    ) as initials
  from recipes r
  join profiles p on p.user_id = r.owner_user_id
  where r.id = any(p_recipe_ids)
    and r.visibility = 'public';
end;
$$;
grant execute on function public.get_public_recipe_authors(uuid[]) to anon;
```

### Pattern 3: FlatList Infinite Scroll (Cursor Pagination)

**What:** Append-style pagination using `onEndReached` and `onEndReachedThreshold`. New page data appended to existing list. Loading spinner shown as FlatList footer.

**When to use:** Public browse screen with any breakpoint.

**Example:**
```typescript
// In app/(public)/index.tsx
const [recipes, setRecipes] = useState<Recipe[]>([]);
const [cursor, setCursor] = useState<PublicBrowseCursor | null>(null);
const [hasMore, setHasMore] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);

async function loadNextPage() {
  if (isLoadingMore || !hasMore) return;
  setIsLoadingMore(true);
  try {
    const page = await searchPublicRecipes({
      query: searchQuery,
      tag: selectedTag,
      cursor: cursor ?? undefined,
    });
    setRecipes(prev => cursor === null ? page.recipes : [...prev, ...page.recipes]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
  } finally {
    setIsLoadingMore(false);
  }
}

// FlatList footer
const ListFooter = isLoadingMore
  ? <ActivityIndicator style={{ padding: 16 }} color={accentWarm} />
  : null;

// FlatList props
<FlatList
  data={recipes}
  onEndReached={loadNextPage}
  onEndReachedThreshold={0.3}
  ListFooterComponent={ListFooter}
  // For web: flexGrow:1, flexBasis:0 + key={numColumns}
/>
```

### Pattern 4: PublicNavHeader Component

**What:** A standalone header component (not expo-router's built-in header) that renders differently per breakpoint. Placed above the ScrollView/FlatList at the same flex level so it stays fixed while content scrolls — same pattern as recipe detail header in Phase 10.

**When to use:** Both `app/(public)/index.tsx` and `app/(public)/recipe/[id].tsx`.

**Note on mobile browse vs mobile detail:** The browse header scrolls away WITH content (part of the list header or above a scrollable content area). The detail nav bar is sticky. These are implemented differently:
- Browse: `PublicBrowseHeader` inside the page as a non-sticky area above FlatList (both are siblings in a `flex:1` column)
- Detail: `PublicNavBar` is a sticky View above a ScrollView — same pattern as recipe detail header in Phase 10

### Pattern 5: Ad Slot Placeholder

**What:** A `View` with fixed dimensions matching the ad banner size, with a "Sponsored" label and Megaphone icon, background `#F9FAFB`, border `borderDefault`. Phase 13 will replace with AdMob integration.

**Important:** From STATE.md: `AdSlot` MUST be platform-branched (`AdSlot.native.tsx` / `AdSlot.web.tsx`) from the start — AdMob SDK breaks web build if imported directly. Even though Phase 11 only renders a placeholder, set up the file-based branching now.

### Anti-Patterns to Avoid
- **Fetching author display_name directly from profiles table:** Will silently return empty for anon callers (RLS blocks it). Always go through the `get_public_recipe_author` RPC.
- **Using StyleSheet.create for dimension-sensitive styles:** All breakpoint-dependent values must be computed inline from `useBreakpoint()`.
- **Re-fetching thumbnails per card in renderItem:** Batch fetch all IDs via `getRecipeThumbnailUrlMap()` before render (same pattern as Home screen in Phase 10).
- **Loading new page on every scroll event:** Guard with `isLoadingMore || !hasMore` before triggering next page fetch.
- **Resetting search without resetting cursor:** When query or tag changes, set `cursor = null` and `recipes = []` to start fresh from page 1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Author name for anon users | Custom join logic in app layer | Supabase RPC with SECURITY DEFINER | RLS blocks anon profile reads; app-layer join would silently return null |
| Infinite scroll detection | Manual scroll position math | FlatList `onEndReached` + `onEndReachedThreshold` | Platform-correct, handles web and native |
| Thumbnail batch fetch | Per-item photo query | `getRecipeThumbnailUrlMap()` (already exists in photos.ts) | N+1 query problem; existing utility solves it |
| Platform-branched ad slot | Single component with conditional | `.native.tsx` / `.web.tsx` file extensions | AdMob SDK import breaks web build |

**Key insight:** Supabase RLS is SECURITY definer-aware — a `SECURITY DEFINER` function can grant safe, limited access to protected data without opening up full table read access to anon callers.

---

## Common Pitfalls

### Pitfall 1: Profiles RLS Silently Blocks Author Display Names
**What goes wrong:** `supabase.from('profiles').select('display_name').eq('user_id', ownerId)` returns empty data (no error) for anon callers because `profiles_select_own` policy requires `user_id = auth.uid()`.
**Why it happens:** Supabase RLS denies silently (empty result, no 403) for SELECT policies — you don't get an error, just no rows.
**How to avoid:** Use the `get_public_recipe_author` RPC exclusively. Never read profiles directly in public screens.
**Warning signs:** Author name shows as null/undefined without any console errors.

### Pitfall 2: Tag Filtering with Supabase Array Overlap
**What goes wrong:** Filter chips map to recipe `tags` column (a text array). Using `.eq('tags', 'Dinner')` won't work on array columns.
**Why it happens:** Need `.overlaps('tags', ['Dinner'])` for array containment, or `.contains('tags', ['Dinner'])` for strict contains.
**How to avoid:** Use `.overlaps('tags', [selectedTag])` when a tag chip is active (other than "All").
**Warning signs:** Filter chips appear to work visually but return no results.

### Pitfall 3: FlatList Key Collision on Pagination Append
**What goes wrong:** Appending new page data produces duplicate keys if the same recipe appears in two pages (edge case with offset pagination near concurrent writes).
**Why it happens:** Offset-based pagination (`range(from, to)`) can have boundary shifts if rows are inserted between page fetches.
**How to avoid:** Use `keyExtractor={(item) => item.id}` (already standard). Accept the rare duplicate risk — offset pagination is acceptable for a "Popular" sort that is essentially static.
**Warning signs:** React Native duplicate key warning in development.

### Pitfall 4: FlatList on Web Without flexGrow/flexBasis
**What goes wrong:** FlatList with `flex:1` inside a flex container on web can collapse to zero height.
**Why it happens:** Web flex model differs from native for FlatList specifically.
**How to avoid:** Use `flexGrow: 1, flexBasis: 0` on the FlatList container on web — same pattern established in Phase 10.
**Warning signs:** Empty list area on web despite data loading successfully.

### Pitfall 5: numColumns Grid Needs key={numColumns}
**What goes wrong:** Switching between breakpoints (resize on web) with `numColumns` causes React warnings or layout glitches.
**Why it happens:** FlatList cannot change numColumns without remounting.
**How to avoid:** Always pass `key={numColumns}` to FlatList alongside `numColumns={numColumns}`.
**Warning signs:** Layout is stuck at initial breakpoint column count after window resize.

### Pitfall 6: Search Debounce Causes Stale Cursor
**What goes wrong:** Rapid typing fires multiple searches with different cursors, resulting in interleaved page appends.
**Why it happens:** No cancellation or sequence guard on debounced search.
**How to avoid:** Use a `loadSeqRef` (same pattern as Phase 10 recipe list screen) to discard stale fetch results. Reset cursor to null on every new search/filter change.
**Warning signs:** Search results contain a mix of items from different queries.

---

## Design Specifications (Extracted from cookbook.pen)

All specs extracted directly from the cookbook.pen file. Confidence: HIGH.

### Token Mapping

| .pen token | tokens.ts export | Value |
|-----------|-----------------|-------|
| `$bg-card-warm` | `bgCardWarm` | `#FFFBF5` |
| `$accent-warm` | `accentWarm` | `#E8784E` |
| `$text-primary` | `textPrimary` | `#1A1A1A` |
| `$text-secondary` | `textSecondary` | `#6B7280` |
| `$text-tertiary` | `textTertiary` | `#9CA3AF` |
| `$bg-card` | `bgCard` | `#F6F7F8` |
| `$white` | `white` | `#FFFFFF` |
| `$border-subtle` | `borderSubtle` | `#F3F4F6` |
| `$border-default` | `borderDefault` | `#E5E7EB` |
| `$accent-blue` | `accentBlue` | `#007AFF` |
| `$radius-sm` | `radiusSm` | `12` |
| `$radius-md` | `radiusMd` | `16` |
| `$radius-pill` | `radiusPill` | `100` |

### Public Navigation Header

#### Mobile Browse Header (`pbHeader`)
- Background: `bgCardWarm` (`#FFFBF5`)
- Layout: vertical stack, padding `[16, 24]` (vertical, horizontal), gap `16`
- No bottom border on browse header
- **Top row:** Logo left, Sign In pill right. `justifyContent: space-between`, `alignItems: center`
  - **Logo:** BookOpen icon (lucide, 24×24, `accentWarm`) + "Cookbook" text (`textPrimary`, 20px, Bricolage Grotesque 700). gap `8`, `alignItems: center`
  - **Sign In button:** `Component/Button/Secondary` — height 48, bg `bgCard`, `borderRadius: radiusPill`, border 1px `borderDefault` inside, padding `[12, 24]`, text "Sign In" 15px DM Sans 600 `textPrimary`
- **Search bar:** `Component/SearchBar` — height 48, bg `bgCard`, borderRadius 26, padding `[0, 18]`, Search icon 18×18 `textTertiary` + "Search recipes..." text 15px DM Sans normal `textTertiary`. Full width (`width: fill_container`)
- **Filter chips:** horizontal row, gap 8, `ScrollView horizontal` (chips overflow on small screens)
  - **Active chip ("All"):** bg `accentWarm`, `borderRadius: radiusPill`, padding `[6, 14]`, text 12px DM Sans 600 `white`
  - **Inactive chip:** bg `bgCard`, `borderRadius: radiusPill`, padding `[6, 14]`, text 12px DM Sans 500 `textSecondary`
  - Chips: "All", "Dinner", "Baking", "Dessert", "Quick"

#### Tablet Browse Header (`pbHeader`)
- Background: `bgCardWarm`, padding `[20, 32]`, gap `16`, layout vertical
- No bottom border
- **Top row:** Logo left, rightActions (search 320px + Sign In) right
  - Logo: BookOpen 28×28 `accentWarm` + "Cookbook" 22px Bricolage 700
  - Sign In: same Secondary Button component
  - Search width: 320px
- **Filter chips:** same style, additional chips "Vegetarian", "Comfort" (7 total)

#### Web Browse Header (`pbHeader`)
- Background: `bgCardWarm`, padding `[16, 48]`, layout horizontal, `justifyContent: space-between`, `alignItems: center`
- No bottom border
- **Logo:** BookOpen 28×28 `accentWarm` + "Cookbook" 22px Bricolage 700, gap 10
- **Center search:** 480px wide `Component/SearchBar`
- **Right actions:** gap 12, `alignItems: center`
  - Sign In: Secondary Button ("Sign In")
  - Get Started: Primary Button (`accentWarm`, `borderRadius: radiusPill`, "Get Started" + arrow-right icon, text 15px DM Sans 600 `white`, padding `[12, 24]`, height 48)

#### Mobile/Tablet Recipe Detail Nav Bar (`pubNavBar`)
- **Bottom border:** `borderSubtle` (`#F3F4F6`), thickness 1px, bottom edge only
- Mobile padding: `[10, 20]`, Tablet padding: `[12, 32]`
- `justifyContent: space-between`, `alignItems: center`
- **Mobile left:** ArrowLeft icon 20×20 `textSecondary` + "Cookbook" 18px Bricolage 700 `textPrimary`, gap 8
- **Tablet left:** ArrowLeft 20×20 + "Cookbook" 20px Bricolage 700, gap 10
- **Mobile right:** Sign In (Secondary Button, "Sign In")
- **Tablet right:** Search 260px + Sign In (Secondary Button), gap 12

#### Web Recipe Detail Nav Bar (`pubNavBar`)
- Padding: `[12, 48]`, `justifyContent: space-between`, `alignItems: center`
- Logo: BookOpen 28×28 + "Cookbook" 22px Bricolage 700, gap 10
- Center: Search 480px
- Right: Sign In (Secondary) + Get Started (Primary), gap 12

### Public Browse Screen

#### Mobile Browse List Item (result row)
- Container: `fill_container` width, bg `bgCard`, `borderRadius: radiusSm` (12), padding 12, gap 12, `alignItems: center`, horizontal layout (default)
- **Thumbnail image:** 72×72px, `cornerRadius: 10` (NOT a full circle), `clip: true`, `resizeMode: cover`
- **Info column:** vertical, gap 4
  - Title: 15px DM Sans 600 `textPrimary`
  - Meta: "1h 30m · 6 servings · Italian", 12px DM Sans normal `textSecondary`
  - By line: "By Maria T.", 11px DM Sans normal `textTertiary`
- **List gap:** gap 14 between rows

#### Mobile Browse Count/Sort Row
- `justifyContent: space-between`, `alignItems: center`
- Count: "248 public recipes", 13px DM Sans normal `textSecondary`
- Sort: "Sort: Popular", 12px DM Sans 500 `accentWarm`

#### Mobile Browse Ad Placement
- Between results (after result 3 in the design, before result 4)
- Container: `fill_container` width, padding `[4, 0]`, `alignItems: center`, `justifyContent: center`
- Renders `Component/AdBanner/Mobile` placeholder: 320×50px, bg `#F9FAFB`, `borderRadius: 8`, border 1px `borderDefault`, centered Megaphone icon 14×14 `textTertiary` + "Sponsored" 10px DM Sans 500 `textTertiary`
- In Phase 11: render the placeholder View but do NOT import AdMob SDK

#### Tablet Browse Grid
- Body padding: `[16, 32]`, gap 16
- 2-column card grid (use `FlatList numColumns={2}` or a horizontal row layout)
- Card: bg `bgCard`, `borderRadius: radiusMd` (16), vertical layout
  - Image: `fill_container` width, 140px height, `clip: true`
  - Info: padding 14, gap 4 — title 15px DM Sans 600, meta 12px DM Sans normal `textSecondary`, by-line 11px DM Sans normal `textTertiary`
- Grid gap: 16

#### Web Browse Grid
- Body padding: `[24, 48]`, gap 20
- **Filters row:** `justifyContent: space-between`, `alignItems: center`
  - Chips left (same active/inactive style)
  - Count + Sort right (gap 12)
- 4-column card grid (gap 20)
  - Card: bg `bgCard`, vertical layout — image `fill_container` × 140px + info padding 12 gap 4
  - Title: 14px DM Sans 600, meta: 11px DM Sans normal `textSecondary`, by-line: 10px DM Sans normal `textTertiary`

### Public Recipe Detail Screen

#### Mobile Detail Content (scrollBody)
- **Hero image:** `fill_container` × 220px, `resizeMode: cover`
- **Content area** (detailContent): padding 24, gap 20, vertical layout
  - **Title:** 24px Bricolage Grotesque 700 `textPrimary`
  - **Author row:** gap 10, `alignItems: center`
    - Avatar: 32×32 circle (View with `borderRadius: 16`), bg `accentBlue`, centered initials text 12px DM Sans 700 `white`
    - Info column: display_name 13px DM Sans 600 `textPrimary`, "Public recipe" 11px DM Sans normal `textTertiary`
  - **Description:** 14px DM Sans normal `textSecondary`, `fill_container` width
  - **Metadata stats row:** bg `bgCard`, padding 14, `justifyContent: space-around`
    - Each stat: value 15px DM Sans 600 `textPrimary` + label 11px DM Sans normal `textTertiary`, gap 2, `alignItems: center`
    - Stats: Cook time, Servings, Oven temp
  - **Ingredients section:** gap 10
    - "Ingredients" heading: 20px Bricolage 700 `textPrimary`
    - Each ingredient row: 6×6 ellipse `accentWarm` + 14px DM Sans normal `textPrimary`, gap 8, `alignItems: center`
    - Truncate after 3: "+ N more ingredients" 13px DM Sans 500 `accentWarm`
  - **Sign-up CTA card:** bg `bgCardWarm`, padding 20, gap 10, `alignItems: center`
    - "Want to save this recipe?" 16px Bricolage 700 `textPrimary`
    - Description: 280px wide, 13px DM Sans normal `textSecondary`
    - "Create Free Account" button: Primary Button component (accentWarm, pill radius)

#### Tablet Detail Content
- Content constrained to 640px width, centered
- Hero: `fill_container` × 300px
- Title: 28px Bricolage 700
- Author avatar: 36×36 (`borderRadius: 18`), initials 13px
- Author name: 14px DM Sans 600, "Public recipe" 12px
- Metadata padding 16, values 16px DM Sans 600
- Ingredients: same truncation pattern, "+ N more ingredients" 13px
- CTA: padding 24, "Want to save this recipe?" 18px Bricolage 700, desc width 400px

#### Web Detail Layout (two-column)
- Content row: 960px max width, gap 40, `alignItems: flex-start`
- **Left column** (`fill_container`): Hero 320px height, title 32px Bricolage 700, author 36×36 avatar, desc 14px, meta stats padding 16
- **Right column** (320px fixed width): vertically stacked, gap 24
  - Ingredients box: bg `bgCard`, padding 20, `borderRadius: radiusMd`, gap 12
    - "Ingredients" 18px Bricolage 700
    - Items 13px DM Sans, 6×6 ellipse `accentWarm`
    - "+ N more" 12px DM Sans 500 `accentWarm`
  - CTA card: bg `bgCardWarm`, padding 20, "Save this recipe" 16px Bricolage 700, desc 260px, CTA button fill_container
  - Ad placeholder: `fill_container` × 250px, bg `#F9FAFB`, centered Megaphone 18×18 `textTertiary` + "Sponsored" 11px

### Component/SearchBar Spec
```typescript
// Height 48, bg bgCard, borderRadius 26, paddingHorizontal 18, gap 12, alignItems center
// Search icon: lucide Search, 18×18, color textTertiary
// Placeholder: "Search recipes...", 15px DM Sans normal, color textTertiary
```

### Ad Banner Placeholder Spec
```typescript
// Mobile (Component/AdBanner/Mobile): 320×50, bg #F9FAFB, borderRadius 8,
//   border 1px borderDefault, centered Megaphone 14×14 + "Sponsored" 10px

// Tablet/Web (Component/AdBanner/Leaderboard): 728×90, bg #F9FAFB, borderRadius 10,
//   border 1px borderDefault, centered Megaphone 16×16 + "Sponsored" 11px

// Implementation in Phase 11: render as static View placeholder
// Phase 13 will replace with AdMob native ads (platform-branched files)
```

---

## Code Examples

### Public Browse Screen Structure
```typescript
// Source: cookbook.pen Public Browse - Mobile (390px) + pattern from Phase 10 recipe list
export default function PublicBrowseScreen() {
  const { breakpoint } = useBreakpoint();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [cursor, setCursor] = useState<PublicBrowseCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [authorMap, setAuthorMap] = useState<Record<string, PublicAuthor>>({});
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const loadSeqRef = useRef(0);

  // Reset and load when query/tag changes
  useEffect(() => {
    const seq = ++loadSeqRef.current;
    setCursor(null);
    setHasMore(true);
    loadPage(null, seq);
  }, [searchQuery, selectedTag]);

  const numColumns = breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 4;

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      <PublicBrowseHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        breakpoint={breakpoint}
      />
      <FlatList
        data={recipes}
        numColumns={numColumns}
        key={numColumns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={numColumns > 1 ? { gap: numColumns === 2 ? 16 : 20 } : undefined}
        contentContainerStyle={{ padding: breakpoint === 'mobile' ? 24 : 32, gap: 14, flexGrow: 1 }}
        style={breakpoint === 'web' ? { flexGrow: 1, flexBasis: 0 } : { flex: 1 }}
        renderItem={({ item }) => (
          breakpoint === 'mobile'
            ? <PublicListRow recipe={item} author={authorMap[item.id]} thumbnail={thumbnailMap[item.id]} />
            : <PublicRecipeCard recipe={item} author={authorMap[item.id]} thumbnail={thumbnailMap[item.id]} />
        )}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator color={accentWarm} style={{ padding: 16 }} /> : null}
      />
    </View>
  );
}
```

### Public List Row (Mobile)
```typescript
// Source: cookbook.pen Public Browse - Mobile (390px) result row spec
// bg: bgCard, borderRadius: radiusSm (12), padding: 12, gap: 12, alignItems: center
// Thumbnail: 72×72, cornerRadius: 10, resizeMode: cover
// Title: 15px DM Sans 600 textPrimary
// Meta: 12px DM Sans normal textSecondary
// By line: 11px DM Sans normal textTertiary
function PublicListRow({ recipe, author, thumbnail }) {
  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      style={{
        flexDirection: 'row',
        backgroundColor: bgCard,
        borderRadius: radiusSm,
        padding: 12,
        gap: 12,
        alignItems: 'center',
      }}
    >
      {thumbnail
        ? <Image source={{ uri: thumbnail }} style={{ width: 72, height: 72, borderRadius: 10 }} resizeMode="cover" />
        : <View style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: '#E8E0D8', alignItems: 'center', justifyContent: 'center' }}>
            <UtensilsCrossed size={24} color="#8B7355" />
          </View>
      }
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: 15, color: textPrimary }} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={{ fontFamily: fontFamilyBody, fontSize: 12, color: textSecondary }}>
          {formatMetadataLine(recipe.prep_time_minutes, recipe.cook_time_minutes, recipe.servings)}
        </Text>
        {author && (
          <Text style={{ fontFamily: fontFamilyBody, fontSize: 11, color: textTertiary }}>
            By {author.display_name ?? 'Anonymous'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
```

### Author Avatar Component
```typescript
// Source: cookbook.pen author attribution spec
// Mobile: 32×32 circle, accentBlue bg, 12px initials
// Tablet/Web: 36×36 circle, accentBlue bg, 13px initials
function AuthorAvatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: fontFamilyBodyBold,
        fontSize: size === 32 ? 12 : 13,
        color: white,
      }}>
        {initials}
      </Text>
    </View>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset pagination with `limit`/`offset` | Cursor-based via `.range()` with `page` index | Phase 11 requirement | Better UX (no re-fetch from page 1 on filter change) |
| Direct profile reads for author names | SECURITY DEFINER RPC | Phase 11 (new) | Required because anon callers cannot read profiles table |

**Deprecated/outdated:**
- `searchRecipes()` current signature: Add `searchPublicRecipes()` as a new function alongside it (don't modify the existing one — it's used by authenticated screens).

---

## Open Questions

1. **Tag filter mapping to database tags**
   - What we know: Recipe `tags` column is a text array. Filter chips are "All", "Dinner", "Baking", "Dessert", "Quick"
   - What's unclear: Are these chip labels exact matches to the values stored in `tags`? Users create tags freely during recipe creation.
   - Recommendation: Use case-insensitive overlap: `.overlaps('tags', [selectedTag.toLowerCase()])`. Implement gracefully — if no recipes have "Dinner" tag, show empty state rather than breaking.

2. **Ingredient truncation threshold on mobile**
   - What we know: .pen shows 3 ingredients + "+ 5 more ingredients" link
   - What's unclear: Is 3 the exact threshold or is it based on available space?
   - Recommendation: Use 3 as the fixed threshold per .pen design. Show "+ N more ingredients" where N = total - 3.

3. **Total count for "248 public recipes" label**
   - What we know: The count shown is the total matching the current filter/search, not just the loaded page
   - What's unclear: Should this be an exact count from a separate `count` query, or approximate?
   - Recommendation: Add a separate `supabase.from('recipes').select('id', { count: 'exact' }).eq('visibility', 'public')` call with same filters. Update count on every filter change. This is a lightweight query.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + ts-jest 29.4 |
| Config file | `jest.config.js` (exists) |
| Quick run command | `npx jest --testPathPattern=public` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | `searchPublicRecipes()` filters by tag and query | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ Wave 0 |
| PUB-01 | Filter chip "All" clears tag filter | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ Wave 0 |
| PUB-02 | `getPublicRecipeAuthor()` returns display_name and initials | unit | `npx jest --testPathPattern=publicRecipes` | ❌ Wave 0 |
| PUB-02 | Author initials derived correctly from display_name | unit | `npx jest --testPathPattern=publicRecipes` | ❌ Wave 0 |
| PUB-03 | PublicNavHeader renders correct elements per breakpoint | unit | `npx jest --testPathPattern=PublicNavHeader` | ❌ Wave 0 |
| PUB-04 | `searchPublicRecipes()` returns `hasMore=true` when pageSize+1 rows returned | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ Wave 0 |
| PUB-04 | `searchPublicRecipes()` `nextCursor.page` increments correctly | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern=public`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/recipes/__tests__/searchPublicRecipes.test.ts` — covers PUB-01, PUB-04
- [ ] `src/features/recipes/__tests__/publicRecipes.test.ts` — covers PUB-02 (initials derivation, author fetch shape)
- [ ] `src/components/public/__tests__/PublicNavHeader.test.ts` — covers PUB-03 (pure style/element logic)

Note: Supabase calls will need mocking (same pattern as existing tests use moduleNameMapper). The `get_public_recipe_author` RPC and `searchPublicRecipes` pagination logic should be tested with pure unit tests mocking the supabase client.

---

## Sources

### Primary (HIGH confidence)
- `cookbook.pen` (parsed directly) — all design specs for Public Browse and Public Recipe Detail at all 3 breakpoints. All dimensions, typography, colors, and layout extracted from actual .pen JSON.
- `/supabase/migrations/20260203090000_phase1_foundation.sql` — confirmed `recipes_select_visibility` RLS policy, profiles table schema, `profiles_select_own` policy
- `/src/features/recipes/search.ts` — existing `searchRecipes()` function to extend
- `/src/features/recipes/photos.ts` — confirmed `getRecipeThumbnailUrlMap()` API
- `/src/lib/tokens.ts` — confirmed all token names and values
- `/src/lib/hooks/useBreakpoint.ts` — confirmed breakpoint thresholds (mobile <640, tablet 640-1279, web ≥1280)
- `/src/components/nav/types.ts` — confirmed `PADDING_BY_BREAKPOINT` values
- `/app/(public)/_layout.tsx` — confirmed stub exists, `headerShown: false`
- `STATE.md` — confirmed AdSlot platform-branching requirement, FlatList web flex pattern

### Secondary (MEDIUM confidence)
- Supabase SECURITY DEFINER pattern for RLS bypass — verified in existing `get_recipe_comments` RPC (20260216000000 migration) and `delete_recipe_comment` RPC (20260216100000 migration). Same pattern used for author RPC.

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — extracted from cookbook.pen directly; patterns match Phase 10 decisions
- Pitfalls: HIGH — profiles RLS confirmed from migration SQL; FlatList web patterns confirmed from STATE.md
- Design specs: HIGH — extracted directly from cookbook.pen JSON, not from visual estimation

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain; design is locked in .pen file)
