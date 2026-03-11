/**
 * Type declarations for react-native-google-mobile-ads.
 *
 * This module is an optional native dependency (only available on native builds).
 * The type declaration allows TypeScript to compile without the package installed.
 * The actual module is loaded dynamically at runtime via import().
 */
declare module 'react-native-google-mobile-ads' {
  import { ComponentType } from 'react';

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
}
