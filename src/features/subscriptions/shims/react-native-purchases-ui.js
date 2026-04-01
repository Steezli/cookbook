// Shim for react-native-purchases-ui when the native SDK is not installed.
// Mirrors the null-returning shape that PaywallPlaceholder expects when
// the dynamic import catches and returns null.
module.exports = {
  default: {
    presentPaywallIfNeeded: async () => 'NOT_PRESENTED',
    presentPaywall: async () => 'NOT_PRESENTED',
    presentCustomerCenter: async () => {},
  },
  PAYWALL_RESULT: {
    NOT_PRESENTED: 'NOT_PRESENTED',
    PURCHASED: 'PURCHASED',
    CANCELLED: 'CANCELLED',
    ERROR: 'ERROR',
    RESTORED: 'RESTORED',
  },
};
