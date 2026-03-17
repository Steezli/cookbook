/**
 * Contract tests for SubscriptionContext / useSubscription()
 *
 * Covers:
 *   - isSubscriber semantics (RevenueCat entitlement presence)
 *   - scansRemaining computation (FREE_SCAN_LIMIT - scanCount, clamped to 0)
 *   - isLoading resolution (false after SDK responds)
 *   - SDK unavailability fallback (isSubscriber: false, isLoading: false)
 *
 * These tests target the pure computation function `computeSubscriptionState`
 * that will be exported from SubscriptionContext.tsx, allowing Node-environment
 * testing without a React renderer.
 *
 * All tests FAIL until T03 implements SubscriptionContext.tsx.
 */

// ---------------------------------------------------------------------------
// Mock react-native-purchases
// ---------------------------------------------------------------------------

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn().mockResolvedValue(undefined),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    addCustomerInfoUpdateListener: jest.fn().mockReturnValue(() => undefined),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock react-native Platform (proxy pattern from AdBanner.test.ts)
// ---------------------------------------------------------------------------

const mockPlatform = { OS: 'ios' as string };

jest.mock('react-native', () => ({
  Platform: new Proxy({}, {
    get(_target, prop) {
      if (prop === 'OS') return mockPlatform.OS;
      return undefined;
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock scan-count module
// ---------------------------------------------------------------------------

const mockGetScanCount = jest.fn().mockResolvedValue(1);

jest.mock('@/features/subscriptions/scan-count', () => ({
  getScanCount: (...args: unknown[]) => mockGetScanCount(...args),
}));

// ---------------------------------------------------------------------------
// Mock session module
// ---------------------------------------------------------------------------

jest.mock('@/features/auth/session', () => ({
  useSession: jest.fn().mockReturnValue({
    session: { user: { id: 'test-user-id' } },
    isLoading: false,
  }),
}));

// ---------------------------------------------------------------------------
// Imports — will fail until SubscriptionContext.tsx exists
// ---------------------------------------------------------------------------

import { computeSubscriptionState } from '@/features/subscriptions/SubscriptionContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FREE_SCAN_LIMIT = 3;

function makeCustomerInfo(premiumActive: boolean) {
  return {
    entitlements: {
      active: premiumActive
        ? { premium: { identifier: 'premium', isActive: true } }
        : {},
    },
  };
}

// ---------------------------------------------------------------------------
// isSubscriber
// ---------------------------------------------------------------------------

describe('isSubscriber', () => {
  it('is false when getCustomerInfo returns no active entitlements', () => {
    const customerInfo = makeCustomerInfo(false);
    const result = computeSubscriptionState(customerInfo, 0);
    expect(result.isSubscriber).toBe(false);
  });

  it('is true when getCustomerInfo returns active "premium" entitlement', () => {
    const customerInfo = makeCustomerInfo(true);
    const result = computeSubscriptionState(customerInfo, 0);
    expect(result.isSubscriber).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scansRemaining
// ---------------------------------------------------------------------------

describe('scansRemaining', () => {
  it('returns 2 when getScanCount returns 1 (3 - 1 = 2)', () => {
    const customerInfo = makeCustomerInfo(false);
    const result = computeSubscriptionState(customerInfo, 1);
    expect(result.scansRemaining).toBe(2);
    expect(result.scanCount).toBe(1);
  });

  it('returns 0 when getScanCount returns 3 (limit reached)', () => {
    const customerInfo = makeCustomerInfo(false);
    const result = computeSubscriptionState(customerInfo, 3);
    expect(result.scansRemaining).toBe(0);
    expect(result.scanCount).toBe(3);
  });

  it('returns 0 when getScanCount returns 5 (over limit — Math.max(0, ...))', () => {
    const customerInfo = makeCustomerInfo(false);
    const result = computeSubscriptionState(customerInfo, 5);
    expect(result.scansRemaining).toBe(0);
    expect(result.scanCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// loading and fallback
// ---------------------------------------------------------------------------

describe('loading and fallback', () => {
  it('computeSubscriptionState resolves synchronously (no stuck isLoading)', () => {
    // The pure computation function is synchronous — no async/loading state.
    // isLoading:false is a contract of the hook after SDK responds.
    const customerInfo = makeCustomerInfo(false);
    const result = computeSubscriptionState(customerInfo, 0);
    // Result is returned immediately — not a Promise
    expect(result).toBeDefined();
    expect(typeof result.isSubscriber).toBe('boolean');
    expect(typeof result.scansRemaining).toBe('number');
  });

  it('SDK unavailable fallback: null customerInfo → isSubscriber false, scansRemaining clamped', () => {
    // When the SDK fails to load, customerInfo will be null/undefined.
    // computeSubscriptionState must handle this gracefully.
    const result = computeSubscriptionState(null, 0);
    expect(result.isSubscriber).toBe(false);
    expect(result.scansRemaining).toBe(FREE_SCAN_LIMIT);
  });
});
