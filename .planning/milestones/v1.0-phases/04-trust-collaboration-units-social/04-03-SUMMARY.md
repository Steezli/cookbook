---
phase: 04-trust-collaboration-units-social
plan: 03
subsystem: social-commenting
tags:
  - comments
  - social
  - threading
  - moderation
  - rls
dependency_graph:
  requires:
    - "04-01 (recipe_comments table and get_recipe_comments RPC)"
    - "Phase 1 (profiles table for author display names)"
  provides:
    - "Comment types and API layer"
    - "CommentThread UI component with threading/nesting"
    - "CommentInput form component"
    - "Recipe detail page comment section"
  affects:
    - "Recipe detail screen (adds comment section)"
tech_stack:
  added:
    - "Comment API functions (getRecipeComments, createComment, updateComment, deleteComment)"
    - "CommentThread component with moderation logic"
    - "CommentInput component with edit/reply modes"
  patterns:
    - "Recursive comment threading with depth limits"
    - "Author enrichment via secondary profile query"
    - "Role-based moderation (owner + family admin)"
    - "Relative timestamp formatting"
key_files:
  created:
    - path: "src/features/comments/types.ts"
      provides: "Comment, CreateCommentInput, UpdateCommentInput types"
    - path: "src/features/comments/api.ts"
      provides: "Comment CRUD operations and RPC integration"
    - path: "src/features/comments/CommentInput.tsx"
      provides: "Comment input form with edit/reply support"
    - path: "src/features/comments/CommentThread.tsx"
      provides: "Threaded comment display with moderation"
  modified:
    - path: "app/recipes/[id].tsx"
      changes: "Added CommentThread integration after Story section"
    - path: "tsconfig.json"
      changes: "Removed Expo base config overrides causing moduleResolution conflict"
decisions:
  - decision: "Enrich comments with author info via secondary profiles query"
    rationale: "Avoids modifying get_recipe_comments SQL function, keeps RPC focused on threading logic"
  - decision: "Flatten visual nesting after depth 3"
    rationale: "Prevents deep indentation from becoming unreadable on mobile screens"
  - decision: "Check family admin role client-side via family_memberships query"
    rationale: "Enables moderation UI without additional RPC functions, RLS enforces server-side"
  - decision: "Show relative timestamps (2h ago, 3d ago)"
    rationale: "Better UX for recent activity, falls back to date for older comments"
metrics:
  duration: "247 seconds"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  commits: 2
  completed_at: "2026-02-16T23:56:04Z"
---

# Phase 4 Plan 03: Recipe Comments Summary

Threaded comments with nested replies, edit/delete, and family admin moderation using recursive CTE display and role-based access

## Overview

Built the complete comments feature for recipes: TypeScript types, Supabase API layer, threaded comment UI component, input form, and integration into recipe detail pages. Comments support nested replies (up to depth 3), editing with "(edited)" indicator, deletion with role-based moderation (owner, family admin), and family-only visibility enforcement via RLS.

**One-liner:** Threaded comments with nested replies, edit/delete, and family admin moderation using recursive CTE display and role-based access.

## What Was Built

### Task 1: Comment Types and API Layer (commit: 0b69064)

**Created:**
- `src/features/comments/types.ts` - Comment, CreateCommentInput, UpdateCommentInput types with author fields
- `src/features/comments/api.ts` - CRUD operations and RPC integration:
  - `getRecipeComments()` - Calls `get_recipe_comments` RPC, enriches with author display names from profiles
  - `createComment()` - Inserts new comment with current user_id
  - `updateComment()` - Updates content and sets is_edited flag
  - `deleteComment()` - Deletes comment (RLS enforces authorization)

**Fixed:**
- `tsconfig.json` - Removed `moduleResolution: "node"` and other overrides conflicting with Expo base config's `customConditions`

**Pattern:** API layer fetches threaded comments from RPC, then does secondary query to profiles table to enrich with author display_name/email. This avoids modifying the SQL function and keeps profile data separate.

### Task 2: Comment UI Components and Integration (commit: cad7c2e)

**Created:**
- `src/features/comments/CommentInput.tsx` - Reusable input form for new comments, replies, and edits
  - Props: recipeId, parentCommentId (for replies), initialContent/isEditing (for edits), callbacks
  - State: content text, isSubmitting
  - Renders TextInput (multiline), Submit/Cancel buttons
  - Disables submit while submitting or content empty

- `src/features/comments/CommentThread.tsx` - Threaded comment display with moderation
  - Groups comments by parent_comment_id for nested rendering
  - Fetches user's family role for moderation check
  - Renders comments with:
    - Author name (display_name or email fallback)
    - Relative timestamp (just now, 2h ago, 3d ago, or date)
    - Content with "(edited)" indicator if modified
    - Reply button (if depth < 3)
    - Edit button (if own comment)
    - Delete button (if own comment, recipe owner, or family admin)
  - Visual nesting: marginLeft increases by 16px per depth level
  - Recursive rendering for nested replies

**Modified:**
- `app/recipes/[id].tsx` - Added Comments section after Story section
  - Renders CommentThread if user authenticated
  - Shows "Log in to view and post comments" if not authenticated
  - Passes recipeId, recipeOwnerId, recipeFamilyId to CommentThread

## How It Works

**Comment Loading:**
1. Call `getRecipeComments(recipeId)` which invokes `get_recipe_comments` RPC
2. RPC returns threaded comments with depth/path from recursive CTE
3. API extracts unique user_ids, queries profiles table for author info
4. Merges author display_name and email into comment objects
5. Returns enriched comments array

**Moderation Logic:**
- User can delete own comment (user_id match)
- Recipe owner can delete any comment on their recipe
- Family admin can delete any comment on family recipe
  - Thread component queries `family_memberships` to get user's role for the recipe's family_id
  - RLS on `recipe_comments` enforces delete authorization server-side

**Threading Display:**
- Group comments by parent_comment_id (null = top-level)
- Render top-level comments, each recursively rendering its children
- Indent each level by 16px (depth * 16)
- Flatten after depth 3 (no reply button shown)

**Editing:**
- Edit button shown only for own comments
- Clicking Edit replaces comment content with CommentInput in edit mode
- On submit, calls `updateComment()` which sets `is_edited: true`
- "(edited)" indicator appears in italic gray after content

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed tsconfig.json moduleResolution conflict**
- **Found during:** Task 1 TypeScript verification
- **Issue:** Local tsconfig overrode Expo base with `moduleResolution: "node"`, conflicting with base's `customConditions: ["react-native"]`. This caused: `error TS5098: Option 'customConditions' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 'bundler'.`
- **Fix:** Removed local overrides (`jsx`, `esModuleInterop`, `allowSyntheticDefaultImports`, `moduleResolution`) from tsconfig.json to inherit correct values from Expo base (which uses `moduleResolution: "bundler"`)
- **Files modified:** `tsconfig.json`
- **Commit:** 0b69064 (Task 1)
- **Rationale:** Blocking issue preventing TypeScript compilation. Expo base config is designed for React Native/Expo environment; local overrides were incompatible.

## Verification

**TypeScript Compilation:**
- ✅ `npm run typecheck` passes for all comment files
- Pre-existing errors in unrelated files (scan-photos.ts, error-reporting-service.ts, confidence-scoring.ts) remain but are out of scope

**Code Structure:**
- ✅ Comment types exported from types.ts
- ✅ API functions follow same pattern as recipes/api.ts (import supabase, throw on error, return typed data)
- ✅ CommentThread component integrated into recipe detail screen
- ✅ CommentInput component reused for new comments, replies, and edits

**Expected Functionality (requires database migration from 04-01):**
- User can view threaded comments on a recipe they have access to
- User can post new top-level comment
- User can reply to comment (nesting up to depth 3 in UI)
- User can edit own comment, "(edited)" indicator appears
- User can delete own comment
- Recipe owner can delete any comment on their recipe
- Family admin can delete any comment on family recipe
- Family recipe comments only visible to family members (enforced by RLS)
- Comments show author display_name and timestamp

## Success Criteria Met

✅ SOC-01 fully implemented:
- Comments on recipes users can access
- Family-only discussion for family recipes (RLS enforced)
- Public discussion for public recipes
- Comment thread UI integrated into recipe detail screen
- Moderation by recipe owner and family admin

## Dependencies

**Requires:**
- Phase 4 Plan 01: `recipe_comments` table, `get_recipe_comments` RPC function
- Phase 1: `profiles` table with display_name and email

**Provides to future plans:**
- Comment API and types for potential notification features
- CommentThread component pattern for other social features

## Files Changed

**Created (4):**
- `src/features/comments/types.ts` (26 lines)
- `src/features/comments/api.ts` (77 lines)
- `src/features/comments/CommentInput.tsx` (137 lines)
- `src/features/comments/CommentThread.tsx` (275 lines)

**Modified (2):**
- `app/recipes/[id].tsx` (+17 lines) - Added CommentThread integration
- `tsconfig.json` (-4 lines) - Removed conflicting Expo base overrides

**Total additions:** ~515 lines of production code

## Self-Check: PASSED

**Created files:**
- ✅ FOUND: src/features/comments/types.ts
- ✅ FOUND: src/features/comments/api.ts
- ✅ FOUND: src/features/comments/CommentInput.tsx
- ✅ FOUND: src/features/comments/CommentThread.tsx

**Commits:**
- ✅ FOUND: 0b69064 (Task 1)
- ✅ FOUND: cad7c2e (Task 2)

All claimed files and commits verified successfully.
