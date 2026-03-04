// Unit tests for PageContainer component.
// Tests the pure getContainerStyle function directly (node environment, no React renderer needed).

import { getContainerStyle } from '../PageContainer';

describe('getContainerStyle', () => {
  describe('breakpoint padding', () => {
    it('returns 20px horizontal padding for mobile breakpoint (default variant)', () => {
      const style = getContainerStyle('mobile');
      expect(style.paddingHorizontal).toBe(20);
      expect(style.maxWidth).toBeUndefined();
    });

    it('returns 32px horizontal padding for tablet breakpoint (default variant)', () => {
      const style = getContainerStyle('tablet');
      expect(style.paddingHorizontal).toBe(32);
      expect(style.maxWidth).toBeUndefined();
    });

    it('returns 40px horizontal padding for web breakpoint (default variant)', () => {
      const style = getContainerStyle('web');
      expect(style.paddingHorizontal).toBe(40);
      expect(style.maxWidth).toBeUndefined();
    });
  });

  describe('variant max-width', () => {
    it("'form' variant returns max-width 600px with alignSelf center and width 100%", () => {
      const style = getContainerStyle('mobile', 'form');
      expect(style.maxWidth).toBe(600);
      expect(style.alignSelf).toBe('center');
      expect(style.width).toBe('100%');
    });

    it("'content' variant returns max-width 960px with alignSelf center and width 100%", () => {
      const style = getContainerStyle('mobile', 'content');
      expect(style.maxWidth).toBe(960);
      expect(style.alignSelf).toBe('center');
      expect(style.width).toBe('100%');
    });
  });
});
