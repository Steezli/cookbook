declare module 'react-native-purchases-ui' {
  export const RevenueCatUI: {
    presentPaywallIfNeeded(options: { requiredEntitlementIdentifier: string }): Promise<void>;
  };
}
