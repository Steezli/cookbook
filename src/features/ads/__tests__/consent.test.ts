/**
 * Tests for ads/consent.ts — GDPR consent module
 *
 * Covers:
 *   - Native platform: UMP SDK interaction via dynamic import
 *   - Web platform: AsyncStorage-based consent persistence
 *   - Status mapping from UMP enum values to unified ConsentStatus
 *   - canShowPersonalizedAds() logic
 *   - Edge cases: empty/null/invalid storage values
 *   - Fallback to 'unavailable' when SDK is absent
 */

// ---------------------------------------------------------------------------
// Mock Platform — mutable for per-test platform switching
// ---------------------------------------------------------------------------

const mockPlatform = { OS: 'ios' as string };

jest.mock('react-native', () => ({
  Platform: new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'OS') return mockPlatform.OS;
        return undefined;
      },
    },
  ),
}));

function setPlatform(os: string) {
  mockPlatform.OS = os;
}

// ---------------------------------------------------------------------------
// Mock AsyncStorage
// ---------------------------------------------------------------------------

const mockAsyncStorage: Record<string, string | null> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

function clearMockStorage() {
  for (const key of Object.keys(mockAsyncStorage)) {
    delete mockAsyncStorage[key];
  }
}

// ---------------------------------------------------------------------------
// Mock react-native-google-mobile-ads (AdsConsent)
// ---------------------------------------------------------------------------

const mockRequestInfoUpdate = jest.fn();
const mockGetConsentInfo = jest.fn();
const mockLoadAndShowConsentFormIfRequired = jest.fn();
const mockReset = jest.fn();

let nativeSdkAvailable = true;

jest.mock(
  'react-native-google-mobile-ads',
  () => {
    return {
      __esModule: true,
      get AdsConsent() {
        if (!nativeSdkAvailable) {
          throw new Error('Module not found');
        }
        return {
          requestInfoUpdate: mockRequestInfoUpdate,
          getConsentInfo: mockGetConsentInfo,
          loadAndShowConsentFormIfRequired: mockLoadAndShowConsentFormIfRequired,
          reset: mockReset,
        };
      },
      AdsConsentStatus: {
        REQUIRED: 'REQUIRED',
        NOT_REQUIRED: 'NOT_REQUIRED',
        OBTAINED: 'OBTAINED',
        UNKNOWN: 'UNKNOWN',
      },
    };
  },
  { virtual: true },
);

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  getConsentStatus,
  requestConsent,
  canShowPersonalizedAds,
  setWebConsentStatus,
  ConsentStatus,
  CONSENT_STORAGE_KEY,
} from '../consent';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  clearMockStorage();
  nativeSdkAvailable = true;
  setPlatform('ios');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Native platform — UMP SDK interaction
// ---------------------------------------------------------------------------

describe('native platform (UMP SDK)', () => {
  beforeEach(() => {
    setPlatform('ios');
  });

  describe('getConsentStatus()', () => {
    it('returns "required" when UMP status is REQUIRED', async () => {
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'REQUIRED',
        canRequestAds: false,
        isConsentFormAvailable: true,
      });

      const status = await getConsentStatus();
      expect(status).toBe('required');
      expect(mockRequestInfoUpdate).toHaveBeenCalledTimes(1);
      expect(mockGetConsentInfo).toHaveBeenCalledTimes(1);
    });

    it('returns "not_required" when UMP status is NOT_REQUIRED', async () => {
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'NOT_REQUIRED',
        canRequestAds: true,
        isConsentFormAvailable: false,
      });

      expect(await getConsentStatus()).toBe('not_required');
    });

    it('returns "obtained" when UMP status is OBTAINED', async () => {
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'OBTAINED',
        canRequestAds: true,
        isConsentFormAvailable: false,
      });

      expect(await getConsentStatus()).toBe('obtained');
    });

    it('returns "unknown" when UMP status is UNKNOWN', async () => {
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'UNKNOWN',
        canRequestAds: false,
        isConsentFormAvailable: false,
      });

      expect(await getConsentStatus()).toBe('unknown');
    });

    it('returns "unknown" and warns on unexpected UMP status', async () => {
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'SOME_NEW_STATUS',
        canRequestAds: false,
        isConsentFormAvailable: false,
      });

      expect(await getConsentStatus()).toBe('unknown');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected UMP status'),
      );
    });

    it('works on android too', async () => {
      setPlatform('android');
      mockRequestInfoUpdate.mockResolvedValue(undefined);
      mockGetConsentInfo.mockResolvedValue({
        status: 'OBTAINED',
        canRequestAds: true,
        isConsentFormAvailable: false,
      });

      expect(await getConsentStatus()).toBe('obtained');
    });
  });

  describe('requestConsent()', () => {
    it('calls loadAndShowConsentFormIfRequired and returns mapped status', async () => {
      mockLoadAndShowConsentFormIfRequired.mockResolvedValue({
        status: 'OBTAINED',
        canRequestAds: true,
        isConsentFormAvailable: false,
      });

      const status = await requestConsent();
      expect(status).toBe('obtained');
      expect(mockLoadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
    });

    it('returns "not_required" when UMP form not needed', async () => {
      mockLoadAndShowConsentFormIfRequired.mockResolvedValue({
        status: 'NOT_REQUIRED',
        canRequestAds: true,
        isConsentFormAvailable: false,
      });

      expect(await requestConsent()).toBe('not_required');
    });

    it('returns "required" when user dismisses form without consenting', async () => {
      mockLoadAndShowConsentFormIfRequired.mockResolvedValue({
        status: 'REQUIRED',
        canRequestAds: false,
        isConsentFormAvailable: true,
      });

      expect(await requestConsent()).toBe('required');
    });
  });

  describe('SDK unavailable (fallback)', () => {
    beforeEach(() => {
      nativeSdkAvailable = false;
    });

    it('getConsentStatus returns "unavailable" when SDK absent', async () => {
      const status = await getConsentStatus();
      expect(status).toBe('unavailable');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('UMP SDK not available'),
        expect.any(String),
      );
    });

    it('requestConsent returns "unavailable" when SDK absent', async () => {
      const status = await requestConsent();
      expect(status).toBe('unavailable');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('UMP consent request failed'),
        expect.any(String),
      );
    });
  });

  describe('SDK errors', () => {
    it('getConsentStatus returns "unavailable" when requestInfoUpdate throws', async () => {
      nativeSdkAvailable = true;
      mockRequestInfoUpdate.mockRejectedValue(
        new Error('Network error'),
      );

      expect(await getConsentStatus()).toBe('unavailable');
      expect(console.warn).toHaveBeenCalled();
    });

    it('requestConsent returns "unavailable" when loadAndShowConsentFormIfRequired throws', async () => {
      nativeSdkAvailable = true;
      mockLoadAndShowConsentFormIfRequired.mockRejectedValue(
        new Error('Form load failed'),
      );

      expect(await requestConsent()).toBe('unavailable');
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Web platform — AsyncStorage-based consent
// ---------------------------------------------------------------------------

describe('web platform (AsyncStorage)', () => {
  beforeEach(() => {
    setPlatform('web');
  });

  describe('getConsentStatus()', () => {
    it('returns "unknown" when no value in storage', async () => {
      expect(await getConsentStatus()).toBe('unknown');
    });

    it('returns "obtained" when stored value is "obtained"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'obtained';
      expect(await getConsentStatus()).toBe('obtained');
    });

    it('returns "required" when stored value is "required"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'required';
      expect(await getConsentStatus()).toBe('required');
    });

    it('returns "not_required" when stored value is "not_required"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'not_required';
      expect(await getConsentStatus()).toBe('not_required');
    });

    it('returns "unknown" when stored value is "unknown"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'unknown';
      expect(await getConsentStatus()).toBe('unknown');
    });

    it('returns "unknown" for empty string', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = '';
      expect(await getConsentStatus()).toBe('unknown');
    });

    it('returns "unknown" for null (not set)', async () => {
      // null is the default from our mock when key doesn't exist
      expect(await getConsentStatus()).toBe('unknown');
    });

    it('returns "unknown" and warns for invalid stored value', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'bogus_value';
      expect(await getConsentStatus()).toBe('unknown');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stored consent value'),
      );
    });
  });

  describe('requestConsent()', () => {
    it('returns "required" when no prior consent stored', async () => {
      expect(await requestConsent()).toBe('required');
    });

    it('returns "required" when stored status is "unknown"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'unknown';
      expect(await requestConsent()).toBe('required');
    });

    it('returns "obtained" when consent was already obtained', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'obtained';
      expect(await requestConsent()).toBe('obtained');
    });

    it('returns "not_required" when consent is not required', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'not_required';
      expect(await requestConsent()).toBe('not_required');
    });

    it('returns "required" when stored status is "required"', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'required';
      expect(await requestConsent()).toBe('required');
    });
  });

  describe('setWebConsentStatus()', () => {
    it('persists "obtained" to AsyncStorage', async () => {
      await setWebConsentStatus('obtained');
      expect(mockAsyncStorage[CONSENT_STORAGE_KEY]).toBe('obtained');
    });

    it('persists "not_required" to AsyncStorage', async () => {
      await setWebConsentStatus('not_required');
      expect(mockAsyncStorage[CONSENT_STORAGE_KEY]).toBe('not_required');
    });

    it('persists "required" to AsyncStorage', async () => {
      await setWebConsentStatus('required');
      expect(mockAsyncStorage[CONSENT_STORAGE_KEY]).toBe('required');
    });

    it('persists "unknown" to AsyncStorage', async () => {
      await setWebConsentStatus('unknown');
      expect(mockAsyncStorage[CONSENT_STORAGE_KEY]).toBe('unknown');
    });

    it('overwrites previous value', async () => {
      mockAsyncStorage[CONSENT_STORAGE_KEY] = 'required';
      await setWebConsentStatus('obtained');
      expect(mockAsyncStorage[CONSENT_STORAGE_KEY]).toBe('obtained');
    });
  });
});

// ---------------------------------------------------------------------------
// canShowPersonalizedAds()
// ---------------------------------------------------------------------------

describe('canShowPersonalizedAds()', () => {
  it('returns true for "obtained"', () => {
    expect(canShowPersonalizedAds('obtained')).toBe(true);
  });

  it('returns false for "required"', () => {
    expect(canShowPersonalizedAds('required')).toBe(false);
  });

  it('returns false for "not_required"', () => {
    expect(canShowPersonalizedAds('not_required')).toBe(false);
  });

  it('returns false for "unknown"', () => {
    expect(canShowPersonalizedAds('unknown')).toBe(false);
  });

  it('returns false for "unavailable"', () => {
    expect(canShowPersonalizedAds('unavailable')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CONSENT_STORAGE_KEY
// ---------------------------------------------------------------------------

describe('CONSENT_STORAGE_KEY', () => {
  it('is the expected AsyncStorage key', () => {
    expect(CONSENT_STORAGE_KEY).toBe('@ads_consent_status');
  });
});

// ---------------------------------------------------------------------------
// ConsentStatus type coverage
// ---------------------------------------------------------------------------

describe('ConsentStatus type', () => {
  it('covers all expected values', () => {
    const allStatuses: ConsentStatus[] = [
      'unknown',
      'required',
      'obtained',
      'not_required',
      'unavailable',
    ];
    expect(allStatuses).toHaveLength(5);
    expect(new Set(allStatuses).size).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Subscriber consent bypass (contract tests — failing until T02 adds the param)
// ---------------------------------------------------------------------------

describe('subscriber consent bypass', () => {
  it('getConsentStatus({ isSubscriber: true }) resolves to "not_required"', async () => {
    const status = await getConsentStatus({ isSubscriber: true });
    expect(status).toBe('not_required');
  });

  it('requestConsent({ isSubscriber: true }) resolves to "not_required"', async () => {
    const status = await requestConsent({ isSubscriber: true });
    expect(status).toBe('not_required');
  });

  it('getConsentStatus({ isSubscriber: false }) does NOT immediately return "not_required" (proceeds normally)', async () => {
    setPlatform('web');
    // No prior consent stored → should return 'unknown' (normal path), not 'not_required'
    const status = await getConsentStatus({ isSubscriber: false });
    expect(status).not.toBe('not_required');
  });
});
