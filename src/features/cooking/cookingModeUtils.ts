/**
 * Navigation state for cooking mode step controls.
 */
export type StepNavState = {
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
};

/**
 * Calculates the reading progress through a recipe as a value between 0 and 1.
 * Step indices are 0-based; progress treats the current step as completed.
 *
 * Examples:
 *   getCookingProgress(0, 5) → 0.2  (step 1 of 5 = 20%)
 *   getCookingProgress(4, 5) → 1.0  (step 5 of 5 = 100%)
 *   getCookingProgress(0, 1) → 1.0  (single step = already at 100%)
 *   getCookingProgress(0, 0) → 0    (no steps edge case)
 */
export function getCookingProgress(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return (currentStepIndex + 1) / totalSteps;
}

/**
 * Returns navigation state for a given step position in a recipe.
 * Used to determine whether previous/next controls should be enabled
 * and whether the finish/complete action should be shown.
 *
 * Examples:
 *   getStepNavState(0, 5) → { canGoPrev: false, canGoNext: true,  isLastStep: false }
 *   getStepNavState(2, 5) → { canGoPrev: true,  canGoNext: true,  isLastStep: false }
 *   getStepNavState(4, 5) → { canGoPrev: true,  canGoNext: false, isLastStep: true  }
 *   getStepNavState(0, 1) → { canGoPrev: false, canGoNext: false, isLastStep: true  }
 */
export function getStepNavState(currentStepIndex: number, totalSteps: number): StepNavState {
  return {
    canGoPrev: currentStepIndex > 0,
    canGoNext: currentStepIndex < totalSteps - 1,
    isLastStep: currentStepIndex === totalSteps - 1,
  };
}

/**
 * Clamps a step index to the valid range [0, totalSteps - 1].
 * Prevents out-of-bounds navigation when programmatically setting step position.
 *
 * Examples:
 *   clampStep(-1, 5) → 0  (below start)
 *   clampStep(5, 5)  → 4  (beyond last index)
 *   clampStep(2, 5)  → 2  (in range, unchanged)
 *   clampStep(0, 0)  → 0  (no steps edge case)
 */
export function clampStep(stepIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(stepIndex, totalSteps - 1));
}
