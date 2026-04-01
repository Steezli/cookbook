import { displayIngredient } from '../displayIngredient';

describe('displayIngredient', () => {
  describe('legacy text (no structured amount/unit)', () => {
    it('converts imperial cups to metric grams for flour', () => {
      const result = displayIngredient(
        { text: '2 cups all-purpose flour', sort_order: 0 },
        'metric'
      );
      // flour: 125 g/cup → 2 × 125 = 250g
      expect(result).toContain('250');
      expect(result).toContain('g');
      expect(result).not.toBe('2 cups all-purpose flour');
    });

    it('converts imperial tsp to metric ml', () => {
      const result = displayIngredient(
        { text: '2 tsp vanilla extract', sort_order: 0 },
        'metric'
      );
      // vanilla extract is liquid → 2 tsp × 4.92892 ml/tsp ≈ 10 ml
      expect(result).toContain('ml');
      expect(result).not.toBe('2 tsp vanilla extract');
    });

    it('converts imperial cups to metric ml for liquid', () => {
      const result = displayIngredient(
        { text: '1 cup milk', sort_order: 0 },
        'metric'
      );
      // milk is liquid → 1 cup × 236.588 ml ≈ 237 ml
      expect(result).toContain('ml');
      expect(result).not.toBe('1 cup milk');
    });

    it('returns original text when preference matches (imperial text, imperial pref)', () => {
      const result = displayIngredient(
        { text: '2 cups all-purpose flour', sort_order: 0 },
        'imperial'
      );
      expect(result).toBe('2 cups all-purpose flour');
    });

    it('handles fractions', () => {
      const result = displayIngredient(
        { text: '3/4 cup brown sugar', sort_order: 0 },
        'metric'
      );
      // brown sugar: 220 g/cup → 0.75 × 220 = 165g
      expect(result).toContain('g');
      expect(result).not.toBe('3/4 cup brown sugar');
    });

    it('passes through unparseable text', () => {
      const result = displayIngredient(
        { text: 'salt and pepper to taste', sort_order: 0 },
        'metric'
      );
      // "to taste" is ambiguous → returns original with (approx.)
      expect(result).toContain('salt and pepper to taste');
    });
  });

  describe('structured data (amount/unit fields present)', () => {
    it('converts structured cups to grams', () => {
      const result = displayIngredient(
        {
          text: '2 cups flour',
          sort_order: 0,
          amount: 2,
          unit: 'cups',
          original_text: '2 cups flour',
          is_ambiguous: false,
        },
        'metric'
      );
      expect(result).toContain('g');
      expect(result).not.toBe('2 cups flour');
    });

    it('keeps structured imperial when preference is imperial', () => {
      const result = displayIngredient(
        {
          text: '2 cups flour',
          sort_order: 0,
          amount: 2,
          unit: 'cups',
          original_text: '2 cups flour',
          is_ambiguous: false,
        },
        'imperial'
      );
      expect(result).toBe('2 cups flour');
    });
  });
});
