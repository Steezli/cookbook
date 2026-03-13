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
// Placeholder colors (no-photo states)
// ---------------------------------------------------------------------------
export const noPhotoBg = '#E8E0D8';
export const noPhotoIcon = '#8B7355';

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
export const fontFamilyDisplayBold = 'BricolageGrotesque_700Bold';

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
// Semantic state colors (error / warning feedback cards)
// ---------------------------------------------------------------------------
export const errorBg = '#FEF2F2';
export const errorBorder = '#FCA5A5';
export const errorTitle = '#991B1B';
export const errorText = '#DC2626';

export const warningBg = '#FEFCE8';
export const warningBorder = '#FDE68A';
export const warningTitle = '#92400E';
export const warningText = '#A16207';

// ---------------------------------------------------------------------------
// Accent colors — extended palette
// ---------------------------------------------------------------------------
export const accentPurple = '#7C3AED';  // Violet-600, used for share/secondary actions

// ---------------------------------------------------------------------------
// Draft-status badge colors (no exact match in primary design tokens)
// Used by DraftManager for status-specific badge coloring
// ---------------------------------------------------------------------------
export const statusReadyBg = '#DCFCE7';      // Green-100
export const statusReadyText = '#166534';     // Green-800
export const statusReviewBg = '#DBEAFE';      // Blue-100
export const statusReviewText = '#1E40AF';    // Blue-800
export const statusEnhancedBg = '#F3E8FF';    // Purple-100
export const statusEnhancedText = '#6B21A8';  // Purple-800

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
