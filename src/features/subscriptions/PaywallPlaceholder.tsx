import React from 'react';
import { Modal, View, Text, Pressable, Platform } from 'react-native';
import { X, Check, RefreshCw } from 'lucide-react-native';
import { showAlert } from '@/lib/alert';
import { useSubscription } from '@/features/subscriptions/SubscriptionContext';
import {
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSize2xl,
  fontSizeLg,
  fontSizeBase,
  fontSizeSm,
  textPrimary,
  textSecondary,
  accentBlue,
  accentBlueDark,
  accentGreen,
  accentWarm,
  bgPage,
  bgCard,
  borderDefault,
  radiusMd,
  radiusSm,
  radiusPill,
  white,
  shadowMd,
} from '@/lib/tokens';

type PaywallPlaceholderProps = {
  visible: boolean;
  onDismiss: () => void;
};

const FEATURES = [
  'Unlimited recipe scans',
  'No ads',
  'Priority processing',
];

export function PaywallPlaceholder({ visible, onDismiss }: PaywallPlaceholderProps) {
  const { restorePurchases } = useSubscription();

  async function handleSubscribe() {
    if (Platform.OS !== 'web') {
      try {
        const mod = await import('react-native-purchases-ui').catch(() => null);
        if (!mod) {
          console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback');
          showAlert('Subscribe', 'Please visit Settings > Subscriptions to manage your subscription.');
          return;
        }
        const RevenueCatUI = mod.default?.RevenueCatUI ?? mod.RevenueCatUI;
        await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: 'premium',
        }).catch(() => {
          showAlert('Subscribe', 'Please visit Settings > Subscriptions to manage your subscription.');
        });
      } catch {
        console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback');
        showAlert('Subscribe', 'Please visit Settings > Subscriptions to manage your subscription.');
      }
    } else {
      showAlert('Coming Soon', 'Web subscriptions coming soon!');
    }
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      onDismiss();
    } catch {
      showAlert('Restore Failed', 'Could not restore purchases. Please try again.');
    }
  }

  const content = (
    <View
      style={{
        backgroundColor: bgPage,
        borderRadius: radiusMd,
        padding: 28,
        maxWidth: 380,
        width: '100%',
        ...shadowMd,
      }}
    >
      {/* Dismiss button */}
      <Pressable
        onPress={onDismiss}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgCard,
          borderRadius: radiusPill,
        }}
        accessibilityLabel="Dismiss paywall"
      >
        <X size={16} color={textSecondary} />
      </Pressable>

      {/* Headline */}
      <Text
        style={{
          fontFamily: fontFamilyDisplay,
          fontSize: fontSize2xl,
          color: textPrimary,
          marginBottom: 6,
          marginTop: 8,
          paddingRight: 32,
        }}
      >
        Scan Unlimited Recipes
      </Text>

      {/* Price */}
      <Text
        style={{
          fontFamily: fontFamilyBodyMedium,
          fontSize: fontSizeLg,
          color: accentWarm,
          marginBottom: 20,
        }}
      >
        $3.99 / month
      </Text>

      {/* Feature bullets */}
      <View style={{ marginBottom: 24, gap: 10 }}>
        {FEATURES.map((feature) => (
          <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radiusPill,
                backgroundColor: accentGreen,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={13} color={white} />
            </View>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textPrimary,
              }}
            >
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {/* Subscribe button */}
      <Pressable
        onPress={handleSubscribe}
        style={({ pressed }) => ({
          backgroundColor: pressed ? accentBlueDark : accentBlue,
          paddingVertical: 14,
          borderRadius: radiusSm,
          alignItems: 'center',
          marginBottom: 12,
        })}
        accessibilityLabel="Subscribe for unlimited scans"
      >
        <Text
          style={{
            fontFamily: fontFamilyBodyBold,
            fontSize: fontSizeBase,
            color: white,
          }}
        >
          Subscribe — $3.99/mo
        </Text>
      </Pressable>

      {/* Restore Purchases */}
      <Pressable
        onPress={handleRestore}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        accessibilityLabel="Restore previous purchases"
      >
        <RefreshCw size={14} color={textSecondary} />
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textSecondary,
          }}
        >
          Restore Purchases
        </Text>
      </Pressable>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!visible) return null;
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: 24,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {content}
      </View>
    </Modal>
  );
}
