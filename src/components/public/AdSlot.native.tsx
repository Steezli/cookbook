import React from 'react';
import { Text, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import {
  borderDefault,
  fontFamilyBodyMedium,
  textTertiary,
} from '@/lib/tokens';
import { AdBanner } from '@/features/ads';
import { BANNER_SIZE_MOBILE, BANNER_SIZE_WEB } from '@/features/ads/config';

type AdSlotProps = {
  variant: 'mobile' | 'leaderboard' | 'sidebar';
  style?: object;
};

const SIZES = {
  mobile: { width: 320, height: 50 },
  leaderboard: { width: 728, height: 90 },
  sidebar: { width: '100%' as const, height: 250 },
};

/**
 * Native ad slot — delegates to AdBanner for mobile/leaderboard variants.
 *
 * - mobile: renders consent-gated AdBanner at 320×50
 * - leaderboard: renders consent-gated AdBanner at 728×90
 * - sidebar: keeps static placeholder (AdBanner doesn't support sidebar format)
 *
 * Consumers import as: import AdSlot from '@/components/public/AdSlot'
 * React Native platform resolution picks .native.tsx automatically.
 */
export default function AdSlot({ variant, style }: AdSlotProps) {
  // Mobile and leaderboard variants delegate to the consent-gated AdBanner
  if (variant === 'mobile') {
    return (
      <View style={style}>
        <AdBanner size={BANNER_SIZE_MOBILE} testID="ad-slot-mobile" />
      </View>
    );
  }

  if (variant === 'leaderboard') {
    return (
      <View style={style}>
        <AdBanner size={BANNER_SIZE_WEB} testID="ad-slot-leaderboard" />
      </View>
    );
  }

  // Sidebar: static placeholder (no AdBanner support for this format)
  const size = SIZES.sidebar;
  const iconSize = 16;
  const fontSize = 11;
  const radius = 10;

  return (
    <View
      style={[
        {
          width: size.width,
          height: size.height,
          backgroundColor: '#F9FAFB',
          borderRadius: radius,
          borderWidth: 1,
          borderColor: borderDefault,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
        },
        style,
      ]}
    >
      <Megaphone size={iconSize} color={textTertiary} />
      <Text
        style={{
          fontSize,
          fontFamily: fontFamilyBodyMedium,
          color: textTertiary,
        }}
      >
        Sponsored
      </Text>
    </View>
  );
}
