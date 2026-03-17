// Shim for react-native-purchases when the native SDK is not installed.
// Used in local dev / web builds where the EAS-only package is absent.
// Metro resolves dynamic import() at bundle time, so even code behind
// Platform.OS guards still requires a resolvable module. This shim
// provides safe no-ops so bundles compile without the native SDK.
module.exports = {
  default: {
    configure: () => {},
    getCustomerInfo: async () => ({ entitlements: { active: {} } }),
    addCustomerInfoUpdateListener: () => () => {},
    restorePurchases: async () => ({ entitlements: { active: {} } }),
    isConfigured: false,
    logIn: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
};
