# Phase 4: Trust + Collaboration (Units + Social) - Research

**Researched:** 2026-02-16
**Domain:** Unit conversion systems and social collaboration features (comments, ratings)
**Confidence:** HIGH

## Summary

Phase 4 implements two distinct but complementary capabilities: (1) canonical unit storage with metric/imperial conversion for ingredient measurements, and (2) social features including threaded comments and half-star ratings that respect recipe visibility boundaries.

The unit conversion system requires building a lightweight conversion engine (not using external libraries) based on standard cooking measurement ratios, coupled with best-effort ingredient parsing and a user confirmation flow. The social features leverage PostgreSQL recursive CTEs for threaded comments and Supabase RLS patterns established in Phase 1 to enforce visibility boundaries (family-only comments for family recipes, public comments for public recipes).

**Primary recommendation:** Build custom solutions for all Phase 4 features. Unit conversion ratios are standardized and straightforward to implement. Star rating interactions use React Native Pressable touch coordinates. Threaded comments use PostgreSQL recursive CTEs. Avoid external libraries for these well-defined problems.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Comment system:**
- Threaded comments (replies nest under parent comments)
- Users can edit their own comments (show "edited" indicator) and delete them
- Moderation: comment author can delete their own; recipe owner and family admin can both moderate/delete any comment
- Family recipe comments are visible to family members only — no special owner exception needed since the recipe owner is always a family member
- Public recipe comments are visible to everyone

**Ingredient display:**
- Converted values show with original in parentheses: "2 cups (500ml) flour"
- Ambiguous/non-standard measurements ("a pinch", "some", "handful") are preserved as-is with a subtle indicator that conversion wasn't possible
- Unit preference is a global setting in the user's profile/settings page — applies to all recipes

**Unit parsing:**
- Parse + confirm approach: when ingredients are entered (manual or scan), show the parsed canonical result and let the user confirm or correct before saving
- Best-effort parsing into canonical form, but user has final say

### Claude's Discretion

- Rating input UX (slider, tap stars, etc.) — pick what works best for half-star increments on mobile
- Where ratings/averages display (list view, detail, or both)
- Who can rate family vs public recipes (infer from privacy model)
- Comment threading depth (flat replies vs deeply nested)
- "Edited" indicator styling
- Ambiguous measurement flag styling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UNIT-01 | Ingredients support canonical amount+unit storage where possible, while preserving as-entered text for ambiguous cases | Custom conversion system with volume/weight ratios; schema supports both canonical and as-entered fields |
| UNIT-02 | User can set a preferred unit system (metric/imperial) and recipes display accordingly | Conversion logic + user preference storage in profiles table; display-time conversion based on preference |
| SOC-01 | Users can comment on recipes they can access (family-only discussion for private/family; public discussion for public recipes) | PostgreSQL recursive CTE for threaded structure; RLS policies inherit recipe visibility pattern from Phase 1 |
| SOC-02 | Users can rate recipes with 0–5 stars in 0.5 increments; recipes display average rating and count | Custom star rating component using Pressable touch coordinates; aggregate calculation for averages |

</phase_requirements>

## Standard Stack

### Core Technologies (Already Established)

| Library | Version | Purpose | Phase Established |
|---------|---------|---------|------------------|
| Expo | ^54.0.33 | React Native framework | Phase 1 |
| React Native | 0.76.0 | Mobile UI | Phase 1 |
| Supabase JS | ^2.49.1 | Database + Auth client | Phase 1 |
| PostgreSQL | (Supabase managed) | Relational database | Phase 1 |
| TypeScript | ^5.6.3 | Type safety | Phase 1 |

### Phase 4 Additions

**No external libraries required.** All Phase 4 features implemented with:
- Built-in React Native components (Pressable, TextInput, View, Text)
- PostgreSQL built-in features (recursive CTEs, aggregate functions)
- Custom TypeScript utility functions for unit conversion and parsing

### Why No Libraries

**Unit conversion:** Standard cooking measurements have fixed ratios that don't change. A simple conversion table (50 lines of code) is more maintainable than a dependency with hundreds of use cases we don't need.

**Star ratings:** Touch coordinate calculation is ~20 lines of code using Pressable's locationX. External libraries add complexity for animation features we don't need.

**Ingredient parsing:** Regex-based parsing for common patterns (fractions, decimals, unit names) is sufficient for "parse + confirm" UX. User correction handles edge cases better than any NLP library.

**Threaded comments:** PostgreSQL recursive CTEs are purpose-built for this. No library needed.

## Architecture Patterns

### Database Schema

**Unit Storage Pattern:**
```sql
-- Extend recipes.ingredients JSONB structure
-- Current: { text: string, sort_order: number }
-- Enhanced: {
--   text: string,                    -- As-entered or canonical display
--   sort_order: number,
--   amount: number | null,            -- Canonical numeric amount
--   unit: string | null,              -- Canonical unit (e.g., 'ml', 'g', 'cup')
--   original_text: string | null,     -- Preserve exact as-entered text
--   is_ambiguous: boolean             -- Flag for "pinch", "to taste", etc.
-- }
```

**Comments Table:**
```sql
create table recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references recipe_comments(id) on delete cascade,
  content text not null,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_comments_recipe_id_idx on recipe_comments(recipe_id);
create index recipe_comments_parent_id_idx on recipe_comments(parent_comment_id);
create index recipe_comments_user_id_idx on recipe_comments(user_id);
```

**Ratings Table:**
```sql
create table recipe_ratings (
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 0 and rating <= 5 and (rating * 10)::int % 5 = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index recipe_ratings_recipe_id_idx on recipe_ratings(recipe_id);
```

**User Preferences:**
```sql
-- Extend profiles table
alter table profiles add column unit_preference text check (unit_preference in ('metric', 'imperial')) default 'imperial';
```

### RLS Policies Pattern

**Comments inherit recipe visibility:**
```sql
-- Users can read comments if they can read the recipe
create policy "comments_select_recipe_access" on recipe_comments
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_comments.recipe_id
      and (
        r.visibility = 'public'
        or r.owner_user_id = auth.uid()
        or (
          r.visibility = 'family'
          and r.family_id is not null
          and public.is_family_member(r.family_id, auth.uid())
        )
      )
    )
  );

-- Users can insert comments on recipes they can access
create policy "comments_insert_recipe_access" on recipe_comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from recipes r where r.id = recipe_id
      and (
        r.visibility = 'public'
        or r.owner_user_id = auth.uid()
        or (r.visibility = 'family' and r.family_id is not null and public.is_family_member(r.family_id, auth.uid()))
      )
    )
  );

-- Users can update their own comments
create policy "comments_update_own" on recipe_comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Users can delete their own comments; recipe owner and family admin can moderate
create policy "comments_delete_moderation" on recipe_comments
  for delete using (
    user_id = auth.uid()  -- Own comment
    or exists (
      select 1 from recipes r
      where r.id = recipe_comments.recipe_id
      and (
        r.owner_user_id = auth.uid()  -- Recipe owner
        or (r.family_id is not null and public.is_family_admin(r.family_id, auth.uid()))  -- Family admin
      )
    )
  );
```

**Ratings inherit recipe visibility (same pattern):**
```sql
-- Similar EXISTS pattern for ratings - users can rate recipes they can access
```

### Recursive CTE for Comment Threading

**PostgreSQL function to fetch threaded comments:**
```sql
create or replace function get_recipe_comments(p_recipe_id uuid)
returns table (
  id uuid,
  recipe_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  content text,
  is_edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  depth int,
  path text
)
language sql
stable
as $$
  with recursive comment_tree as (
    -- Base case: top-level comments (no parent)
    select
      c.id,
      c.recipe_id,
      c.user_id,
      c.parent_comment_id,
      c.content,
      c.is_edited,
      c.created_at,
      c.updated_at,
      0 as depth,
      c.id::text as path
    from recipe_comments c
    where c.recipe_id = p_recipe_id
      and c.parent_comment_id is null

    union all

    -- Recursive case: child comments
    select
      c.id,
      c.recipe_id,
      c.user_id,
      c.parent_comment_id,
      c.content,
      c.is_edited,
      c.created_at,
      c.updated_at,
      ct.depth + 1,
      ct.path || '/' || c.id::text
    from recipe_comments c
    join comment_tree ct on c.parent_comment_id = ct.id
  )
  select * from comment_tree
  order by path;
$$;
```

**Performance note:** Mark as `STABLE` so PostgreSQL can cache results within transaction. RLS still applies to the underlying `recipe_comments` table, so no security definer needed.

### Unit Conversion Utility

**src/features/units/conversions.ts:**
```typescript
// Conversion ratios (source: WebstaurantStore, USDA standards)
const VOLUME_TO_ML = {
  // US customary to metric
  tsp: 4.92892,
  tbsp: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,

  // Metric
  ml: 1,
  l: 1000,

  // Aliases
  teaspoon: 4.92892,
  tablespoon: 14.7868,
  ounce: 29.5735,
  oz: 29.5735,
};

const WEIGHT_TO_GRAMS = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
  gram: 1,
  kilogram: 1000,
  pound: 453.592,
};

export type UnitSystem = 'metric' | 'imperial';

export function convertVolume(amount: number, fromUnit: string, toUnit: string): number {
  const fromMl = VOLUME_TO_ML[fromUnit.toLowerCase()];
  const toMl = VOLUME_TO_ML[toUnit.toLowerCase()];

  if (!fromMl || !toMl) return amount; // Can't convert

  const ml = amount * fromMl;
  return ml / toMl;
}

export function convertWeight(amount: number, fromUnit: string, toUnit: string): number {
  const fromG = WEIGHT_TO_GRAMS[fromUnit.toLowerCase()];
  const toG = WEIGHT_TO_GRAMS[toUnit.toLowerCase()];

  if (!fromG || !toG) return amount;

  const grams = amount * fromG;
  return grams / toG;
}

// Convert for display based on user preference
export function displayAmount(
  amount: number,
  unit: string,
  preference: UnitSystem,
  originalText: string
): string {
  // If conversion not possible, show original
  if (!canConvert(unit)) {
    return originalText;
  }

  // Convert based on preference
  const targetUnit = getTargetUnit(unit, preference);
  const converted = convertVolume(amount, unit, targetUnit) || convertWeight(amount, unit, targetUnit);

  if (!converted) return originalText;

  // Format: "2 cups (500ml) flour"
  return `${formatAmount(converted)} ${targetUnit} (${formatAmount(amount)} ${unit})`;
}

function canConvert(unit: string): boolean {
  const u = unit.toLowerCase();
  return !!(VOLUME_TO_ML[u] || WEIGHT_TO_GRAMS[u]);
}

function formatAmount(num: number): string {
  // Round to 2 decimals, remove trailing zeros
  return parseFloat(num.toFixed(2)).toString();
}
```

### Ingredient Parsing Pattern

**src/features/units/parser.ts:**
```typescript
// Regex patterns for common ingredient formats
const FRACTION_MAP: Record<string, number> = {
  '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.167,
  '⅚': 0.833, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const AMBIGUOUS_TERMS = [
  'pinch', 'dash', 'handful', 'bunch', 'sprig', 'to taste',
  'some', 'dollop', 'smidgen', 'sprinkle',
];

export type ParsedIngredient = {
  amount: number | null;
  unit: string | null;
  ingredient: string;
  original: string;
  isAmbiguous: boolean;
};

export function parseIngredient(text: string): ParsedIngredient {
  const original = text.trim();

  // Check for ambiguous terms first
  const lowerText = original.toLowerCase();
  const isAmbiguous = AMBIGUOUS_TERMS.some(term => lowerText.includes(term));

  if (isAmbiguous) {
    return {
      amount: null,
      unit: null,
      ingredient: original,
      original,
      isAmbiguous: true,
    };
  }

  // Try to parse: [amount] [unit] [ingredient]
  // Handles: "2 cups flour", "1/2 tsp salt", "1 ½ tbsp butter"

  let remaining = original;
  let amount: number | null = null;

  // Extract unicode fraction at start
  const unicodeFraction = remaining[0];
  if (FRACTION_MAP[unicodeFraction]) {
    amount = FRACTION_MAP[unicodeFraction];
    remaining = remaining.slice(1).trim();
  }

  // Extract decimal or whole number
  const numberMatch = remaining.match(/^(\d+\.?\d*)/);
  if (numberMatch) {
    const num = parseFloat(numberMatch[1]);
    amount = amount ? amount + num : num;
    remaining = remaining.slice(numberMatch[0].length).trim();
  }

  // Extract fraction like "1/2"
  const fractionMatch = remaining.match(/^(\d+)\/(\d+)/);
  if (fractionMatch) {
    const frac = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    amount = amount ? amount + frac : frac;
    remaining = remaining.slice(fractionMatch[0].length).trim();
  }

  // Extract unit (match known units)
  const unitMatch = remaining.match(/^(tsp|tbsp|cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|fl oz|ml|l|liter|liters|g|gram|grams|kg|lb|pound|pounds)\b/i);
  const unit = unitMatch ? unitMatch[1] : null;
  if (unit) {
    remaining = remaining.slice(unit.length).trim();
  }

  return {
    amount,
    unit,
    ingredient: remaining || original,
    original,
    isAmbiguous: false,
  };
}
```

### Star Rating Component Pattern

**src/components/StarRating.tsx:**
```typescript
import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';

type StarRatingProps = {
  value: number;  // 0-5 in 0.5 increments
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
};

export function StarRating({ value, onChange, readonly = false, size = 32 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handlePress = (event: any, starIndex: number) => {
    if (readonly || !onChange) return;

    // Get touch coordinates relative to the star element
    const { locationX } = event.nativeEvent;

    // Calculate if left or right half was pressed
    const halfWidth = size / 2;
    const isLeftHalf = locationX < halfWidth;

    const rating = starIndex + (isLeftHalf ? 0.5 : 1);
    onChange(rating);
  };

  const displayValue = hoverValue ?? value;

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const filled = displayValue >= starIndex;
        const halfFilled = displayValue >= starIndex - 0.5 && displayValue < starIndex;

        return (
          <Pressable
            key={starIndex}
            onPress={(e) => handlePress(e, starIndex)}
            style={[styles.star, { width: size, height: size }]}
            disabled={readonly}
          >
            <Text style={[styles.starText, { fontSize: size }]}>
              {filled ? '★' : halfFilled ? '⯨' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    color: '#FFD700',
  },
});
```

**Note:** Using Pressable's `locationX` (coordinates relative to element) to detect left/right half. Unicode characters ★ (filled), ☆ (empty), ⯨ (half-filled alternative) provide visual feedback without custom graphics.

### Feature Module Organization

```
src/features/
├── units/
│   ├── conversions.ts       # Conversion logic
│   ├── parser.ts            # Ingredient parsing
│   ├── types.ts             # Unit types
│   └── api.ts               # User preference CRUD
├── comments/
│   ├── api.ts               # Comment CRUD + fetch threaded
│   ├── types.ts             # Comment types
│   ├── CommentThread.tsx    # Threaded display component
│   └── CommentInput.tsx     # Add/edit comment form
└── ratings/
    ├── api.ts               # Rating CRUD + aggregates
    ├── types.ts             # Rating types
    └── StarRating.tsx       # Star rating component
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comment threading | Custom tree structure in JS | PostgreSQL recursive CTE | Postgres is optimized for hierarchical queries; handles unlimited depth, sorting, path calculation |
| RLS for comment visibility | Application-layer permission checks | Supabase RLS with EXISTS | Server-side enforcement prevents bypass; consistent with Phase 1 pattern |
| Rate limiting comment posts | Client-side throttling | PostgreSQL triggers or Supabase Edge Functions | Client checks can be bypassed; server enforcement required |
| Aggregate rating calculation | Manual SUM/COUNT queries | PostgreSQL aggregate view or function | Atomic calculation, can be indexed, updated via trigger |

**Key insight:** PostgreSQL already provides the primitives we need (recursive CTEs, RLS, aggregates, triggers). Custom solutions would duplicate database features poorly.

## Common Pitfalls

### Pitfall 1: Recursive RLS Performance

**What goes wrong:** Comment RLS policies that JOIN to recipes can cause performance issues because RLS applies recursively — if the `recipes` table also has RLS, both policies execute for every row.

**Why it happens:** Supabase RLS evaluates policies on every table in the query. The pattern `exists (select 1 from recipes where ...)` triggers RLS on `recipes` for each comment row.

**How to avoid:**
- Option 1: Use security definer function to break RLS recursion
- Option 2: Fetch recipe once, pass `recipe_id` to comment query with direct filter
- Option 3: Mark comment-fetching function as `STABLE` and use subquery that fetches allowed recipe IDs once

**Preferred approach for Phase 4:** Security definer function for `get_recipe_comments()` that validates access once, then fetches comments without re-checking RLS on every row.

**Warning signs:** Slow comment loading (>500ms for <100 comments); EXPLAIN ANALYZE shows multiple recipe table scans.

### Pitfall 2: Ambiguous Measurement False Negatives

**What goes wrong:** Parsing "1 cup chopped onions" as `amount=1, unit='cup'` when "cup" might refer to the noun (a cup of onions) rather than the measurement.

**Why it happens:** Unit names overlap with common nouns. "cup", "bunch", "head" have cooking meanings but also object meanings.

**How to avoid:**
- Parse + confirm UX (user must review before saving)
- Context awareness: "1 cup" after number is usually measurement; "a cup" is ambiguous
- Preserve `original_text` always, show it alongside parsed values
- Mark extractions with LOW confidence when unit appears mid-phrase vs start

**Warning signs:** User complaints about incorrect parsing; high edit rate on parsed ingredients.

### Pitfall 3: Star Rating Touch Area

**What goes wrong:** On mobile, tapping a star is difficult because the touch target is small and users miss the half-star boundary.

**Why it happens:** Default star size is too small; half-star detection relies on precise locationX which assumes star is exactly aligned.

**How to avoid:**
- Increase star size to minimum 44x44pt (iOS/Android touch target guideline)
- Add `hitSlop` prop to Pressable to expand touch area beyond visual bounds
- Test on physical device (not just simulator) — touch accuracy differs
- Consider alternative UX: slider for ratings, stars for display only

**Warning signs:** Users report "can't select half stars"; analytics show uneven rating distribution (many 3.0, few 3.5).

### Pitfall 4: Comment Edit Race Condition

**What goes wrong:** User A edits comment, User B deletes it simultaneously → update fails or edits applied to deleted comment.

**Why it happens:** No optimistic locking; client doesn't check if comment still exists before updating.

**How to avoid:**
- Use `updated_at` timestamp for optimistic locking
- UPDATE WHERE id = X AND updated_at = {client_value}
- If update returns 0 rows, comment was modified/deleted → show error
- RLS delete policy already prevents unauthorized deletion

**Warning signs:** Error reports about "comment not found" after edit; silent edit failures.

### Pitfall 5: Unit Preference Not Refreshing

**What goes wrong:** User changes unit preference in settings, but recipe view still shows old units until app restart.

**Why it happens:** Component caches user preference at mount; doesn't subscribe to profile updates.

**How to avoid:**
- Store preference in session context (refreshes on auth state change)
- OR use Supabase realtime subscription to profiles table
- OR invalidate/refetch on navigation back from settings

**Preferred approach:** Add `unit_preference` to SessionContext alongside `session` — update when auth state changes. Settings screen updates profile, session refetches on next render.

**Warning signs:** User reports "setting doesn't work"; support tickets about cached values.

## Code Examples

### Parse + Confirm Flow (Draft Review Integration)

**Extending Phase 3 draft review to show parsed ingredients:**

```typescript
// In DraftReview.tsx or ingredient editing component
import { parseIngredient } from '@/features/units/parser';

function IngredientEditor({ ingredient, onChange }: Props) {
  const [parsed, setParsed] = useState(() => parseIngredient(ingredient.text));
  const [showParsed, setShowParsed] = useState(false);

  const handleParse = () => {
    const result = parseIngredient(ingredient.text);
    setParsed(result);
    setShowParsed(true);
  };

  const handleConfirm = () => {
    onChange({
      text: ingredient.text,
      amount: parsed.amount,
      unit: parsed.unit,
      original_text: parsed.original,
      is_ambiguous: parsed.isAmbiguous,
      sort_order: ingredient.sort_order,
    });
    setShowParsed(false);
  };

  return (
    <View>
      <TextInput
        value={ingredient.text}
        onChangeText={(text) => {
          onChange({ ...ingredient, text });
          setParsed(parseIngredient(text));
        }}
      />

      {parsed.isAmbiguous && (
        <Text style={styles.ambiguousWarning}>
          ⚠️ Ambiguous measurement — will be preserved as-is
        </Text>
      )}

      {!parsed.isAmbiguous && parsed.amount && (
        <View style={styles.parsedPreview}>
          <Text>Parsed: {parsed.amount} {parsed.unit} of {parsed.ingredient}</Text>
          <Pressable onPress={handleConfirm}>
            <Text style={styles.confirmButton}>✓ Confirm</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

### Display Converted Units

**Recipe detail view with unit conversion:**

```typescript
// In recipes/[id].tsx
import { useSession } from '@/features/auth/session';
import { displayAmount } from '@/features/units/conversions';

function RecipeDetail({ recipe }: Props) {
  const { session } = useSession();
  const unitPreference = session?.user?.user_metadata?.unit_preference || 'imperial';

  return (
    <View>
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ing, i) => {
        // If ingredient has canonical units, display with conversion
        if (ing.amount && ing.unit && !ing.is_ambiguous) {
          const displayed = displayAmount(
            ing.amount,
            ing.unit,
            unitPreference,
            ing.original_text || ing.text
          );
          return (
            <Text key={i} style={styles.listItem}>• {displayed}</Text>
          );
        }

        // Otherwise show as-entered text
        return (
          <Text key={i} style={styles.listItem}>
            • {ing.text}
            {ing.is_ambiguous && <Text style={styles.ambiguousIndicator}> ⓘ</Text>}
          </Text>
        );
      })}
    </View>
  );
}
```

### Threaded Comment Display

**Recursive component for nested comments:**

```typescript
// CommentThread.tsx
import { getRecipeComments, deleteComment } from '@/features/comments/api';
import type { Comment } from '@/features/comments/types';

function CommentThread({ recipeId }: { recipeId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    loadComments();
  }, [recipeId]);

  async function loadComments() {
    const data = await getRecipeComments(recipeId);  // Calls recursive CTE function
    setComments(data);
  }

  // Group comments by parent
  const commentsByParent = comments.reduce((acc, comment) => {
    const parentId = comment.parent_comment_id || 'root';
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(comment);
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <View>
      {commentsByParent['root']?.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={commentsByParent[comment.id] || []}
          depth={0}
          maxDepth={3}  // Flatten after 3 levels
        />
      ))}
    </View>
  );
}

function CommentItem({ comment, replies, depth, maxDepth }: Props) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { session } = useSession();

  const canDelete =
    comment.user_id === session?.user.id ||  // Own comment
    /* OR recipe owner OR family admin - check via recipe */;

  return (
    <View style={[styles.comment, { marginLeft: depth * 16 }]}>
      <Text style={styles.content}>{comment.content}</Text>
      {comment.is_edited && <Text style={styles.editedIndicator}>(edited)</Text>}
      <Text style={styles.meta}>{formatDate(comment.created_at)}</Text>

      {depth < maxDepth && (
        <Pressable onPress={() => setShowReplyForm(true)}>
          <Text style={styles.replyButton}>Reply</Text>
        </Pressable>
      )}

      {canDelete && (
        <Pressable onPress={() => handleDelete(comment.id)}>
          <Text style={styles.deleteButton}>Delete</Text>
        </Pressable>
      )}

      {showReplyForm && (
        <CommentInput
          recipeId={comment.recipe_id}
          parentId={comment.id}
          onSubmit={() => {
            setShowReplyForm(false);
            loadComments();  // Refresh thread
          }}
        />
      )}

      {replies.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          replies={[]}  // Only 1 level of nesting rendered recursively
          depth={depth + 1}
          maxDepth={maxDepth}
        />
      ))}
    </View>
  );
}
```

### Rating Aggregation

**PostgreSQL function for efficient aggregate:**

```sql
-- Create materialized view or live aggregate function
create or replace function get_recipe_rating(p_recipe_id uuid)
returns table (average_rating numeric, rating_count bigint)
language sql
stable
as $$
  select
    round(avg(rating), 1) as average_rating,
    count(*) as rating_count
  from recipe_ratings
  where recipe_id = p_recipe_id;
$$;

-- Or use trigger to maintain denormalized count
alter table recipes
  add column rating_average numeric(2,1),
  add column rating_count int default 0;

create or replace function update_recipe_rating()
returns trigger
language plpgsql
as $$
begin
  update recipes
  set
    rating_average = (select round(avg(rating), 1) from recipe_ratings where recipe_id = new.recipe_id),
    rating_count = (select count(*) from recipe_ratings where recipe_id = new.recipe_id)
  where id = new.recipe_id;

  return new;
end;
$$;

create trigger recipe_ratings_update_aggregate
after insert or update or delete on recipe_ratings
for each row execute function update_recipe_rating();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate tables for metric/imperial | Single canonical + display-time conversion | Modern recipe apps (2020+) | Simpler schema, user preference flexibility |
| Flat comment structure | Threaded with recursive CTE | PostgreSQL 8.4+ (2009) | Native database support, no app-side tree building |
| Integer star ratings (1-5) | Half-star increments (0.5 granularity) | Mobile UX standard (2015+) | More nuanced feedback without overwhelming users |
| Client-side permission checks | Row Level Security (RLS) | Supabase/PostgreSQL focus (2020+) | Server-enforced, impossible to bypass |

**Deprecated/outdated:**
- **External unit conversion libraries:** Recipe apps use small custom converters for cooking-specific ratios (50-100 lines vs 50KB+ libraries)
- **Comment pagination at app layer:** Modern approach uses database LIMIT/OFFSET with recursive CTE
- **Star rating images:** Unicode star characters (★☆⯨) are universal, no image assets needed
- **Nested comment JSON storage:** PostgreSQL self-referencing foreign keys + CTEs outperform JSON traversal

## Open Questions

1. **Comment threading depth limit**
   - What we know: PostgreSQL recursive CTEs support unlimited depth; UI readability degrades beyond 3-4 levels
   - What's unclear: Should database enforce max depth, or just UI flattening?
   - Recommendation: No database constraint (future flexibility); UI flattens after depth 3 with "show more" expansion. User testing will reveal if depth 2 is better for mobile.

2. **Rating visibility**
   - What we know: Users can only rate recipes they can access (via RLS)
   - What's unclear: Should family recipe ratings be visible only to family, or are averages always public if the recipe becomes public later?
   - Recommendation: Rating visibility follows recipe visibility at query time. If recipe changes from family→public, existing family ratings become visible. Alternative: separate "public_rating" and "family_rating" aggregates — probably over-engineering for v1.

3. **Unicode fraction support in parser**
   - What we know: Unicode fractions (½ ¼ ¾) are common in recipes
   - What's unclear: Full coverage of all Unicode fractions vs common subset?
   - Recommendation: Support 15 most common fractions (mapped in code example above). Edge cases handled by "parse + confirm" — user can override. Full Unicode fraction set is 80+ characters, diminishing returns.

4. **Weight-to-volume conversions**
   - What we know: Volume and weight conversions require ingredient density (1 cup flour ≠ 1 cup sugar in grams)
   - What's unclear: Should Phase 4 include ingredient-specific density table, or volume↔weight conversion is out of scope?
   - Recommendation: Phase 4 scope: volume↔volume and weight↔weight only. Density-based conversions are UNIT-04 (deferred to v2). Document clearly that "1 cup flour" can convert to ml but not to grams without density data.

## Sources

### Primary (HIGH confidence)

- [WebstaurantStore Cooking Measurements](https://www.webstaurantstore.com/guide/582/measurements-and-conversions-guide.html) - Volume/weight conversion ratios
- [PostgreSQL Recursive CTE Documentation](https://www.postgresql.org/docs/current/queries-with.html) - Official syntax and patterns
- [React Native Pressable API](https://reactnative.dev/docs/pressable) - Touch event properties
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Security definer patterns, recursive policy issues

### Secondary (MEDIUM confidence)

- [Escoffier Glossary of Vague Measurements](https://www.escoffieronline.com/glossary-of-vague-cooking-measurements/) - Ambiguous terms (pinch, dash, dollop)
- [RecipeRadar Ingredient Parsing Blog](http://blog.reciperadar.com/posts/introduction-to-ingredient-parsing/) - Parsing edge cases and regex patterns
- [Supabase Discussions: RLS with Joins](https://github.com/orgs/supabase/discussions/811) - Performance patterns for related table access

### Tertiary (LOW confidence)

- Various WebSearch results on star rating libraries - Used to understand UX patterns, NOT for library selection
- Medium articles on NLP ingredient parsing - Informative for edge cases, but custom parser preferred over NLP complexity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All existing dependencies verified via package.json, no new external libraries required
- Architecture: HIGH - Patterns extend Phase 1 RLS approach and Phase 3 JSONB ingredient structure; recursive CTE is PostgreSQL built-in; Pressable is React Native core API
- Unit conversions: HIGH - Ratios sourced from authoritative cooking references and USDA standards; simple lookup table implementation
- Ingredient parsing: MEDIUM - Regex patterns cover common cases; "parse + confirm" UX mitigates edge case risk; real-world testing will reveal additional patterns
- Comment threading: HIGH - PostgreSQL recursive CTE is purpose-built for this; existing codebase shows RLS pattern
- Star ratings: MEDIUM - Pressable touch coordinate approach is well-documented, but half-star detection via locationX requires device testing to validate usability
- Pitfalls: MEDIUM - RLS recursion and touch target issues verified in Supabase docs; other pitfalls are informed by training data on common recipe app issues

**Research date:** 2026-02-16
**Valid until:** ~2026-03-16 (30 days - stable domain, conversion ratios don't change, PostgreSQL CTE syntax stable since 2009)
