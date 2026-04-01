import {
  convertVolume,
  convertWeight,
  displayAmount,
  canConvert,
  getTargetUnit,
  formatAmount,
  isLiquidIngredient,
} from '../conversions';

describe('Unit Conversions', () => {
  describe('convertVolume', () => {
    it('converts US cups to ml', () => {
      expect(convertVolume(1, 'cup', 'ml')).toBeCloseTo(236.588, 2);
    });

    it('converts ml to US cups', () => {
      expect(convertVolume(500, 'ml', 'cup')).toBeCloseTo(2.113, 2);
    });

    it('converts tablespoons to ml', () => {
      expect(convertVolume(1, 'tbsp', 'ml')).toBeCloseTo(14.787, 2);
    });

    it('converts teaspoons to ml', () => {
      expect(convertVolume(1, 'tsp', 'ml')).toBeCloseTo(4.929, 2);
    });

    it('converts fl oz to ml', () => {
      expect(convertVolume(1, 'fl oz', 'ml')).toBeCloseTo(29.574, 2);
    });

    it('converts pint to ml', () => {
      expect(convertVolume(1, 'pint', 'ml')).toBeCloseTo(473.176, 2);
    });

    it('converts quart to ml', () => {
      expect(convertVolume(1, 'quart', 'ml')).toBeCloseTo(946.353, 2);
    });

    it('converts gallon to ml', () => {
      expect(convertVolume(1, 'gallon', 'ml')).toBeCloseTo(3785.412, 2);
    });

    it('converts liters to ml', () => {
      expect(convertVolume(1, 'l', 'ml')).toBe(1000);
    });

    it('returns original amount for unknown target unit', () => {
      expect(convertVolume(1, 'cup', 'pinch')).toBe(1);
    });
  });

  describe('convertWeight', () => {
    it('converts pounds to grams', () => {
      expect(convertWeight(1, 'lb', 'g')).toBeCloseTo(453.592, 2);
    });

    it('converts grams to ounces', () => {
      expect(convertWeight(100, 'g', 'oz')).toBeCloseTo(3.527, 2);
    });

    it('converts ounces to grams', () => {
      expect(convertWeight(1, 'oz', 'g')).toBeCloseTo(28.350, 2);
    });

    it('converts kilograms to grams', () => {
      expect(convertWeight(1, 'kg', 'g')).toBe(1000);
    });

    it('converts pounds to ounces', () => {
      expect(convertWeight(1, 'lb', 'oz')).toBe(16);
    });

    it('returns original amount for unknown target unit', () => {
      expect(convertWeight(1, 'lb', 'pinch')).toBe(1);
    });
  });

  describe('canConvert', () => {
    it('returns true for convertible volume units', () => {
      expect(canConvert('cup')).toBe(true);
      expect(canConvert('ml')).toBe(true);
      expect(canConvert('tbsp')).toBe(true);
      expect(canConvert('tsp')).toBe(true);
    });

    it('returns true for convertible weight units', () => {
      expect(canConvert('g')).toBe(true);
      expect(canConvert('oz')).toBe(true);
      expect(canConvert('lb')).toBe(true);
      expect(canConvert('kg')).toBe(true);
    });

    it('returns false for non-convertible units', () => {
      expect(canConvert('pinch')).toBe(false);
      expect(canConvert('dash')).toBe(false);
      expect(canConvert('handful')).toBe(false);
    });
  });

  describe('getTargetUnit', () => {
    it('returns ml for cup when preference is metric', () => {
      expect(getTargetUnit('cup', 'metric')).toBe('ml');
    });

    it('returns cup for ml when preference is imperial', () => {
      expect(getTargetUnit('ml', 'imperial')).toBe('cup');
    });

    it('returns oz for g when preference is imperial', () => {
      expect(getTargetUnit('g', 'imperial')).toBe('oz');
    });

    it('returns g for oz when preference is metric', () => {
      expect(getTargetUnit('oz', 'metric')).toBe('g');
    });
  });

  describe('formatAmount', () => {
    it('formats whole numbers', () => {
      expect(formatAmount(3)).toBe('3');
      expect(formatAmount(3.00)).toBe('3');
      expect(formatAmount(2.02)).toBe('2');
    });

    it('rounds to whole number by default (metric style)', () => {
      expect(formatAmount(2.5)).toBe('3');
      expect(formatAmount(2.456)).toBe('2');
      expect(formatAmount(236.588)).toBe('237');
      expect(formatAmount(473.176)).toBe('473');
    });

    it('uses vulgar fractions when useFractions is true (imperial style)', () => {
      expect(formatAmount(0.5, true)).toBe('½');
      expect(formatAmount(0.25, true)).toBe('¼');
      expect(formatAmount(0.75, true)).toBe('¾');
      expect(formatAmount(0.333, true)).toBe('⅓');
      expect(formatAmount(0.667, true)).toBe('⅔');
    });

    it('formats mixed numbers with fractions (imperial style)', () => {
      expect(formatAmount(2.5, true)).toBe('2 ½');
      expect(formatAmount(1.25, true)).toBe('1 ¼');
      expect(formatAmount(1.75, true)).toBe('1 ¾');
      expect(formatAmount(2.333, true)).toBe('2 ⅓');
    });

    it('falls back to rounding when fraction is unrecognizable', () => {
      expect(formatAmount(2.456, true)).toBe('2');
      expect(formatAmount(3.17, true)).toBe('3');
    });
  });

  describe('isLiquidIngredient', () => {
    it('identifies water as liquid', () => {
      expect(isLiquidIngredient('water')).toBe(true);
    });

    it('identifies milk as liquid', () => {
      expect(isLiquidIngredient('milk')).toBe(true);
    });

    it('identifies olive oil as liquid', () => {
      expect(isLiquidIngredient('olive oil')).toBe(true);
    });

    it('identifies chicken broth as liquid', () => {
      expect(isLiquidIngredient('chicken broth')).toBe(true);
    });

    it('identifies honey as liquid', () => {
      expect(isLiquidIngredient('honey')).toBe(true);
    });

    it('identifies vanilla extract as liquid', () => {
      expect(isLiquidIngredient('vanilla extract')).toBe(true);
    });

    it('identifies soy sauce as liquid', () => {
      expect(isLiquidIngredient('soy sauce')).toBe(true);
    });

    it('does not identify flour as liquid', () => {
      expect(isLiquidIngredient('all-purpose flour')).toBe(false);
    });

    it('does not identify sugar as liquid', () => {
      expect(isLiquidIngredient('granulated sugar')).toBe(false);
    });

    it('does not identify salt as liquid', () => {
      expect(isLiquidIngredient('salt')).toBe(false);
    });

    it('does not identify butter as liquid', () => {
      expect(isLiquidIngredient('butter')).toBe(false);
    });

    it('handles empty string', () => {
      expect(isLiquidIngredient('')).toBe(false);
    });

    it('handles case insensitivity', () => {
      expect(isLiquidIngredient('Whole Milk')).toBe(true);
    });
  });

  describe('displayAmount', () => {
    it('converts and displays cup to ml for metric preference (liquid)', () => {
      const result = displayAmount(1, 'cup', 'metric', '1 cup milk', 'milk');
      // 1 cup = 236.588 ml → rounds to "237ml milk"
      expect(result).toContain('237');
      expect(result).toContain('ml');
      expect(result).toContain('milk');
    });

    it('converts dry ingredient cups to grams for metric preference', () => {
      const result = displayAmount(2, 'cup', 'metric', '2 cups all-purpose flour', 'all-purpose flour');
      expect(result).toContain('250');
      expect(result).toContain('g');
      expect(result).toContain('flour');
    });

    it('converts sugar cups to grams for metric preference', () => {
      const result = displayAmount(1, 'cup', 'metric', '1 cup sugar', 'sugar');
      expect(result).toContain('200');
      expect(result).toContain('g');
    });

    it('converts butter cups to grams for metric preference', () => {
      const result = displayAmount(1, 'cup', 'metric', '1 cup butter', 'butter');
      expect(result).toContain('227');
      expect(result).toContain('g');
    });

    it('falls back to grams with generic density for unknown dry ingredient', () => {
      const result = displayAmount(1, 'cup', 'metric', '1 cup mystery ingredient', 'mystery ingredient');
      expect(result).toContain('g');
      expect(result).toContain('mystery ingredient');
    });

    it('converts ml to cup for imperial preference', () => {
      const result = displayAmount(500, 'ml', 'imperial', '500ml flour');
      expect(result).toContain('2');
      expect(result).toContain('cups');
      expect(result).toContain('flour');
      // Should NOT contain original measurement in parentheses
      expect(result).not.toContain('(');
    });

    it('returns original text for unconvertible units', () => {
      const original = 'a pinch of salt';
      const result = displayAmount(null, null, 'metric', original);
      expect(result).toBe(original);
    });

    it('standardizes display when preference matches stored system', () => {
      const result = displayAmount(2, 'cup', 'imperial', '2 cups flour');
      expect(result).toBe('2 cups flour');
    });

    it('standardizes metric display when preference matches', () => {
      const result = displayAmount(500, 'ml', 'metric', '500ml flour');
      expect(result).toBe('500ml flour');
    });

    it('converts oz to g for metric preference', () => {
      const result = displayAmount(8, 'oz', 'metric', '8 oz cheese');
      // 8 oz = 226.796g → rounds to "227g cheese"
      expect(result).toContain('227');
      expect(result).toContain('g');
    });

    it('converts grams to cups for dry ingredients in imperial mode', () => {
      const result = displayAmount(250, 'g', 'imperial', '250g flour', 'flour');
      expect(result).toContain('cups');
    });

    it('backward compatible — works without ingredientName param', () => {
      const result = displayAmount(2, 'cup', 'metric', '2 cups flour');
      // Should still produce a valid conversion (either g or ml based on text extraction)
      expect(result).not.toBe('2 cups flour');
      expect(result).toContain('flour');
    });
  });
});
