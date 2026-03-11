// Pure helper functions for PublicNavHeader breakpoint-specific logic.
// Extracted for unit testing without React renderer (node jest environment).

import type { Breakpoint } from '@/lib/hooks/useBreakpoint';

/** Chip tags shown in the browse header per breakpoint. */
const MOBILE_CHIPS = ['All', 'Dinner', 'Baking', 'Dessert', 'Quick'] as const;
const TABLET_CHIPS = [
  'All',
  'Dinner',
  'Baking',
  'Dessert',
  'Quick',
  'Vegetarian',
  'Comfort',
] as const;

export function getChipsForBreakpoint(breakpoint: Breakpoint): string[] {
  if (breakpoint === 'web') return [];
  if (breakpoint === 'tablet') return [...TABLET_CHIPS];
  return [...MOBILE_CHIPS];
}

export type HeaderVariant = 'browse' | 'detail';

export interface HeaderLayout {
  direction: 'vertical' | 'horizontal';
  showGetStarted: boolean;
  showSearchBar: boolean;
  logoIcon: 'BookOpen' | 'ArrowLeft';
  searchBarWidth: number | undefined;
}

export function getHeaderLayout(
  breakpoint: Breakpoint,
  variant: HeaderVariant,
): HeaderLayout {
  if (variant === 'browse') {
    return getBrowseLayout(breakpoint);
  }
  return getDetailLayout(breakpoint);
}

function getBrowseLayout(breakpoint: Breakpoint): HeaderLayout {
  switch (breakpoint) {
    case 'mobile':
      return {
        direction: 'vertical',
        showGetStarted: false,
        showSearchBar: true,
        logoIcon: 'BookOpen',
        searchBarWidth: undefined,
      };
    case 'tablet':
      return {
        direction: 'vertical',
        showGetStarted: false,
        showSearchBar: true,
        logoIcon: 'BookOpen',
        searchBarWidth: 320,
      };
    case 'web':
      return {
        direction: 'horizontal',
        showGetStarted: true,
        showSearchBar: true,
        logoIcon: 'BookOpen',
        searchBarWidth: 480,
      };
  }
}

function getDetailLayout(breakpoint: Breakpoint): HeaderLayout {
  switch (breakpoint) {
    case 'mobile':
      return {
        direction: 'horizontal',
        showGetStarted: false,
        showSearchBar: false,
        logoIcon: 'ArrowLeft',
        searchBarWidth: undefined,
      };
    case 'tablet':
      return {
        direction: 'horizontal',
        showGetStarted: false,
        showSearchBar: true,
        logoIcon: 'ArrowLeft',
        searchBarWidth: 260,
      };
    case 'web':
      return {
        direction: 'horizontal',
        showGetStarted: true,
        showSearchBar: true,
        logoIcon: 'BookOpen',
        searchBarWidth: 480,
      };
  }
}
