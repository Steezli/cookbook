import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import type { Breakpoint } from '@/lib/hooks/useBreakpoint';
import { PADDING_BY_BREAKPOINT, MAX_WIDTH_BY_VARIANT } from './types';
import type { PageContainerVariant } from './types';

type PageContainerProps = {
  children: React.ReactNode;
  variant?: PageContainerVariant;
  style?: ViewStyle;
};

/** Pure function for testability — exported for unit tests. */
export function getContainerStyle(
  breakpoint: Breakpoint,
  variant: PageContainerVariant = 'default',
): ViewStyle {
  const paddingHorizontal = PADDING_BY_BREAKPOINT[breakpoint];
  const maxWidth = MAX_WIDTH_BY_VARIANT[variant];

  return {
    flex: 1,
    paddingHorizontal,
    ...(maxWidth ? { maxWidth, alignSelf: 'center', width: '100%' } : {}),
  };
}

export function PageContainer({ children, variant = 'default', style }: PageContainerProps) {
  const { breakpoint } = useBreakpoint();
  const containerStyle = getContainerStyle(breakpoint, variant);

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
}
