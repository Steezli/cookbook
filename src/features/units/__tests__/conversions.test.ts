import {
  convertVolume,
  convertWeight,
  displayAmount,
  canConvert,
  getTargetUnit,
  formatAmount,
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
    it('rounds to whole number', () => {
      expect(formatAmount(2.10000)).toBe('2');
    });

    it('handles whole numbers', () => {
      expect(formatAmount(3.00)).toBe('3');
    });

    it('rounds up from .5', () => {
      expect(formatAmount(2.5)).toBe('3');
    });

    it('rounds down below .5', () => {
      expect(formatAmount(2.456)).toBe('2');
    });

    it('rounds small amounts', () => {
      expect(formatAmount(0.125)).toBe('0');
    });

    it('rounds metric conversions to whole numbers', () => {
      expect(formatAmount(236.588)).toBe('237');
      expect(formatAmount(473.176)).toBe('473');
    });
  });

  describe('displayAmount', () => {
    it('converts and displays cup to ml for metric preference', () => {
      const result = displayAmount(2, 'cup', 'metric', '2 cups flour');
      expect(result).toContain('473');
      expect(result).toContain('ml');
      expect(result).toContain('2 cup');
      expect(result).toContain('flour');
    });

    it('converts and displays ml to cup for imperial preference', () => {
      const result = displayAmount(500, 'ml', 'imperial', '500ml flour');
      expect(result).toContain('2');
      expect(result).toContain('cup');
      expect(result).toContain('500 ml');
      expect(result).toContain('flour');
    });

    it('returns original text for unconvertible units', () => {
      const original = 'a pinch of salt';
      const result = displayAmount(null, null, 'metric', original);
      expect(result).toBe(original);
    });

    it('shows just amount and unit when preference matches stored system', () => {
      const result = displayAmount(2, 'cup', 'imperial', '2 cups flour');
      expect(result).toBe('2 cups flour');
    });

    it('shows just amount and unit when preference matches metric stored', () => {
      const result = displayAmount(500, 'ml', 'metric', '500ml flour');
      expect(result).toBe('500ml flour');
    });
  });
});
