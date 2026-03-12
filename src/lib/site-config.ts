/**
 * Site-wide constants for branding and canonical URLs.
 *
 * Single source of truth — import from here instead of hardcoding
 * the domain or display name in individual files.
 */

/** Display name shown to users (page titles, OG tags, legal copy). */
export const SITE_NAME = 'Berven Book';

/** Production domain without protocol. */
export const SITE_DOMAIN = 'bervenbook.com';

/** Full canonical base URL (no trailing slash). */
export const SITE_URL = `https://${SITE_DOMAIN}`;
