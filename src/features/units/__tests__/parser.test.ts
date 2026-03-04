import { parseIngredient } from '../parser';

describe('Ingredient Parser', () => {
  describe('Basic parsing', () => {
    it('parses standard format with amount, unit, and ingredient', () => {
      const result = parseIngredient('2 cups flour');
      expect(result).toEqual({
        amount: 2,
        amountDisplay: '2',
        unit: 'cups',
        ingredient: 'flour',
        original: '2 cups flour',
        isAmbiguous: false,
      });
    });

    it('parses decimal amounts', () => {
      const result = parseIngredient('1.5 tbsp butter');
      expect(result).toEqual({
        amount: 1.5,
        amountDisplay: '1.5',
        unit: 'tbsp',
        ingredient: 'butter',
        original: '1.5 tbsp butter',
        isAmbiguous: false,
      });
    });

    it('parses ingredient with no unit (count)', () => {
      const result = parseIngredient('3 eggs');
      expect(result).toEqual({
        amount: 3,
        amountDisplay: '3',
        unit: null,
        ingredient: 'eggs',
        original: '3 eggs',
        isAmbiguous: false,
      });
    });

    it('parses ingredient with no amount', () => {
      const result = parseIngredient('flour');
      expect(result).toEqual({
        amount: null,
        amountDisplay: null,
        unit: null,
        ingredient: 'flour',
        original: 'flour',
        isAmbiguous: false,
      });
    });
  });

  describe('Fraction parsing', () => {
    it('parses slash fractions', () => {
      const result = parseIngredient('1/2 tsp salt');
      expect(result).toEqual({
        amount: 0.5,
        amountDisplay: '1/2',
        unit: 'tsp',
        ingredient: 'salt',
        original: '1/2 tsp salt',
        isAmbiguous: false,
      });
    });

    it('parses mixed numbers with slash fractions', () => {
      const result = parseIngredient('1 1/2 tbsp butter');
      expect(result).toEqual({
        amount: 1.5,
        amountDisplay: '1 1/2',
        unit: 'tbsp',
        ingredient: 'butter',
        original: '1 1/2 tbsp butter',
        isAmbiguous: false,
      });
    });

    it('parses Unicode fractions', () => {
      const result = parseIngredient('½ cup sugar');
      expect(result).toEqual({
        amount: 0.5,
        amountDisplay: '½',
        unit: 'cup',
        ingredient: 'sugar',
        original: '½ cup sugar',
        isAmbiguous: false,
      });
    });

    it('parses whole number plus Unicode fraction', () => {
      const result = parseIngredient('1½ cups milk');
      expect(result).toEqual({
        amount: 1.5,
        amountDisplay: '1½',
        unit: 'cups',
        ingredient: 'milk',
        original: '1½ cups milk',
        isAmbiguous: false,
      });
    });

    it('parses ¼ Unicode fraction', () => {
      const result = parseIngredient('¼ tsp pepper');
      expect(result.amount).toBeCloseTo(0.25, 2);
      expect(result.unit).toBe('tsp');
      expect(result.ingredient).toBe('pepper');
    });

    it('parses ¾ Unicode fraction', () => {
      const result = parseIngredient('¾ cup water');
      expect(result.amount).toBeCloseTo(0.75, 2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('water');
    });

    it('parses ⅓ Unicode fraction', () => {
      const result = parseIngredient('⅓ cup oil');
      expect(result.amount).toBeCloseTo(0.333, 2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('oil');
    });

    it('parses ⅔ Unicode fraction', () => {
      const result = parseIngredient('⅔ cup milk');
      expect(result.amount).toBeCloseTo(0.667, 2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('milk');
    });
  });

  describe('Unit variations', () => {
    it('recognizes tablespoon variants', () => {
      expect(parseIngredient('1 tablespoon butter').unit).toBe('tablespoon');
      expect(parseIngredient('2 tablespoons butter').unit).toBe('tablespoons');
    });

    it('recognizes teaspoon variants', () => {
      expect(parseIngredient('1 teaspoon salt').unit).toBe('teaspoon');
      expect(parseIngredient('2 teaspoons salt').unit).toBe('teaspoons');
    });

    it('recognizes ounce variants', () => {
      expect(parseIngredient('8 oz water').unit).toBe('oz');
      expect(parseIngredient('8 ounces water').unit).toBe('ounces');
    });

    it('recognizes gram variants', () => {
      expect(parseIngredient('100 g flour').unit).toBe('g');
      expect(parseIngredient('100 grams flour').unit).toBe('grams');
    });

    it('recognizes kilogram variants', () => {
      expect(parseIngredient('1 kg sugar').unit).toBe('kg');
    });

    it('recognizes liter variants', () => {
      expect(parseIngredient('1 l water').unit).toBe('l');
      expect(parseIngredient('1 liter water').unit).toBe('liter');
      expect(parseIngredient('2 liters water').unit).toBe('liters');
    });

    it('recognizes pound variants', () => {
      expect(parseIngredient('1 lb beef').unit).toBe('lb');
      expect(parseIngredient('2 pounds beef').unit).toBe('pounds');
    });
  });

  describe('Ambiguous terms', () => {
    it('marks pinch as ambiguous', () => {
      const result = parseIngredient('a pinch of salt');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ingredient).toBe('a pinch of salt');
    });

    it('marks dash as ambiguous', () => {
      const result = parseIngredient('a dash of pepper');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks handful as ambiguous', () => {
      const result = parseIngredient('handful of herbs');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ingredient).toBe('handful of herbs');
    });

    it('marks bunch as ambiguous', () => {
      const result = parseIngredient('a bunch of parsley');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks sprig as ambiguous', () => {
      const result = parseIngredient('a sprig of rosemary');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks "to taste" as ambiguous', () => {
      const result = parseIngredient('salt to taste');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks dollop as ambiguous', () => {
      const result = parseIngredient('a dollop of cream');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks smidgen as ambiguous', () => {
      const result = parseIngredient('a smidgen of cayenne');
      expect(result.isAmbiguous).toBe(true);
    });

    it('marks sprinkle as ambiguous', () => {
      const result = parseIngredient('a sprinkle of cinnamon');
      expect(result.isAmbiguous).toBe(true);
    });
  });

  describe('Compound ingredients', () => {
    it('parses metric units without space', () => {
      const result = parseIngredient('250g chicken breast');
      expect(result.amount).toBe(250);
      expect(result.unit).toBe('g');
      expect(result.ingredient).toBe('chicken breast');
    });

    it('parses ml without space', () => {
      const result = parseIngredient('500ml water');
      expect(result.amount).toBe(500);
      expect(result.unit).toBe('ml');
      expect(result.ingredient).toBe('water');
    });

    it('handles multi-word ingredients', () => {
      const result = parseIngredient('1 cup all-purpose flour');
      expect(result.ingredient).toBe('all-purpose flour');
    });

    it('handles ingredients with commas', () => {
      const result = parseIngredient('2 cups tomatoes, diced');
      expect(result.ingredient).toBe('tomatoes, diced');
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = parseIngredient('');
      expect(result.ingredient).toBe('');
      expect(result.amount).toBeNull();
      expect(result.unit).toBeNull();
    });

    it('handles whitespace-only string', () => {
      const result = parseIngredient('   ');
      expect(result.ingredient).toBe('');
    });

    it('handles very large numbers', () => {
      const result = parseIngredient('1000 g flour');
      expect(result.amount).toBe(1000);
    });

    it('handles very small decimals', () => {
      const result = parseIngredient('0.125 tsp vanilla');
      expect(result.amount).toBe(0.125);
    });
  });
});
