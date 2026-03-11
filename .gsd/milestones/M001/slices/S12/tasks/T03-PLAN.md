# T03: 12-remaining-screens 03

**Slice:** S12 — **Milestone:** M001

## Description

Rebuild family management screens and invite screen to match cookbook.pen at all 3 breakpoints. Add native share sheet for invite links.

Purpose: Family management is core to the app's trust proposition. Invite flow must handle both existing and new users smoothly.
Output: Responsive family list, family detail with member management, and invite screen with share sheet.

## Must-Haves

- [ ] "Family list screen shows user's families in a responsive layout matching cookbook.pen"
- [ ] "Family detail screen shows members, roles, invite controls, and admin actions matching cookbook.pen"
- [ ] "Invite screen renders responsively and supports native share sheet for sending invite links"
- [ ] "Invite acceptance handles both existing users (direct join) and new users (redirect to signup with token)"
- [ ] "All three screens adapt to mobile, tablet, and web breakpoints"

## Files

- `app/(tabs)/family/index.tsx`
- `app/(tabs)/family/[id].tsx`
- `app/(tabs)/invite/[token].tsx`
