---
estimated_steps: 8
estimated_files: 0
---

# T01: Web end-to-end walkthrough

**Slice:** S05 — End-to-End Verification
**Milestone:** M005

## Description

Start the web dev server and navigate every screen. Test auth flows (login/signup/logout), recipe CRUD (create, edit, delete), scan upload (4 test images), draft review and save, collections CRUD, profile view, public browsing, and public recipe detail. Check browser console for errors. Fix any issues found.

## Steps

1. Start web dev server (`npx expo start --web`)
2. Test public browsing: home/index, public recipe list, public recipe detail, privacy page
3. Test auth: signup, login, forgot-password flow
4. Test recipes: list, create, edit, delete
5. Test scan: upload images, review drafts (scanner verification is T03 scope, but basic upload path here)
6. Test collections: create, add recipe, view, remove recipe, delete collection
7. Test profile page
8. Test logout, verify redirect to public/auth

## Must-Haves

- [ ] All web screens render without errors
- [ ] All actions (CRUD, auth, navigation) complete
- [ ] No uncaught console errors

## Verification

- Browser console shows no uncaught errors during walkthrough
- Every route from the app/ directory is visited and renders
- Forms submit and produce expected results
