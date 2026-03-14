# Handoff: Web Scan Page — Same Treatment as Mobile

## What Was Done (Mobile/iOS)

The multi-draft scan experience was redesigned across several commits on branch `gsd/M004/QOL-bug-fixes`. Key changes:

### 1. Scan Processing Screen (`app/(tabs)/scan/draft/[id].tsx`)
- **Status pipeline** — 4-step progress: uploaded → queued → reading → results ready
- Each step shows green check (done), spinner (active), or dot (pending)
- Photo thumbnails of uploaded images (filters `inline://` placeholders)
- Elapsed time ticker
- Progressive reassurance messages at 15s/45s/90s
- **No artificial timeout** — waits for backend, only shows error for real failures
- Uses `getJobById()` and `subscribeToJob()` for real-time status

### 2. Multi-Draft List View (`src/features/scan/DraftListView.tsx`)
- **Mobile**: Arrow nav `← Recipe 1 of 3 →` with tappable dot indicators
- Directly renders `DraftReview`/`DraftEditor` below (no intermediate card)
- State-based navigation (`currentIndex`) — no horizontal FlatList (nested scroll conflict with DraftReview's ScrollView)
- **Tablet/Web**: Sidebar list + detail panel layout (less polished, needs review)
- Progress bar with "Save All" batch button
- `inline://` URLs filtered from photo loading

### 3. Scan Layout (`app/(tabs)/scan/_layout.tsx`)
- Header hidden on web (`Platform.OS === "web" ? { headerShown: false }`)
- Native gets styled header with back button
- Duplicate ad banner removed

## What Needs to Be Done (Web)

### Primary Task
Review and polish the **web/tablet layout** of the scan flow to match the quality of the mobile experience. Specifically:

1. **`DraftListView.tsx` tablet/web branch** (line ~430+) — The sidebar + detail panel layout exists but may need:
   - Better visual hierarchy
   - Progress section styling consistency
   - Draft card selection UX
   - Verify the detail panel renders `DraftReview`/`DraftEditor` correctly

2. **`app/(tabs)/scan/draft/[id].tsx` on web** — The processing pipeline screen should render well on desktop:
   - Photo thumbnails may need different sizing
   - Status steps layout
   - The scan header is hidden on web (`headerShown: false`), so the scan index page provides its own

3. **`app/(tabs)/scan/index.tsx` on web** — The scan upload page already has web-specific layout with drag-and-drop, but verify it still works correctly after the route move from `app/scan/` to `app/(tabs)/scan/`

### Key Files
- `src/features/scan/DraftListView.tsx` — main file to update (tablet/web branch)
- `app/(tabs)/scan/draft/[id].tsx` — processing screen
- `app/(tabs)/scan/index.tsx` — upload page
- `app/(tabs)/scan/_layout.tsx` — scan Stack layout
- `src/features/scan/DraftReview.tsx` — draft detail (read-only, props: `draft`, `onEdit`, `onDraftSaved`)
- `src/features/scan/DraftEditor.tsx` — draft editor (props: `draft`, `onCancel`, `onConverted`)
- `src/features/scan/scan-service.ts` — `getJobById()`, `subscribeToJob()`, `getJobPhotos()`
- `src/lib/scan/scan-draft-service.ts` — `getDraftsByJobId()`, `convertToRecipe()`
- `src/lib/scan/multi-draft-helpers.ts` — `getDraftProgress()`, `getDraftDisplayStatus()`, `canSaveAll()`

### Design Tokens
All UI uses tokens from `src/lib/tokens.ts`. Key ones for scan:
- `bgPage`, `bgCard`, `bgCardWarm` — backgrounds
- `accentBlue`, `accentGreen`, `accentWarm`, `accentCoral` — status colors
- `errorBg`, `errorBorder`, `errorText`, `errorTitle` — error states
- `fontFamilyDisplay`, `fontFamilyBody`, `fontFamilyBodyMedium` — typography
- `radiusMd`, `radiusSm`, `shadowSm` — shapes

### Constraints
- Cross-platform: changes must work on iOS, Android, and web
- Use `useBreakpoint()` hook — returns `'mobile' | 'tablet' | 'web'`
- `showAlert`/`confirmAction` from `@/lib/alert` for alerts
- 540 tests currently passing, 23 suites — don't break them
- Branch: `gsd/M004/QOL-bug-fixes`
