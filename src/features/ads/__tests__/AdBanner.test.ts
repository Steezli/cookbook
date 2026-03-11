/**
 * Tests for ads/AdBanner component logic
 *
 * Covers:
 *   ADS-01: Ad banner component (320×50 mobile, 728×90 web) with platform branching
 *   GDPR: Consent-gated ad loading (personalization driven by canShowPersonalizedAds)
 *
 * These tests verify the component's platform-branching logic, configuration,
 * and consent-gated personalization behavior without requiring a React rendering
 * environment. The component's behavior is driven by config.ts and consent.ts
 * which are thoroughly tested in their own test files.
 *
 * For full component rendering tests, a React Native testing environment
 * (e.g., @testing-library/react-native) would be needed — deferred to
 * integration testing.
 */

import { getBannerSize, getAdPlatform, getBannerAdUnitId, BANNER_SIZE_MOBILE, BANNER_SIZE_WEB } from '../config';
import { canShowPersonalizedAds } from '../consent';
import type { ConsentStatus } from '../consent';

// ---------------------------------------------------------------------------
// Mock Platform
// ---------------------------------------------------------------------------

const mockPlatform = { OS: 'web' as string };

jest.mock('react-native', () => ({
  Platform: new Proxy({}, {
    get(_target, prop) {
      if (prop === 'OS') return mockPlatform.OS;
      return undefined;
    },
  }),
}));

function setPlatform(os: string) {
  mockPlatform.OS = os;
}

afterEach(() => setPlatform('web'));

// ---------------------------------------------------------------------------
// Platform branching logic (drives AdBanner rendering decisions)
// ---------------------------------------------------------------------------

describe('AdBanner platform branching', () => {
  describe('web platform', () => {
    beforeEach(() => setPlatform('web'));

    it('uses web platform', () => {
      expect(getAdPlatform()).toBe('web');
    });

    it('uses leaderboard size (728×90)', () => {
      const size = getBannerSize();
      expect(size).toEqual(BANNER_SIZE_WEB);
      expect(size.width).toBe(728);
      expect(size.height).toBe(90);
      expect(size.label).toBe('LEADERBOARD');
    });

    it('uses placeholder ad unit ID', () => {
      expect(getBannerAdUnitId()).toBe('placeholder');
    });
  });

  describe('iOS platform', () => {
    beforeEach(() => setPlatform('ios'));

    it('uses ios platform', () => {
      expect(getAdPlatform()).toBe('ios');
    });

    it('uses mobile banner size (320×50)', () => {
      const size = getBannerSize();
      expect(size).toEqual(BANNER_SIZE_MOBILE);
      expect(size.width).toBe(320);
      expect(size.height).toBe(50);
      expect(size.label).toBe('BANNER');
    });

    it('uses AdMob iOS test ad unit ID', () => {
      const id = getBannerAdUnitId();
      expect(id).toMatch(/^ca-app-pub-/);
    });
  });

  describe('Android platform', () => {
    beforeEach(() => setPlatform('android'));

    it('uses android platform', () => {
      expect(getAdPlatform()).toBe('android');
    });

    it('uses mobile banner size (320×50)', () => {
      const size = getBannerSize();
      expect(size).toEqual(BANNER_SIZE_MOBILE);
    });

    it('uses AdMob Android test ad unit ID', () => {
      const id = getBannerAdUnitId();
      expect(id).toMatch(/^ca-app-pub-/);
      expect(id).not.toBe((() => { setPlatform('ios'); return getBannerAdUnitId(); })());
    });
  });
});

// ---------------------------------------------------------------------------
// Size constants validation
// ---------------------------------------------------------------------------

describe('banner size constants', () => {
  it('mobile banner is 320×50 (IAB standard)', () => {
    expect(BANNER_SIZE_MOBILE).toEqual({
      width: 320,
      height: 50,
      label: 'BANNER',
    });
  });

  it('web banner is 728×90 (IAB leaderboard)', () => {
    expect(BANNER_SIZE_WEB).toEqual({
      width: 728,
      height: 90,
      label: 'LEADERBOARD',
    });
  });
});

// ---------------------------------------------------------------------------
// Consent-gated ad loading logic
// ---------------------------------------------------------------------------

describe('consent-gated ad personalization', () => {
  describe('canShowPersonalizedAds determines requestNonPersonalizedAdsOnly', () => {
    /**
     * The NativeAdBanner component sets:
     *   requestNonPersonalizedAdsOnly = !canShowPersonalizedAds(consentStatus)
     *
     * These tests verify the consent→personalization mapping that drives
     * the AdMob requestOptions at the logic level.
     */

    it('consent "obtained" → personalized ads allowed (requestNonPersonalizedAdsOnly: false)', () => {
      const status: ConsentStatus = 'obtained';
      const personalized = canShowPersonalizedAds(status);
      expect(personalized).toBe(true);
      // Component would set: requestNonPersonalizedAdsOnly = !true = false
      expect(!personalized).toBe(false);
    });

    it('consent "not_required" → non-personalized ads (requestNonPersonalizedAdsOnly: true)', () => {
      const status: ConsentStatus = 'not_required';
      const personalized = canShowPersonalizedAds(status);
      expect(personalized).toBe(false);
      expect(!personalized).toBe(true);
    });

    it('consent "unavailable" → non-personalized ads as safe default (requestNonPersonalizedAdsOnly: true)', () => {
      const status: ConsentStatus = 'unavailable';
      const personalized = canShowPersonalizedAds(status);
      expect(personalized).toBe(false);
      expect(!personalized).toBe(true);
    });

    it('consent "unknown" → non-personalized ads (requestNonPersonalizedAdsOnly: true)', () => {
      const status: ConsentStatus = 'unknown';
      const personalized = canShowPersonalizedAds(status);
      expect(personalized).toBe(false);
      expect(!personalized).toBe(true);
    });

    it('consent "required" → non-personalized ads (requestNonPersonalizedAdsOnly: true)', () => {
      const status: ConsentStatus = 'required';
      const personalized = canShowPersonalizedAds(status);
      expect(personalized).toBe(false);
      expect(!personalized).toBe(true);
    });
  });

  describe('all ConsentStatus values produce valid personalization flags', () => {
    const ALL_STATUSES: ConsentStatus[] = [
      'unknown',
      'required',
      'obtained',
      'not_required',
      'unavailable',
    ];

    it.each(ALL_STATUSES)('status "%s" returns a boolean', (status) => {
      const result = canShowPersonalizedAds(status);
      expect(typeof result).toBe('boolean');
    });

    it('only "obtained" enables personalized ads', () => {
      const personalizedStatuses = ALL_STATUSES.filter(canShowPersonalizedAds);
      expect(personalizedStatuses).toEqual(['obtained']);
    });
  });
});
