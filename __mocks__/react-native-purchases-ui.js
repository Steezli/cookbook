// Manual mock for react-native-purchases-ui (RevenueCat Paywall UI SDK)
// Used in Jest tests — the real SDK is a native module unavailable in Node.
const RevenueCatUI = {
  presentPaywallIfNeeded: jest.fn().mockResolvedValue(undefined),
};

module.exports = {
  __esModule: true,
  default: { RevenueCatUI },
  RevenueCatUI,
};
