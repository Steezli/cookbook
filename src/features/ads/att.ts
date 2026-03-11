/**
 * App Tracking Transparency (ATT) permission prompt for iOS.
 *
 * Requirement: ADS-03 — ATT permission prompt on iOS for ad tracking
 *
 * On iOS 14+, apps must request permission before collecting IDFA for ad tracking.
 * This module wraps the ATT prompt with proper platform guards.
 *
 * Design decisions:
 *   - Returns a discriminated status type (not just boolean) so callers can
 *     distinguish "authorized" from "denied" from "not-applicable".
 *   - On Android/web, immediately returns 'not-applicable' — no user prompt.
 *   - Uses dynamic import so the native ATT module is never bundled on web.
 */

import { Platform } from 'react-native';

export type ATTStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'undetermined'
  | 'not-applicable'
  | 'unavailable';

/**
 * Request App Tracking Transparency permission on iOS.
 * No-ops on Android and web.
 *
 * @returns The ATT authorization status after the prompt.
 */
export async function requestTrackingPermission(): Promise<ATTStatus> {
  // ATT only applies to iOS
  if (Platform.OS !== 'ios') {
    return 'not-applicable';
  }

  try {
    // Dynamic import so the native module is not required on web/android bundles
    const TrackingTransparency = await import('expo-tracking-transparency');
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();

    return mapExpoStatus(status);
  } catch {
    // Module not available (e.g., Expo Go, or pre-iOS 14)
    return 'unavailable';
  }
}

/**
 * Check current ATT status without prompting.
 */
export async function getTrackingStatus(): Promise<ATTStatus> {
  if (Platform.OS !== 'ios') {
    return 'not-applicable';
  }

  try {
    const TrackingTransparency = await import('expo-tracking-transparency');
    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();

    return mapExpoStatus(status);
  } catch {
    return 'unavailable';
  }
}

/**
 * Whether ad tracking is currently authorized (helper for ad SDK initialization).
 */
export async function isTrackingAuthorized(): Promise<boolean> {
  const status = await getTrackingStatus();
  return status === 'authorized';
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

type ExpoPermissionStatus = 'granted' | 'denied' | 'undetermined';

function mapExpoStatus(status: ExpoPermissionStatus | string): ATTStatus {
  switch (status) {
    case 'granted':
      return 'authorized';
    case 'denied':
      return 'denied';
    case 'undetermined':
      return 'undetermined';
    default:
      return 'restricted';
  }
}
