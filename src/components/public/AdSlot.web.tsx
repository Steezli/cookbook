import React from 'react';
import { Text, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import {
  borderDefault,
  fontFamilyBodyMedium,
  textTertiary,
} from '@/lib/tokens';

type AdSlotProps = {
  variant: 'mobile' | 'leaderboard';
  style?: object;
};

/**
 * Web ad slot placeholder.
 * Phase 11: static placeholder. Phase 13 replaces with web ad integration.
 *
 * Consumers import as: import AdSlot from '@/components/public/AdSlot'
 * React Native platform resolution picks .web.tsx automatically on web.
 */
export default function AdSlot({ variant, style }: AdSlotProps) {
  const isMobile = variant === 'mobile';

  return (
    <View
      style={[
        {
          width: isMobile ? 320 : 728,
          height: isMobile ? 50 : 90,
          backgroundColor: '#F9FAFB',
          borderRadius: isMobile ? 8 : 10,
          borderWidth: 1,
          borderColor: borderDefault,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        },
        style,
      ]}
    >
      <Megaphone size={isMobile ? 14 : 16} color={textTertiary} />
      <Text
        style={{
          fontSize: isMobile ? 10 : 11,
          fontFamily: fontFamilyBodyMedium,
          color: textTertiary,
        }}
      >
        Sponsored
      </Text>
    </View>
  );
}
