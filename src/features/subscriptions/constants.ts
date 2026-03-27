/**
 * Subscription configuration constants.
 *
 * These must match the RevenueCat dashboard configuration exactly:
 * - Entitlement identifier: set in RevenueCat → Project → Entitlements
 * - Offering identifier: set in RevenueCat → Project → Offerings
 * - Free scan limit: business rule enforced in scan-count.ts
 */

/** RevenueCat entitlement identifier — must match dashboard configuration. */
export const ENTITLEMENT_ID = 'Berven Book Pro';

/** RevenueCat offering identifier — must match dashboard "Current Offering". */
export const OFFERING_ID = 'default';

/** RevenueCat package identifier inside the offering. */
export const PACKAGE_ID = 'monthly';

/** Maximum free scans per calendar month for non-subscribers. */
export const FREE_SCAN_LIMIT = 3;
