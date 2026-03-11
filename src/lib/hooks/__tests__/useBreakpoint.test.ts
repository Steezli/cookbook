// Mock react-native so Jest (node environment) can import the hook module
// without parsing RN's ESM syntax. Only useWindowDimensions is used in the hook.
jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

import { getBreakpoint, Breakpoint } from '@/lib/hooks/useBreakpoint';

describe('getBreakpoint — mobile boundary conditions', () => {
  it('returns "mobile" for width 0 (edge case)', () => {
    const result: Breakpoint = getBreakpoint(0);
    expect(result).toBe('mobile');
  });

  it('returns "mobile" for width 390 (typical phone)', () => {
    const result: Breakpoint = getBreakpoint(390);
    expect(result).toBe('mobile');
  });

  it('returns "mobile" for width 639 (just below tablet threshold)', () => {
    const result: Breakpoint = getBreakpoint(639);
    expect(result).toBe('mobile');
  });
});

describe('getBreakpoint — tablet boundary conditions', () => {
  it('returns "tablet" for width 640 (tablet lower threshold)', () => {
    const result: Breakpoint = getBreakpoint(640);
    expect(result).toBe('tablet');
  });

  it('returns "tablet" for width 768 (typical tablet)', () => {
    const result: Breakpoint = getBreakpoint(768);
    expect(result).toBe('tablet');
  });

  it('returns "tablet" for width 1279 (just below web threshold)', () => {
    const result: Breakpoint = getBreakpoint(1279);
    expect(result).toBe('tablet');
  });
});

describe('getBreakpoint — web boundary conditions', () => {
  it('returns "web" for width 1280 (web lower threshold)', () => {
    const result: Breakpoint = getBreakpoint(1280);
    expect(result).toBe('web');
  });

  it('returns "web" for width 1440 (typical desktop)', () => {
    const result: Breakpoint = getBreakpoint(1440);
    expect(result).toBe('web');
  });
});

describe('getBreakpoint — return type', () => {
  it('always returns one of the three valid breakpoint values', () => {
    const validValues: Breakpoint[] = ['mobile', 'tablet', 'web'];
    const widths = [0, 320, 375, 390, 430, 639, 640, 768, 1024, 1279, 1280, 1440, 1920];
    for (const width of widths) {
      const result = getBreakpoint(width);
      expect(validValues).toContain(result);
    }
  });
});
