# Cookbook (Family Recipe Vault)

## What This Is

An app (web + phone) to capture handwritten family recipes, translate them into clean, searchable recipes, and keep them safely organized. It’s built around family sharing: recipes can stay private, be shared within an invite-only family space, or (optionally) be shared publicly.

## Core Value

Families can save and share treasured recipes (like Grandma’s) without losing control over who gets to see them.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can create an account, create/join an invite-only family space, and manage family members
- [ ] Users can add recipes manually and organize them into a personal/family collection
- [ ] Users can upload a photo of a handwritten recipe and get an editable draft (ingredients, steps, units) from AI extraction
- [ ] Users can set each recipe’s visibility: private / family / public (public is opt-in)
- [ ] Users can comment on and rate recipes (5-star with half stars); private/family recipes use family-only discussion, public recipes have public discussion
- [ ] Recipes support both metric and imperial display, based on a canonical stored representation and user preferences
- [ ] Public browsing includes minimal, non-intrusive ads; AI scanning is monetizable via subscription (v1 hypothesis)

### Out of Scope

- Aggressive ad experiences (popovers, layout shift, autoplay media) — conflicts with usability and “heirloom” vibe
- Forced public sharing or default-public recipes — families must control visibility
- Fully-automated “no review needed” AI publishing — OCR/parsing must be user-reviewable for accuracy
- Mobile-native-only experience — web remains a first-class surface

## Context

- Primary differentiator is family sharing with privacy control (private / family / public) per recipe.
- AI is primarily for extracting and structuring content from photos; users must be able to review and correct any field.
- Recipe data includes at minimum ingredients + steps; likely also servings, prep/cook time, photos, tags, and an optional source story.
- Monetization should avoid “recipe blog” ad overload; preference is minimal ads on public browsing and optional subscription for scanning.

## Constraints

- **Platforms**: Web + phone — cross-platform approach preferred.
- **Usability**: “Grandma-friendly” — adding recipes (manual or scan) and finding recipes must be simple and direct.
- **Data**: SQL-based database preferred — reliability and queryability for search/collections.
- **Units**: Must support metric + imperial — store canonical values and render in user preference.
- **Tech preference**: JavaScript-based stack preferred; TypeScript is acceptable when it provides clear value.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Invite-only family space | Sharing is centered on trusted family membership | — Pending |
| Per-recipe visibility: private / family / public | Families keep control of “secret” recipes | — Pending |
| Attribution on public recipes is to the user (family attribution is “maybe”) | Keeps authorship clear without exposing family identity by default | — Pending |
| AI scan creates a structured draft (ingredients/steps/units) | Minimizes manual effort while keeping review/edit control | — Pending |
| Comments/ratings: family-only for private/family; public discussion for public | Privacy for family recipes; community for public | — Pending |
| Units stored canonically, displayed in user preference | Enables consistent scaling/conversion across recipes | — Pending |
| Monetization: minimal ads on public + subscription unlocks AI scanning | Aligns with usability; scanning is paid value | — Pending |

---
*Last updated: 2026-02-02 after initialization*
