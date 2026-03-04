# Phase 4: Trust + Collaboration (Units + Social) - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities: (1) canonical unit storage with metric/imperial conversion so ingredients display in the user's preferred measurement system, and (2) social features — threaded comments and half-star ratings — so families can discuss and rate recipes. Comments respect recipe visibility (family-only for family recipes, public for public recipes).

</domain>

<decisions>
## Implementation Decisions

### Comment system
- Threaded comments (replies nest under parent comments)
- Users can edit their own comments (show "edited" indicator) and delete them
- Moderation: comment author can delete their own; recipe owner and family admin can both moderate/delete any comment
- Family recipe comments are visible to family members only — no special owner exception needed since the recipe owner is always a family member
- Public recipe comments are visible to everyone

### Ingredient display
- Converted values show with original in parentheses: "2 cups (500ml) flour"
- Ambiguous/non-standard measurements ("a pinch", "some", "handful") are preserved as-is with a subtle indicator that conversion wasn't possible
- Unit preference is a global setting in the user's profile/settings page — applies to all recipes

### Unit parsing
- Parse + confirm approach: when ingredients are entered (manual or scan), show the parsed canonical result and let the user confirm or correct before saving
- Best-effort parsing into canonical form, but user has final say

### Claude's Discretion
- Rating input UX (slider, tap stars, etc.) — pick what works best for half-star increments on mobile
- Where ratings/averages display (list view, detail, or both)
- Who can rate family vs public recipes (infer from privacy model)
- Comment threading depth (flat replies vs deeply nested)
- "Edited" indicator styling
- Ambiguous measurement flag styling

</decisions>

<specifics>
## Specific Ideas

- Converted-with-original format keeps transparency — users can verify the conversion is correct, especially important for baking
- The "parse + confirm" flow should integrate naturally with the existing scan-to-draft editing interface from Phase 3
- Family comment visibility follows the same RLS pattern established in Phase 1 for recipe visibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-trust-collaboration-units-social*
*Context gathered: 2026-02-16*
