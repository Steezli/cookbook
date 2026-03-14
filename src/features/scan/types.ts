// Canonical scan type definitions (originally in recipe-parsing-service.ts
// and confidence-scoring-service.ts).

export interface ParsedRecipe {
  title?: string
  ingredients: ParsedIngredient[]
  instructions: string[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  totalTimeMinutes?: number
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  cuisine?: string
  category?: string
  notes?: string[]
}

export interface ParsedIngredient {
  name: string
  amount?: string
  unit?: string
  preparation?: string
  quantity?: number // Numeric version of amount
  confidence: number
  alternatives?: string[] // Alternative interpretations
}

export interface FieldConfidence {
  title: number
  ingredients: number
  instructions: number
  prepTime: number
  cookTime: number
  servings: number
}

export interface ConfidenceThresholds {
  high: number    // >= high: ready for approval
  medium: number  // >= medium: needs review
  low: number     // >= low: needs enhancement
}

export interface FieldScore {
  field: string
  confidence: number
  status: 'ready' | 'needs_review' | 'enhanced'
  issues: string[]
  suggestions: string[]
}

export interface OverallConfidence {
  score: number
  status: 'ready' | 'needs_review' | 'enhanced'
  fieldScores: FieldScore[]
  priority: 'high' | 'medium' | 'low'
  recommendedActions: string[]
}

export interface ConfidenceEnhancement {
  field: string
  original: string | string[]
  enhanced: string | string[]
  confidenceImprovement: number
  aiSuggestions: string[]
}
