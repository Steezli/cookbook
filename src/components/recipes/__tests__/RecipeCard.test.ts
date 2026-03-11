import {
  formatMetadataLine,
  getNumColumns,
  getVisibilityColor,
} from '@/components/recipes/recipeCardUtils';
import { accentBlue, accentGreen, accentWarm } from '@/lib/tokens';

describe('formatMetadataLine', () => {
  it('returns "" when no time and no servings', () => {
    expect(formatMetadataLine(0, 0, null)).toBe('');
  });

  it('returns "30 min" when combined time is 30 and no servings', () => {
    expect(formatMetadataLine(10, 20, null)).toBe('30 min');
  });

  it('returns "4 servings" when no time and has servings', () => {
    expect(formatMetadataLine(0, 0, 4)).toBe('4 servings');
  });

  it('returns "45 min . 6 servings" when both time and servings are present', () => {
    expect(formatMetadataLine(15, 30, 6)).toBe('45 min . 6 servings');
  });

  it('returns "" when all values are null', () => {
    expect(formatMetadataLine(null, null, null)).toBe('');
  });

  it('returns "10 min" when only prep time is provided', () => {
    expect(formatMetadataLine(10, 0, null)).toBe('10 min');
  });

  it('returns "20 min" when only cook time is provided', () => {
    expect(formatMetadataLine(0, 20, null)).toBe('20 min');
  });

  it('handles undefined values the same as null', () => {
    expect(formatMetadataLine(undefined, undefined, undefined)).toBe('');
  });
});

describe('getNumColumns', () => {
  it('returns 1 for mobile breakpoint', () => {
    expect(getNumColumns('mobile')).toBe(1);
  });

  it('returns 2 for tablet breakpoint', () => {
    expect(getNumColumns('tablet')).toBe(2);
  });

  it('returns 3 for web breakpoint', () => {
    expect(getNumColumns('web')).toBe(3);
  });
});

describe('getVisibilityColor', () => {
  it('returns accentWarm for private visibility', () => {
    expect(getVisibilityColor('private')).toBe(accentWarm);
  });

  it('returns accentBlue for family visibility', () => {
    expect(getVisibilityColor('family')).toBe(accentBlue);
  });

  it('returns accentGreen for public visibility', () => {
    expect(getVisibilityColor('public')).toBe(accentGreen);
  });
});
