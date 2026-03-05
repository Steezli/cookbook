import {
  getChipsForBreakpoint,
  getHeaderLayout,
} from '@/components/public/publicNavHeaderUtils';

describe('getChipsForBreakpoint', () => {
  it('returns 5 chips for mobile breakpoint', () => {
    const chips = getChipsForBreakpoint('mobile');
    expect(chips).toHaveLength(5);
    expect(chips).toEqual(['All', 'Dinner', 'Baking', 'Dessert', 'Quick']);
  });

  it('returns 7 chips for tablet breakpoint (includes Vegetarian and Comfort)', () => {
    const chips = getChipsForBreakpoint('tablet');
    expect(chips).toHaveLength(7);
    expect(chips).toContain('Vegetarian');
    expect(chips).toContain('Comfort');
  });

  it('returns 0 chips for web breakpoint (chips rendered by browse screen, not header)', () => {
    const chips = getChipsForBreakpoint('web');
    expect(chips).toHaveLength(0);
  });
});

describe('getHeaderLayout', () => {
  describe('browse variant', () => {
    it('mobile: vertical layout, no Get Started button', () => {
      const layout = getHeaderLayout('mobile', 'browse');
      expect(layout.direction).toBe('vertical');
      expect(layout.showGetStarted).toBe(false);
      expect(layout.showSearchBar).toBe(true);
      expect(layout.logoIcon).toBe('BookOpen');
      expect(layout.searchBarWidth).toBeUndefined();
    });

    it('tablet: vertical layout with search bar width 320', () => {
      const layout = getHeaderLayout('tablet', 'browse');
      expect(layout.direction).toBe('vertical');
      expect(layout.showGetStarted).toBe(false);
      expect(layout.showSearchBar).toBe(true);
      expect(layout.searchBarWidth).toBe(320);
    });

    it('web: horizontal layout with Get Started CTA and search bar width 480', () => {
      const layout = getHeaderLayout('web', 'browse');
      expect(layout.direction).toBe('horizontal');
      expect(layout.showGetStarted).toBe(true);
      expect(layout.showSearchBar).toBe(true);
      expect(layout.searchBarWidth).toBe(480);
    });
  });

  describe('detail variant', () => {
    it('mobile: uses ArrowLeft icon, no Get Started', () => {
      const layout = getHeaderLayout('mobile', 'detail');
      expect(layout.logoIcon).toBe('ArrowLeft');
      expect(layout.showGetStarted).toBe(false);
      expect(layout.showSearchBar).toBe(false);
    });

    it('tablet: uses ArrowLeft icon, shows search bar width 260', () => {
      const layout = getHeaderLayout('tablet', 'detail');
      expect(layout.logoIcon).toBe('ArrowLeft');
      expect(layout.showGetStarted).toBe(false);
      expect(layout.showSearchBar).toBe(true);
      expect(layout.searchBarWidth).toBe(260);
    });

    it('web: uses BookOpen icon (not ArrowLeft), shows Get Started', () => {
      const layout = getHeaderLayout('web', 'detail');
      expect(layout.logoIcon).toBe('BookOpen');
      expect(layout.showGetStarted).toBe(true);
      expect(layout.showSearchBar).toBe(true);
      expect(layout.searchBarWidth).toBe(480);
    });
  });
});
