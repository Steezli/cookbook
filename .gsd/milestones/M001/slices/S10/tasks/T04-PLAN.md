# T04: 11-public-browsing 04

**Slice:** S10 — **Milestone:** M001

## Description

Build the public recipe detail screen with read-only view, author attribution, ingredient truncation, sign-up CTA, and breakpoint-responsive layout (single column mobile/tablet, two-column web).

Purpose: This is where the organic discovery funnel converts — users read a recipe and see the "Want to save this recipe?" CTA. The read-only view must be complete enough to be useful (users can actually cook from it) while clearly showing they cannot save, rate, or comment without an account.

Output: `app/(public)/recipe/[id].tsx` — complete public recipe detail screen.

## Must-Haves

- [ ] "Tapping a public recipe shows a read-only detail view"
- [ ] "Author attribution shows avatar circle with initials + display name + 'Public recipe' label"
- [ ] "Ingredients list is truncated after 3 items with '+ N more ingredients' link"
- [ ] "Sign-up CTA card shows 'Want to save this recipe?' with 'Create Free Account' button"
- [ ] "Web layout is two-column — recipe content left, ingredients + CTA + ad right"
- [ ] "Web detail nav bar shows Sign In and Get Started buttons matching the browse header"
- [ ] "No ratings, comments, or edit actions appear on the public view"

## Files

- `app/(public)/recipe/[id].tsx`
