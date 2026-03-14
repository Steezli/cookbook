/**
 * Backfill structured amount/unit fields on recipe ingredients.
 *
 * Reads every recipe's ingredients JSONB array, runs each element through
 * the ingredient parser, and writes back amount/unit/original_text/is_ambiguous
 * for ingredients that don't already have structured data.
 *
 * Safe to run multiple times — skips ingredients that already have amount set.
 *
 * Usage:
 *   node scripts/backfill-ingredients.mjs              # dry-run (default)
 *   node scripts/backfill-ingredients.mjs --apply       # actually update DB
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

// ─── Inline parser (mirrors src/features/units/parser.ts) ────────────────────
// We inline it because the source uses TypeScript + path aliases that
// don't resolve in plain Node ESM.

const FRACTION_MAP = {
  '½': 0.5, '⅓': 0.333333, '⅔': 0.666667, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.166667,
  '⅚': 0.833333, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

const AMBIGUOUS_TERMS = [
  'pinch', 'dash', 'handful', 'bunch', 'sprig',
  'to taste', 'some', 'dollop', 'smidgen', 'sprinkle',
];

const KNOWN_UNITS = [
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'oz', 'ounce', 'ounces', 'fl oz',
  'cup', 'cups',
  'pint', 'pints', 'quart', 'quarts',
  'gallon', 'gallons',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'lb', 'pound', 'pounds',
  'count',
];

function parseIngredient(text) {
  const original = text;
  let remaining = text.trim();

  if (!remaining) {
    return { amount: null, unit: null, ingredient: '', original, isAmbiguous: false };
  }

  const lowerText = remaining.toLowerCase();
  for (const term of AMBIGUOUS_TERMS) {
    if (lowerText.includes(term)) {
      return { amount: null, unit: null, ingredient: remaining, original, isAmbiguous: true };
    }
  }

  let amount = null;
  let unit = null;

  // Unicode fraction
  const unicodeFractionMatch = remaining.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
  if (unicodeFractionMatch) {
    amount = FRACTION_MAP[unicodeFractionMatch[1]] || 0;
    remaining = remaining.slice(unicodeFractionMatch[0].length).trim();
  }

  // Number (decimal or whole)
  const numberMatch = remaining.match(/^(\d+)(?:\.(\d+))?(?![/])/);
  if (numberMatch) {
    const wholeOrDecimal = numberMatch[2] !== undefined
      ? parseFloat(`${numberMatch[1]}.${numberMatch[2]}`)
      : parseInt(numberMatch[1], 10);
    amount = (amount || 0) + wholeOrDecimal;
    remaining = remaining.slice(numberMatch[0].length).trim();

    // Slash fraction after number (e.g., "1 1/2")
    const followingFraction = remaining.match(/^(\d+)\/(\d+)/);
    if (followingFraction) {
      amount += parseInt(followingFraction[1], 10) / parseInt(followingFraction[2], 10);
      remaining = remaining.slice(followingFraction[0].length).trim();
    }

    // Unicode fraction after number (e.g., "1½")
    const followingUnicode = remaining.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
    if (followingUnicode) {
      amount += FRACTION_MAP[followingUnicode[1]] || 0;
      remaining = remaining.slice(followingUnicode[0].length).trim();
    }
  } else {
    // Standalone slash fraction
    const slashFractionMatch = remaining.match(/^(\d+)\/(\d+)/);
    if (slashFractionMatch) {
      amount = (amount || 0) + parseInt(slashFractionMatch[1], 10) / parseInt(slashFractionMatch[2], 10);
      remaining = remaining.slice(slashFractionMatch[0].length).trim();
    }
  }

  // Extract unit
  const sortedUnits = [...KNOWN_UNITS].sort((a, b) => b.length - a.length);
  const unitPattern = new RegExp(`^(${sortedUnits.join('|')})\\b`, 'i');
  const unitMatch = remaining.match(unitPattern);

  if (unitMatch) {
    unit = unitMatch[1];
    remaining = remaining.slice(unitMatch[0].length).trim();
  }

  return { amount, unit, ingredient: remaining, original, isAmbiguous: false };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const dryRun = !process.argv.includes('--apply');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Auth — needed because RLS restricts access
const { error: authError } = await supabase.auth.signInWithPassword({
  email: 'eli9nicholson@gmail.com',
  password: 'test1234!'
});
if (authError) {
  console.error('Auth failed:', authError.message);
  process.exit(1);
}

// Fetch all recipes (paginate if > 1000)
let allRecipes = [];
let from = 0;
const pageSize = 100;

while (true) {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, ingredients')
    .range(from, from + pageSize - 1);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  allRecipes.push(...data);
  if (data.length < pageSize) break;
  from += pageSize;
}

console.log(`Found ${allRecipes.length} recipes`);
console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to write)' : 'APPLYING CHANGES'}\n`);

let totalIngredients = 0;
let alreadyStructured = 0;
let backfilled = 0;
let unparseable = 0;
let ambiguous = 0;
let recipesUpdated = 0;

for (const recipe of allRecipes) {
  const ings = recipe.ingredients;
  let changed = false;

  const updatedIngs = ings.map((ing) => {
    totalIngredients++;

    // Skip if already has structured amount
    if (ing.amount !== undefined && ing.amount !== null) {
      alreadyStructured++;
      return ing;
    }

    // Parse the text
    const parsed = parseIngredient(ing.text);

    if (parsed.isAmbiguous) {
      ambiguous++;
      changed = true;
      return {
        ...ing,
        amount: null,
        unit: null,
        original_text: ing.text,
        is_ambiguous: true,
      };
    }

    if (parsed.amount !== null && parsed.unit !== null) {
      backfilled++;
      changed = true;
      console.log(`  ✅ "${ing.text}" → amount=${parsed.amount}, unit=${parsed.unit}`);
      return {
        ...ing,
        amount: parsed.amount,
        unit: parsed.unit,
        original_text: ing.text,
        is_ambiguous: false,
      };
    }

    // Parser couldn't extract — leave as-is but mark with null amount
    unparseable++;
    console.log(`  ⚠️  "${ing.text}" → unparseable`);
    return {
      ...ing,
      amount: null,
      unit: null,
      original_text: ing.text,
      is_ambiguous: false,
    };
  });

  if (changed) {
    recipesUpdated++;
    console.log(`\n📝 ${recipe.title}: ${ings.length} ingredients`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ ingredients: updatedIngs })
        .eq('id', recipe.id);

      if (updateError) {
        console.error(`  ❌ Update failed for "${recipe.title}": ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated`);
      }
    } else {
      console.log(`  (dry run — would update)`);
    }
  }
}

console.log(`
╔══════════════════════════════════════╗
║        Backfill Summary             ║
╠══════════════════════════════════════╣
║  Total ingredients:  ${String(totalIngredients).padStart(5)}          ║
║  Already structured: ${String(alreadyStructured).padStart(5)}          ║
║  Backfilled:         ${String(backfilled).padStart(5)}          ║
║  Ambiguous:          ${String(ambiguous).padStart(5)}          ║
║  Unparseable:        ${String(unparseable).padStart(5)}          ║
║  Recipes updated:    ${String(recipesUpdated).padStart(5)}          ║
╚══════════════════════════════════════╝
`);
