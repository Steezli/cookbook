/**
 * GdprConsentBanner — web-only GDPR consent prompt for ad personalization.
 *
 * On web: renders a fixed-bottom banner when consent status is 'unknown' or
 * 'required'. User can accept (→ 'obtained') or decline (→ 'not_required').
 * Dismisses after either action.
 *
 * On native: returns null — the UMP SDK handles consent UI natively via
 * requestConsent() in the consent module.
 *
 * Observability:
 *   - Banner visibility indicates consent is pending on web
 *   - After user action, AsyncStorage key '@ads_consent_status' is updated
 *   - onConsentResult callback fires with the resulting status
 */

import React, { useEffect, useState } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import {
  accentBlue,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontSizeSm,
  fontSizeXs,
  radiusSm,
  shadowMd,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

import { getConsentStatus, setWebConsentStatus } from './consent';
import type { ConsentStatus } from './consent';

export interface GdprConsentBannerProps {
  /** Called after the user accepts or declines, with the resulting status. */
  onConsentResult?: (status: ConsentStatus) => void;
  /** Test ID for testing frameworks */
  testID?: string;
}

const isWeb = Platform.OS === 'web';

/**
 * GDPR consent banner for web users.
 * Returns null on native platforms (UMP SDK handles consent natively).
 */
export function GdprConsentBanner({
  onConsentResult,
  testID,
}: GdprConsentBannerProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // Check consent status on mount (web only)
  useEffect(() => {
    if (!isWeb) return;

    let cancelled = false;

    async function checkConsent() {
      const status = await getConsentStatus();
      if (!cancelled && (status === 'unknown' || status === 'required')) {
        setVisible(true);
      }
    }

    checkConsent();
    return () => { cancelled = true; };
  }, []);

  // On native, never render — UMP handles the UI
  if (!isWeb || !visible) {
    return null;
  }

  async function handleAccept() {
    await setWebConsentStatus('obtained');
    setVisible(false);
    onConsentResult?.('obtained');
  }

  async function handleDecline() {
    await setWebConsentStatus('not_required');
    setVisible(false);
    onConsentResult?.('not_required');
  }

  return (
    <View
      testID={testID ?? 'gdpr-consent-banner'}
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel="Cookie consent banner"
    >
      <View style={styles.content}>
        <Text style={styles.message}>
          We use cookies and similar technologies to show you personalized ads.
          You can accept or decline — either way, you'll still see ads, just
          less relevant ones if you decline. See our{' '}
          <Text
            style={styles.privacyLink}
            onPress={() => router.push('/(public)/privacy')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            Privacy Policy
          </Text>
          .
        </Text>
        <View style={styles.actions}>
          <Pressable
            testID="gdpr-decline-button"
            style={styles.declineButton}
            onPress={handleDecline}
            accessibilityRole="button"
            accessibilityLabel="Decline personalized ads"
          >
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
          <Pressable
            testID="gdpr-accept-button"
            style={styles.acceptButton}
            onPress={handleAccept}
            accessibilityRole="button"
            accessibilityLabel="Accept personalized ads"
          >
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: bgPage,
    borderTopWidth: 1,
    borderTopColor: borderDefault,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...shadowMd,
  },
  content: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  message: {
    flex: 1,
    fontFamily: fontFamilyBody,
    fontSize: fontSizeSm,
    color: textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radiusSm,
    borderWidth: 1,
    borderColor: borderDefault,
    backgroundColor: bgPage,
  },
  declineText: {
    fontFamily: fontFamilyBodyMedium,
    fontSize: fontSizeXs,
    color: textPrimary,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radiusSm,
    backgroundColor: accentBlue,
  },
  acceptText: {
    fontFamily: fontFamilyBodyMedium,
    fontSize: fontSizeXs,
    color: white,
  },
  privacyLink: {
    fontFamily: fontFamilyBodyMedium,
    fontSize: fontSizeSm,
    color: accentBlue,
    textDecorationLine: 'underline',
  },
});

export default GdprConsentBanner;
