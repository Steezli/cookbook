import {
  // 24 cookbook.pen $ variables
  accentBlue,
  accentCoral,
  accentGreen,
  accentWarm,
  accentYellow,
  badgeCoralBg,
  badgeGreenBg,
  badgeYellowBg,
  bgCard,
  bgCardWarm,
  bgPage,
  borderDefault,
  borderSubtle,
  fontBody,
  fontDisplay,
  radiusLg,
  radiusMd,
  radiusPill,
  radiusSm,
  textDisabled,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
  // Font family RN string constants
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  // Font size scale
  fontSizeXs,
  fontSizeSm,
  fontSizeBase,
  fontSizeLg,
  fontSizeXl,
  fontSize2xl,
  fontSize3xl,
  // Shadow tokens
  shadowSm,
  shadowMd,
  shadowLg,
} from '@/lib/tokens';

describe('tokens.ts — 24 cookbook.pen $ variables', () => {
  describe('accent colors', () => {
    it('accentBlue is a hex string', () => {
      expect(typeof accentBlue).toBe('string');
      expect(accentBlue).toMatch(/^#/);
      expect(accentBlue).toBe('#007AFF');
    });

    it('accentCoral is a hex string', () => {
      expect(typeof accentCoral).toBe('string');
      expect(accentCoral).toMatch(/^#/);
      expect(accentCoral).toBe('#FF6B6B');
    });

    it('accentGreen is a hex string', () => {
      expect(typeof accentGreen).toBe('string');
      expect(accentGreen).toMatch(/^#/);
      expect(accentGreen).toBe('#22C55E');
    });

    it('accentWarm is a hex string', () => {
      expect(typeof accentWarm).toBe('string');
      expect(accentWarm).toMatch(/^#/);
      expect(accentWarm).toBe('#E8784E');
    });

    it('accentYellow is a hex string', () => {
      expect(typeof accentYellow).toBe('string');
      expect(accentYellow).toMatch(/^#/);
      expect(accentYellow).toBe('#FCD34D');
    });
  });

  describe('badge colors', () => {
    it('badgeCoralBg is a hex string', () => {
      expect(typeof badgeCoralBg).toBe('string');
      expect(badgeCoralBg).toMatch(/^#/);
      expect(badgeCoralBg).toBe('#FFF1F0');
    });

    it('badgeGreenBg is a hex string', () => {
      expect(typeof badgeGreenBg).toBe('string');
      expect(badgeGreenBg).toMatch(/^#/);
      expect(badgeGreenBg).toBe('#F0FDF4');
    });

    it('badgeYellowBg is a hex string', () => {
      expect(typeof badgeYellowBg).toBe('string');
      expect(badgeYellowBg).toMatch(/^#/);
      expect(badgeYellowBg).toBe('#FFFBEB');
    });
  });

  describe('background colors', () => {
    it('bgCard is a hex string', () => {
      expect(typeof bgCard).toBe('string');
      expect(bgCard).toMatch(/^#/);
      expect(bgCard).toBe('#F6F7F8');
    });

    it('bgCardWarm is a hex string', () => {
      expect(typeof bgCardWarm).toBe('string');
      expect(bgCardWarm).toMatch(/^#/);
      expect(bgCardWarm).toBe('#FFFBF5');
    });

    it('bgPage is a hex string', () => {
      expect(typeof bgPage).toBe('string');
      expect(bgPage).toMatch(/^#/);
      expect(bgPage).toBe('#FFFFFF');
    });
  });

  describe('border colors', () => {
    it('borderDefault is a hex string', () => {
      expect(typeof borderDefault).toBe('string');
      expect(borderDefault).toMatch(/^#/);
      expect(borderDefault).toBe('#E5E7EB');
    });

    it('borderSubtle is a hex string', () => {
      expect(typeof borderSubtle).toBe('string');
      expect(borderSubtle).toMatch(/^#/);
      expect(borderSubtle).toBe('#F3F4F6');
    });
  });

  describe('font references', () => {
    it('fontBody is a non-empty string', () => {
      expect(typeof fontBody).toBe('string');
      expect(fontBody.length).toBeGreaterThan(0);
      expect(fontBody).toBe('DM Sans');
    });

    it('fontDisplay is a non-empty string', () => {
      expect(typeof fontDisplay).toBe('string');
      expect(fontDisplay.length).toBeGreaterThan(0);
      expect(fontDisplay).toBe('Bricolage Grotesque');
    });
  });

  describe('radius tokens', () => {
    it('radiusLg is a number', () => {
      expect(typeof radiusLg).toBe('number');
      expect(radiusLg).toBe(20);
    });

    it('radiusMd is a number', () => {
      expect(typeof radiusMd).toBe('number');
      expect(radiusMd).toBe(16);
    });

    it('radiusPill is a number', () => {
      expect(typeof radiusPill).toBe('number');
      expect(radiusPill).toBe(100);
    });

    it('radiusSm is a number', () => {
      expect(typeof radiusSm).toBe('number');
      expect(radiusSm).toBe(12);
    });
  });

  describe('text colors', () => {
    it('textDisabled is a hex string', () => {
      expect(typeof textDisabled).toBe('string');
      expect(textDisabled).toMatch(/^#/);
      expect(textDisabled).toBe('#D1D5DB');
    });

    it('textPrimary is a hex string', () => {
      expect(typeof textPrimary).toBe('string');
      expect(textPrimary).toMatch(/^#/);
      expect(textPrimary).toBe('#1A1A1A');
    });

    it('textSecondary is a hex string', () => {
      expect(typeof textSecondary).toBe('string');
      expect(textSecondary).toMatch(/^#/);
      expect(textSecondary).toBe('#6B7280');
    });

    it('textTertiary is a hex string', () => {
      expect(typeof textTertiary).toBe('string');
      expect(textTertiary).toMatch(/^#/);
      expect(textTertiary).toBe('#9CA3AF');
    });

    it('white is a hex string', () => {
      expect(typeof white).toBe('string');
      expect(white).toMatch(/^#/);
      expect(white).toBe('#FFFFFF');
    });
  });
});

describe('tokens.ts — font family RN string constants', () => {
  it('fontFamilyDisplay is BricolageGrotesque_600SemiBold', () => {
    expect(fontFamilyDisplay).toBe('BricolageGrotesque_600SemiBold');
  });

  it('fontFamilyBody is DMSans_400Regular', () => {
    expect(fontFamilyBody).toBe('DMSans_400Regular');
  });

  it('fontFamilyBodyMedium is DMSans_500Medium', () => {
    expect(fontFamilyBodyMedium).toBe('DMSans_500Medium');
  });

  it('fontFamilyBodyBold is DMSans_700Bold', () => {
    expect(fontFamilyBodyBold).toBe('DMSans_700Bold');
  });
});

describe('tokens.ts — font size scale', () => {
  it('fontSizeXs is 12', () => {
    expect(fontSizeXs).toBe(12);
  });

  it('fontSizeSm is 14', () => {
    expect(fontSizeSm).toBe(14);
  });

  it('fontSizeBase is 16', () => {
    expect(fontSizeBase).toBe(16);
  });

  it('fontSizeLg is 18', () => {
    expect(fontSizeLg).toBe(18);
  });

  it('fontSizeXl is 20', () => {
    expect(fontSizeXl).toBe(20);
  });

  it('fontSize2xl is 24', () => {
    expect(fontSize2xl).toBe(24);
  });

  it('fontSize3xl is 30', () => {
    expect(fontSize3xl).toBe(30);
  });

  it('has exactly 7 font size entries', () => {
    const fontSizes = [fontSizeXs, fontSizeSm, fontSizeBase, fontSizeLg, fontSizeXl, fontSize2xl, fontSize3xl];
    expect(fontSizes).toHaveLength(7);
  });
});

describe('tokens.ts — shadow tokens', () => {
  const shadowKeys = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation'];

  it('shadowSm has all required RN shadow properties', () => {
    for (const key of shadowKeys) {
      expect(shadowSm).toHaveProperty(key);
    }
  });

  it('shadowSm.shadowOffset has width and height', () => {
    expect(shadowSm.shadowOffset).toHaveProperty('width');
    expect(shadowSm.shadowOffset).toHaveProperty('height');
  });

  it('shadowMd has all required RN shadow properties', () => {
    for (const key of shadowKeys) {
      expect(shadowMd).toHaveProperty(key);
    }
  });

  it('shadowMd.shadowOffset has width and height', () => {
    expect(shadowMd.shadowOffset).toHaveProperty('width');
    expect(shadowMd.shadowOffset).toHaveProperty('height');
  });

  it('shadowLg has all required RN shadow properties', () => {
    for (const key of shadowKeys) {
      expect(shadowLg).toHaveProperty(key);
    }
  });

  it('shadowLg.shadowOffset has width and height', () => {
    expect(shadowLg.shadowOffset).toHaveProperty('width');
    expect(shadowLg.shadowOffset).toHaveProperty('height');
  });

  it('shadows have increasing elevation: sm < md < lg', () => {
    expect(shadowSm.elevation).toBeLessThan(shadowMd.elevation);
    expect(shadowMd.elevation).toBeLessThan(shadowLg.elevation);
  });
});

describe('tokens.ts — color uniqueness', () => {
  it('accent colors are distinct from each other', () => {
    const accents = [accentBlue, accentCoral, accentGreen, accentWarm, accentYellow];
    const unique = new Set(accents);
    expect(unique.size).toBe(accents.length);
  });

  it('text colors are distinct from each other', () => {
    const textColors = [textPrimary, textSecondary, textTertiary, textDisabled];
    const unique = new Set(textColors);
    expect(unique.size).toBe(textColors.length);
  });

  it('background colors are distinct from each other', () => {
    const bgColors = [bgCard, bgCardWarm];
    const unique = new Set(bgColors);
    expect(unique.size).toBe(bgColors.length);
  });
});
