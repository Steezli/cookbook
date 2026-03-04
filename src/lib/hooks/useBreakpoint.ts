// Breakpoint detection hook for responsive layouts.
// Source: React Native docs (useWindowDimensions) + project CONTEXT.md thresholds.
//
// CRITICAL CONSTRAINT (from STATE.md):
// All dimension-sensitive styles must be computed inside components from
// useBreakpoint() — NOT cached in StyleSheet.create.
//
// The pure getBreakpoint() function is exported separately for unit testing
// without a React renderer.

import { useWindowDimensions } from 'react-native';

// Breakpoint thresholds (per project CONTEXT.md decisions):
// mobile:  width < 640px
// tablet:  640px <= width < 1280px
// web:     width >= 1280px
export type Breakpoint = 'mobile' | 'tablet' | 'web';

export interface BreakpointResult {
  breakpoint: Breakpoint;
  width: number;
}

/**
 * Pure function mapping a pixel width to the current breakpoint.
 * Extracted from the hook to allow unit testing without React renderer.
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= 1280) {
    return 'web';
  }
  if (width >= 640) {
    return 'tablet';
  }
  return 'mobile';
}

/**
 * Hook that returns the current breakpoint and window width.
 * Uses useWindowDimensions (not Dimensions.get) to re-render on web resize.
 *
 * Usage:
 *   const { breakpoint } = useBreakpoint();
 *   const padding = breakpoint === 'mobile' ? 16 : 32;
 */
export function useBreakpoint(): BreakpointResult {
  const { width } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  return { breakpoint, width };
}
