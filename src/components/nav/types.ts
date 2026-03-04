// Shared type definitions for navigation components.
// Used by MobileTabBar, WebSidebar, TabButton, SidebarItem, and PageContainer.

import type { Breakpoint } from '@/lib/hooks/useBreakpoint';

/** Tab destinations shown in the mobile/tablet bottom tab bar. */
export type TabDestination = 'index' | 'my-recipes' | 'scan' | 'family' | 'profile';

/** Sidebar destinations shown in the web left sidebar. */
export type SidebarDestination = 'index' | 'my-recipes' | 'collections' | 'scan' | 'family' | 'profile';

/** PageContainer layout variants controlling max-width. */
export type PageContainerVariant = 'default' | 'form' | 'content';

/** Padding values per breakpoint (from cookbook.pen / CONTEXT.md). */
export const PADDING_BY_BREAKPOINT: Record<Breakpoint, number> = {
  mobile: 20,
  tablet: 32,
  web: 40,
};

/** Max-width constraints by PageContainer variant. */
export const MAX_WIDTH_BY_VARIANT: Record<PageContainerVariant, number | undefined> = {
  default: undefined,
  form: 600,
  content: 960,
};
