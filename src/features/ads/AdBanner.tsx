/**
 * AdBanner — platform-branched ad banner component.
 *
 * Requirements:
 *   ADS-01: Ad banner (320×50 mobile, 728×90 web) with platform branching
 *   ADS-02: Ads only on public browsing screens
 *
 * On native (iOS/Android): renders a Google AdMob banner via
 * react-native-google-mobile-ads (or a styled placeholder if the SDK
 * is not available — common in Expo Go dev).
 *
 * On web: renders a styled placeholder banner (AdMob doesn't support RN web).
 *
 * Platform branching is done via React Native's Platform.select and runtime
 * checks rather than .native.tsx/.web.tsx file extensions, so the component
 * can be tested in a single Node test environment.
 */

import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

import { useSubscription } from '@/features/subscriptions/SubscriptionContext';
import { getBannerSize, getBannerAdUnitId, getAdPlatform } from './config';
import type { AdBannerSize } from './config';
import { getConsentStatus, requestConsent, canShowPersonalizedAds } from './consent';
import type { ConsentStatus } from './consent';

/**
 * Pure helper — returns true when the ad should be suppressed for a subscriber.
 * Guards against layout shift by requiring isLoading to be false first.
 */
export function shouldSuppressAd(isLoading: boolean, isSubscriber: boolean): boolean {
  return !isLoading && isSubscriber;
}

export interface AdBannerProps {
  /** Override the computed banner size (for testing or custom layouts) */
  size?: AdBannerSize;
  /** Test ID for testing frameworks */
  testID?: string;
}

/**
 * Platform-branched ad banner.
 * - iOS/Android: attempts to load AdMob; falls back to placeholder
 * - Web: always renders a styled placeholder
 */
export function AdBanner({ size: sizeProp, testID }: AdBannerProps) {
  const { isLoading, isSubscriber } = useSubscription();
  if (!isLoading && isSubscriber) return null;

  const platform = getAdPlatform();
  const size = sizeProp ?? getBannerSize();

  if (platform === 'web') {
    return <AdPlaceholder size={size} testID={testID} />;
  }

  // On native, try to render AdMob banner
  return <NativeAdBanner size={size} testID={testID} />;
}

// ---------------------------------------------------------------------------
// Web / Fallback placeholder
// ---------------------------------------------------------------------------

interface PlaceholderProps {
  size: AdBannerSize;
  testID?: string;
}

export function AdPlaceholder({ size, testID }: PlaceholderProps) {
  return (
    <View
      testID={testID ?? 'ad-placeholder'}
      style={[
        styles.placeholder,
        { width: size.width, height: size.height },
      ]}
      accessibilityLabel="Advertisement placeholder"
      accessibilityRole="none"
    >
      <Text style={styles.placeholderText}>Ad Space — {size.label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Native AdMob banner (with graceful fallback)
// ---------------------------------------------------------------------------

interface NativeAdBannerProps {
  size: AdBannerSize;
  testID?: string;
}

function NativeAdBanner({ size, testID }: NativeAdBannerProps) {
  const [sdkAvailable, setSdkAvailable] = useState<boolean | null>(null);
  const [AdMobBanner, setAdMobBanner] = useState<React.ComponentType<any> | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);

  // Load AdMob SDK
  useEffect(() => {
    let cancelled = false;

    async function loadAdMob() {
      try {
        const mod = await import('react-native-google-mobile-ads');
        if (!cancelled) {
          setAdMobBanner(() => mod.BannerAd);
          setSdkAvailable(true);
        }
      } catch {
        if (!cancelled) {
          setSdkAvailable(false);
        }
      }
    }

    loadAdMob();
    return () => { cancelled = true; };
  }, []);

  // Check consent status and request if needed
  useEffect(() => {
    let cancelled = false;

    async function resolveConsent() {
      try {
        const status = await getConsentStatus();

        if (status === 'unknown' || status === 'required') {
          // Triggers UMP form on native, returns 'required' on web
          const resolved = await requestConsent();
          if (!cancelled) setConsentStatus(resolved);
        } else {
          if (!cancelled) setConsentStatus(status);
        }
      } catch (error) {
        console.warn(
          '[AdsConsent] Consent check failed at render time:',
          error instanceof Error ? error.message : String(error),
        );
        if (!cancelled) setConsentStatus('unavailable');
      }
    }

    resolveConsent();
    return () => { cancelled = true; };
  }, []);

  // Still loading SDK or consent check
  if (sdkAvailable === null || consentStatus === null) {
    return <AdPlaceholder size={size} testID={testID} />;
  }

  // SDK not available (Expo Go, dev builds without native modules)
  if (!sdkAvailable || !AdMobBanner) {
    return <AdPlaceholder size={size} testID={testID} />;
  }

  // SDK available — render real AdMob banner with consent-driven personalization
  const adUnitId = getBannerAdUnitId();
  const bannerSize = Platform.OS === 'ios' || Platform.OS === 'android'
    ? `${size.label}`
    : 'BANNER';

  // Only show personalized ads when consent is explicitly obtained
  const nonPersonalized = !canShowPersonalizedAds(consentStatus);

  return (
    <View testID={testID ?? 'ad-banner-native'} style={styles.nativeContainer}>
      <AdMobBanner
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
        onAdFailedToLoad={(error: Error) => {
          console.warn('[AdBanner] Failed to load ad:', error.message);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  placeholderText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  nativeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

export default AdBanner;
