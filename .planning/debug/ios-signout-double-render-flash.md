---
status: diagnosed
trigger: "double render flash on iOS when signing out"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Two competing navigation paths race after signOut -- the auth state listener nulls session (causing Redirect in tabs layout) while handleSignOut also calls router.replace
test: trace both code paths
expecting: both fire, causing two navigations to auth screens
next_action: report findings

## Symptoms

expected: Clean transition to login screen after sign out
actual: Brief double render flash of signin/signup screen on iOS before settling
errors: none
reproduction: Tap sign out on profile screen on iOS
started: unknown

## Eliminated

(none needed -- root cause identified on first pass)

## Evidence

- timestamp: 2026-03-10
  checked: profile.tsx handleSignOut (lines 158-168)
  found: Calls supabase.auth.signOut() then router.replace("/(auth)/login")
  implication: This is an explicit navigation to the login screen

- timestamp: 2026-03-10
  checked: session.tsx onAuthStateChange listener (line 36-41)
  found: Listener calls setSession(nextSession) where nextSession is null on sign out
  implication: Session becomes null, triggering re-renders in all useSession consumers

- timestamp: 2026-03-10
  checked: app/(tabs)/_layout.tsx (lines 20-21)
  found: When session is null, returns <Redirect href="/(auth)/login" />
  implication: This is a SECOND navigation to the auth login screen, triggered by session going null

- timestamp: 2026-03-10
  checked: app/index.tsx (lines 9-13)
  found: When session is null, redirects to /(public)
  implication: If the router.replace("/") in logout.tsx fires, this redirects to (public), not (auth)

- timestamp: 2026-03-10
  checked: app/(auth)/logout.tsx (lines 8-26)
  found: A THIRD sign-out path exists -- logout screen calls signOut then router.replace("/")
  implication: Three different sign-out mechanisms with different target routes

## Resolution

root_cause: |
  There are TWO competing navigation triggers on sign out, creating a race condition:

  1. EXPLICIT NAV: profile.tsx handleSignOut() calls `await supabase.auth.signOut()` then `router.replace("/(auth)/login")` -- navigates to login
  2. REACTIVE NAV: The Supabase onAuthStateChange listener in session.tsx sets session to null, which causes (tabs)/_layout.tsx to render `<Redirect href="/(auth)/login" />` -- also navigates to login

  Both fire nearly simultaneously. The sequence on iOS:
  - supabase.auth.signOut() completes
  - onAuthStateChange fires, sets session = null
  - React re-renders: (tabs)/_layout sees null session, renders <Redirect href="/(auth)/login">
  - Meanwhile, handleSignOut's next line executes: router.replace("/(auth)/login")
  - Two navigations to the same destination create a visible flash

  Additionally, there's a third sign-out path (app/(auth)/logout.tsx) that navigates to "/" instead of "/(auth)/login", which would redirect to /(public) via index.tsx -- an inconsistency.

  Why iOS-only: Native navigation stacks render intermediate frames that web's history-based routing skips. On web, two rapid replace() calls collapse; on native, each triggers a visible screen transition.

fix: (research only -- not applied)
verification: (research only)
files_changed: []
