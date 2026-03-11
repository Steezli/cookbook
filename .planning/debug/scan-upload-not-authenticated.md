---
status: diagnosed
trigger: "scan upload Not authenticated error on iOS"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: supabase.auth.getUser() makes a network round-trip to Supabase and fails when the access token has expired, even though the local session still exists
test: confirmed by code reading — getUser() is a server call, getSession() is local
expecting: getUser() returns null user when token expired but session provider still has cached session
next_action: report diagnosis

## Symptoms

expected: Scan upload should work for logged-in users
actual: "Not authenticated" error thrown at scan-service.ts:211-212 in checkJobLimit
errors: "Multi-scan upload error: [Error: Not authenticated]"
reproduction: Select photos on iOS, tap upload
started: Unknown — may be intermittent (token expiry related)

## Eliminated

- hypothesis: Multiple supabase client instances (different auth state)
  evidence: All files import from @/lib/supabase which exports a single createClient() call — true singleton
  timestamp: 2026-03-10

- hypothesis: Wrong import path / different module
  evidence: scan-service.ts line 1 imports from "@/lib/supabase" same as all other working modules
  timestamp: 2026-03-10

## Evidence

- timestamp: 2026-03-10
  checked: src/lib/supabase.ts — client creation
  found: Single supabase client created and exported. Uses AsyncStorage on native, localStorage on web. Has custom lock shim (no-op sequential lock) because RN lacks Web Locks API.
  implication: Singleton is correct, not a multi-instance issue.

- timestamp: 2026-03-10
  checked: src/features/scan/scan-service.ts — checkJobLimit (line 210-226)
  found: Uses `supabase.auth.getUser()` which is a SERVER call (hits /auth/v1/user endpoint). If access token is expired, this returns {user: null} even if a session exists locally.
  implication: This is the root cause vector — getUser() !== getSession().

- timestamp: 2026-03-10
  checked: src/features/auth/session.tsx — SessionProvider
  found: Uses getSession() (local) on init, listens to onAuthStateChange. The session context holds the session object. Components see the user as logged in via useSession() because that reads the LOCAL cached session.
  implication: UI thinks user is logged in (getSession has cached data) but getUser() server call fails when token expired.

- timestamp: 2026-03-10
  checked: supabase.ts lock shim
  found: The custom lock is a pass-through `async (name, acquireTimeout, fn) => await fn()`. This means concurrent getUser/token-refresh calls are NOT serialized — they can race.
  implication: The no-op lock means if two getUser() calls happen close together, the second may use a stale token while the first is still refreshing. autoRefreshToken is enabled but the lock bypass means refresh and getUser can race.

- timestamp: 2026-03-10
  checked: scan-upload.ts call chain
  found: uploadScanPhotosWithValidation calls checkJobLimit() which calls getUser(). Then if that passes, uploadScanPhotos calls createMultiPhotoScanJob which ALSO calls getUser(). Two sequential getUser() server calls in one upload flow.
  implication: Double server-side auth check amplifies the window for token-expiry failure.

## Resolution

root_cause: `supabase.auth.getUser()` is a server-side call that validates the access token against Supabase's /auth/v1/user endpoint. When the JWT access token expires (default 1 hour), getUser() returns `{user: null}` even though the local session/refresh token is still valid. The app's SessionProvider uses getSession() (local read) so the UI shows the user as logged in, but the server-side getUser() call in checkJobLimit fails. The no-op lock shim exacerbates this by allowing token refresh races.

fix: (not applied — research only)
verification: (not applied — research only)
files_changed: []
