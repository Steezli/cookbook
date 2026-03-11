/**
 * ISO 8601 duration helper for schema.org time fields.
 *
 * Converts minutes to PT{N}M format. Returns null for null, undefined, or zero
 * — schema.org recommends omitting time fields rather than including PT0M.
 */
export function minutesToIsoDuration(
  minutes: number | null | undefined
): string | null {
  if (minutes == null || minutes <= 0) {
    return null;
  }
  return `PT${minutes}M`;
}
