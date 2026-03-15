# S05: End-to-End Verification

**Goal:** Systematically test every feature on both web and iOS, verify scanner with real recipe photos
**Demo:** Every screen visited, every action exercised, scanner processes 4 real recipe images

## Must-Haves

- Web walkthrough: login → recipes list → create recipe → edit recipe → delete recipe → scan (upload 4 test images) → review drafts → save as recipes → collections CRUD → profile → public browsing → public recipe detail → logout
- iOS walkthrough: login → recipes list → create recipe → scan (using test images) → review drafts → save → collections → profile → logout
- All buttons clicked, all forms submitted, all error states triggered where safe
- Scanner processes all 4 test images: IMG_4547.jpeg, IMG_4552.jpeg, IMG_4553.jpeg, IMG_4554.jpeg
- Fix any issues discovered during verification

## Proof Level

- This slice proves: operational + final-assembly
- Real runtime required: yes (web server + iOS simulator/Expo Go)
- Human/UAT required: no (agent-driven)

## Verification

- Web: all screens render, all actions complete, no console errors
- iOS: all screens render, all actions complete
- Scanner: 4 images uploaded, drafts created, at least 1 saved as recipe
- `npx tsc --noEmit` exits 0
- `npx jest` — all tests pass

## Observability / Diagnostics

- Runtime signals: browser console logs, network request logs
- Inspection surfaces: browser DevTools, Expo Go logs
- Failure visibility: screenshot evidence of each screen
- Redaction constraints: blur any real auth tokens in screenshots

## Integration Closure

- Upstream surfaces consumed: all S01–S04 fixes
- New wiring introduced: none (verification only, plus any discovered fixes)
- What remains: nothing — this is the final slice

## Tasks

- [x] **T01: Web end-to-end walkthrough** `est:45m`
  - Why: Must verify all web features work after code changes
  - Files: none (verification only, fix files as needed)
  - Do: Start web dev server. Navigate every screen. Test: auth (login/signup/logout), recipe CRUD (create, edit, delete), scan upload (4 test images), draft review and save, collections (create, add recipe, remove, delete), profile view, public browsing, public recipe detail with SEO head. Check browser console for errors. Fix any issues found.
  - Verify: All actions complete without errors
  - Done when: every web feature works

- [x] **T02: iOS end-to-end walkthrough** `est:45m`
  - Why: Must verify all iOS features work after code changes
  - Files: none (verification only, fix files as needed)
  - Do: Start Expo dev server. Open in iOS simulator. Navigate every screen. Test: auth (login/signup/logout), recipe CRUD, scan (pick images from simulator photo library), draft review and save, collections, profile. Fix any issues found.
  - Verify: All actions complete without errors
  - Done when: every iOS feature works

- [x] **T03: Scanner verification with 4 test images** `est:30m`
  - Why: Must verify scanner pipeline processes real handwritten recipe photos
  - Files: test images at /Users/elinicholson/Documents/recipes/
  - Do: Upload all 4 images (IMG_4547.jpeg, IMG_4552.jpeg, IMG_4553.jpeg, IMG_4554.jpeg) through the scan interface on web. Wait for processing. Verify drafts are created with reasonable recipe data. Save at least one as a real recipe. Verify the saved recipe displays correctly.
  - Verify: Drafts created, recipe data extracted, saved recipe renders
  - Done when: all 4 images processed, at least 1 recipe saved successfully

## Files Likely Touched

- Any files with issues discovered during testing
