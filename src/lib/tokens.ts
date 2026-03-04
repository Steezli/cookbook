// Design tokens extracted from cookbook.pen $ variables.
// Source: cookbook.pen variables section (all 24 $ entries).
// Naming: flat-with-category-prefix for ergonomic use in StyleSheet.create.

// ---------------------------------------------------------------------------
// Accent colors
// ---------------------------------------------------------------------------
export const accentBlue = '#007AFF';
export const accentCoral = '#FF6B6B';
export const accentGreen = '#22C55E';
export const accentWarm = '#E8784E';
export const accentYellow = '#FCD34D';

// ---------------------------------------------------------------------------
// Badge background colors
// ---------------------------------------------------------------------------
export const badgeCoralBg = '#FFF1F0';
export const badgeGreenBg = '#F0FDF4';
export const badgeYellowBg = '#FFFBEB';

// ---------------------------------------------------------------------------
// Background colors
// ---------------------------------------------------------------------------
export const bgCard = '#F6F7F8';
export const bgCardWarm = '#FFFBF5';
export const bgPage = '#FFFFFF';

// ---------------------------------------------------------------------------
// Border colors
// ---------------------------------------------------------------------------
export const borderDefault = '#E5E7EB';
export const borderSubtle = '#F3F4F6';

// ---------------------------------------------------------------------------
// Font references (raw design names from cookbook.pen)
// ---------------------------------------------------------------------------
export const fontBody = 'DM Sans';
export const fontDisplay = 'Bricolage Grotesque';

// ---------------------------------------------------------------------------
// Border radii (from cookbook.pen $ variables)
// ---------------------------------------------------------------------------
export const radiusSm = 12;
export const radiusMd = 16;
export const radiusLg = 20;
export const radiusPill = 100;

// ---------------------------------------------------------------------------
// Text colors
// ---------------------------------------------------------------------------
export const textDisabled = '#D1D5DB';
export const textPrimary = '#1A1A1A';
export const textSecondary = '#6B7280';
export const textTertiary = '#9CA3AF';
export const white = '#FFFFFF';

// ---------------------------------------------------------------------------
// Font family constants for React Native fontFamily strings.
// These strings must match the keys passed to useFonts() in _layout.tsx.
// ---------------------------------------------------------------------------
export const fontFamilyDisplay = 'BricolageGrotesque_600SemiBold';
export const fontFamilyBody = 'DMSans_400Regular';
export const fontFamilyBodyMedium = 'DMSans_500Medium';
export const fontFamilyBodyBold = 'DMSans_700Bold';

// ---------------------------------------------------------------------------
// Font size scale (derived from cookbook.pen screen analysis)
// ---------------------------------------------------------------------------
export const fontSizeXs = 12;
export const fontSizeSm = 14;
export const fontSizeBase = 16;
export const fontSizeLg = 18;
export const fontSizeXl = 20;
export const fontSize2xl = 24;
export const fontSize3xl = 30;

// ---------------------------------------------------------------------------
// Shadow tokens — spread into style objects (do not use in StyleSheet.create
// if shadow values are breakpoint-dependent, but these are fixed constants).
//
// Usage: <View style={{ ...shadowMd, backgroundColor: bgCard }} />
// ---------------------------------------------------------------------------
export const shadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
} as const;

export const shadowMd = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.10,
  shadowRadius: 4,
  elevation: 4,
} as const;

export const shadowLg = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 8,
} as const;
