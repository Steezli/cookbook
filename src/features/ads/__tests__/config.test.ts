/**
 * Tests for ads/config.ts
 *
 * Covers:
 *   ADS-01: Banner sizes per platform
 *   ADS-02: Route-based ad placement logic (public vs. private screens)
 */

import {
  getAdPlatform,
  getBannerAdUnitId,
  getBannerSize,
  shouldShowAds,
  BANNER_SIZE_MOBILE,
  BANNER_SIZE_WEB,
  PUBLIC_ROUTE_PATTERNS,
  PRIVATE_ROUTE_PATTERNS,
  TEST_BANNER_ID_IOS,
  TEST_BANNER_ID_ANDROID,
  TEST_BANNER_ID_WEB,
} from '../config';

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

// ---------------------------------------------------------------------------
// getAdPlatform
// ---------------------------------------------------------------------------

describe('getAdPlatform', () => {
  afterEach(() => setPlatform('web'));

  it('returns "ios" on iOS', () => {
    setPlatform('ios');
    expect(getAdPlatform()).toBe('ios');
  });

  it('returns "android" on Android', () => {
    setPlatform('android');
    expect(getAdPlatform()).toBe('android');
  });

  it('returns "web" on web', () => {
    setPlatform('web');
    expect(getAdPlatform()).toBe('web');
  });

  it('returns "web" for unknown platform', () => {
    setPlatform('windows');
    expect(getAdPlatform()).toBe('web');
  });
});

// ---------------------------------------------------------------------------
// getBannerAdUnitId — fallback to test IDs
// ---------------------------------------------------------------------------

describe('getBannerAdUnitId', () => {
  afterEach(() => setPlatform('web'));

  it('returns iOS test ad unit ID when env var is absent', () => {
    setPlatform('ios');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_IOS);
  });

  it('returns Android test ad unit ID when env var is absent', () => {
    setPlatform('android');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_ANDROID);
  });

  it('returns placeholder for web regardless of env vars', () => {
    setPlatform('web');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_WEB);
  });

  it('never returns undefined or empty string', () => {
    for (const os of ['ios', 'android', 'web', 'windows']) {
      setPlatform(os);
      const id = getBannerAdUnitId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getBannerAdUnitId — env-var resolution
// ---------------------------------------------------------------------------

describe('getBannerAdUnitId env-var resolution', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    delete process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID;
    delete process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;
    setPlatform('web');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns EXPO_PUBLIC_ADMOB_IOS_BANNER_ID on iOS when set', () => {
    const prodId = 'ca-app-pub-1234567890123456/1111111111';
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID = prodId;
    setPlatform('ios');
    expect(getBannerAdUnitId()).toBe(prodId);
  });

  it('returns EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID on Android when set', () => {
    const prodId = 'ca-app-pub-1234567890123456/2222222222';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID = prodId;
    setPlatform('android');
    expect(getBannerAdUnitId()).toBe(prodId);
  });

  it('falls back to iOS test ID when env var is empty string', () => {
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID = '';
    setPlatform('ios');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_IOS);
  });

  it('falls back to Android test ID when env var is empty string', () => {
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID = '';
    setPlatform('android');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_ANDROID);
  });

  it('ignores Android env var on iOS and vice versa', () => {
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID = 'ca-app-pub-android/9999';
    setPlatform('ios');
    // iOS should still return test ID, not the Android env var
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_IOS);
  });

  it('web always returns placeholder even if env vars are set', () => {
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID = 'ca-app-pub-ios/1111';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID = 'ca-app-pub-android/2222';
    setPlatform('web');
    expect(getBannerAdUnitId()).toBe(TEST_BANNER_ID_WEB);
  });
});

// ---------------------------------------------------------------------------
// getBannerSize
// ---------------------------------------------------------------------------

describe('getBannerSize', () => {
  afterEach(() => setPlatform('web'));

  it('returns 320×50 BANNER on iOS', () => {
    setPlatform('ios');
    const size = getBannerSize();
    expect(size).toEqual(BANNER_SIZE_MOBILE);
    expect(size.width).toBe(320);
    expect(size.height).toBe(50);
  });

  it('returns 320×50 BANNER on Android', () => {
    setPlatform('android');
    const size = getBannerSize();
    expect(size).toEqual(BANNER_SIZE_MOBILE);
  });

  it('returns 728×90 LEADERBOARD on web', () => {
    setPlatform('web');
    const size = getBannerSize();
    expect(size).toEqual(BANNER_SIZE_WEB);
    expect(size.width).toBe(728);
    expect(size.height).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// shouldShowAds — route-based ad placement (ADS-02)
// ---------------------------------------------------------------------------

describe('shouldShowAds', () => {
  describe('returns true for public routes', () => {
    it.each([
      '/public',
      '/public/recipes',
      '/public/recipes/123',
      '/browse',
      '/browse/popular',
      '/discover',
      '/discover/trending',
    ])('shows ads on %s', (route) => {
      expect(shouldShowAds(route)).toBe(true);
    });
  });

  describe('returns false for private/authenticated routes', () => {
    it.each([
      '/(auth)/login',
      '/(auth)/signup',
      '/(scan)/index',
      '/(scan)/draft/123',
      '/(family)/index',
      '/(family)/family/abc',
      '/recipes/create',
      '/recipes/[id]/edit',
      '/recipes/[id]/edit/something',
      '/collections',
      '/collections/123',
      '/collections/create',
      '/settings',
    ])('hides ads on %s', (route) => {
      expect(shouldShowAds(route)).toBe(false);
    });
  });

  describe('returns false for non-public routes', () => {
    it.each([
      '/',
      '/recipes',
      '/recipes/123',
      '/invite/token',
      '',
    ])('hides ads on %s', (route) => {
      expect(shouldShowAds(route)).toBe(false);
    });
  });

  it('returns false for empty string', () => {
    expect(shouldShowAds('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test ID constants integrity
// ---------------------------------------------------------------------------

describe('test banner ID constants', () => {
  it('iOS test ID matches Google AdMob format', () => {
    expect(TEST_BANNER_ID_IOS).toMatch(/^ca-app-pub-\d+\/\d+$/);
  });

  it('Android test ID matches Google AdMob format', () => {
    expect(TEST_BANNER_ID_ANDROID).toMatch(/^ca-app-pub-\d+\/\d+$/);
  });

  it('web placeholder is a non-empty string', () => {
    expect(TEST_BANNER_ID_WEB).toBe('placeholder');
  });
});

// ---------------------------------------------------------------------------
// Constants integrity
// ---------------------------------------------------------------------------

describe('route pattern constants', () => {
  it('PUBLIC_ROUTE_PATTERNS is non-empty', () => {
    expect(PUBLIC_ROUTE_PATTERNS.length).toBeGreaterThan(0);
  });

  it('PRIVATE_ROUTE_PATTERNS is non-empty', () => {
    expect(PRIVATE_ROUTE_PATTERNS.length).toBeGreaterThan(0);
  });

  it('banner sizes have positive dimensions', () => {
    expect(BANNER_SIZE_MOBILE.width).toBeGreaterThan(0);
    expect(BANNER_SIZE_MOBILE.height).toBeGreaterThan(0);
    expect(BANNER_SIZE_WEB.width).toBeGreaterThan(0);
    expect(BANNER_SIZE_WEB.height).toBeGreaterThan(0);
  });

  it('web banner is larger than mobile banner', () => {
    expect(BANNER_SIZE_WEB.width).toBeGreaterThan(BANNER_SIZE_MOBILE.width);
    expect(BANNER_SIZE_WEB.height).toBeGreaterThan(BANNER_SIZE_MOBILE.height);
  });
});
