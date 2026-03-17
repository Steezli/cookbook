/**
 * Type declarations for react-native-purchases (RevenueCat SDK).
 *
 * This module is an optional native dependency (only available on native builds).
 * The type declaration allows TypeScript to compile without the package installed.
 * The actual module is loaded dynamically at runtime via import().
 */
declare module 'react-native-purchases' {
  export interface EntitlementInfo {
    expirationDate: string | null;
    willRenew: boolean;
    productIdentifier: string;
  }

  export interface CustomerInfo {
    entitlements: {
      active: Record<string, EntitlementInfo>;
    };
  }

  const Purchases: {
    configure(options: { apiKey: string; appUserID: string }): void;
    getCustomerInfo(): Promise<CustomerInfo>;
    restorePurchases(): Promise<CustomerInfo>;
    addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void;
    removeCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void;
  };

  export default Purchases;
}
