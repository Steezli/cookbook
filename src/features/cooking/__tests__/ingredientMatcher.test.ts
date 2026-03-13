import {
  extractStepIngredients,
  highlightStepIngredients,
  TextSegment,
} from '../ingredientMatcher';
import type { RecipeIngredient } from '@/features/recipes/types';

function makeIngredient(text: string, sortOrder = 0): RecipeIngredient {
  return { text, sort_order: sortOrder };
}

function makeIngredientWithOriginal(
  text: string,
  originalText: string,
  sortOrder = 0
): RecipeIngredient {
  return { text, sort_order: sortOrder, original_text: originalText };
}

describe('extractStepIngredients', () => {
  const ingredients: RecipeIngredient[] = [
    makeIngredient('6 large Granny Smith apples'),
    makeIngredient('1 tsp ground cinnamon'),
    makeIngredient('2 cups all-purpose flour'),
    makeIngredient('1 cup butter, melted'),
    makeIngredient('1/2 cup sugar'),
    makeIngredient('3 eggs'),
    makeIngredient('1 cup milk'),
    makeIngredient('a pinch of salt'),
  ];

  it('matches a single ingredient by name', () => {
    const result = extractStepIngredients(
      'Peel and slice the apples into thin wedges.',
      ingredients
    );
    expect(result).toContain(0); // apples
  });

  it('matches multiple ingredients in one step', () => {
    const result = extractStepIngredients(
      'Mix the flour, sugar, and cinnamon together in a bowl.',
      ingredients
    );
    expect(result).toContain(1); // cinnamon
    expect(result).toContain(2); // flour
    expect(result).toContain(4); // sugar
  });

  it('matches butter even with preparation notes in ingredient', () => {
    const result = extractStepIngredients(
      'Pour the melted butter over the mixture.',
      ingredients
    );
    expect(result).toContain(3); // butter
  });

  it('matches eggs', () => {
    const result = extractStepIngredients(
      'Beat the eggs until fluffy.',
      ingredients
    );
    expect(result).toContain(5); // eggs
  });

  it('matches milk', () => {
    const result = extractStepIngredients(
      'Slowly add the milk while stirring.',
      ingredients
    );
    expect(result).toContain(6); // milk
  });

  it('matches salt', () => {
    const result = extractStepIngredients(
      'Add a pinch of salt to taste.',
      ingredients
    );
    expect(result).toContain(7); // salt
  });

  it('returns empty array when no ingredients match', () => {
    const result = extractStepIngredients(
      'Preheat oven to 350°F.',
      ingredients
    );
    expect(result).toEqual([]);
  });

  it('returns empty array for empty step text', () => {
    expect(extractStepIngredients('', ingredients)).toEqual([]);
  });

  it('returns empty array for empty ingredients', () => {
    expect(extractStepIngredients('Mix the flour.', [])).toEqual([]);
  });

  it('handles case insensitivity', () => {
    const result = extractStepIngredients(
      'FOLD IN THE FLOUR AND SUGAR.',
      ingredients
    );
    expect(result).toContain(2); // flour
    expect(result).toContain(4); // sugar
  });

  it('does not match substring of unrelated word (flour vs cauliflower)', () => {
    const result = extractStepIngredients(
      'Serve the cauliflower on the side.',
      ingredients
    );
    expect(result).not.toContain(2); // flour should NOT match
  });

  it('handles ingredient with original_text field', () => {
    const ings = [
      makeIngredientWithOriginal('all-purpose flour', '2 cups all-purpose flour'),
    ];
    const result = extractStepIngredients(
      'Sift the flour into the bowl.',
      ings
    );
    expect(result).toContain(0);
  });

  it('matches plural ingredient in singular step text', () => {
    const ings = [makeIngredient('3 eggs')];
    const result = extractStepIngredients(
      'Crack each egg into the bowl.',
      ings
    );
    expect(result).toContain(0);
  });

  it('matches singular ingredient in plural step text', () => {
    const ings = [makeIngredient('1 egg')];
    const result = extractStepIngredients(
      'Add the eggs and whisk.',
      ings
    );
    // "egg" should match "eggs" in step via depluralization of step text tokens
    // Actually our matcher checks if ingredient tokens appear in step text
    // "egg" has word boundary match against "eggs"? No - "egg" != "eggs"
    // But depluralize("eggs") = "egg" and we check that too
    expect(result).toContain(0);
  });
});

describe('highlightStepIngredients', () => {
  it('returns single unhighlighted segment when no ingredients match', () => {
    const result = highlightStepIngredients(
      'Preheat oven to 350°F.',
      []
    );
    expect(result).toEqual([{ text: 'Preheat oven to 350°F.', highlighted: false }]);
  });

  it('highlights a single ingredient in step text', () => {
    const ingredients = [makeIngredient('2 cups flour')];
    const result = highlightStepIngredients(
      'Sift the flour into a bowl.',
      ingredients
    );

    const highlighted = result.filter(s => s.highlighted);
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.some(s => s.text.toLowerCase().includes('flour'))).toBe(true);
  });

  it('highlights multiple ingredients in step text', () => {
    const ingredients = [
      makeIngredient('2 cups flour'),
      makeIngredient('1 cup sugar'),
    ];
    const result = highlightStepIngredients(
      'Mix the flour and sugar together.',
      ingredients
    );

    const highlighted = result.filter(s => s.highlighted);
    expect(highlighted.length).toBe(2);
    expect(highlighted[0].text.toLowerCase()).toBe('flour');
    expect(highlighted[1].text.toLowerCase()).toBe('sugar');
  });

  it('preserves original text casing in segments', () => {
    const ingredients = [makeIngredient('1 cup Flour')];
    const result = highlightStepIngredients(
      'Add the Flour slowly.',
      ingredients
    );

    const highlighted = result.filter(s => s.highlighted);
    expect(highlighted[0].text).toBe('Flour'); // original casing preserved
  });

  it('returns original text as single segment when no ingredients provided', () => {
    const result = highlightStepIngredients(
      'Stir well.',
      []
    );
    expect(result).toEqual([{ text: 'Stir well.', highlighted: false }]);
  });

  it('returns empty text for empty input', () => {
    const result = highlightStepIngredients('', []);
    expect(result).toEqual([{ text: '', highlighted: false }]);
  });
});
