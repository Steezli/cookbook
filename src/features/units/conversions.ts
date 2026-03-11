// Unit conversion functions
import { UnitSystem } from './types';

// Volume conversion table - all values in milliliters
const VOLUME_TO_ML: Record<string, number> = {
  // US customary
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  cups: 236.588,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  // Metric
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

// Weight conversion table - all values in grams
const WEIGHT_TO_GRAMS: Record<string, number> = {
  // Imperial
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
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

// Preferred target units for different magnitudes
const IMPERIAL_VOLUME_PREFERRED: Record<string, string> = {
  tsp: 'tsp',
  tbsp: 'tbsp',
  'fl oz': 'fl oz',
  cup: 'cup',
  ml: 'cup', // default to cup for metric->imperial
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

export function convertVolume(amount: number, fromUnit: string, toUnit: string): number {
  const fromMl = VOLUME_TO_ML[fromUnit.toLowerCase()];
  const toMl = VOLUME_TO_ML[toUnit.toLowerCase()];

  if (!fromMl || !toMl) {
    return amount; // Return original if conversion not possible
  }

  const ml = amount * fromMl;
  return ml / toMl;
}

export function convertWeight(amount: number, fromUnit: string, toUnit: string): number {
  const fromGrams = WEIGHT_TO_GRAMS[fromUnit.toLowerCase()];
  const toGrams = WEIGHT_TO_GRAMS[toUnit.toLowerCase()];

  if (!fromGrams || !toGrams) {
    return amount; // Return original if conversion not possible
  }

  const grams = amount * fromGrams;
  return grams / toGrams;
}

export function canConvert(unit: string): boolean {
  const normalized = unit.toLowerCase();
  return normalized in VOLUME_TO_ML || normalized in WEIGHT_TO_GRAMS;
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

  return unit; // Return original if not found
}

export function formatAmount(num: number): string {
  // Round to the nearest whole number
  return Math.round(num).toString();
}

export function displayAmount(
  amount: number | null,
  unit: string | null,
  preference: UnitSystem,
  originalText: string
): string {
  // If no amount or unit, return original
  if (amount === null || unit === null) {
    return originalText;
  }

  const normalized = unit.toLowerCase();

  // Check if unit can be converted
  if (!canConvert(normalized)) {
    return originalText;
  }

  // Determine if conversion is needed
  const isMetricUnit = normalized in VOLUME_TO_ML ?
    ['ml', 'l', 'milliliter', 'milliliters', 'liter', 'liters'].includes(normalized) :
    ['g', 'kg', 'gram', 'grams', 'kilogram', 'kilograms'].includes(normalized);

  const needsConversion = (preference === 'metric' && !isMetricUnit) ||
                          (preference === 'imperial' && isMetricUnit);

  // If no conversion needed, return original
  if (!needsConversion) {
    return originalText;
  }

  // Convert
  const targetUnit = getTargetUnit(normalized, preference);
  let convertedAmount: number;

  if (normalized in VOLUME_TO_ML) {
    convertedAmount = convertVolume(amount, normalized, targetUnit);
  } else {
    convertedAmount = convertWeight(amount, normalized, targetUnit);
  }

  // Extract ingredient name from original text
  const ingredientMatch = originalText.match(/(?:\d+\.?\d*\s*(?:[a-z]+\s+)?)?(.+)$/i);
  const ingredientName = ingredientMatch ? ingredientMatch[1] : '';

  // Format: "converted target (original amount unit) ingredient"
  return `${formatAmount(convertedAmount)} ${targetUnit} (${amount} ${unit}) ${ingredientName}`.trim();
}
