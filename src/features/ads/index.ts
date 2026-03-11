/**
 * Advertising module — public API
 *
 * Requirements:
 *   ADS-01: Ad banner component with platform branching
 *   ADS-02: Ad placement on public browsing screens only
 *   ADS-03: ATT permission prompt on iOS
 */

export { AdBanner, AdPlaceholder } from './AdBanner';
export type { AdBannerProps } from './AdBanner';

export {
  getAdPlatform,
  getBannerAdUnitId,
  getBannerSize,
  shouldShowAds,
  BANNER_SIZE_MOBILE,
  BANNER_SIZE_WEB,
  PUBLIC_ROUTE_PATTERNS,
  PRIVATE_ROUTE_PATTERNS,
} from './config';
export type { AdPlatform, AdBannerSize } from './config';

export {
  requestTrackingPermission,
  getTrackingStatus,
  isTrackingAuthorized,
} from './att';
export type { ATTStatus } from './att';

export { useAdPlacement, evaluateAdPlacement } from './useAdPlacement';
export type { AdPlacementResult } from './useAdPlacement';
