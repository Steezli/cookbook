# Phase 1: Foundation (Identity + Family + Privacy) - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Phase 1 foundation: email/password auth (signup/login/reset/logout, “stay logged in”), create/join invite-only family spaces with roles, and enforce recipe visibility (private/family/public) server-side everywhere. Recipe CRUD and public browsing are in later phases; Phase 1 defines/enforces the access model and primitives.

</domain>

<decisions>
## Implementation Decisions

### Auth experience details
- Password rules: min 8 chars + must include a number/symbol.
- “Stay logged in”: default on (remember me); user can log out manually.
- Password reset: email reset link; show “email not found” if not registered (account enumeration allowed).
- Logout scope: logout this device only (not global logout).
- Email verification: none in Phase 1.
- Identifiers: email-only (no username).

### Family invites + roles flow
- Invite send: email invite link (token) to recipient.
- Invite accept: click link -> if logged out, prompt signup/login -> then join family.
- Expiration/control: expires in 7 days; admin can revoke/resend.
- Roles/permissions:
  - Members can invite.
  - Admins can remove members, promote/demote.
  - Multiple admins allowed.
- Leaving a family: members can leave anytime; if last admin, must transfer admin first.
- Member invites scope: members can invite anyone; admin can revoke any invite.
- Invite token behavior: single-use link (once accepted, invalid).

### “Public” meaning in Phase 1 (pre-Phase 5 public browsing)
- Access to public recipes: anyone with the direct link/URL can view (no listing/search yet).
- Discoverability: no public browse pages; not indexed/listed anywhere in Phase 1.
- Public recipe page for non-members: full recipe content + author name.
- Who can set visibility to public (once recipe editing exists): recipe owner can set visibility; family admins can also change visibility.

### Privacy enforcement behavior
- Non-member hits a family/private recipe URL or API by ID: return 404 (hide existence).
- Non-member hits family endpoints (family detail, members list): return 404.
- Logged-out vs logged-in-but-unauthorized: same behavior as above (mostly 404), except true auth-required endpoints return 401 when logged out.
- Error message text: explicit messaging is preferred even if it leaks existence/membership (i.e., clarity over secrecy in user-facing messaging).

### Claude's Discretion
None — decisions were specified for all discussed areas.

</decisions>

<specifics>
## Specific Ideas

No specific product references — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-identity-family-privacy*
*Context gathered: 2026-02-03*
