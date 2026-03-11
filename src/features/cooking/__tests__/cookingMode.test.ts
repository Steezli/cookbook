import {
  getCookingProgress,
  getStepNavState,
  clampStep,
} from '@/features/cooking/cookingModeUtils';

describe('getCookingProgress', () => {
  it('returns 0.2 for step 0 of 5 (first step = 20%)', () => {
    expect(getCookingProgress(0, 5)).toBe(0.2);
  });

  it('returns 1.0 for step 4 of 5 (last step = 100%)', () => {
    expect(getCookingProgress(4, 5)).toBe(1.0);
  });

  it('returns 1.0 for step 0 of 1 (single step = 100%)', () => {
    expect(getCookingProgress(0, 1)).toBe(1.0);
  });

  it('returns 0 when there are no steps (edge case)', () => {
    expect(getCookingProgress(0, 0)).toBe(0);
  });

  it('returns 0.5 for step 1 of 4 (middle)', () => {
    expect(getCookingProgress(1, 4)).toBeCloseTo(0.5);
  });
});

describe('getStepNavState', () => {
  it('returns canGoPrev:false, canGoNext:true, isLastStep:false for first step of 5', () => {
    const result = getStepNavState(0, 5);
    expect(result).toEqual({ canGoPrev: false, canGoNext: true, isLastStep: false });
  });

  it('returns canGoPrev:true, canGoNext:true, isLastStep:false for middle step of 5', () => {
    const result = getStepNavState(2, 5);
    expect(result).toEqual({ canGoPrev: true, canGoNext: true, isLastStep: false });
  });

  it('returns canGoPrev:true, canGoNext:false, isLastStep:true for last step of 5', () => {
    const result = getStepNavState(4, 5);
    expect(result).toEqual({ canGoPrev: true, canGoNext: false, isLastStep: true });
  });

  it('returns canGoPrev:false, canGoNext:false, isLastStep:true for only step', () => {
    const result = getStepNavState(0, 1);
    expect(result).toEqual({ canGoPrev: false, canGoNext: false, isLastStep: true });
  });
});

describe('clampStep', () => {
  it('clamps -1 to 0 (below start)', () => {
    expect(clampStep(-1, 5)).toBe(0);
  });

  it('clamps 5 to 4 (beyond last index of 5-step recipe)', () => {
    expect(clampStep(5, 5)).toBe(4);
  });

  it('returns 2 unchanged when in range', () => {
    expect(clampStep(2, 5)).toBe(2);
  });

  it('returns 0 for first step unchanged', () => {
    expect(clampStep(0, 5)).toBe(0);
  });

  it('returns 4 for last step unchanged', () => {
    expect(clampStep(4, 5)).toBe(4);
  });

  it('returns 0 when totalSteps is 0 (edge case)', () => {
    expect(clampStep(0, 0)).toBe(0);
  });
});
