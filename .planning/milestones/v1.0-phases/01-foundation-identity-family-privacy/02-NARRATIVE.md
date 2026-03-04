# Phase 1: Foundation (Identity + Family + Privacy) - Plan

**Planned:** 2026-02-03
**Status:** Ready to execute

## Incoming Request

User asked: `/gsd-plan-phase 1`

## PM Assessment (Product Manager)

### Goal

Ship Phase 1 foundation: email/password auth, invite-only family spaces with roles, and strict server-side privacy enforcement for recipe visibility (private/family/public) everywhere.

### Phase Scope (In)

- AUTH-01..04: signup/login/stay logged in/reset/logout
- FAM-01..05: create family, invite, accept invite, roles, remove/leave
- VIS-01..02: visibility field exists and is enforced server-side (not UI-only)

### Explicit Non-Goals (Out of Scope)

- Full recipe CRUD UI and “library” workflows (Phase 2)
- Public browse/search/listing pages (Phase 5)
- Email verification (per Phase 1 context)
- Global logout (per Phase 1 context)

### Assumptions / Defaults (Until Changed by Execution Findings)

- Stack default: Expo (web + mobile) + Supabase (Postgres + Auth + Storage) for fastest privacy-correct foundation.
- Privacy is enforced primarily with database policies (RLS) plus minimal API wrappers to translate “not accessible” into 404 for resource-by-id endpoints.
- We will create a minimal `recipes` table in Phase 1 to make visibility a first-class field and test privacy enforcement, even if recipe creation UI is deferred.

## PM Routing Decision

Workflow: UI/UX Designer -> Backend Developer -> Frontend Developer -> Tech Lead.

Rationale: Privacy-first enforcement and auth/invites are cross-cutting; define UX flows (including edge cases) first, then implement policies/server flows, then UI integration, then do an explicit privacy/security review.

---

## UI/UX Design (UI/UX Designer)

### Screens / Flows (Phase 1)

- Auth
  - Sign up (email + password)
  - Log in (email + password, "Stay logged in" default on)
  - Forgot password (email; show "email not found" if not registered)
  - Reset password (from emailed link)
  - Log out (this device only)
- Family
  - Empty state: "Create a family" / "Join via invite link"
  - Create family space
  - Family members list (role badges)
  - Invite member (email input, pending invites list)
  - Invite accept (from link)
  - Remove member (admin)
  - Leave family (member), with "last admin must transfer admin" constraint

### Copy / Error States (Phase 1 Context Alignment)

- Unauthorized access to private/family recipe or family resources by ID: show a generic “Not found” (404) on the UI.
- Auth-required actions when logged out (e.g., create family): show login prompt (401 from API).
- Prefer clarity in user-facing messaging even if it leaks membership/visibility in the UI copy, but still return 404 for protected resource existence checks.

### Deliverables

- Wireframes for the flows above (web + mobile responsive)
- Interaction specs for invite accept (logged out vs logged in)
- Component inventory (buttons, form fields, toasts, empty states)

---

## Backend Implementation (Backend Developer)

### Data Model (Minimum for Phase 1)

Create tables (names can be adjusted to match chosen framework conventions):

- `profiles`
  - `user_id` (PK, references auth user)
  - `display_name` (for attribution; minimal Phase 1)
- `families`
  - `id` (PK)
  - `name`
  - `created_by_user_id`
- `family_memberships`
  - `family_id`
  - `user_id`
  - `role` enum: `admin` | `member`
  - uniqueness: (family_id, user_id)
- `family_invites`
  - `id` (PK)
  - `family_id`
  - `email`
  - `token_hash` (store hash, not raw token)
  - `created_by_user_id`
  - `expires_at`
  - `revoked_at` (nullable)
  - `accepted_at` (nullable)
  - `accepted_by_user_id` (nullable)
- `recipes` (minimal Phase 1 "visibility primitive")
  - `id` (PK)
  - `owner_user_id`
  - `family_id` (nullable)
  - `visibility` enum: `private` | `family` | `public`
  - `title` (optional placeholder)
  - `created_at`

Notes:
- `recipes.family_id` nullable enables private/public recipes not tied to a family (future flexibility).
- Even though recipe CRUD is Phase 2, having the table now lets us enforce and test VIS rules.

### Auth + Sessions

- Use provider auth (Supabase Auth if selected).
- “Stay logged in” default on: use persistent session storage on web/mobile.
- Logout scope: revoke local session only.

### Email Workflows

- Password reset must show “email not found” for unknown emails (explicit account enumeration allowed per context).
  - Likely implementation: an authenticated server-side function checks for user existence then triggers provider reset email only if present; otherwise returns a 404-like response to the client.
- Family invites:
  - Generate single-use token, store hash in DB, email the raw token in a link.
  - Expire after 7 days.
  - Support revoke/resend by admins; members can invite too.

### Access Control (Policy-First)

Implement RLS/policies to enforce:

- Family resources:
  - Only members can read family details and members list.
  - Only admins can remove members / change roles.
  - Members can invite.
  - Leaving family allowed; prevent last admin from leaving unless another admin exists.
- Invites:
  - Members/admins can create invites for their family.
  - Only members/admins can list invites for their family.
  - Accept invite is a server function that validates token, ensures not expired/revoked/accepted, then creates membership and marks invite accepted.
- Recipes:
  - `public`: readable by anyone (including logged out) via direct link/id.
  - `private`: readable only by owner.
  - `family`: readable only by family members.

### API Surface (Minimal)

Whether via REST, RPC, or direct DB access:

- `POST /auth/reset-request` (or function): returns "email not found" for unknown.
- `POST /families`: create family and create membership as admin.
- `GET /families/:id`: member-only (return 404 if not member).
- `GET /families/:id/members`: member-only (404 if not member).
- `POST /families/:id/invites`: member+ (create invite)
- `POST /invites/accept`: token-based accept; requires logged-in user; returns 401 if logged out.
- `POST /families/:id/members/:userId/remove`: admin-only
- `POST /families/:id/leave`: enforce last-admin rule
- `GET /recipes/:id`: enforce visibility rules; return 404 when unauthorized (hide existence)

### Verification (Backend)

- Automated tests (at minimum) for visibility/membership access:
  - Logged out cannot read `private` or `family` recipes by ID (404).
  - Logged in non-member cannot read `family` recipes by ID (404).
  - Logged in member can read `family` recipes by ID (200).
  - Logged out can read `public` recipe by ID (200).
  - Non-member cannot read family detail/members (404).
  - Last admin cannot leave until admin transferred (409 or clear error).

---

## Frontend Implementation (Frontend Developer)

### App Scaffolding (If Repo Has No Code Yet)

- Create an Expo app with Expo Router targeting web + mobile.
- Configure environment handling for backend URL/keys (no secrets committed).
- Add auth session persistence and guarded routes.

### UI Implementation (Phase 1)

- Auth screens per UI/UX specs
- Family screens per UI/UX specs
- Invite accept route that works when:
  - User is logged out -> redirect to login/signup then resume accept
  - User is logged in -> accept immediately
- Minimal recipe detail route (read-only) to validate visibility enforcement end-to-end:
  - Displays placeholder recipe content (title + visibility) when accessible
  - Shows "Not found" when 404 returned

### Error Handling Semantics

- Treat 404 as "Not found" (covers unauthorized-by-design)
- Treat 401 as "Please log in"
- Show explicit UI messages where appropriate, but avoid implying existence for 404-by-design endpoints.

### Frontend Test Plan (Minimum)

- Manual sanity tests with 2 accounts + 2 families:
  - Invite flow works (member invites, accept joins)
  - Non-member cannot access family pages via direct URL
  - Recipe visibility checks work for public vs private vs family IDs

---

## Tech Lead Review (Tech Lead)

### Review Focus (Phase 1)

- Privacy enforcement is server-side and centralized (policies/RLS), not scattered filters.
- 404 vs 401 semantics match context and don’t accidentally leak private resources via error differences.
- Invite tokens are single-use, expire, and are stored hashed.
- Last-admin constraints are enforced atomically (no race conditions).
- Minimum automated coverage exists for access rules (VIS-02) and family membership boundaries.

### Deliverable

- A short risk register for Phase 1 with mitigations (privacy leak paths, token handling, auth edge cases)

---

## Acceptance Checklist (Phase 1 Done When...)

- AUTH-01..04: signup/login/logout/reset work; session persists by default; reset shows "email not found" for unknown email.
- FAM-01..05: family create/invite/accept/roles/remove/leave work; last-admin transfer rule enforced.
- VIS-01..02: `visibility` exists as a first-class field; server enforces access for recipe-by-id reads; unauthorized access returns 404; public recipes accessible by direct link while not listed anywhere.

---

## Files / Areas Expected To Change During Execution

Because this repo is currently planning-only, Phase 1 execution will likely introduce:

- App scaffold (Expo)
- Backend schema/migrations (Supabase)
- Auth + invite mail templates / edge functions
- Minimal automated test harness (policy/permission tests)
