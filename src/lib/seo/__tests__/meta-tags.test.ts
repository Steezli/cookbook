/**
 * Tests for SEO meta tag generation
 *
 * Covers:
 *   - Full recipe → OG tags (title, description, image, url, type, site_name)
 *   - Full recipe → Twitter Card tags (card, title, description, image)
 *   - Minimal recipe → omits description and image tags
 *   - Page URL correctly set in og:url
 */

import { generateRecipeMetaTags, type MetaTag } from '../meta-tags';
import { SITE_NAME, SITE_URL } from '@/lib/site-config';
import type { Recipe } from '@/features/recipes/types';

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
  ],
  steps: [
    { text: 'Preheat oven to 375°F.', sort_order: 0 },
  ],
  servings: 24,
  prep_time_minutes: 15,
  cook_time_minutes: 12,
  source_story: null,
  tags: ['cookies', 'dessert'],
  rating_average: 4.8,
  rating_count: 42,
  created_at: '2025-06-15T10:30:00Z',
  updated_at: '2025-12-01T14:00:00Z',
};

const fullImageUrl = 'https://example.supabase.co/storage/v1/object/public/photos/recipe-001/hero.jpg';
const pageUrl = `${SITE_URL}/recipe/recipe-001`;

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
// Helpers
// ---------------------------------------------------------------------------

function findTag(tags: MetaTag[], key: string): MetaTag | undefined {
  return tags.find((t) => t.property === key || t.name === key);
}

// ---------------------------------------------------------------------------
// Full recipe — OG tags
// ---------------------------------------------------------------------------

describe('generateRecipeMetaTags — full recipe OG tags', () => {
  let tags: MetaTag[];

  beforeAll(() => {
    tags = generateRecipeMetaTags(fullRecipe, fullImageUrl, pageUrl);
  });

  it('includes og:title', () => {
    const tag = findTag(tags, 'og:title');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('Grandma\'s Chocolate Chip Cookies');
  });

  it('includes og:description', () => {
    const tag = findTag(tags, 'og:description');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(
      'The best cookies you will ever taste, passed down through generations.'
    );
  });

  it('includes og:image', () => {
    const tag = findTag(tags, 'og:image');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(fullImageUrl);
  });

  it('includes og:url with page URL', () => {
    const tag = findTag(tags, 'og:url');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(pageUrl);
  });

  it('includes og:type as article', () => {
    const tag = findTag(tags, 'og:type');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('article');
  });

  it('includes og:site_name', () => {
    const tag = findTag(tags, 'og:site_name');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(SITE_NAME);
  });
});

// ---------------------------------------------------------------------------
// Full recipe — Twitter Card tags
// ---------------------------------------------------------------------------

describe('generateRecipeMetaTags — full recipe Twitter tags', () => {
  let tags: MetaTag[];

  beforeAll(() => {
    tags = generateRecipeMetaTags(fullRecipe, fullImageUrl, pageUrl);
  });

  it('includes twitter:card as summary_large_image', () => {
    const tag = findTag(tags, 'twitter:card');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('summary_large_image');
  });

  it('includes twitter:title', () => {
    const tag = findTag(tags, 'twitter:title');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('Grandma\'s Chocolate Chip Cookies');
  });

  it('includes twitter:description', () => {
    const tag = findTag(tags, 'twitter:description');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(
      'The best cookies you will ever taste, passed down through generations.'
    );
  });

  it('includes twitter:image', () => {
    const tag = findTag(tags, 'twitter:image');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(fullImageUrl);
  });
});

// ---------------------------------------------------------------------------
// Minimal recipe — omitted tags
// ---------------------------------------------------------------------------

describe('generateRecipeMetaTags — minimal recipe', () => {
  let tags: MetaTag[];

  beforeAll(() => {
    tags = generateRecipeMetaTags(minimalRecipe, null, pageUrl);
  });

  it('includes og:title', () => {
    const tag = findTag(tags, 'og:title');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('Quick Salad');
  });

  it('omits og:description when recipe description is null', () => {
    const tag = findTag(tags, 'og:description');
    expect(tag).toBeUndefined();
  });

  it('omits og:image when imageUrl is null', () => {
    const tag = findTag(tags, 'og:image');
    expect(tag).toBeUndefined();
  });

  it('includes og:url', () => {
    const tag = findTag(tags, 'og:url');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(pageUrl);
  });

  it('includes og:type', () => {
    const tag = findTag(tags, 'og:type');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('article');
  });

  it('includes og:site_name', () => {
    const tag = findTag(tags, 'og:site_name');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe(SITE_NAME);
  });

  it('includes twitter:card', () => {
    const tag = findTag(tags, 'twitter:card');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('summary_large_image');
  });

  it('includes twitter:title', () => {
    const tag = findTag(tags, 'twitter:title');
    expect(tag).toBeDefined();
    expect(tag!.content).toBe('Quick Salad');
  });

  it('omits twitter:description when recipe description is null', () => {
    const tag = findTag(tags, 'twitter:description');
    expect(tag).toBeUndefined();
  });

  it('omits twitter:image when imageUrl is null', () => {
    const tag = findTag(tags, 'twitter:image');
    expect(tag).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tag structure
// ---------------------------------------------------------------------------

describe('generateRecipeMetaTags — tag structure', () => {
  it('OG tags use property key, not name', () => {
    const tags = generateRecipeMetaTags(fullRecipe, fullImageUrl, pageUrl);
    const ogTags = tags.filter((t) => t.property?.startsWith('og:'));
    expect(ogTags.length).toBeGreaterThan(0);
    for (const tag of ogTags) {
      expect(tag).toHaveProperty('property');
      expect(tag).toHaveProperty('content');
    }
  });

  it('Twitter tags use name key, not property', () => {
    const tags = generateRecipeMetaTags(fullRecipe, fullImageUrl, pageUrl);
    const twitterTags = tags.filter((t) => t.name?.startsWith('twitter:'));
    expect(twitterTags.length).toBeGreaterThan(0);
    for (const tag of twitterTags) {
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('content');
    }
  });
});
