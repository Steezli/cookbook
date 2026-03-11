/**
 * Tests for SEO JSON-LD generation
 *
 * Covers:
 *   - Full recipe → valid schema.org/Recipe JSON-LD with all mapped fields
 *   - Minimal recipe → JSON-LD with only required fields
 *   - minutesToIsoDuration edge cases
 *   - aggregateRating conditional inclusion
 *   - recipeIngredient / recipeInstructions mapping
 *   - keywords from tags
 *   - No undefined values in output
 *   - Author fallback behavior
 */

import { generateRecipeJsonLd } from '../json-ld';
import { minutesToIsoDuration } from '../duration';
import type { Recipe } from '@/features/recipes/types';
import type { PublicAuthor } from '@/features/recipes/public';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullRecipe: Recipe = {
  id: 'recipe-001',
  owner_user_id: 'user-001',
  family_id: 'family-001',
  visibility: 'public',
  title: 'Grandma\'s Chocolate Chip Cookies',
  description: 'The best cookies you will ever taste, passed down through generations.',
  ingredients: [
    { text: '2 cups all-purpose flour', sort_order: 0 },
    { text: '1 cup butter, softened', sort_order: 1 },
    { text: '1 cup chocolate chips', sort_order: 2 },
  ],
  steps: [
    { text: 'Preheat oven to 375°F.', sort_order: 0 },
    { text: 'Mix flour and butter until smooth.', sort_order: 1 },
    { text: 'Fold in chocolate chips and bake for 12 minutes.', sort_order: 2 },
  ],
  servings: 24,
  prep_time_minutes: 15,
  cook_time_minutes: 12,
  source_story: 'My grandma used to make these every Sunday.',
  tags: ['cookies', 'dessert', 'chocolate'],
  rating_average: 4.8,
  rating_count: 42,
  created_at: '2025-06-15T10:30:00Z',
  updated_at: '2025-12-01T14:00:00Z',
};

const fullAuthor: PublicAuthor = {
  display_name: 'Jane Berven',
  initials: 'JB',
};

const fullImageUrl = 'https://example.supabase.co/storage/v1/object/public/photos/recipe-001/hero.jpg';

const minimalRecipe: Recipe = {
  id: 'recipe-002',
  owner_user_id: 'user-002',
  family_id: null,
  visibility: 'public',
  title: 'Quick Salad',
  description: null,
  ingredients: [],
  steps: [],
  servings: null,
  prep_time_minutes: null,
  cook_time_minutes: null,
  source_story: null,
  tags: [],
  rating_average: null,
  rating_count: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// minutesToIsoDuration
// ---------------------------------------------------------------------------

describe('minutesToIsoDuration', () => {
  it('converts positive minutes to ISO 8601 duration', () => {
    expect(minutesToIsoDuration(30)).toBe('PT30M');
  });

  it('converts 1 minute', () => {
    expect(minutesToIsoDuration(1)).toBe('PT1M');
  });

  it('converts large values', () => {
    expect(minutesToIsoDuration(120)).toBe('PT120M');
  });

  it('returns null for 0', () => {
    expect(minutesToIsoDuration(0)).toBeNull();
  });

  it('returns null for null', () => {
    expect(minutesToIsoDuration(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(minutesToIsoDuration(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateRecipeJsonLd — full recipe
// ---------------------------------------------------------------------------

describe('generateRecipeJsonLd — full recipe', () => {
  let jsonLd: Record<string, unknown>;

  beforeAll(() => {
    jsonLd = generateRecipeJsonLd(fullRecipe, fullAuthor, fullImageUrl);
  });

  it('includes @context and @type', () => {
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Recipe');
  });

  it('maps title to name', () => {
    expect(jsonLd.name).toBe('Grandma\'s Chocolate Chip Cookies');
  });

  it('maps description', () => {
    expect(jsonLd.description).toBe(
      'The best cookies you will ever taste, passed down through generations.'
    );
  });

  it('maps image URL', () => {
    expect(jsonLd.image).toBe(fullImageUrl);
  });

  it('maps author with display_name', () => {
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'Jane Berven',
    });
  });

  it('maps datePublished and dateModified', () => {
    expect(jsonLd.datePublished).toBe('2025-06-15T10:30:00Z');
    expect(jsonLd.dateModified).toBe('2025-12-01T14:00:00Z');
  });

  it('converts prep_time_minutes to prepTime ISO duration', () => {
    expect(jsonLd.prepTime).toBe('PT15M');
  });

  it('converts cook_time_minutes to cookTime ISO duration', () => {
    expect(jsonLd.cookTime).toBe('PT12M');
  });

  it('computes totalTime as sum of prep + cook', () => {
    expect(jsonLd.totalTime).toBe('PT27M');
  });

  it('maps servings to recipeYield', () => {
    expect(jsonLd.recipeYield).toBe('24 servings');
  });

  it('maps ingredients to recipeIngredient array of strings', () => {
    expect(jsonLd.recipeIngredient).toEqual([
      '2 cups all-purpose flour',
      '1 cup butter, softened',
      '1 cup chocolate chips',
    ]);
  });

  it('maps steps to recipeInstructions array of HowToStep objects', () => {
    expect(jsonLd.recipeInstructions).toEqual([
      { '@type': 'HowToStep', text: 'Preheat oven to 375°F.' },
      { '@type': 'HowToStep', text: 'Mix flour and butter until smooth.' },
      { '@type': 'HowToStep', text: 'Fold in chocolate chips and bake for 12 minutes.' },
    ]);
  });

  it('maps tags to comma-separated keywords', () => {
    expect(jsonLd.keywords).toBe('cookies, dessert, chocolate');
  });

  it('includes aggregateRating when rating data exists', () => {
    expect(jsonLd.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      ratingCount: 42,
    });
  });

  it('contains no undefined values (JSON roundtrip)', () => {
    const serialized = JSON.stringify(jsonLd);
    const parsed = JSON.parse(serialized);
    // JSON.stringify drops undefined values; if roundtrip matches, no undefineds
    expect(parsed).toEqual(jsonLd);
    // Also verify the string doesn't contain the literal "undefined"
    expect(serialized).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// generateRecipeJsonLd — minimal recipe
// ---------------------------------------------------------------------------

describe('generateRecipeJsonLd — minimal recipe', () => {
  let jsonLd: Record<string, unknown>;

  beforeAll(() => {
    jsonLd = generateRecipeJsonLd(minimalRecipe, null, null);
  });

  it('includes @context and @type', () => {
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Recipe');
  });

  it('maps title to name', () => {
    expect(jsonLd.name).toBe('Quick Salad');
  });

  it('omits description when null', () => {
    expect(jsonLd).not.toHaveProperty('description');
  });

  it('omits image when null', () => {
    expect(jsonLd).not.toHaveProperty('image');
  });

  it('uses "Anonymous" fallback when author is null', () => {
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'Anonymous',
    });
  });

  it('omits prepTime when null', () => {
    expect(jsonLd).not.toHaveProperty('prepTime');
  });

  it('omits cookTime when null', () => {
    expect(jsonLd).not.toHaveProperty('cookTime');
  });

  it('omits totalTime when prep and cook are null', () => {
    expect(jsonLd).not.toHaveProperty('totalTime');
  });

  it('omits recipeYield when servings is null', () => {
    expect(jsonLd).not.toHaveProperty('recipeYield');
  });

  it('omits recipeIngredient when ingredients is empty', () => {
    expect(jsonLd).not.toHaveProperty('recipeIngredient');
  });

  it('omits recipeInstructions when steps is empty', () => {
    expect(jsonLd).not.toHaveProperty('recipeInstructions');
  });

  it('omits keywords when tags is empty', () => {
    expect(jsonLd).not.toHaveProperty('keywords');
  });

  it('omits aggregateRating when rating data is null', () => {
    expect(jsonLd).not.toHaveProperty('aggregateRating');
  });

  it('contains no undefined values (JSON roundtrip)', () => {
    const serialized = JSON.stringify(jsonLd);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(jsonLd);
    expect(serialized).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// generateRecipeJsonLd — edge cases
// ---------------------------------------------------------------------------

describe('generateRecipeJsonLd — edge cases', () => {
  it('omits totalTime when only prepTime is present', () => {
    const recipe: Recipe = {
      ...minimalRecipe,
      prep_time_minutes: 10,
      cook_time_minutes: null,
    };
    const jsonLd = generateRecipeJsonLd(recipe, null, null);
    expect(jsonLd.prepTime).toBe('PT10M');
    expect(jsonLd).not.toHaveProperty('cookTime');
    expect(jsonLd).not.toHaveProperty('totalTime');
  });

  it('omits totalTime when only cookTime is present', () => {
    const recipe: Recipe = {
      ...minimalRecipe,
      prep_time_minutes: null,
      cook_time_minutes: 20,
    };
    const jsonLd = generateRecipeJsonLd(recipe, null, null);
    expect(jsonLd).not.toHaveProperty('prepTime');
    expect(jsonLd.cookTime).toBe('PT20M');
    expect(jsonLd).not.toHaveProperty('totalTime');
  });

  it('uses "Anonymous" when author display_name is null', () => {
    const authorNoName: PublicAuthor = { display_name: null, initials: 'U' };
    const jsonLd = generateRecipeJsonLd(minimalRecipe, authorNoName, null);
    expect(jsonLd.author).toEqual({
      '@type': 'Person',
      name: 'Anonymous',
    });
  });

  it('omits aggregateRating when only rating_average is present', () => {
    const recipe: Recipe = {
      ...minimalRecipe,
      rating_average: 4.5,
      rating_count: null,
    };
    const jsonLd = generateRecipeJsonLd(recipe, null, null);
    expect(jsonLd).not.toHaveProperty('aggregateRating');
  });

  it('omits aggregateRating when only rating_count is present', () => {
    const recipe: Recipe = {
      ...minimalRecipe,
      rating_average: null,
      rating_count: 10,
    };
    const jsonLd = generateRecipeJsonLd(recipe, null, null);
    expect(jsonLd).not.toHaveProperty('aggregateRating');
  });
});
