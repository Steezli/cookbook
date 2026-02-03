# Phase 1 (01-02) Summary — Supabase schema + RLS + primitives

**Date:** 2026-02-03
**Status:** Implemented (verification pending local run)
**Specialist:** Backend Developer (routed by PM)

## What shipped

- Supabase-in-repo scaffold (`supabase/config.toml`).
- Migration adding Phase 1 tables + enums + RLS policies enforcing:
  - Family resources are readable only by members (non-members see zero rows).
  - Recipe visibility `private|family|public` is enforced server-side.
  - Public recipes are readable when logged out (policy allows `visibility='public'`).
- Atomic “last admin can’t leave” constraint via `BEFORE DELETE` trigger on `family_memberships`.
- Minimal primitives:
  - SQL RPCs: `create_family`, `create_family_invite`, `accept_family_invite`, `revoke_family_invite`
  - Edge functions wrappers: `supabase/functions/create-invite`, `accept-invite`, `reset-request`

## Files added

- `supabase/config.toml`
- `supabase/migrations/20260203090000_phase1_foundation.sql`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/create-invite/index.ts`
- `supabase/functions/accept-invite/index.ts`
- `supabase/functions/reset-request/index.ts`

## Notes / trade-offs

- Invite tokens are **stored hashed** in `family_invites.token_hash`; raw token is only returned to the caller (so the app can generate a link).
- Email sending for invites is **not** implemented yet (requires an email provider). The create-invite edge function returns an `invite_link` when `invite_base_url` is provided.
- Password reset email sending uses Supabase’s built-in `resetPasswordForEmail`, but we pre-check `profiles` so the endpoint can return explicit `"email not found"` per Phase 1 context.

## Verification (needs local run)

Shell execution is blocked in this environment, so these must be run locally:

```bash
supabase --version
supabase start
supabase db reset
```

