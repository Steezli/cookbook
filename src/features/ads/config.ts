/**
 * Advertising configuration — centralizes ad unit IDs, sizes, and platform detection.
 *
 * Requirements:
 *   ADS-01: Ad banner component (320×50 mobile, 728×90 web) with platform branching
 *   ADS-02: Ad placement on public browsing screens only
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Ad unit IDs — test IDs from Google AdMob documentation.
// Replace with real IDs before production release.
// ---------------------------------------------------------------------------

const TEST_BANNER_IDS = {
  ios: 'ca-app-pub-3940256099942544/2934735716',
  android: 'ca-app-pub-3940256099942544/6300978111',
  web: 'placeholder', // Web uses a placeholder component, not real AdMob
} as const;

export type AdPlatform = 'ios' | 'android' | 'web';

export function getAdPlatform(): AdPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function getBannerAdUnitId(): string {
  return TEST_BANNER_IDS[getAdPlatform()];
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
