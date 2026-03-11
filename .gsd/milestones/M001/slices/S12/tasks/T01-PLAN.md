# T01: 12-remaining-screens 01

**Slice:** S12 — **Milestone:** M001

## Description

Rebuild auth screens (Login, Sign Up, Forgot Password) to match cookbook.pen at all 3 breakpoints and add social OAuth login (Google, Apple, Facebook).

Purpose: Auth screens are the first impression for new users. Responsive layout + social login reduces signup friction for family-oriented app.
Output: Three responsive auth screens with social login buttons and a shared social-auth helper module.

## Must-Haves

- [ ] "Login screen renders correctly at mobile (full-screen form), tablet (centered card), and web (split hero + form) breakpoints matching cookbook.pen"
- [ ] "Sign Up screen renders correctly at all 3 breakpoints matching cookbook.pen"
- [ ] "Forgot Password screen renders correctly at all 3 breakpoints matching cookbook.pen"
- [ ] "Social login buttons (Google, Apple, Facebook) appear on login and signup screens"
- [ ] "Social auth calls Supabase signInWithOAuth for Google/Facebook and signInWithIdToken for Apple on iOS"

## Files

- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(auth)/forgot-password.tsx`
- `src/features/auth/social-auth.ts`
