/**
 * Tests for ads/useAdPlacement.ts
 *
 * Covers:
 *   ADS-02: Ad placement on public browsing screens only (never authenticated screens)
 *   - evaluateAdPlacement returns correct showAds for public and private routes
 */

import { evaluateAdPlacement } from '../useAdPlacement';

// Mock react-native Platform for config.ts dependency
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

describe('evaluateAdPlacement', () => {
  describe('public routes — showAds is true', () => {
    it.each([
      ['/public', true],
      ['/public/recipes', true],
      ['/public/recipes/abc-123', true],
      ['/browse', true],
      ['/browse/popular', true],
      ['/discover', true],
      ['/discover/trending', true],
    ])('evaluateAdPlacement("%s") → showAds=%s', (route, expected) => {
      const result = evaluateAdPlacement(route);
      expect(result.showAds).toBe(expected);
      expect(result.routePath).toBe(route);
    });
  });

  describe('private routes — showAds is false', () => {
    it.each([
      ['/(auth)/login', false],
      ['/(auth)/signup', false],
      ['/(scan)/index', false],
      ['/(family)/index', false],
      ['/recipes/create', false],
      ['/recipes/[id]/edit', false],
      ['/collections', false],
      ['/settings', false],
    ])('evaluateAdPlacement("%s") → showAds=%s', (route, expected) => {
      const result = evaluateAdPlacement(route);
      expect(result.showAds).toBe(expected);
    });
  });

  describe('non-public routes — showAds is false', () => {
    it.each([
      ['/', false],
      ['/recipes', false],
      ['/recipes/123', false],
      ['', false],
    ])('evaluateAdPlacement("%s") → showAds=%s', (route, expected) => {
      const result = evaluateAdPlacement(route);
      expect(result.showAds).toBe(expected);
    });
  });

  it('returns the evaluated routePath', () => {
    const result = evaluateAdPlacement('/public/recipes');
    expect(result.routePath).toBe('/public/recipes');
  });

  it('returns empty routePath when given empty string', () => {
    const result = evaluateAdPlacement('');
    expect(result.routePath).toBe('');
    expect(result.showAds).toBe(false);
  });
});
