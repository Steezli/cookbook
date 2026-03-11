/**
 * Advertising configuration — centralizes ad unit IDs, sizes, and platform detection.
 *
 * Requirements:
 *   ADS-01: Ad banner component (320×50 mobile, 728×90 web) with platform branching
 *   ADS-02: Ad placement on public browsing screens only
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Ad unit IDs — Google AdMob test IDs used as fallback when env vars are absent.
// Production IDs are read from EXPO_PUBLIC_ADMOB_IOS_BANNER_ID /
// EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID at build time.
// ---------------------------------------------------------------------------

/** Google AdMob test banner ID for iOS */
export const TEST_BANNER_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';
/** Google AdMob test banner ID for Android */
export const TEST_BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
/** Placeholder for web (no real AdMob on web) */
export const TEST_BANNER_ID_WEB = 'placeholder';

const TEST_BANNER_IDS = {
  ios: TEST_BANNER_ID_IOS,
  android: TEST_BANNER_ID_ANDROID,
  web: TEST_BANNER_ID_WEB,
} as const;

export type AdPlatform = 'ios' | 'android' | 'web';

export function getAdPlatform(): AdPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Returns the banner ad unit ID for the current platform.
 *
 * Reads from environment variables on iOS/Android:
 *   - iOS: EXPO_PUBLIC_ADMOB_IOS_BANNER_ID
 *   - Android: EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID
 *
 * Falls back to Google's test banner IDs when env vars are absent or empty.
 * Web always returns the placeholder string.
 */
export function getBannerAdUnitId(): string {
  const platform = getAdPlatform();

  if (platform === 'ios') {
    return process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || TEST_BANNER_ID_IOS;
  }
  if (platform === 'android') {
    return process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || TEST_BANNER_ID_ANDROID;
  }

  return TEST_BANNER_ID_WEB;
}

// ---------------------------------------------------------------------------
// Banner sizes per breakpoint
// ---------------------------------------------------------------------------

export interface AdBannerSize {
  width: number;
  height: number;
  label: string;
}

export const BANNER_SIZE_MOBILE: AdBannerSize = {
  width: 320,
  height: 50,
  label: 'BANNER',
};

export const BANNER_SIZE_WEB: AdBannerSize = {
  width: 728,
  height: 90,
  label: 'LEADERBOARD',
};

/**
 * Returns the appropriate banner size for the current platform.
 * Mobile (iOS/Android) → 320×50, Web → 728×90
 */
export function getBannerSize(): AdBannerSize {
  const platform = getAdPlatform();
  return platform === 'web' ? BANNER_SIZE_WEB : BANNER_SIZE_MOBILE;
}

// ---------------------------------------------------------------------------
// Public screen detection — ads only appear on public screens (ADS-02)
// ---------------------------------------------------------------------------

/**
 * Route prefixes/patterns that are considered "public" (unauthenticated browsing).
 * Ads are ONLY shown on these routes.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  '/public',
  '/browse',
  '/discover',
] as const;

/**
 * Routes that are explicitly authenticated / private — ads must NEVER appear.
 */
export const PRIVATE_ROUTE_PATTERNS = [
  '/(auth)',
  '/(scan)',
  '/(family)',
  '/recipes/create',
  '/recipes/[id]/edit',
  '/collections',
  '/settings',
] as const;

/**
 * Determine whether a given route path should show ads.
 * Returns true only for public browsing screens (ADS-02).
 */
export function shouldShowAds(routePath: string): boolean {
  if (!routePath) return false;

  // First check: if it matches any private pattern, never show ads
  for (const pattern of PRIVATE_ROUTE_PATTERNS) {
    if (routePath.startsWith(pattern)) return false;
  }

  // Second check: must match a public pattern to show ads
  for (const pattern of PUBLIC_ROUTE_PATTERNS) {
    if (routePath.startsWith(pattern)) return true;
  }

  return false;
}
