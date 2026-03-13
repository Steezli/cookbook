---
estimated_steps: 4
estimated_files: 1
---

# T03: Write OAuth consent branding documentation

**Slice:** S02 — Form UX & OAuth Branding
**Milestone:** M003

## Description

Create `docs/oauth-branding.md` with step-by-step instructions for branding the Google and Apple OAuth consent screens to show "Berven Book" instead of the raw Supabase project URL (`ugixgcbysrwabwzbsjxr.supabase.co`). This is a documentation-only task — no code changes. Directly satisfies QA-05.

## Steps

1. **Create `docs/oauth-branding.md`** with the following sections:

2. **Google Cloud Console section:**
   - Navigate to APIs & Services → OAuth consent screen
   - Set app name to "Berven Book"
   - Set user support email
   - Upload app logo (optional but recommended)
   - Add authorized domain (`berven.app`)
   - Set developer contact email
   - Note: verification status — if the app requests sensitive scopes (email/profile), Google may require verification review before the branding appears to all users
   - Note: the Supabase redirect URI (`ugixgcbysrwabwzbsjxr.supabase.co`) will still appear in the redirect — this is normal and separate from consent screen branding

3. **Apple Developer section:**
   - Navigate to Certificates, Identifiers & Profiles → Identifiers → Service IDs
   - Select the Service ID used for Sign in with Apple web flow
   - Set the Description field to "Berven Book" (this controls the display name on the consent screen)
   - Verify the Return URL matches Supabase's callback URL
   - Note: native iOS Sign in with Apple shows the app name from the App ID / App Store listing, not the Service ID

4. **Supabase Dashboard section:**
   - Navigate to Authentication → Providers
   - Verify Google provider's Client ID and Client Secret match the Google Cloud Console OAuth client
   - Verify Apple provider's Service ID, Team ID, Key ID, and private key are correct
   - Note: no branding configuration in Supabase itself — branding is controlled entirely in Google/Apple consoles

## Must-Haves

- [ ] `docs/oauth-branding.md` exists
- [ ] Google Cloud Console steps cover: app name, support email, authorized domains, logo, verification status caveat
- [ ] Apple Developer steps cover: Service ID description, return URL verification, native vs web display name difference
- [ ] Supabase Dashboard steps cover: provider configuration verification
- [ ] Redirect URI caveat documented (Supabase URL still appears in redirect, separate from consent screen branding)
- [ ] Domain verification requirement for Google noted

## Verification

- `test -f docs/oauth-branding.md` exits 0
- `grep -c 'Google Cloud Console' docs/oauth-branding.md` returns at least 1
- `grep -c 'Apple Developer' docs/oauth-branding.md` returns at least 1
- `grep -c 'Supabase' docs/oauth-branding.md` returns at least 1
- `grep -c 'Berven Book' docs/oauth-branding.md` returns at least 1
- `grep -c 'verification' docs/oauth-branding.md` returns at least 1

## Observability Impact

- Signals added/changed: None (documentation only)
- How a future agent inspects this: read `docs/oauth-branding.md`
- Failure state exposed: None

## Inputs

- S02 Research (`S02-RESEARCH.md`) — QA-05 analysis, known Supabase project URL, bundle ID, app name
- `app.config.ts` — confirms app name is "Berven", bundle ID is `com.steezli.berven`
- `src/features/auth/social-auth.ts` — confirms OAuth flow implementation (Google via `signInWithOAuth`, Apple via native `signInAsync` on iOS)

## Expected Output

- `docs/oauth-branding.md` — complete step-by-step guide for branding Google and Apple OAuth consent screens, with caveats about verification and redirect URIs
