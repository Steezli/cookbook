/**
 * Hook to determine whether ads should be displayed on the current screen.
 *
 * Requirement: ADS-02 — Ad placement on public browsing screens only
 *
 * Usage:
 *   const { showAds } = useAdPlacement();
 *   return showAds ? <AdBanner /> : null;
 *
 * This hook reads the current route from expo-router and checks it against
 * the public/private route patterns defined in config.ts.
 */

import { shouldShowAds } from './config';

export interface AdPlacementResult {
  /** Whether ads should be shown on the current screen */
  showAds: boolean;
  /** The route path that was evaluated */
  routePath: string;
}

/**
 * Determine ad visibility for a given route path.
 * This is the pure logic extracted for testability.
 * The React hook wrapper would use expo-router's usePathname().
 */
export function evaluateAdPlacement(routePath: string): AdPlacementResult {
  return {
    showAds: shouldShowAds(routePath),
    routePath,
  };
}

/**
 * React hook for ad placement.
 * Uses expo-router to get current path.
 *
 * NOTE: This wraps evaluateAdPlacement with router integration.
 * In testing, use evaluateAdPlacement directly.
 */
export function useAdPlacement(): AdPlacementResult {
  // Dynamic import to avoid hard dependency on expo-router in tests
  let routePath = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const router = require('expo-router');
    routePath = router.usePathname?.() ?? '';
  } catch {
    // Outside of router context — no ads
    routePath = '';
  }

  return evaluateAdPlacement(routePath);
}
