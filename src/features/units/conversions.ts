// Unit conversion functions
import { UnitSystem } from './types';

// ---------------------------------------------------------------------------
// Volume conversion table — all values in milliliters
// ---------------------------------------------------------------------------
const VOLUME_TO_ML: Record<string, number> = {
  // US customary
  tsp: 4.92892,
  'tsp.': 4.92892,
  't.': 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  'tbsp.': 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  cups: 236.588,
  'c.': 236.588,
  'c': 236.588,
  pint: 473.176,
  pints: 473.176,
  'pt.': 473.176,
  quart: 946.353,
  quarts: 946.353,
  'qt.': 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  'gal.': 3785.41,
  // Metric
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

// ---------------------------------------------------------------------------
// Weight conversion table — all values in grams
// ---------------------------------------------------------------------------
const WEIGHT_TO_GRAMS: Record<string, number> = {
  // Imperial
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  // Metric
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
};

// ---------------------------------------------------------------------------
// Dry ingredient density table — grams per US cup (236.588 ml)
// Used when converting dry ingredients from volume to weight for metric.
// These are standard baking/cooking densities.
// ---------------------------------------------------------------------------
const DRY_GRAMS_PER_CUP: Record<string, number> = {
  // Flours
  'all-purpose flour': 125,
  'flour': 125,
  'bread flour': 127,
  'cake flour': 114,
  'whole wheat flour': 128,
  'self-rising flour': 125,
  'almond flour': 96,
  'coconut flour': 128,
  'oat flour': 120,
  'rice flour': 160,

  // Sugars
  'sugar': 200,
  'granulated sugar': 200,
  'white sugar': 200,
  'brown sugar': 220,
  'light brown sugar': 220,
  'dark brown sugar': 220,
  'powdered sugar': 120,
  'confectioners sugar': 120,
  'icing sugar': 120,

  // Fats (solid at room temp)
  'butter': 227,
  'shortening': 191,
  'lard': 205,
  'coconut oil': 218,

  // Grains & starches
  'rice': 185,
  'oats': 90,
  'rolled oats': 90,
  'cornstarch': 128,
  'cornmeal': 150,
  'breadcrumbs': 108,
  'panko': 60,

  // Nuts & seeds
  'almonds': 143,
  'walnuts': 120,
  'pecans': 109,
  'peanuts': 146,
  'chocolate chips': 170,
  'cocoa powder': 86,
  'cocoa': 86,

  // Other dry
  'salt': 288,
  'baking soda': 220,
  'baking powder': 230,
  'yeast': 192,
  'cinnamon': 125,
  'ground cinnamon': 125,
};

// ---------------------------------------------------------------------------
// Liquid ingredients — ingredients that should stay in volume units.
// Anything NOT in this list is treated as dry when measured in cups.
// ---------------------------------------------------------------------------
const KNOWN_LIQUIDS = new Set([
  'water',
  'milk',
  'whole milk',
  'skim milk',
  'buttermilk',
  'cream',
  'heavy cream',
  'whipping cream',
  'half and half',
  'half-and-half',
  'broth',
  'stock',
  'chicken broth',
  'beef broth',
  'vegetable broth',
  'chicken stock',
  'beef stock',
  'oil',
  'olive oil',
  'vegetable oil',
  'canola oil',
  'sesame oil',
  'coconut milk',
  'almond milk',
  'oat milk',
  'soy milk',
  'juice',
  'orange juice',
  'lemon juice',
  'lime juice',
  'apple juice',
  'vinegar',
  'apple cider vinegar',
  'white vinegar',
  'balsamic vinegar',
  'red wine vinegar',
  'wine',
  'red wine',
  'white wine',
  'beer',
  'rum',
  'bourbon',
  'vanilla extract',
  'extract',
  'soy sauce',
  'fish sauce',
  'worcestershire sauce',
  'hot sauce',
  'maple syrup',
  'syrup',
  'honey',
  'molasses',
  'corn syrup',
  'condensed milk',
  'evaporated milk',
  'yogurt',
  'sour cream',
  'ketchup',
  'mustard',
  'mayonnaise',
  'coffee',
  'tea',
  'egg',
  'eggs',
]);

// ---------------------------------------------------------------------------
// Preferred target units for different magnitudes
// ---------------------------------------------------------------------------
const IMPERIAL_VOLUME_PREFERRED: Record<string, string> = {
  tsp: 'tsp',
  tbsp: 'tbsp',
  'fl oz': 'fl oz',
  cup: 'cup',
  ml: 'cup',
  l: 'cup',
};

const METRIC_VOLUME_PREFERRED: Record<string, string> = {
  tsp: 'ml',
  tbsp: 'ml',
  'fl oz': 'ml',
  cup: 'ml',
  ml: 'ml',
  l: 'ml',
};

const IMPERIAL_WEIGHT_PREFERRED: Record<string, string> = {
  g: 'oz',
  kg: 'lb',
  oz: 'oz',
  lb: 'lb',
};

const METRIC_WEIGHT_PREFERRED: Record<string, string> = {
  g: 'g',
  kg: 'g',
  oz: 'g',
  lb: 'g',
};

// ---------------------------------------------------------------------------
// Canonical display units — maps every accepted variant to a single standard
// abbreviation. Output is always one of these canonical forms.
// ---------------------------------------------------------------------------
const CANONICAL_UNIT: Record<string, string> = {
  // Volume – imperial
  tsp: 'tsp',
  'tsp.': 'tsp',
  't.': 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  'tbsp.': 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  'fl oz': 'fl oz',
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  'c.': 'cup',
  pint: 'pint',
  pints: 'pint',
  'pt.': 'pint',
  quart: 'quart',
  quarts: 'quart',
  'qt.': 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
  'gal.': 'gallon',
  // Volume – metric
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'L',
  liter: 'L',
  liters: 'L',
  // Weight – imperial
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  'lbs.': 'lb',
  'lb.': 'lb',
  pound: 'lb',
  pounds: 'lb',
  // Weight – metric
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  mg: 'mg',
  milligram: 'mg',
  milligrams: 'mg',
};

/** Units that have a distinct plural form (word-length units only). */
const PLURAL_UNITS: Record<string, string> = {
  cup: 'cups',
  pint: 'pints',
  quart: 'quarts',
  gallon: 'gallons',
};

/** Resolve any unit variant to its canonical display form, pluralizing word-length units. */
function canonicalUnit(unit: string, amount?: number): string {
  const normalized = unit === 'T.' || unit === 'T' ? 'tbsp' : unit.toLowerCase();
  const canonical = CANONICAL_UNIT[normalized] || unit;
  // Pluralize word-length units when amount > 1 (standard recipe convention)
  if (amount !== undefined && amount > 1) {
    const plural = PLURAL_UNITS[canonical];
    if (plural) return plural;
  }
  return canonical;
}

/** Units that are written without a space after the number (250g, 10ml).
 *  Only metric abbreviations — imperial units always use a space (2 oz, 1 lb). */
const COMPACT_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'L']);

/** Imperial units — these use vulgar fractions (½, ¼) instead of decimals. */
const IMPERIAL_UNITS = new Set([
  'tsp', 'tbsp', 'fl oz', 'cup', 'cups', 'pint', 'pints',
  'quart', 'quarts', 'gallon', 'gallons', 'oz', 'lb',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function convertVolume(amount: number, fromUnit: string, toUnit: string): number {
  const fromMl = VOLUME_TO_ML[fromUnit.toLowerCase()];
  const toMl = VOLUME_TO_ML[toUnit.toLowerCase()];

  if (!fromMl || !toMl) {
    return amount;
  }

  const ml = amount * fromMl;
  return ml / toMl;
}

export function convertWeight(amount: number, fromUnit: string, toUnit: string): number {
  const fromGrams = WEIGHT_TO_GRAMS[fromUnit.toLowerCase()];
  const toGrams = WEIGHT_TO_GRAMS[toUnit.toLowerCase()];

  if (!fromGrams || !toGrams) {
    return amount;
  }

  const grams = amount * fromGrams;
  return grams / toGrams;
}

export function canConvert(unit: string): boolean {
  const normalized = unit.toLowerCase();
  return normalized in VOLUME_TO_ML || normalized in WEIGHT_TO_GRAMS;
}

/**
 * Classify an ingredient as liquid or dry based on its name.
 * Used to decide whether volume units (cups) should convert to
 * volume (ml) or weight (g) when switching to metric.
 */
export function isLiquidIngredient(ingredientName: string): boolean {
  if (!ingredientName) return false;

  const normalized = ingredientName
    .toLowerCase()
    .replace(/[,;.!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Direct match
  if (KNOWN_LIQUIDS.has(normalized)) return true;

  // Check if any known liquid is a substring of the ingredient name
  for (const liquid of KNOWN_LIQUIDS) {
    if (normalized.includes(liquid)) return true;
  }

  return false;
}

/**
 * Look up the grams-per-cup for a dry ingredient.
 * Returns null if no density data is available.
 */
function getDryGramsPerCup(ingredientName: string): number | null {
  if (!ingredientName) return null;

  const normalized = ingredientName
    .toLowerCase()
    .replace(/[,;.!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Direct match
  if (DRY_GRAMS_PER_CUP[normalized] !== undefined) {
    return DRY_GRAMS_PER_CUP[normalized];
  }

  // Check if any known dry ingredient is a substring
  for (const [key, value] of Object.entries(DRY_GRAMS_PER_CUP)) {
    if (normalized.includes(key)) return value;
  }

  return null;
}

/**
 * Convert a volume amount of a dry ingredient to grams.
 * Uses the density lookup table. Falls back to null if unknown.
 */
function convertDryVolumeToGrams(
  amount: number,
  fromUnit: string,
  ingredientName: string
): number | null {
  const gramsPerCup = getDryGramsPerCup(ingredientName);
  if (gramsPerCup === null) return null;

  // Convert the amount to cups first, then multiply by grams-per-cup
  const amountInCups = convertVolume(amount, fromUnit, 'cup');
  return amountInCups * gramsPerCup;
}

/**
 * Convert grams of a dry ingredient to a volume amount in cups.
 * Used for metric→imperial conversion of dry goods.
 */
function convertDryGramsToVolume(
  amountInGrams: number,
  ingredientName: string
): { amount: number; unit: string } | null {
  const gramsPerCup = getDryGramsPerCup(ingredientName);
  if (gramsPerCup === null) return null;

  const cups = amountInGrams / gramsPerCup;

  // Use tsp/tbsp for small amounts
  if (cups < 1 / 16) {
    return { amount: cups * 48, unit: 'tsp' }; // 48 tsp per cup
  }
  if (cups < 1 / 4) {
    return { amount: cups * 16, unit: 'tbsp' }; // 16 tbsp per cup
  }

  return { amount: cups, unit: 'cup' };
}

export function getTargetUnit(unit: string, preference: UnitSystem): string {
  const normalized = unit.toLowerCase();

  if (preference === 'imperial') {
    if (normalized in VOLUME_TO_ML) {
      return IMPERIAL_VOLUME_PREFERRED[normalized] || 'cup';
    }
    if (normalized in WEIGHT_TO_GRAMS) {
      return IMPERIAL_WEIGHT_PREFERRED[normalized] || 'oz';
    }
  } else {
    if (normalized in VOLUME_TO_ML) {
      return METRIC_VOLUME_PREFERRED[normalized] || 'ml';
    }
    if (normalized in WEIGHT_TO_GRAMS) {
      return METRIC_WEIGHT_PREFERRED[normalized] || 'g';
    }
  }

  return unit;
}

/** Common fraction lookup — maps decimal to Unicode vulgar fraction. */
const FRACTION_MAP: [number, string][] = [
  [0.125, '⅛'],
  [0.25,  '¼'],
  [0.333, '⅓'],
  [0.375, '⅜'],
  [0.5,   '½'],
  [0.625, '⅝'],
  [0.667, '⅔'],
  [0.75,  '¾'],
  [0.875, '⅞'],
];

/**
 * Format a numeric amount for display.
 *
 * @param num - The numeric amount
 * @param useFractions - When true, use vulgar fractions (½, ¼, ¾) for imperial.
 *                       When false (metric), round to whole numbers.
 */
export function formatAmount(num: number, useFractions = false): string {
  if (num === 0) return '0';

  const whole = Math.floor(num);
  const frac = num - whole;

  // Pure whole number
  if (frac < 0.05) return Math.round(num).toString();
  // Close enough to next whole number (e.g. 2.96)
  if (frac > 0.95) return (whole + 1).toString();

  // For imperial: try to match a common fraction
  if (useFractions) {
    for (const [value, symbol] of FRACTION_MAP) {
      if (Math.abs(frac - value) < 0.03) {
        return whole > 0 ? `${whole} ${symbol}` : symbol;
      }
    }
  }

  // No matching fraction or metric — round to whole
  return Math.round(num).toString();
}

/**
 * Display a converted amount with unit, preference-aware.
 *
 * @param amount - The numeric amount
 * @param unit - The stored unit
 * @param preference - User's preferred unit system
 * @param originalText - The original ingredient text (fallback display)
 * @param ingredientName - Optional ingredient name for liquid/dry classification
 */
export function displayAmount(
  amount: number | null,
  unit: string | null,
  preference: UnitSystem,
  originalText: string,
  ingredientName?: string
): string {
  // Guard against undefined/null originalText from malformed ingredient data
  const safeOriginal = originalText || '';

  if (amount === null || unit === null) {
    return safeOriginal;
  }

  // "T." = tablespoon (uppercase), "t." = teaspoon — resolve before lowercasing
  const normalized = unit === 'T.' || unit === 'T' ? 'tbsp' : unit.toLowerCase();

  if (!canConvert(normalized)) {
    return safeOriginal;
  }

  // Determine if conversion is needed
  const isMetricUnit = normalized in VOLUME_TO_ML
    ? ['ml', 'l', 'milliliter', 'milliliters', 'liter', 'liters'].includes(normalized)
    : ['g', 'kg', 'gram', 'grams', 'kilogram', 'kilograms'].includes(normalized);

  const needsConversion =
    (preference === 'metric' && !isMetricUnit) ||
    (preference === 'imperial' && isMetricUnit);

  if (!needsConversion) {
    // No conversion needed, but still standardize the display format
    return formatStandardDisplay(amount, normalized, safeOriginal);
  }

  // Extract ingredient name from original text if not provided
  const ingredientContext = ingredientName || extractIngredientFromText(safeOriginal);

  // Check if this is a volume unit that might need liquid/dry routing
  const isVolumeUnit = normalized in VOLUME_TO_ML;
  const isWeightUnit = normalized in WEIGHT_TO_GRAMS;

  // --- Volume unit conversion with liquid/dry awareness ---
  if (isVolumeUnit) {
    const liquid = isLiquidIngredient(ingredientContext);

    if (preference === 'metric') {
      // Imperial volume → metric
      if (!liquid) {
        // Dry ingredient: try to convert to grams
        const grams = convertDryVolumeToGrams(amount, normalized, ingredientContext);
        if (grams !== null) {
          // Use kg for large amounts
          if (grams >= 1000) {
            return formatConvertedDisplay(grams / 1000, 'kg', amount, unit, safeOriginal);
          }
          return formatConvertedDisplay(grams, 'g', amount, unit, safeOriginal);
        }
      }
      // Liquid or unknown dry: convert to ml (original behavior)
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertVolume(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, safeOriginal);
    } else {
      // Metric volume → imperial volume (liquid stays as volume)
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertVolume(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, safeOriginal);
    }
  }

  // --- Weight unit conversion with liquid/dry awareness ---
  if (isWeightUnit) {
    if (preference === 'imperial') {
      // Metric weight → imperial
      // For dry ingredients with a known density, convert to cups
      const liquid = isLiquidIngredient(ingredientContext);
      if (!liquid && !isMetricUnit) {
        // Already imperial weight, no conversion needed
        return safeOriginal;
      }
      if (!liquid) {
        // Try to convert grams to cups for dry ingredients
        const fromGrams = WEIGHT_TO_GRAMS[normalized];
        if (fromGrams) {
          const totalGrams = amount * fromGrams;
          const volumeResult = convertDryGramsToVolume(totalGrams, ingredientContext);
          if (volumeResult) {
            return formatConvertedDisplay(volumeResult.amount, volumeResult.unit, amount, unit, safeOriginal);
          }
        }
      }
      // Fallback: standard weight→weight conversion
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertWeight(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, safeOriginal);
    } else {
      // Imperial weight → metric weight
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertWeight(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, safeOriginal);
    }
  }

  return safeOriginal;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the ingredient name from an ingredient text line.
 * "2 cups all-purpose flour" → "all-purpose flour"
 */
function extractIngredientFromText(text: string): string {
  return (text || '')
    .replace(/^[\d\s/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+/, '')
    .replace(/^(tsp\.?|teaspoons?|tbsp\.?|tablespoons?|oz\.?|ounces?|fl\.?\s*oz\.?|cups?|c\.?|pints?|pt\.?|quarts?|qt\.?|gallons?|gal\.?|ml|milliliters?|l|liters?|g|grams?|kg|kilograms?|lbs?\.?|pounds?|[tT]\.)\s*/i, '')
    .trim();
}

/**
 * Format a non-converted ingredient with standardized unit display.
 * "2 Cups flour" → "2 cups flour", "250 grams sugar" → "250g sugar"
 */
function formatStandardDisplay(
  amount: number,
  normalizedUnit: string,
  originalText: string
): string {
  const ingredientName = extractIngredientFromText(originalText);
  const displayUnit = canonicalUnit(normalizedUnit, amount);
  const useFractions = IMPERIAL_UNITS.has(displayUnit);
  const formattedAmount = formatAmount(amount, useFractions);
  const separator = COMPACT_UNITS.has(displayUnit) ? '' : ' ';
  return `${formattedAmount}${separator}${displayUnit} ${ingredientName}`.trim();
}

/**
 * Format a converted display string with canonical units.
 * Shows: "250g flour", "2 cups flour"
 */
function formatConvertedDisplay(
  convertedAmount: number,
  targetUnit: string,
  _originalAmount: number,
  _originalUnit: string,
  originalText: string
): string {
  const ingredientName = extractIngredientFromText(originalText);
  const displayUnit = canonicalUnit(targetUnit, convertedAmount);
  const useFractions = IMPERIAL_UNITS.has(displayUnit);
  const formattedAmount = formatAmount(convertedAmount, useFractions);
  const separator = COMPACT_UNITS.has(displayUnit) ? '' : ' ';
  return `${formattedAmount}${separator}${displayUnit} ${ingredientName}`.trim();
}
