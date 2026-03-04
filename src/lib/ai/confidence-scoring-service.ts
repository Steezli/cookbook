import { ParsedRecipe, ParsedIngredient, FieldConfidence } from './recipe-parsing-service'

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

export class ConfidenceScoringService {
  private readonly thresholds: ConfidenceThresholds = {
    high: 0.85,
    medium: 0.65,
    low: 0.40
  }

  /**
   * Calculate comprehensive confidence scores for a recipe
   */
  calculateConfidence(
    recipe: ParsedRecipe,
    ocrConfidence: number,
    fieldConfidence: FieldConfidence
  ): OverallConfidence {
    const fieldScores: FieldScore[] = []

    // Score title
    fieldScores.push(this.scoreTitle(recipe.title, fieldConfidence.title))

    // Score ingredients
    fieldScores.push(this.scoreIngredients(recipe.ingredients, fieldConfidence.ingredients))

    // Score instructions
    fieldScores.push(this.scoreInstructions(recipe.instructions, fieldConfidence.instructions))

    // Score metadata fields
    fieldScores.push(this.scorePrepTime(recipe.prepTimeMinutes, fieldConfidence.prepTime))
    fieldScores.push(this.scoreCookTime(recipe.cookTimeMinutes, fieldConfidence.cookTime))
    fieldScores.push(this.scoreServings(recipe.servings, fieldConfidence.servings))

    // Calculate overall score
    const overallScore = this.calculateOverallScore(fieldScores)
    const overallStatus = this.determineStatus(overallScore)
    const priority = this.determinePriority(fieldScores)
    const recommendedActions = this.generateRecommendations(fieldScores, overallStatus)

    return {
      score: overallScore,
      status: overallStatus,
      fieldScores,
      priority,
      recommendedActions
    }
  }

  /**
   * Score recipe title
   */
  private scoreTitle(title: string | undefined, baseConfidence: number): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!title) {
      return {
        field: 'title',
        confidence: 0,
        status: 'enhanced',
        issues: ['No title detected'],
        suggestions: ['Check if title is present in original image', 'Consider manual entry']
      }
    }

    // Length checks
    if (title.length < 3) {
      issues.push('Title too short')
      confidence *= 0.5
      suggestions.push('Title may be truncated')
    } else if (title.length > 100) {
      issues.push('Title too long')
      confidence *= 0.8
      suggestions.push('Title may include extra text')
    }

    // Common OCR issues
    if (title.includes('|') || title.includes('/') || title.includes('\\')) {
      issues.push('Title contains special characters')
      confidence *= 0.9
      suggestions.push('Review special characters in title')
    }

    // Check for common recipe words
    const recipeWords = ['recipe', 'ingredients', 'instructions', 'method', 'directions']
    const lowerTitle = title.toLowerCase()
    if (recipeWords.some(word => lowerTitle.includes(word))) {
      issues.push('Title may include section headers')
      confidence *= 0.7
      suggestions.push('Title might be a section header instead of recipe name')
    }

    return {
      field: 'title',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Score ingredients list
   */
  private scoreIngredients(
    ingredients: ParsedIngredient[] | undefined,
    baseConfidence: number
  ): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!ingredients || ingredients.length === 0) {
      return {
        field: 'ingredients',
        confidence: 0,
        status: 'enhanced',
        issues: ['No ingredients detected'],
        suggestions: ['Check image quality', 'Verify ingredients are clearly visible']
      }
    }

    // Quantity checks
    if (ingredients.length < 3) {
      issues.push('Very few ingredients')
      confidence *= 0.8
      suggestions.push('Recipe may have missing ingredients')
    } else if (ingredients.length > 30) {
      issues.push('Unusually many ingredients')
      confidence *= 0.9
      suggestions.push('May have captured non-ingredient text')
    }

    // Analyze individual ingredient confidence
    const avgIngredientConfidence = ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / ingredients.length
    confidence *= avgIngredientConfidence

    // Check for missing amounts
    const missingAmounts = ingredients.filter(ing => !ing.amount || ing.amount.trim() === '').length
    if (missingAmounts > 0) {
      issues.push(`${missingAmounts} ingredients missing amounts`)
      confidence *= (1 - (missingAmounts / ingredients.length) * 0.3)
      suggestions.push('Review ingredients without specified amounts')
    }

    // Check for unusual units
    const unusualUnits = ['package', 'box', 'bottle', 'jar', 'can']
    const unusualCount = ingredients.filter(ing => 
      ing.unit && unusualUnits.includes(ing.unit.toLowerCase())
    ).length
    if (unusualCount > 0) {
      issues.push(`${unusualCount} ingredients with vague units`)
      confidence *= 0.9
      suggestions.push('Consider specifying exact quantities for packaged items')
    }

    return {
      field: 'ingredients',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Score instructions list
   */
  private scoreInstructions(
    instructions: string[] | undefined,
    baseConfidence: number
  ): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!instructions || instructions.length === 0) {
      return {
        field: 'instructions',
        confidence: 0,
        status: 'enhanced',
        issues: ['No instructions detected'],
        suggestions: ['Check if instructions are present in original image']
      }
    }

    // Length checks
    if (instructions.length < 3) {
      issues.push('Very few instructions')
      confidence *= 0.7
      suggestions.push('Recipe may be missing instruction steps')
    } else if (instructions.length > 20) {
      issues.push('Unusually many steps')
      confidence *= 0.9
      suggestions.push('May have split individual steps too much')
    }

    // Analyze instruction quality
    const avgLength = instructions.reduce((sum, inst) => sum + inst.length, 0) / instructions.length
    if (avgLength < 10) {
      issues.push('Instructions are very short')
      confidence *= 0.8
      suggestions.push('Instructions may be incomplete')
    } else if (avgLength > 200) {
      issues.push('Instructions are very long')
      confidence *= 0.9
      suggestions.push('Consider breaking down long instructions')
    }

    // Check for numbered steps
    const numberedSteps = instructions.filter(inst => inst.match(/^\d+\.?\s*/)).length
    if (numberedSteps < instructions.length * 0.5) {
      issues.push('Instructions may not be properly ordered')
      confidence *= 0.8
      suggestions.push('Review instruction order')
    }

    return {
      field: 'instructions',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Score prep time
   */
  private scorePrepTime(prepTime: number | undefined, baseConfidence: number): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!prepTime) {
      return {
        field: 'prepTime',
        confidence: 0,
        status: 'enhanced',
        issues: ['Prep time not detected'],
        suggestions: ['Check if prep time is mentioned in recipe']
      }
    }

    // Reasonableness checks
    if (prepTime < 1) {
      issues.push('Prep time too short')
      confidence *= 0.3
      suggestions.push('May be measurement error (minutes vs hours)')
    } else if (prepTime > 300) { // 5 hours
      issues.push('Prep time very high')
      confidence *= 0.6
      suggestions.push('May include marinating/resting time')
    }

    return {
      field: 'prepTime',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Score cook time
   */
  private scoreCookTime(cookTime: number | undefined, baseConfidence: number): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!cookTime) {
      return {
        field: 'cookTime',
        confidence: 0,
        status: 'enhanced',
        issues: ['Cook time not detected'],
        suggestions: ['Check if cook time is mentioned in recipe']
      }
    }

    // Reasonableness checks
    if (cookTime < 1) {
      issues.push('Cook time too short')
      confidence *= 0.3
      suggestions.push('May be measurement error (minutes vs hours)')
    } else if (cookTime > 480) { // 8 hours
      issues.push('Cook time very high')
      confidence *= 0.6
      suggestions.push('May include slow cooking time')
    }

    return {
      field: 'cookTime',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Score servings
   */
  private scoreServings(servings: number | undefined, baseConfidence: number): FieldScore {
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = baseConfidence

    if (!servings) {
      return {
        field: 'servings',
        confidence: 0,
        status: 'enhanced',
        issues: ['Servings not detected'],
        suggestions: ['Check if recipe specifies yield or servings']
      }
    }

    // Reasonableness checks
    if (servings < 1) {
      issues.push('Invalid serving count')
      confidence *= 0.2
      suggestions.push('May be OCR error')
    } else if (servings > 50) {
      issues.push('Unusually high serving count')
      confidence *= 0.7
      suggestions.push('May be for bulk preparation')
    }

    return {
      field: 'servings',
      confidence: Math.round(confidence * 100) / 100,
      status: this.determineStatus(confidence),
      issues,
      suggestions
    }
  }

  /**
   * Calculate overall confidence score from field scores
   */
  private calculateOverallScore(fieldScores: FieldScore[]): number {
    // Weight fields by importance
    const weights = {
      title: 0.15,
      ingredients: 0.35,
      instructions: 0.35,
      prepTime: 0.05,
      cookTime: 0.05,
      servings: 0.05
    }

    const weightedSum = fieldScores.reduce((sum, field) => {
      const weight = weights[field.field as keyof typeof weights] || 0.1
      return sum + (field.confidence * weight)
    }, 0)

    return Math.round(weightedSum * 100) / 100
  }

  /**
   * Determine status based on confidence score
   */
  private determineStatus(confidence: number): 'ready' | 'needs_review' | 'enhanced' {
    if (confidence >= this.thresholds.high) return 'ready'
    if (confidence >= this.thresholds.medium) return 'needs_review'
    return 'enhanced'
  }

  /**
   * Determine overall priority based on field scores
   */
  private determinePriority(fieldScores: FieldScore[]): 'high' | 'medium' | 'low' {
    const criticalFields = ['title', 'ingredients', 'instructions']
    const criticalScores = fieldScores.filter(f => criticalFields.includes(f.field))
    
    const hasEnhancement = criticalScores.some(f => f.status === 'enhanced')
    const hasReview = criticalScores.some(f => f.status === 'needs_review')
    
    if (hasEnhancement) return 'high'
    if (hasReview) return 'medium'
    return 'low'
  }

  /**
   * Generate recommended actions based on field scores
   */
  private generateRecommendations(
    fieldScores: FieldScore[],
    overallStatus: 'ready' | 'needs_review' | 'enhanced'
  ): string[] {
    const recommendations: string[] = []

    // Add field-specific recommendations
    fieldScores.forEach(field => {
      if (field.status === 'enhanced') {
        recommendations.push(`Enhance ${field.field}: ${field.suggestions[0] || 'Review field accuracy'}`)
      } else if (field.status === 'needs_review') {
        recommendations.push(`Review ${field.field}: ${field.suggestions[0] || 'Verify field content'}`)
      }
    })

    // Add general recommendations based on overall status
    if (overallStatus === 'enhanced') {
      recommendations.push('Consider re-scanning with better image quality')
      recommendations.push('Manual entry may be faster for this recipe')
    } else if (overallStatus === 'needs_review') {
      recommendations.push('Review all fields before saving')
      recommendations.push('Add any missing information')
    }

    return recommendations.slice(0, 5) // Limit to 5 recommendations
  }

  /**
   * Identify fields that need enhancement
   */
  getFieldsNeedingEnhancement(fieldScores: FieldScore[]): string[] {
    return fieldScores
      .filter(field => field.status === 'enhanced')
      .map(field => field.field)
  }

  /**
   * Identify fields that need review
   */
  getFieldsNeedingReview(fieldScores: FieldScore[]): string[] {
    return fieldScores
      .filter(field => field.status === 'needs_review')
      .map(field => field.field)
  }

  /**
   * Get confidence thresholds
   */
  getThresholds(): ConfidenceThresholds {
    return { ...this.thresholds }
  }

  /**
   * Check if recipe meets minimum quality standards
   */
  meetsMinimumStandards(confidence: OverallConfidence): boolean {
    // Must have at least medium confidence in title, ingredients, and instructions
    const criticalFields = ['title', 'ingredients', 'instructions']
    return criticalFields.every(field => {
      const fieldScore = confidence.fieldScores.find(f => f.field === field)
      return fieldScore ? fieldScore.confidence >= this.thresholds.low : false
    })
  }
}

// Export singleton instance
export const confidenceScoringService = new ConfidenceScoringService()