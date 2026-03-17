// Manual mock for react-native-purchases (RevenueCat SDK)
// Used in Jest tests — the real SDK is a native module unavailable in Node.
const Purchases = {
  configure: jest.fn().mockResolvedValue(undefined),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  addCustomerInfoUpdateListener: jest.fn().mockReturnValue(() => undefined),
  removeCustomerInfoUpdateListener: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: Purchases,
};
