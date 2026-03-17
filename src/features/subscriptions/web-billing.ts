import {
  ErrorCode,
  Purchases,
  PurchasesError,
} from '@revenuecat/purchases-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
} | null;

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _purchases: Purchases | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the RevenueCat web SDK. Safe to call multiple times — subsequent
 * calls are no-ops when the SDK is already configured.
 */
export async function initializeWebBilling(
  apiKey: string,
  appUserId: string,
): Promise<void> {
  try {
    if (Purchases.isConfigured()) {
      return;
    }
    _purchases = Purchases.configure({ apiKey, appUserId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[WebBilling] initializeWebBilling failed:', message);
    throw err;
  }
}

/**
 * Fetch the current customer's entitlement state from RevenueCat.
 */
export async function getWebCustomerInfo(): Promise<CustomerInfoLike> {
  if (!_purchases) {
    throw new Error('[WebBilling] SDK not initialized — call initializeWebBilling first');
  }
  return _purchases.getCustomerInfo();
}

/**
 * Start a web checkout flow for the current monthly offering.
 *
 * Returns updated CustomerInfo on success, or null if the user cancelled.
 * Throws for any other error (no offering configured, network failure, etc.).
 */
export async function startWebCheckout(
  userEmail?: string,
): Promise<CustomerInfoLike> {
  if (!_purchases) {
    throw new Error('[WebBilling] SDK not initialized — call initializeWebBilling first');
  }

  try {
    const offerings = await _purchases.getOfferings();

    if (!offerings.current?.monthly) {
      throw new Error(
        'No offering available — check RevenueCat dashboard configuration',
      );
    }

    await _purchases.purchase({
      rcPackage: offerings.current.monthly,
      customerEmail: userEmail,
    });

    return _purchases.getCustomerInfo();
  } catch (err) {
    if (
      err instanceof PurchasesError &&
      err.errorCode === ErrorCode.UserCancelledError
    ) {
      // User closed the checkout modal — silent path, not an error.
      return null;
    }

    const message = err instanceof Error ? err.message : String(err);
    console.warn('[WebBilling] startWebCheckout failed:', message);
    throw err;
  }
}
