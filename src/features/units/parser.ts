// Ingredient parser
import { ParsedIngredient } from './types';

// Unicode fraction mappings
const FRACTION_MAP: Record<string, number> = {
  '½': 0.5,
  '⅓': 0.333333,
  '⅔': 0.666667,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 0.166667,
  '⅚': 0.833333,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

// Ambiguous terms that can't be reliably converted
const AMBIGUOUS_TERMS = [
  'pinch',
  'dash',
  'handful',
  'bunch',
  'sprig',
  'to taste',
  'some',
  'dollop',
  'smidgen',
  'sprinkle',
];

// Known units pattern — canonical forms that match the conversion tables
const KNOWN_UNITS = [
  'tsp',
  'teaspoon',
  'teaspoons',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'oz',
  'ounce',
  'ounces',
  'fl oz',
  'cup',
  'cups',
  'pint',
  'pints',
  'quart',
  'quarts',
  'gallon',
  'gallons',
  'ml',
  'milliliter',
  'milliliters',
  'l',
  'liter',
  'liters',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'lb',
  'lbs',
  'pound',
  'pounds',
];

// Short abbreviations common on handwritten/typed recipe cards.
// Maps to the canonical unit name used in KNOWN_UNITS / conversion tables.
const ABBREVIATION_MAP: Record<string, string> = {
  'c': 'cup',
  't': 'tsp',
  'T': 'tbsp',
};

export function parseIngredient(text: string): ParsedIngredient {
  const original = text;
  let remaining = text.trim();

  if (!remaining) {
    return {
      amount: null,
      amountDisplay: null,
      unit: null,
      ingredient: '',
      original,
      isAmbiguous: false,
    };
  }

  // Check for ambiguous terms first
  const lowerText = remaining.toLowerCase();
  for (const term of AMBIGUOUS_TERMS) {
    if (lowerText.includes(term)) {
      return {
        amount: null,
        amountDisplay: null,
        unit: null,
        ingredient: remaining,
        original,
        isAmbiguous: true,
      };
    }
  }

  let amount: number | null = null;
  let unit: string | null = null;
  // Track original amount text to preserve fractions for display
  const amountStart = remaining;

  // Try to parse amount at the start
  // Handle multiple formats: decimal, whole+fraction, standalone fraction, unicode fractions

  // Check for unicode fraction first (simplest case)
  const unicodeFractionMatch = remaining.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
  if (unicodeFractionMatch) {
    amount = FRACTION_MAP[unicodeFractionMatch[1]] || 0;
    remaining = remaining.slice(unicodeFractionMatch[0].length).trim();
  }

  // Check for number (decimal or whole) - but be careful about slash fractions
  // Match: \d+\.?\d* but NOT if followed immediately by "/" (that's a slash fraction)
  const numberMatch = remaining.match(/^(\d+)(?:\.(\d+))?(?![/])/);
  if (numberMatch) {
    const wholeOrDecimal = numberMatch[2] !== undefined ?
      parseFloat(`${numberMatch[1]}.${numberMatch[2]}`) :
      parseInt(numberMatch[1], 10);

    amount = (amount || 0) + wholeOrDecimal;
    remaining = remaining.slice(numberMatch[0].length).trim();

    // Check for slash fraction after the number (e.g., "1 1/2")
    const followingFraction = remaining.match(/^(\d+)\/(\d+)/);
    if (followingFraction) {
      const numerator = parseInt(followingFraction[1], 10);
      const denominator = parseInt(followingFraction[2], 10);
      amount += numerator / denominator;
      remaining = remaining.slice(followingFraction[0].length).trim();
    }

    // Check for unicode fraction after the number (e.g., "1½")
    const followingUnicode = remaining.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
    if (followingUnicode) {
      amount += FRACTION_MAP[followingUnicode[1]] || 0;
      remaining = remaining.slice(followingUnicode[0].length).trim();
    }
  } else {
    // No decimal/whole number found, check for standalone slash fraction
    const slashFractionMatch = remaining.match(/^(\d+)\/(\d+)/);
    if (slashFractionMatch) {
      const numerator = parseInt(slashFractionMatch[1], 10);
      const denominator = parseInt(slashFractionMatch[2], 10);
      amount = (amount || 0) + numerator / denominator;
      remaining = remaining.slice(slashFractionMatch[0].length).trim();
    }
  }

  // Extract the original amount text (preserves fractions like "1/2", "1 1/2", "½")
  const amountDisplay = amount !== null
    ? amountStart.slice(0, amountStart.length - remaining.length).trim()
    : null;

  // Try to extract unit
  // Build regex pattern from known units (longest first to match "fl oz" before "oz")
  // The optional \.? handles period-abbreviated units (tsp., tbsp., lb., etc.)
  const sortedUnits = [...KNOWN_UNITS].sort((a, b) => b.length - a.length);
  const unitPattern = new RegExp(`^(${sortedUnits.join('|')})\\.?(?=\\s|$)`, 'i');
  const unitMatch = remaining.match(unitPattern);

  if (unitMatch) {
    unit = unitMatch[1];
    remaining = remaining.slice(unitMatch[0].length).trim();
  } else {
    // Check for single-letter abbreviations (c., t., T.) — case-sensitive
    // These are common on handwritten recipe cards and need special handling
    // because they're too short for a reliable word-boundary match.
    const abbrMatch = remaining.match(/^([ctT])\.?\s/);
    if (abbrMatch) {
      const abbr = abbrMatch[1];
      if (abbr in ABBREVIATION_MAP) {
        unit = ABBREVIATION_MAP[abbr];
        remaining = remaining.slice(abbrMatch[0].length).trim();
      }
    }
  }

  // The rest is the ingredient name
  const ingredient = remaining;

  return {
    amount,
    amountDisplay,
    unit,
    ingredient,
    original,
    isAmbiguous: false,
  };
}
