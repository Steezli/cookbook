/**
 * GDPR consent module — unified API for consent lifecycle management.
 *
 * Provides a platform-branched implementation:
 *   - Native (iOS/Android): wraps AdsConsent from react-native-google-mobile-ads (UMP SDK)
 *   - Web: uses AsyncStorage for consent state persistence
 *
 * The module never throws — all errors are caught and mapped to typed status values.
 * This is the core logic that the GdprConsentBanner component and AdBanner will consume.
 *
 * Observability:
 *   - console.warn('[AdsConsent]') on UMP SDK failure or unexpected status
 *   - getConsentStatus() returns current state at any time
 *   - AsyncStorage key '@ads_consent_status' inspectable on web
 *   - 'unavailable' status = SDK not present; 'unknown' = no consent decision yet
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Unified consent status across platforms.
 *
 * - 'unknown': No consent decision yet (fresh install, or no stored value)
 * - 'required': Consent is needed but not yet gathered (UMP says REQUIRED, or web first visit)
 * - 'obtained': User has provided consent
 * - 'not_required': User is not in a region that requires consent
 * - 'unavailable': Consent SDK is not available (web fallback, or native SDK missing)
 */
export type ConsentStatus =
  | 'unknown'
  | 'required'
  | 'obtained'
  | 'not_required'
  | 'unavailable';

/** AsyncStorage key for persisting consent status on web. */
export const CONSENT_STORAGE_KEY = '@ads_consent_status';

/** Valid values that can be stored/read from AsyncStorage. */
const VALID_STORED_STATUSES: ReadonlySet<string> = new Set([
  'unknown',
  'required',
  'obtained',
  'not_required',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the current consent status.
 *
 * - Native: calls AdsConsent.requestInfoUpdate() + getConsentInfo() via dynamic import.
 *   Falls back to 'unavailable' if the SDK is not present.
 * - Web: reads from AsyncStorage. Returns 'unknown' if no value stored.
 */
export async function getConsentStatus(options?: { isSubscriber?: boolean }): Promise<ConsentStatus> {
  if (options?.isSubscriber) return Promise.resolve('not_required');
  if (Platform.OS === 'web') {
    return getWebConsentStatus();
  }
  return getNativeConsentStatus();
}

/**
 * Request consent from the user.
 *
 * - Native: calls AdsConsent.loadAndShowConsentFormIfRequired() which shows the
 *   UMP consent form if required, then returns the updated status.
 * - Web: returns 'required' to signal the UI should show the custom consent banner.
 *   (The banner calls setWebConsentStatus() when the user decides.)
 */
export async function requestConsent(options?: { isSubscriber?: boolean }): Promise<ConsentStatus> {
  if (options?.isSubscriber) return Promise.resolve('not_required');
  if (Platform.OS === 'web') {
    return requestWebConsent();
  }
  return requestNativeConsent();
}

/**
 * Whether personalized ads can be shown based on current consent.
 * Returns true only when consent status is 'obtained'.
 */
export function canShowPersonalizedAds(status: ConsentStatus): boolean {
  return status === 'obtained';
}

/**
 * Persist consent status to AsyncStorage (web only).
 * Called by the GdprConsentBanner component when the user accepts or declines.
 */
export async function setWebConsentStatus(
  status: ConsentStatus,
): Promise<void> {
  try {
    const AsyncStorage = await importAsyncStorage();
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch (error) {
    console.warn(
      '[AdsConsent] Failed to persist web consent status:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ---------------------------------------------------------------------------
// Native implementation (UMP SDK via dynamic import)
// ---------------------------------------------------------------------------

/**
 * Map UMP AdsConsentStatus enum values to our unified ConsentStatus.
 */
function mapUmpStatus(umpStatus: string): ConsentStatus {
  switch (umpStatus) {
    case 'REQUIRED':
      return 'required';
    case 'NOT_REQUIRED':
      return 'not_required';
    case 'OBTAINED':
      return 'obtained';
    case 'UNKNOWN':
      return 'unknown';
    default:
      console.warn(`[AdsConsent] Unexpected UMP status: ${umpStatus}`);
      return 'unknown';
  }
}

async function getNativeConsentStatus(): Promise<ConsentStatus> {
  try {
    const { AdsConsent } = await import('react-native-google-mobile-ads');

    // Request info update to get fresh status from UMP server
    await AdsConsent.requestInfoUpdate();
    const consentInfo = await AdsConsent.getConsentInfo();

    return mapUmpStatus(consentInfo.status as unknown as string);
  } catch (error) {
    console.warn(
      '[AdsConsent] UMP SDK not available, returning unavailable:',
      error instanceof Error ? error.message : String(error),
    );
    return 'unavailable';
  }
}

async function requestNativeConsent(): Promise<ConsentStatus> {
  try {
    const { AdsConsent } = await import('react-native-google-mobile-ads');

    // loadAndShowConsentFormIfRequired handles the full flow:
    // shows form if needed, resolves immediately if not
    const consentInfo = await AdsConsent.loadAndShowConsentFormIfRequired();

    return mapUmpStatus(consentInfo.status as unknown as string);
  } catch (error) {
    console.warn(
      '[AdsConsent] UMP consent request failed:',
      error instanceof Error ? error.message : String(error),
    );
    return 'unavailable';
  }
}

// ---------------------------------------------------------------------------
// Web implementation (AsyncStorage-based)
// ---------------------------------------------------------------------------

async function importAsyncStorage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

async function getWebConsentStatus(): Promise<ConsentStatus> {
  try {
    const AsyncStorage = await importAsyncStorage();
    const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);

    if (stored === null || stored === '') {
      return 'unknown';
    }

    if (VALID_STORED_STATUSES.has(stored)) {
      return stored as ConsentStatus;
    }

    // Invalid value in storage — treat as unknown
    console.warn(`[AdsConsent] Invalid stored consent value: ${stored}`);
    return 'unknown';
  } catch (error) {
    console.warn(
      '[AdsConsent] Failed to read web consent status:',
      error instanceof Error ? error.message : String(error),
    );
    return 'unknown';
  }
}

/**
 * Web consent request: returns 'required' to signal the UI should show
 * the consent banner. The actual consent decision is handled by setWebConsentStatus()
 * when the user interacts with the banner.
 */
async function requestWebConsent(): Promise<ConsentStatus> {
  const current = await getWebConsentStatus();

  // If consent was already obtained or not required, return that status
  if (current === 'obtained' || current === 'not_required') {
    return current;
  }

  // Signal that consent is needed — the UI should show the banner
  return 'required';
}
