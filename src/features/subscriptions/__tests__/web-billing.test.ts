import { ErrorCode, PurchasesError } from '@revenuecat/purchases-js';

// ---------------------------------------------------------------------------
// Mocks needed to import SubscriptionContext without native module errors
// ---------------------------------------------------------------------------

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {} }));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/features/auth/session', () => ({
  useSession: jest.fn().mockReturnValue({ session: null }),
}));

jest.mock('@/features/subscriptions/scan-count', () => ({
  getScanCount: jest.fn().mockResolvedValue(0),
}));

import { computeSubscriptionState } from '../SubscriptionContext';
import {
  initializeWebBilling,
  startWebCheckout,
} from '../web-billing';

// ---------------------------------------------------------------------------
// Mock @revenuecat/purchases-js
// ---------------------------------------------------------------------------

const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn();
const mockPurchase = jest.fn();
const mockIsConfigured = jest.fn();
const mockConfigure = jest.fn();

jest.mock('@revenuecat/purchases-js', () => {
  class MockPurchasesError extends Error {
    errorCode: number;
    constructor(errorCode: number, message?: string) {
      super(message);
      this.errorCode = errorCode;
    }
  }

  class MockPurchases {
    static isConfigured = jest.fn();
    static configure = jest.fn();
    getCustomerInfo = jest.fn();
    getOfferings = jest.fn();
    purchase = jest.fn();
  }

  return {
    Purchases: MockPurchases,
    PurchasesError: MockPurchasesError,
    ErrorCode: { UserCancelledError: 1 },
  };
});

// Pull the mock class after the mock is hoisted
import { Purchases } from '@revenuecat/purchases-js';

// Wire up shared jest.fn references to the mock statics
beforeAll(() => {
  (Purchases.isConfigured as jest.Mock).mockImplementation(mockIsConfigured);
  (Purchases.configure as jest.Mock).mockImplementation(mockConfigure);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initializeWebBilling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigure.mockReturnValue(new Purchases());
  });

  test('(a) does NOT call configure when isConfigured() returns true', async () => {
    mockIsConfigured.mockReturnValue(true);
    await initializeWebBilling('rcb_test_key', 'user-123');
    expect(mockConfigure).not.toHaveBeenCalled();
  });

  test('(b) DOES call configure when isConfigured() returns false', async () => {
    mockIsConfigured.mockReturnValue(false);
    await initializeWebBilling('rcb_test_key', 'user-123');
    expect(mockConfigure).toHaveBeenCalledWith({
      apiKey: 'rcb_test_key',
      appUserId: 'user-123',
    });
  });
});

describe('startWebCheckout', () => {
  let mockInstance: InstanceType<typeof Purchases>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockInstance = new Purchases();
    (mockInstance.getCustomerInfo as jest.Mock).mockResolvedValue({ entitlements: { active: { premium: {} } } });
    (mockInstance.getOfferings as jest.Mock).mockResolvedValue({ current: { monthly: { identifier: 'monthly' } } });
    (mockInstance.purchase as jest.Mock).mockResolvedValue({});
    mockConfigure.mockReturnValue(mockInstance);
    mockIsConfigured.mockReturnValue(false);
    await initializeWebBilling('rcb_test_key', 'user-123');
  });

  test('(c) throws "No offering available" when getOfferings() returns { current: null }', async () => {
    (mockInstance.getOfferings as jest.Mock).mockResolvedValue({ current: null });
    await expect(startWebCheckout()).rejects.toThrow(
      'No offering available — check RevenueCat dashboard configuration',
    );
  });

  test('(d) resolves to null (no throw) when purchase() throws UserCancelledError', async () => {
    (mockInstance.purchase as jest.Mock).mockRejectedValue(
      new PurchasesError(ErrorCode.UserCancelledError, 'User cancelled'),
    );
    const result = await startWebCheckout();
    expect(result).toBeNull();
  });
});

describe('computeSubscriptionState with web CustomerInfo', () => {
  test('(e) active premium entitlement → isSubscriber: true', () => {
    const customerInfo = {
      entitlements: { active: { premium: { isActive: true } } },
    };
    const result = computeSubscriptionState(customerInfo, 1);
    expect(result.isSubscriber).toBe(true);
  });

  test('(f) empty active entitlements → isSubscriber: false, scansRemaining: 3', () => {
    const customerInfo = {
      entitlements: { active: {} },
    };
    const result = computeSubscriptionState(customerInfo, 0);
    expect(result.isSubscriber).toBe(false);
    expect(result.scansRemaining).toBe(3);
  });
});
