# Subscription Setup

How to configure RevenueCat, App Store Connect, Google Play Console, and Stripe Web Billing so the Berven Book subscription system works end-to-end.

> **This is a configuration guide, not code.** All changes happen in external dashboards. The app code reads the API keys you configure here via environment variables.

---

## 1. RevenueCat Project Setup

### Create the project

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Click **Create new project** → name it `Berven Book`

### Add platform apps

Add three apps under the project:

| Platform | App type | Key prefix | Notes |
|----------|----------|------------|-------|
| **Apple App Store** | iOS | `appl_` | Requires shared secret from App Store Connect |
| **Google Play Store** | Android | `goog_` | Requires service account JSON from Google Play Console |
| **Stripe (Web Billing)** | Web | `rcb_` | Requires connected Stripe account |

Copy each platform's **public API key** — you'll need them for environment variables later.

### Create the entitlement

1. Go to **Products → Entitlements**
2. Click **+ New** → identifier: `Berven Book Pro`
3. This is the entitlement the app checks via `ENTITLEMENT_ID` in `src/features/subscriptions/constants.ts`

### Configure the offering

> **Critical:** The app code expects a specific offering and package naming convention. `offerings.current?.monthly` will fail silently if these names don't match. See `src/features/subscriptions/constants.ts` for the authoritative values.

1. Go to **Products → Offerings**
2. Create an offering with identifier: `default`
3. Mark it as the **Current Offering**
4. Inside the "default" offering, create a package with identifier: `monthly`
5. Attach the subscription products (created in Sections 2–4 below) to this `monthly` package
6. Attach the `Berven Book Pro` entitlement to each product

---

## 2. App Store Connect

### Create the subscription

1. Go to [App Store Connect](https://appstoreconnect.apple.com/) → your app → **Subscriptions**
2. Create a **Subscription Group** (e.g. `Berven Book Premium`)
3. Create a subscription product inside the group:

| Field | Value |
|-------|-------|
| **Reference Name** | `Monthly Premium` |
| **Product ID** | `berven_book_monthly_premium` (must match RevenueCat product mapping) |
| **Duration** | 1 Month |
| **Price** | **$3.99/month** |

4. Add at least one **Localization** (display name + description)
5. Submit for review (or use Sandbox for testing)

### Connect to RevenueCat

1. In App Store Connect → **App Information** → **App-Specific Shared Secret**, generate or copy the shared secret
2. In RevenueCat → your iOS app → **App Store Connect configuration**, paste the shared secret
3. In RevenueCat → **Products**, create a product mapping `berven_book_monthly_premium` → link to App Store product

---

## 3. Google Play Console

### Create the subscription

1. Go to [Google Play Console](https://play.google.com/console/) → your app → **Monetize → Subscriptions**
2. Create a new subscription:

| Field | Value |
|-------|-------|
| **Product ID** | `berven_book_monthly_premium` |
| **Name** | `Monthly Premium` |

3. Add a **Base Plan**:

| Field | Value |
|-------|-------|
| **Base Plan ID** | `monthly` |
| **Renewal type** | Auto-renewing |
| **Billing period** | 1 Month |
| **Price** | **$3.99/month** |

### Connect to RevenueCat

1. Create a Google Play service account with financial access (see [RevenueCat docs](https://www.revenuecat.com/docs/creating-play-service-credentials))
2. In RevenueCat → your Android app → **Google Play configuration**, upload the service account JSON
3. In RevenueCat → **Products**, create a product mapping for `berven_book_monthly_premium` → link to Google Play product

---

## 4. Stripe + Web Billing

### Connect Stripe to RevenueCat

1. In RevenueCat Dashboard → your Web (Stripe) app → **Stripe configuration**
2. Click **Connect to Stripe** — this redirects to Stripe OAuth
3. Authorize the connection

### Create the Stripe product

1. In [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**
2. Create a product:

| Field | Value |
|-------|-------|
| **Name** | `Berven Book Monthly Premium` |
| **Pricing** | **$3.99/month**, recurring |

3. Copy the **Price ID** (starts with `price_`)
4. In RevenueCat → **Products**, create a product mapping using the Stripe Price ID

### Configure Web Billing integration

1. In RevenueCat → your Web app → **Web Billing**
2. Enable Web Billing
3. Ensure the Stripe product is mapped to the same RevenueCat product as the iOS/Android subscriptions

### Test mode vs Live mode

> **Important:** Stripe has separate **Test** and **Live** modes with different API keys and data.

- **Test mode** (`pk_test_` / `sk_test_`): Use for development. Creates test subscriptions that don't charge real money. Toggle "Test mode" in the Stripe Dashboard top bar.
- **Live mode** (`pk_live_` / `sk_live_`): Use for production. Charges real money.
- RevenueCat connects to one mode at a time. For development, connect to Stripe Test mode. Switch to Live mode before releasing to production.
- The Web Billing API key from RevenueCat (`rcb_` prefix) works with whichever Stripe mode is connected.

---

## 5. EAS Environment Variables

The app reads two environment variables at runtime:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | `session.tsx` (native SDK init) | Platform-specific public API key (`appl_` on iOS, `goog_` on Android) |
| `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` | `SubscriptionContext.tsx` (web billing) | Web Billing API key (`rcb_` prefix) |

### Local development

Add to your `.env` file (see `.env.example`):

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY="appl_your_ios_api_key_here"
EXPO_PUBLIC_REVENUECAT_WEB_API_KEY="rcb_your_web_billing_api_key_here"
```

> For local iOS Simulator testing, use the `appl_` key. For Android emulator, use the `goog_` key. You may need to swap this value depending on which platform you're testing.

### EAS Build (CI/CD)

Set secrets in EAS for build-time injection:

```bash
eas secret:create --name EXPO_PUBLIC_REVENUECAT_API_KEY --value "appl_your_key" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_WEB_API_KEY --value "rcb_your_key" --scope project
```

These are automatically injected into EAS builds via the `env` block in `eas.json`.

---

## 6. Promotional Entitlements

Use RevenueCat's promotional entitlements to grant premium access without a purchase (e.g. for beta testers, reviewers, or team members).

### Grant via RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/) → your project
2. Navigate to **Customers**
3. Search for the user by **App User ID** (this is the Supabase user UUID — check the `session.tsx` login call)
4. Click on the customer to open their profile
5. Click **Grant Promotional**
6. Select the entitlement to grant: `Berven Book Pro`
7. Choose the duration:
   - **Lifetime** — never expires
   - **Custom** — set a specific end date
   - **Duration** — set a number of days/weeks/months
8. Click **Grant**

### Verify the grant

1. On the customer profile page, confirm the entitlement appears under **Active Entitlements**
2. In the app, the user should see premium features after restarting or after the SDK refreshes (typically within a few minutes)

### Revoke a promotional entitlement

1. On the customer profile → **Active Entitlements**
2. Click the promotional entitlement
3. Click **Revoke**
