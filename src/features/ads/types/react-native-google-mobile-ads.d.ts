/**
 * Type declarations for react-native-google-mobile-ads.
 *
 * This module is an optional native dependency (only available on native builds).
 * The type declaration allows TypeScript to compile without the package installed.
 * The actual module is loaded dynamically at runtime via import().
 */
declare module 'react-native-google-mobile-ads' {
  import { ComponentType } from 'react';

  // ---------------------------------------------------------------------------
  // Banner Ad
  // ---------------------------------------------------------------------------

  export interface BannerAdProps {
    unitId: string;
    size: string;
    requestOptions?: {
      requestNonPersonalizedAdsOnly?: boolean;
    };
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
    onAdOpened?: () => void;
    onAdClosed?: () => void;
  }

  export const BannerAd: ComponentType<BannerAdProps>;

  // ---------------------------------------------------------------------------
  // AdsConsent — Google UMP SDK for GDPR consent
  // ---------------------------------------------------------------------------

  /**
   * Consent status returned by the UMP SDK.
   *
   * - REQUIRED: User is in a region requiring consent and has not yet consented.
   * - NOT_REQUIRED: User is not in a region requiring consent.
   * - OBTAINED: User has already provided consent.
   * - UNKNOWN: Consent status has not been determined yet.
   */
  export enum AdsConsentStatus {
    REQUIRED = 'REQUIRED',
    NOT_REQUIRED = 'NOT_REQUIRED',
    OBTAINED = 'OBTAINED',
    UNKNOWN = 'UNKNOWN',
  }

  /**
   * Debug geography for testing consent flows in development.
   *
   * - DISABLED: Removes any previous debug locations.
   * - EEA: Simulates the device being within the EEA.
   * - NOT_EEA: Simulates the device being outside of the EEA.
   */
  export enum AdsConsentDebugGeography {
    DISABLED = 0,
    EEA = 1,
    NOT_EEA = 2,
  }

  /**
   * Consent information returned by AdsConsent methods.
   */
  export interface AdsConsentInfo {
    /** Current consent status. */
    status: AdsConsentStatus;
    /** Whether the app can request ads (personalized or non-personalized). */
    canRequestAds: boolean;
    /** Whether a consent form is available for display. */
    isConsentFormAvailable: boolean;
  }

  /**
   * Options for AdsConsent.requestInfoUpdate().
   */
  export interface AdsConsentInfoUpdateOptions {
    /** Debug geography for simulating consent states. */
    debugGeography?: AdsConsentDebugGeography;
    /** Hashed test device identifiers. */
    testDeviceIdentifiers?: string[];
  }

  /**
   * AdsConsent namespace — wraps the Google UMP SDK for GDPR consent management.
   *
   * Usage flow:
   * 1. Call requestInfoUpdate() to get current consent state.
   * 2. Call loadAndShowConsentFormIfRequired() to show consent form if needed.
   * 3. Call getConsentInfo() to check canRequestAds before loading ads.
   * 4. Call reset() to clear consent state (testing only).
   */
  export namespace AdsConsent {
    /**
     * Request an update to the consent information.
     * Should be called on app startup. Returns updated consent info.
     */
    function requestInfoUpdate(
      options?: AdsConsentInfoUpdateOptions,
    ): Promise<AdsConsentInfo>;

    /**
     * Load and show the consent form if consent is required.
     * If consent is not required, resolves immediately.
     * Returns the updated consent info after form dismissal.
     */
    function loadAndShowConsentFormIfRequired(): Promise<AdsConsentInfo>;

    /**
     * Gather consent in a single call: requests info update, then
     * loads and shows form if required.
     */
    function gatherConsent(
      options?: AdsConsentInfoUpdateOptions,
    ): Promise<AdsConsentInfo>;

    /**
     * Get the current consent info without requesting an update.
     */
    function getConsentInfo(): Promise<AdsConsentInfo>;

    /**
     * Get whether GDPR applies for the current user.
     */
    function getGdprApplies(): Promise<boolean>;

    /**
     * Get the user's purpose consent string (TCF v2).
     */
    function getPurposeConsents(): Promise<string>;

    /**
     * Get user consent choices for inspection.
     */
    function getUserChoices(): Promise<{
      storeAndAccessInformationOnDevice: boolean;
      [key: string]: boolean;
    }>;

    /**
     * Reset the consent state. Useful for testing.
     */
    function reset(): void;
  }
}
