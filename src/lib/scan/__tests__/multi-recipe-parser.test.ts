import {
  parseSingleRecipe,
  parseMultiScanResult,
  buildScanPrompt,
  ScanResult,
} from '../multi-recipe-parser';

// ---------------------------------------------------------------------------
// Helpers — sample recipe data
// ---------------------------------------------------------------------------

function makeRecipe(overrides: Record<string, any> = {}) {
  return {
    rawText: 'Test recipe text',
    confidence: 0.95,
    title: 'Pancakes',
    ingredients: [
      { name: 'flour', amount: '2', unit: 'cups', preparation: '' },
      { name: 'milk', amount: '1', unit: 'cup', preparation: '' },
    ],
    instructions: ['Mix dry ingredients', 'Add milk', 'Cook on griddle'],
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    servings: 4,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseSingleRecipe
// ---------------------------------------------------------------------------

describe('parseSingleRecipe', () => {
  it('parses a fully-populated recipe object', () => {
    const result = parseSingleRecipe(makeRecipe());

    expect(result.rawText).toBe('Test recipe text');
    expect(result.confidence).toBe(0.95);
    expect(result.extracted.title).toBe('Pancakes');
    expect(result.extracted.ingredients).toHaveLength(2);
    expect(result.extracted.instructions).toHaveLength(3);
    expect(result.extracted.prepTimeMinutes).toBe(5);
    expect(result.extracted.cookTimeMinutes).toBe(15);
    expect(result.extracted.servings).toBe(4);
  });

  it('defaults confidence to 0.7 when missing', () => {
    const result = parseSingleRecipe(makeRecipe({ confidence: undefined }));
    expect(result.confidence).toBe(0.7);
  });

  it('defaults confidence to 0.7 when not a number', () => {
    const result = parseSingleRecipe(makeRecipe({ confidence: 'high' }));
    expect(result.confidence).toBe(0.7);
  });

  it('handles null input gracefully', () => {
    const result = parseSingleRecipe(null);
    expect(result.rawText).toBe('');
    expect(result.confidence).toBe(0.7);
    expect(result.extracted).toEqual({});
  });

  it('handles undefined input gracefully', () => {
    const result = parseSingleRecipe(undefined);
    expect(result.rawText).toBe('');
    expect(result.confidence).toBe(0.7);
  });

  it('handles empty object input', () => {
    const result = parseSingleRecipe({});
    expect(result.rawText).toBe('');
    expect(result.confidence).toBe(0.7);
    expect(result.extracted.title).toBeUndefined();
    expect(result.extracted.ingredients).toBeUndefined();
    expect(result.extracted.instructions).toBeUndefined();
  });

  it('coerces ingredient amount to string', () => {
    const result = parseSingleRecipe(
      makeRecipe({
        ingredients: [{ name: 'sugar', amount: 2, unit: 'tbsp' }],
      })
    );
    expect(result.extracted.ingredients![0].amount).toBe('2');
  });

  it('handles missing ingredient fields with defaults', () => {
    const result = parseSingleRecipe(
      makeRecipe({
        ingredients: [{ name: 'salt' }],
      })
    );
    const ing = result.extracted.ingredients![0];
    expect(ing.name).toBe('salt');
    expect(ing.amount).toBe('');
    expect(ing.unit).toBe('');
    expect(ing.preparation).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseMultiScanResult
// ---------------------------------------------------------------------------

describe('parseMultiScanResult', () => {
  it('parses multi-recipe array format (2 recipes)', () => {
    const input = {
      recipes: [
        makeRecipe({ title: 'Pancakes' }),
        makeRecipe({ title: 'Waffles', confidence: 0.85 }),
      ],
    };

    const results = parseMultiScanResult(input);

    expect(results).toHaveLength(2);
    expect(results[0].extracted.title).toBe('Pancakes');
    expect(results[0].confidence).toBe(0.95);
    expect(results[1].extracted.title).toBe('Waffles');
    expect(results[1].confidence).toBe(0.85);
  });

  it('parses single recipe in array wrapper', () => {
    const input = {
      recipes: [makeRecipe({ title: 'Solo Recipe' })],
    };

    const results = parseMultiScanResult(input);

    expect(results).toHaveLength(1);
    expect(results[0].extracted.title).toBe('Solo Recipe');
  });

  it('handles legacy single-object format (backward compat)', () => {
    const input = makeRecipe({ title: 'Legacy Recipe' });

    const results = parseMultiScanResult(input);

    expect(results).toHaveLength(1);
    expect(results[0].extracted.title).toBe('Legacy Recipe');
    expect(results[0].rawText).toBe('Test recipe text');
    expect(results[0].confidence).toBe(0.95);
  });

  it('returns empty array for null input', () => {
    expect(parseMultiScanResult(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(parseMultiScanResult(undefined)).toEqual([]);
  });

  it('returns empty array for non-object input (string)', () => {
    expect(parseMultiScanResult('not an object')).toEqual([]);
  });

  it('returns empty array for non-object input (number)', () => {
    expect(parseMultiScanResult(42)).toEqual([]);
  });

  it('returns empty array for empty recipes array', () => {
    expect(parseMultiScanResult({ recipes: [] })).toEqual([]);
  });

  it('returns empty array for unrecognised shape', () => {
    expect(parseMultiScanResult({ foo: 'bar' })).toEqual([]);
  });

  it('handles recipes array with malformed entries', () => {
    const input = {
      recipes: [null, makeRecipe({ title: 'Good One' }), undefined],
    };

    const results = parseMultiScanResult(input);

    expect(results).toHaveLength(3);
    // Malformed entries get safe defaults
    expect(results[0].rawText).toBe('');
    expect(results[0].confidence).toBe(0.7);
    // Valid entry is parsed correctly
    expect(results[1].extracted.title).toBe('Good One');
    // undefined entry also gets defaults
    expect(results[2].rawText).toBe('');
  });

  it('detects legacy format via rawText key', () => {
    const input = { rawText: 'some text' };
    const results = parseMultiScanResult(input);
    expect(results).toHaveLength(1);
    expect(results[0].rawText).toBe('some text');
  });

  it('detects legacy format via title key', () => {
    const input = { title: 'My Recipe' };
    const results = parseMultiScanResult(input);
    expect(results).toHaveLength(1);
    expect(results[0].extracted.title).toBe('My Recipe');
  });

  it('detects legacy format via ingredients key', () => {
    const input = { ingredients: [{ name: 'flour', amount: '1', unit: 'cup' }] };
    const results = parseMultiScanResult(input);
    expect(results).toHaveLength(1);
    expect(results[0].extracted.ingredients).toHaveLength(1);
  });

  it('applies confidence default in multi-recipe array', () => {
    const input = {
      recipes: [
        makeRecipe({ confidence: undefined }),
        makeRecipe({ confidence: 0.9 }),
      ],
    };

    const results = parseMultiScanResult(input);

    expect(results[0].confidence).toBe(0.7); // default
    expect(results[1].confidence).toBe(0.9); // explicit
  });
});

// ---------------------------------------------------------------------------
// buildScanPrompt
// ---------------------------------------------------------------------------

describe('buildScanPrompt', () => {
  it('single-image prompt contains "photo" language', () => {
    const prompt = buildScanPrompt(1);
    expect(prompt).toMatch(/photo/i);
  });

  it('single-image prompt does NOT contain "multiple pages" language', () => {
    const prompt = buildScanPrompt(1);
    expect(prompt).not.toMatch(/multiple pages/i);
  });

  it('multi-image prompt contains multi-image language', () => {
    const prompt = buildScanPrompt(3);
    expect(prompt).toMatch(/multiple pages/i);
  });

  it('multi-image prompt references the image count', () => {
    const prompt = buildScanPrompt(3);
    expect(prompt).toContain('3');
  });

  it('both prompts contain recipes array schema', () => {
    const single = buildScanPrompt(1);
    const multi = buildScanPrompt(3);

    expect(single).toContain('"recipes"');
    expect(multi).toContain('"recipes"');
  });

  it('both prompts contain 5-recipe cap instruction', () => {
    const single = buildScanPrompt(1);
    const multi = buildScanPrompt(3);

    expect(single).toMatch(/5 recipes/i);
    expect(multi).toMatch(/5 recipes/i);
  });

  it('both prompts instruct to always use array format', () => {
    const single = buildScanPrompt(1);
    const multi = buildScanPrompt(3);

    // Should tell Claude to always wrap in recipes array
    expect(single).toMatch(/always wrap/i);
    expect(multi).toMatch(/always wrap/i);
  });

  it('prompts contain JSON schema block', () => {
    const prompt = buildScanPrompt(1);
    expect(prompt).toContain('"rawText"');
    expect(prompt).toContain('"confidence"');
    expect(prompt).toContain('"ingredients"');
    expect(prompt).toContain('"instructions"');
  });
});
