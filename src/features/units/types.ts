export type UnitSystem = 'metric' | 'imperial';

export interface ParsedIngredient {
  amount: number | null;
  amountDisplay: string | null; // Preserves fractions for display (e.g. "1/2" instead of "0.5")
  unit: string | null;
  ingredient: string;
  original: string;
  isAmbiguous: boolean;
}

export interface EnhancedIngredient {
  text: string;
  sort_order: number;
  amount: number | null;
  unit: string | null;
  original_text: string | null;
  is_ambiguous: boolean;
}
