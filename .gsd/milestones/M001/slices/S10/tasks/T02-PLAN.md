# T02: 11-public-browsing 02

**Slice:** S10 — **Milestone:** M001

## Description

Build the shared UI components for public screens: navigation header (3 breakpoints, 2 variants), search bar, and platform-branched ad slot placeholder.

Purpose: Both the public browse and detail screens need the navigation header. Building these as shared components avoids duplication and establishes the public chrome that distinguishes unauthenticated views from the authenticated app.

Output: PublicNavHeader (with browse and detail variants), PublicSearchBar, AdSlot (platform-branched placeholders), and PublicNavHeader unit tests.

## Must-Haves

- [ ] "Public navigation header renders logo, Sign In, and search on all breakpoints"
- [ ] "Web header shows Get Started CTA button alongside Sign In"
- [ ] "Mobile browse header scrolls with content (not sticky)"
- [ ] "Mobile/tablet detail nav bar has back arrow and Sign In"
- [ ] "Web detail nav bar shows Sign In and Get Started buttons matching the browse header"
- [ ] "Ad slot placeholder renders correct dimensions per breakpoint with platform branching"

## Files

- `src/components/public/PublicNavHeader.tsx`
- `src/components/public/PublicSearchBar.tsx`
- `src/components/public/__tests__/PublicNavHeader.test.ts`
- `src/components/public/AdSlot.native.tsx`
- `src/components/public/AdSlot.web.tsx`
