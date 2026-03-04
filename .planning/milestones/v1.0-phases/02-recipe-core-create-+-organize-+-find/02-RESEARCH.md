# Phase 2 Research: Recipe Core (Create + Organize + Find)

**Created:** 2026-02-03
**Phase:** 02
**Goal:** Users can build and manage a recipe library

---

## Context

Phase 1 delivered the foundation:
- Auth (Supabase)
- Family spaces with invite system
- RLS policies for privacy
- Recipe visibility enum (private/family/public)
- Minimal `recipes` table (id, owner, family_id, visibility, title)

Phase 2 builds the recipe CRUD, collections, tags, and search on top of this foundation.

**Stack:**
- Frontend: Expo + React Native + Expo Router (file-based routing)
- Backend: Supabase (PostgreSQL + Storage)
- TypeScript throughout

---

## Standard Stack

### Database: Supabase PostgreSQL

**Recipe data modeling — Two approaches:**

**Option A: JSON columns (RECOMMENDED for Phase 2)**
```sql
create table recipes (
  id uuid primary key,
  owner_user_id uuid references auth.users,
  family_id uuid references families,
  visibility recipe_visibility,
  
  -- Core fields
  title text not null,
  description text,
  
  -- Structured JSON
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  
  -- Metadata
  servings int,
  prep_time_minutes int,
  cook_time_minutes int,
  source_story text,
  
  -- Organization
  tags text[] default '{}'::text[],
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ingredients structure:
-- [
--   {"text": "2 cups flour", "sort_order": 0},
--   {"text": "1 tsp salt", "sort_order": 1}
-- ]

-- Steps structure:
-- [
--   {"text": "Mix dry ingredients", "sort_order": 0},
--   {"text": "Add wet ingredients", "sort_order": 1}
-- ]
```

**Why JSON for ingredients/steps:**
- Simple CRUD (insert/update entire array)
- Easy reordering (just update sort_order)
- No complex joins for recipe display
- Flexible schema (Phase 3 can add parsed fields without migration)
- Good Supabase support for `jsonb` queries

**Option B: Normalized tables**
```sql
create table recipe_ingredients (...);
create table recipe_steps (...);
```

**Why NOT normalized for v1:**
- More complex queries (always needs joins)
- Reordering requires updating multiple rows
- Overkill for v1 (no ingredient search, no step filtering)
- Can migrate from JSON → normalized later if needed

**Recommendation:** Use JSON (Option A) for Phase 2.

---

### File Storage: Supabase Storage

**Photo storage pattern:**

```typescript
// Upload photo
const file = {uri, name, type}
const filePath = `recipes/${recipeId}/${uuidv4()}.jpg`

await supabase.storage
  .from('recipe-photos')
  .upload(filePath, file)

// Store path in recipe_photos table
await supabase
  .from('recipe_photos')
  .insert({
    recipe_id: recipeId,
    storage_path: filePath,
    sort_order: 0
  })
```

**Schema:**
```sql
create table recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Bucket policies
create policy "recipe_photos_select"
  on storage.objects for select
  using (bucket_id = 'recipe-photos' AND /* visibility check */);

create policy "recipe_photos_insert"
  on storage.objects for insert
  with check (bucket_id = 'recipe-photos' AND auth.uid() = /* owner check */);
```

**Why separate table + storage:**
- Multiple photos per recipe
- Explicit sort_order for display
- Can delete photo without losing metadata
- RLS policies control access
- Supabase Storage handles CDN/thumbnails

**Thumbnail strategy:**
- Phase 2: Use original images (Supabase auto-resizes via URL params)
- Phase 3+: Consider image transformations API

---

### Search: PostgreSQL Full-Text Search

**Simple search (Phase 2):**
```sql
-- Title + tags search
select * from recipes
where (
  title ilike '%query%'
  or tags && array['query']
)
and /* visibility RLS applies */
order by created_at desc;
```

**Why simple ILIKE:**
- Good enough for v1 (exact substring match)
- Works with existing RLS policies
- No additional indexes needed (can add GIN later)
- Fast for small-medium datasets

**Future enhancement (post-Phase 2):**
```sql
-- Full-text search with ranking
alter table recipes add column title_search tsvector
  generated always as (to_tsvector('english', coalesce(title, ''))) stored;

create index recipes_title_search_idx on recipes using gin(title_search);

-- Then query:
select * from recipes
where title_search @@ plainto_tsquery('english', 'query')
order by ts_rank(title_search, plainto_tsquery('english', 'query')) desc;
```

**Recommendation:** Start with ILIKE, add full-text search in later phase if needed.

---

### Collections: Many-to-Many Relationship

**Schema:**
```sql
create table collections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users on delete cascade,
  family_id uuid references families on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table collection_recipes (
  collection_id uuid not null references collections on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

-- RLS: user can only see collections they own or are family member of
create policy "collections_select" on collections
  for select using (
    owner_user_id = auth.uid()
    or (family_id is not null and is_family_member(family_id, auth.uid()))
  );
```

**Collection types:**
- **Personal collections:** `family_id = null`, only owner sees
- **Family collections:** `family_id = <family>`, all members see

**UI pattern:**
```typescript
// List collections
const {data: collections} = await supabase
  .from('collections')
  .select('*')
  .order('created_at', {ascending: false})

// Add recipe to collection
await supabase
  .from('collection_recipes')
  .insert({collection_id, recipe_id})

// Get recipes in collection
const {data: recipes} = await supabase
  .from('collection_recipes')
  .select('recipe_id, recipes(*)')
  .eq('collection_id', collectionId)
```

---

### Tags: Array Column (Simple Approach)

**Schema:**
```sql
-- Already in recipes table
tags text[] default '{}'::text[]

-- Index for fast tag lookups
create index recipes_tags_idx on recipes using gin(tags);
```

**UI pattern:**
```typescript
// Save tags
await supabase
  .from('recipes')
  .update({tags: ['dessert', 'holiday', 'grandma']})
  .eq('id', recipeId)

// Search by tag
const {data} = await supabase
  .from('recipes')
  .select('*')
  .contains('tags', ['dessert'])

// Get all tags (for autocomplete)
const {data} = await supabase
  .from('recipes')
  .select('tags')
// Flatten client-side for unique list
```

**Why array instead of tags table:**
- Simpler for v1 (no joins)
- PostgreSQL GIN index handles array searches efficiently
- Easy to query: `tags && array['dessert']` or `'dessert' = ANY(tags)`
- Can migrate to normalized tags table later if needed (tag counts, tag management)

**Tag management UI:**
- Input with comma-separated values
- Autocomplete from existing tags
- Case-insensitive tag matching (normalize to lowercase)

---

## Architecture Patterns

### Data Fetching Pattern (Established in Phase 1)

**Pattern:**
```typescript
// In route component
const [data, setData] = useState<T[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  async function load() {
    setIsLoading(true)
    setError(null)
    
    const {data, error: fetchError} = await supabase
      .from('table')
      .select('*')
    
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setData(data || [])
    }
    
    setIsLoading(false)
  }
  
  void load()
}, [/* deps */])
```

**Use this pattern consistently for:**
- Recipe list screens
- Recipe detail screen
- Collection list
- Search results

---

### Form Pattern (from Phase 1 auth screens)

**Pattern:**
```typescript
const [formData, setFormData] = useState({
  title: '',
  description: '',
  // ...
})
const [isSubmitting, setIsSubmitting] = useState(false)

async function handleSubmit() {
  setIsSubmitting(true)
  try {
    const {error} = await supabase
      .from('recipes')
      .insert(formData)
    
    if (error) throw error
    
    router.back() // or router.push to detail
  } catch (e) {
    Alert.alert('Error', e.message)
  } finally {
    setIsSubmitting(false)
  }
}
```

**Form fields:**
- `TextInput` for text fields
- `Pressable` for submit button
- Disable button while submitting
- Show validation errors via `Alert.alert`

---

### Routing Pattern (Expo Router file-based)

**Recipe routes structure:**
```
app/
  recipes/
    index.tsx          # List all recipes (with search)
    [id].tsx           # Recipe detail (exists, needs enhancement)
    create.tsx         # Create new recipe
    [id]/edit.tsx      # Edit recipe
  collections/
    index.tsx          # List collections
    [id].tsx           # Collection detail (recipes in collection)
    create.tsx         # Create collection
```

**Navigation:**
```typescript
// To detail
router.push(`/recipes/${recipeId}`)

// To edit
router.push(`/recipes/${recipeId}/edit`)

// Back after save
router.back()
```

---

### RLS Pattern (Established in Phase 1)

**Recipe RLS policies:**
```sql
-- Select: respect visibility
create policy "recipes_select_visibility"
  on recipes for select
  using (
    visibility = 'public'
    or (visibility = 'family' and is_family_member(family_id, auth.uid()))
    or (visibility = 'private' and owner_user_id = auth.uid())
  );

-- Insert: user can create own recipes
create policy "recipes_insert"
  on recipes for insert
  with check (owner_user_id = auth.uid());

-- Update: owner only
create policy "recipes_update"
  on recipes for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Delete: owner only
create policy "recipes_delete"
  on recipes for delete
  using (owner_user_id = auth.uid());
```

**Photo RLS policies:**
```sql
-- Select: follow recipe visibility
create policy "recipe_photos_select"
  on recipe_photos for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_photos.recipe_id
      -- RLS on recipes handles visibility
    )
  );

-- Insert/Delete: owner only
create policy "recipe_photos_insert"
  on recipe_photos for insert
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_photos.recipe_id
      and r.owner_user_id = auth.uid()
    )
  );
```

**Storage bucket policies:**
```sql
-- recipe-photos bucket
create policy "recipe_photos_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'recipe-photos'
    and /* check recipe visibility via recipe_photos join */
  );
```

---

## Don't Hand-Roll

### DO use Supabase built-ins:
- ✅ `supabase.from('recipes').select()` — built-in RLS enforcement
- ✅ `supabase.storage.from('recipe-photos').upload()` — handled file upload
- ✅ `jsonb` columns — PostgreSQL native JSON support
- ✅ `text[]` for tags — PostgreSQL native array type
- ✅ GIN indexes — PostgreSQL native for array/jsonb queries

### DON'T hand-roll:
- ❌ Custom auth middleware (use Supabase RLS)
- ❌ File upload library (use Supabase Storage client)
- ❌ Image processing (use Supabase transformations)
- ❌ Search ranking algorithm (use PostgreSQL full-text search)

---

## Common Pitfalls

### 1. Forgetting RLS Policies

**Problem:** Create table but forget RLS → all queries blocked or leak data

**Solution:**
- Enable RLS: `alter table recipes enable row level security;`
- Create policies for SELECT, INSERT, UPDATE, DELETE
- Test with different users to verify isolation

### 2. Photo Upload Race Conditions

**Problem:** Upload file then insert record → file exists but no DB reference if insert fails

**Solution:**
- Insert recipe_photos record first (with pending status)
- Upload file
- Update record to active
- Or: use Supabase transactions (but adds complexity)

**Simpler for v1:**
- Upload file
- If upload succeeds, insert DB record
- If DB insert fails, log error but leave orphaned file (cleanup job later)

### 3. Large Photo Files on Mobile

**Problem:** Uploading full-res photos (5-10 MB) over mobile is slow

**Solution (Phase 2):**
- Accept limitation for v1 (native mobile photo picker quality)
- Show upload progress indicator

**Solution (later):**
- Add client-side image compression (expo-image-manipulator)
- Resize before upload (max 1920px wide)

### 4. Tag Case Sensitivity

**Problem:** User enters "Dessert", later enters "dessert" → two separate tags

**Solution:**
- Normalize tags to lowercase before saving
- Display with title case in UI

```typescript
function normalizeTags(tags: string[]): string[] {
  return tags.map(t => t.toLowerCase().trim()).filter(Boolean)
}
```

### 5. Empty Ingredients/Steps

**Problem:** User saves recipe with empty arrays → breaks UI assumptions

**Solution:**
- Validate on client: require at least 1 ingredient and 1 step
- Show error: "Recipe must have at least one ingredient and one step"

### 6. Search Performance

**Problem:** ILIKE with leading wildcard (`%query%`) is slow on large tables

**Solution (Phase 2):**
- Accept performance for v1 (likely < 10k recipes per user)
- Add LIMIT to queries (max 100 results)

**Solution (later):**
- Add full-text search index
- Add pagination

---

## Success Metrics

**Phase 2 is successful when:**

1. ✅ User can create recipe with title, ingredients (array), steps (array), optional metadata
2. ✅ User can edit any field of their recipe
3. ✅ User can delete recipe (with confirmation)
4. ✅ User can upload 1+ photos to recipe
5. ✅ Recipe list shows thumbnails (first photo)
6. ✅ User can add tags to recipe
7. ✅ User can create personal or family collection
8. ✅ User can add/remove recipes from collection
9. ✅ User can search recipes by title (substring match)
10. ✅ User can filter recipes by tag
11. ✅ User can browse recipes by visibility (private/family/public)
12. ✅ User can browse recipes by family space
13. ✅ RLS enforces privacy (non-owners cannot edit/delete)
14. ✅ RLS enforces visibility (private recipes not visible to others)

---

## Out of Scope for Phase 2

**Explicitly NOT included in Phase 2:**

- ❌ Recipe scanning (AI extraction) — Phase 3
- ❌ Unit conversion — Phase 4
- ❌ Comments/ratings — Phase 4
- ❌ Full-text search with ranking — post-v1
- ❌ Recipe versioning — post-v1
- ❌ Batch operations (delete multiple) — post-v1
- ❌ Recipe templates — post-v1
- ❌ Nutrition info — post-v1

---

## Implementation Notes

### Migration Strategy

**Phase 2 migration will:**
1. Alter `recipes` table to add fields (description, ingredients, steps, metadata)
2. Create `recipe_photos` table
3. Create `collections` and `collection_recipes` tables
4. Add RLS policies for all new tables
5. Create indexes (tags GIN, photo recipe_id, collection foreign keys)
6. Create storage bucket `recipe-photos` with RLS policies

**Backward compatibility:**
- Phase 1's minimal `recipes` table already has required fields (id, owner, family, visibility, title)
- Adding columns is non-breaking (existing rows get defaults)
- Existing recipe detail route will continue to work (just shows more fields)

---

## Dependencies on Phase 1

**Required from Phase 1:**
- ✅ Auth (session, user_id)
- ✅ Families table and RLS
- ✅ `is_family_member()` helper function
- ✅ `recipe_visibility` enum
- ✅ `recipes` table (minimal)
- ✅ SessionProvider for auth state

**Phase 2 builds on this foundation without changes to Phase 1 code.**

---

## Recommended Plan Structure

Based on Phase 2 scope and standard practices:

**Parallel-first breakdown:**

**Plan 01: Recipe CRUD (backend + frontend)**
- Alter recipes table (add fields)
- Add RLS policies
- Create recipe list screen
- Create recipe create/edit screens
- Create recipe delete functionality

**Plan 02: Photo Attachments (storage + UI)**
- Create recipe_photos table
- Create storage bucket with RLS
- Add photo upload to recipe form
- Display photos in recipe detail
- Show thumbnails in recipe list

**Plan 03: Collections (backend + frontend)**
- Create collections tables
- Add RLS policies
- Create collection list screen
- Create collection detail screen
- Add "add to collection" UI in recipe detail

**Plan 04: Tags & Search (database + UI)**
- Add tags array to recipes
- Add tag input to recipe form
- Create search bar in recipe list
- Add tag filter UI
- Add visibility/family filter UI

**Dependency analysis:**
- Plan 02 depends on Plan 01 (needs recipes first)
- Plan 03 independent of Plan 02 (can run parallel)
- Plan 04 depends on Plan 01 (searches recipes)

**Wave structure:**
- Wave 1: Plan 01 (Recipe CRUD foundation)
- Wave 2: Plan 02 + Plan 03 (Photos + Collections in parallel)
- Wave 3: Plan 04 (Search depends on recipes existing)

**Estimated effort:**
- Plan 01: ~50% context (complex, many fields)
- Plan 02: ~40% context (storage + multiple UI touch points)
- Plan 03: ~40% context (full collection CRUD)
- Plan 04: ~30% context (search UI + filters)

---

**Research complete. Ready for planning.**
