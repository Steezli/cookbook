import React from 'react';
import { Text, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import {
  borderDefault,
  fontFamilyBodyMedium,
  textTertiary,
} from '@/lib/tokens';

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
 * Web ad slot placeholder.
 * Phase 11: static placeholder. Phase 13 replaces with web ad integration.
 *
 * Consumers import as: import AdSlot from '@/components/public/AdSlot'
 * React Native platform resolution picks .web.tsx automatically on web.
 */
export default function AdSlot({ variant, style }: AdSlotProps) {
  const size = SIZES[variant];
  const iconSize = variant === 'mobile' ? 14 : 16;
  const fontSize = variant === 'mobile' ? 10 : 11;
  const radius = variant === 'mobile' ? 8 : 10;

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
          flexDirection: variant === 'sidebar' ? 'column' : 'row',
          gap: variant === 'sidebar' ? 8 : 6,
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
