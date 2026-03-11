# T03: 10-core-screens 02

**Slice:** S09 — **Milestone:** M001

## Description

Rebuild the recipe detail screen to match cookbook.pen spec at all three breakpoints with ratings, comments, and Start Cooking navigation.

Purpose: The recipe detail screen is the core content display -- where users read recipes, rate them, comment, and launch cooking mode. The existing 740-line implementation is functional but uses hardcoded styles and lacks responsive layout.

Output: Fully rebuilt recipe detail screen with responsive two-column layout, design tokens, and integrated ratings/comments.

## Must-Haves

- [ ] "Recipe detail renders hero image on mobile (full-width) and two-column layout on tablet/web"
- [ ] "Sticky action header with back button, edit button (owner only), and Start Cooking button is always accessible while scrolling"
- [ ] "Ingredients section displays all ingredients with unit conversion support"
- [ ] "Steps section displays numbered steps"
- [ ] "Story section displays source_story when present"
- [ ] "Ratings section shows star average + count and allows user rating"
- [ ] "Comments section shows comment thread and input field"
- [ ] "Start Cooking button navigates to /recipes/{id}/cook"
- [ ] "All colors use design tokens from tokens.ts"

## Files

- `app/(tabs)/recipes/[id].tsx`
