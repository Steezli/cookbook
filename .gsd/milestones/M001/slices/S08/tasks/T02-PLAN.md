# T02: 09-navigation-restructure 02

**Slice:** S08 — **Milestone:** M001

## Description

Move all existing screens into the (tabs)/ route group, update the root layout to a Stack with explicit route group screens, and create the (tabs)/_layout.tsx with headless Tabs from expo-router/ui including auth redirect.

Purpose: This is the structural backbone of the navigation restructure. Every existing screen must remain accessible in its new location, and the (scan) flow must present as a modal overlay from the root Stack.

Output: All screens relocated into (tabs)/, root layout declares route groups, tabs layout has auth redirect and headless Tabs with inline nav placeholders.

## Must-Haves

- [ ] "Authenticated users land on the Home tab after login"
- [ ] "All existing screens remain accessible after the route group restructure"
- [ ] "Unauthenticated users are redirected to login"
- [ ] "(tabs)/, (auth)/, (public)/, and (scan)/ route groups exist as separate Stack screens"
- [ ] "Scan flow opens as a modal overlay from root Stack level"

## Files

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/my-recipes.tsx`
- `app/(tabs)/scan.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/collections/index.tsx`
- `app/(tabs)/collections/[id].tsx`
- `app/(tabs)/collections/create.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/edit.tsx`
- `app/(tabs)/recipes/create.tsx`
- `app/(tabs)/invite/[token].tsx`
- `app/(tabs)/family/_layout.tsx`
- `app/(tabs)/family/index.tsx`
- `app/(tabs)/family/[id].tsx`
- `app/(public)/_layout.tsx`
