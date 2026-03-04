import type { Breakpoint } from '@/lib/hooks/useBreakpoint';
import type { RecipeVisibility } from '@/features/recipes/types';
import { accentBlue, accentGreen, accentWarm } from '@/lib/tokens';

/**
 * Formats the metadata line for a RecipeCard.
 * Combines prep + cook time and servings into a readable string.
 *
 * Examples:
 *   formatMetadataLine(15, 30, 6) → "45 min . 6 servings"
 *   formatMetadataLine(10, 0, null) → "10 min"
 *   formatMetadataLine(0, 0, 4) → "4 servings"
 *   formatMetadataLine(0, 0, null) → ""
 */
export function formatMetadataLine(
  prepMinutes: number | null | undefined,
  cookMinutes: number | null | undefined,
  servings: number | null | undefined
): string {
  const totalTime = (prepMinutes ?? 0) + (cookMinutes ?? 0);
  const parts: string[] = [];
  if (totalTime > 0) parts.push(`${totalTime} min`);
  if (servings) parts.push(`${servings} servings`);
  return parts.join(' . ');
}

/**
 * Returns the number of recipe card columns for a given breakpoint.
 * mobile → 1, tablet → 2, web → 3
 */
export function getNumColumns(breakpoint: Breakpoint): number {
  return breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3;
}

/**
 * Returns the accent color token for a recipe's visibility level.
 * private → accentWarm, family → accentBlue, public → accentGreen
 */
export function getVisibilityColor(visibility: RecipeVisibility): string {
  return visibility === 'private'
    ? accentWarm
    : visibility === 'family'
    ? accentBlue
    : accentGreen;
}
