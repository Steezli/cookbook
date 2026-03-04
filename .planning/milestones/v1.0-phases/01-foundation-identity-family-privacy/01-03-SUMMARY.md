# Phase 1 (01-03) Summary — Auth + Family flows + visibility demo

**Date:** 2026-02-03
**Status:** Implemented (verification pending local run)
**Specialist:** Frontend Developer (routed by PM)

## What shipped

- Auth routes under `app/(auth)`:
  - `login`, `signup`, `forgot-password`, `reset-password`, `logout`
  - Password policy: min 8 chars + number/symbol
  - Forgot password uses backend primitive `reset-request` to return explicit `"email not found"`
- Family routes under `app/(family)`:
  - Create family (`create_family` RPC)
  - Members list + role controls (admin promote/demote/remove)
  - Invite creation (returns a shareable `/invite/<token>` link)
  - Leave family (DB trigger enforces “cannot remove last admin”)
- Invite accept route:
  - `app/invite/[token].tsx` auto-accepts after auth and routes to the family.
- Recipe detail route upgraded to be RLS-aware:
  - `app/recipes/[id].tsx` fetches recipe by id and shows **Not found** when RLS returns zero rows.
  - Public recipes are viewable logged out by direct URL when `visibility='public'`.

## Key files

- `src/lib/supabase.ts` now configures session persistence for web + native.
- `src/features/auth/session.tsx` provides `SessionProvider` and `useSession`.

## Verification (needs local run)

Shell execution is blocked in this environment, so these must be run locally:

```bash
npm install
supabase start
supabase db reset
npm run typecheck
npx expo export --platform web
```

## Notes

- Invite “sending” is implemented as link-sharing (the UI surfaces `/invite/<token>`). Email delivery can be layered in later once an email provider is configured.
- For profile visibility in member lists, a follow-up migration was added to allow reading `profiles` for users who share a family:
  - `supabase/migrations/20260203091000_profiles_shared_family_select.sql`

## Hotfix (Typecheck)

**Date:** 2026-02-03
**Specialist:** Frontend Developer

- Fixed TS type mismatch in `app/(family)/family/[id].tsx` by normalizing the `profiles` relationship select result (Supabase can return an object or an array depending on schema inference).

