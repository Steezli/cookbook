# OAuth Consent Screen Branding

How to configure Google and Apple OAuth consent screens so users see **"Berven Book"** instead of the raw Supabase project URL (`ugixgcbysrwabwzbsjxr.supabase.co`).

> **This is a configuration guide, not code.** All changes happen in external dashboards.

---

## Google Cloud Console

### 1. Open the OAuth consent screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project linked to the Supabase Google provider
3. Navigate to **APIs & Services → OAuth consent screen**

### 2. Set app information

| Field | Value |
|-------|-------|
| **App name** | `Berven Book` |
| **User support email** | Your support email (e.g. `support@berven.app`) |
| **App logo** | Upload a square PNG/JPG (min 120×120 px). Optional but recommended — it appears on the consent prompt. |

### 3. Add authorized domain

Under **Authorized domains**, add:

```
berven.app
```

This tells Google that `berven.app` is a legitimate domain associated with this OAuth client. Google uses it to validate the consent screen branding.

### 4. Set developer contact email

Add at least one email under **Developer contact information**. Google uses this for verification correspondence.

### 5. Domain verification

If the app requests sensitive scopes (`email`, `profile`), Google may require **domain verification** before the branded consent screen appears to all users:

1. Navigate to **APIs & Services → Domain verification**
2. Add `berven.app` and verify ownership via DNS TXT record or HTML file
3. Until verification completes, unverified apps show a warning screen and may display the raw project URL instead of "Berven Book"

### 6. Verification status

- **Testing**: Only test users (added manually in the consent screen config) can authorize. The consent screen shows an "unverified app" warning but does display your app name.
- **In production (unverified)**: Any user can authorize, but Google shows an "unverified app" warning with an extra click-through step.
- **In production (verified)**: Clean consent screen showing "Berven Book" with your logo. Required if requesting sensitive scopes for broad user access.

To submit for verification, click **Publish App** and then **Prepare for verification** in the OAuth consent screen settings. Review typically takes 2–6 weeks.

### 7. Redirect URI caveat

The Supabase callback URL (`https://ugixgcbysrwabwzbsjxr.supabase.co/auth/v1/callback`) still appears in the browser address bar during the OAuth redirect. This is normal and separate from consent screen branding — the consent screen itself shows "Berven Book", but the redirect passes through the Supabase URL. Users who inspect the URL bar may see it. This cannot be changed without a custom domain on Supabase.

---

## Apple Developer

### 1. Configure the Service ID (web / non-iOS flow)

1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles → Identifiers**
3. Filter by **Service IDs**
4. Select the Service ID used for Sign in with Apple (this is the identifier configured in Supabase's Apple provider settings)
5. Set the **Description** field to `Berven Book` — this controls the display name on the web consent screen

### 2. Verify the Return URL

In the Service ID configuration under **Sign In with Apple → Configure**:

1. Confirm the **Domains and Subdomains** include `ugixgcbysrwabwzbsjxr.supabase.co`
2. Confirm the **Return URLs** include `https://ugixgcbysrwabwzbsjxr.supabase.co/auth/v1/callback`

These must match what Supabase sends during the OAuth flow.

### 3. Native iOS vs web display name

| Platform | Display name source |
|----------|-------------------|
| **iOS native** (uses `expo-apple-authentication` / `signInAsync`) | App name from the **App ID** registration and **App Store Connect** listing — not the Service ID |
| **Web / Android** (uses Supabase OAuth redirect) | **Service ID Description** field (set in step 1 above) |

The app's bundle ID is `com.steezli.berven`. The native iOS Sign in with Apple dialog pulls the display name from the App ID associated with this bundle identifier, which should already show "Berven" from the App Store listing.

---

## Supabase Dashboard

Supabase itself has **no branding configuration** for OAuth consent screens. Branding is controlled entirely in the Google and Apple consoles above. The Supabase Dashboard is used only to verify that provider credentials are correctly linked.

### 1. Verify Google provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select the project (`ugixgcbysrwabwzbsjxr`)
3. Navigate to **Authentication → Providers → Google**
4. Confirm:
   - **Client ID** matches the OAuth 2.0 Client ID from Google Cloud Console (APIs & Services → Credentials)
   - **Client Secret** matches the corresponding client secret

### 2. Verify Apple provider

1. Navigate to **Authentication → Providers → Apple**
2. Confirm:
   - **Service ID** matches the identifier from Apple Developer (Certificates, Identifiers & Profiles → Service IDs)
   - **Team ID** matches your Apple Developer Team ID (visible in the top-right of the Apple Developer portal)
   - **Key ID** matches the key created under Keys → Sign in with Apple
   - **Private Key** is the `.p8` file contents from that key (only downloadable once at creation time)

---

## Summary checklist

- [ ] Google Cloud Console: app name set to "Berven Book"
- [ ] Google Cloud Console: user support email configured
- [ ] Google Cloud Console: `berven.app` added as authorized domain
- [ ] Google Cloud Console: domain verification completed for `berven.app`
- [ ] Google Cloud Console: app logo uploaded (optional)
- [ ] Google Cloud Console: verification submitted if using sensitive scopes broadly
- [ ] Apple Developer: Service ID description set to "Berven Book"
- [ ] Apple Developer: return URL matches Supabase callback
- [ ] Supabase: Google provider Client ID and Secret match Google Cloud Console
- [ ] Supabase: Apple provider Service ID, Team ID, Key ID, and private key match Apple Developer
