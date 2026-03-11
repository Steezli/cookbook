# T06: 10-core-screens 05

**Slice:** S09 — **Milestone:** M001

## Description

Create the Cooking Mode walkthrough screen -- a new route that guides users through a recipe one step at a time.

Purpose: Cooking mode is a focused, distraction-free experience designed for use while actually cooking. Users see one step at a time with the ingredients they need, navigate with previous/next, and track progress via a progress bar. This is the most architecturally new feature in Phase 10.

Output: New cook.tsx route at app/(tabs)/recipes/[id]/cook.tsx with responsive layout.

## Must-Haves

- [ ] "Cooking mode displays one step at a time with step number badge and instruction text"
- [ ] "Each step shows a 'You'll need' card with the full ingredient list"
- [ ] "Progress bar at top shows current position in the recipe"
- [ ] "Previous/Next buttons at bottom navigate between steps"
- [ ] "X button exits cooking mode and returns to recipe detail"
- [ ] "Mobile/tablet: centered vertical layout"
- [ ] "Web: sidebar with clickable step list + main content area"

## Files

- `app/(tabs)/recipes/[id]/cook.tsx`
