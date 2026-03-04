export interface ConfidenceThresholds {
  low: number;
  medium: number;
  high: number;
}

export interface FieldWeight {
  title: number;
  ingredients: number;
  instructions: number;
  prepTime: number;
  cookTime: number;
  servings: number;
}

export interface ConfidenceAnalysis {
  overall: number;
  fieldConfidence: Record<string, number>;
  fieldWeights: FieldWeight;
  weightedScore: number;
  status: 'ready' | 'needs_review' | 'enhanced';
  flaggedFields: Array<{
    field: string;
    confidence: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    field: string;
    action: string;
    suggestedImprovement: string;
  }>;
}

export interface ConfidenceMetrics {
  fieldScore: number;
  dataQuality: number;
  consistencyScore: number;
  completenessScore: number;
  overallReliability: number;
}

export class ConfidenceScoringService {
  private defaultThresholds: ConfidenceThresholds = {
    low: 0.5,
    medium: 0.75,
    high: 0.9,
  };

  private defaultWeights: FieldWeight = {
    title: 0.15,
    ingredients: 0.35,
    instructions: 0.35,
    prepTime: 0.05,
    cookTime: 0.05,
    servings: 0.05,
  };

  /**
   * Calculate comprehensive confidence analysis
   */
  analyzeConfidence(
    fieldConfidence: Record<string, number>,
    structuredData?: any,
    options: {
      thresholds?: Partial<ConfidenceThresholds>;
      weights?: Partial<FieldWeight>;
      strict?: boolean;
    } = {}
  ): ConfidenceAnalysis {
    const thresholds = { ...this.defaultThresholds, ...options.thresholds };
    const weights = { ...this.defaultWeights, ...options.weights };

    // Calculate weighted overall score
    const weightedScore = this.calculateWeightedScore(fieldConfidence, weights);
    
    // Calculate simple average
    const confidenceValues = Object.values(fieldConfidence);
    const overall = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;

    // Determine status
    const status = this.determineStatus(weightedScore, thresholds, options.strict);

    // Identify flagged fields
    const flaggedFields = this.identifyFlaggedFields(fieldConfidence, thresholds);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      flaggedFields,
      structuredData,
      fieldConfidence
    );

    return {
      overall,
      fieldConfidence,
      fieldWeights: weights,
      weightedScore,
      status,
      flaggedFields,
      recommendations,
    };
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedScore(
    fieldConfidence: Record<string, number>,
    weights: FieldWeight
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [field, confidence] of Object.entries(fieldConfidence)) {
      const weight = (weights as any)[field];
      if (weight && confidence !== undefined) {
        totalScore += confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Determine status based on confidence score
   */
  private determineStatus(
    score: number,
    thresholds: ConfidenceThresholds,
    strict = false
  ): 'ready' | 'needs_review' | 'enhanced' {
    if (strict) {
      if (score >= thresholds.high) return 'ready';
      if (score >= thresholds.medium) return 'needs_review';
      return 'enhanced';
    }

    // More lenient status determination
    if (score >= thresholds.medium) return 'ready';
    if (score >= thresholds.low) return 'needs_review';
    return 'enhanced';
  }

  /**
   * Identify fields that need attention
   */
  private identifyFlaggedFields(
    fieldConfidence: Record<string, number>,
    thresholds: ConfidenceThresholds
  ): Array<{
    field: string;
    confidence: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const flagged: Array<{
      field: string;
      confidence: number;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    for (const [field, confidence] of Object.entries(fieldConfidence)) {
      if (confidence < thresholds.low) {
        flagged.push({
          field,
          confidence,
          reason: 'Very low confidence - likely OCR error',
          priority: 'high',
        });
      } else if (confidence < thresholds.medium) {
        flagged.push({
          field,
          confidence,
          reason: 'Low confidence - may need manual review',
          priority: 'medium',
        });
      } else if (confidence < thresholds.high) {
        flagged.push({
          field,
          confidence,
          reason: 'Medium confidence - minor issues possible',
          priority: 'low',
        });
      }
    }

    return flagged.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    flaggedFields: Array<{ field: string; confidence: number; priority: 'high' | 'medium' | 'low' }>,
    structuredData?: any,
    fieldConfidence?: Record<string, number>
  ): Array<{
    field: string;
    action: string;
    suggestedImprovement: string;
  }> {
    const recommendations = [];

    for (const flagged of flaggedFields) {
      const { field, confidence } = flagged;

      switch (field) {
        case 'title':
          recommendations.push({
            field,
            action: 'enhance',
            suggestedImprovement: 'Use AI enhancement to correct OCR errors in recipe title',
          });
          break;

        case 'ingredients':
          recommendations.push({
            field,
            action: 'review',
            suggestedImprovement: 'Manually review ingredient list for missing quantities or units',
          });
          if (structuredData?.ingredients) {
            const incompleteIngredients = structuredData.ingredients.filter(
              (ing: any) => !ing.quantity || !ing.unit
            );
            if (incompleteIngredients.length > 0) {
              recommendations.push({
                field,
                action: 'complete',
                suggestedImprovement: `${incompleteIngredients.length} ingredients missing quantities or units`,
              });
            }
          }
          break;

        case 'instructions':
          recommendations.push({
            field,
            action: 'enhance',
            suggestedImprovement: 'Review step numbering and add missing cooking verbs',
          });
          if (structuredData?.instructions) {
            const vagueInstructions = structuredData.instructions.filter(
              (instr: any) => instr.text.length < 10
            );
            if (vagueInstructions.length > 0) {
              recommendations.push({
                field,
                action: 'expand',
                suggestedImprovement: `${vagueInstructions.length} instructions are too brief`,
              });
            }
          }
          break;

        case 'prepTime':
        case 'cookTime':
          recommendations.push({
            field,
            action: 'verify',
            suggestedImprovement: 'Verify time values and add cooking context',
          });
          break;

        case 'servings':
          recommendations.push({
            field,
            action: 'confirm',
            suggestedImprovement: 'Confirm serving size or calculate from ingredient quantities',
          });
          break;

        default:
          recommendations.push({
            field,
            action: 'review',
            suggestedImprovement: 'Manual review recommended for this field',
          });
      }
    }

    return recommendations;
  }

  /**
   * Calculate detailed confidence metrics
   */
  calculateMetrics(
    fieldConfidence: Record<string, number>,
    structuredData?: any,
    rawText?: string
  ): ConfidenceMetrics {
    // Field score: Average of all field confidences
    const confidenceValues = Object.values(fieldConfidence);
    const fieldScore = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;

    // Data quality: Based on completeness and structure
    const dataQuality = this.calculateDataQuality(structuredData);

    // Consistency score: Internal consistency of extracted data
    const consistencyScore = this.calculateConsistency(structuredData);

    // Completeness score: Percentage of expected fields present
    const completenessScore = this.calculateCompleteness(structuredData);

    // Overall reliability: Weighted combination
    const overallReliability = (
      fieldScore * 0.4 +
      dataQuality * 0.3 +
      consistencyScore * 0.2 +
      completenessScore * 0.1
    );

    return {
      fieldScore,
      dataQuality,
      consistencyScore,
      completenessScore,
      overallReliability,
    };
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(structuredData?: any): number {
    if (!structuredData) return 0;

    let score = 0;
    let maxScore = 0;

    // Title quality
    if (structuredData.title) {
      maxScore += 10;
      if (structuredData.title.length > 5 && structuredData.title.length < 60) {
        score += 10;
      } else if (structuredData.title.length > 0) {
        score += 5;
      }
    }

    // Ingredients quality
    if (structuredData.ingredients && Array.isArray(structuredData.ingredients)) {
      maxScore += 30;
      const validIngredients = structuredData.ingredients.filter(
        (ing: any) => ing.text && ing.text.trim().length > 0
      );
      score += (validIngredients.length / Math.max(structuredData.ingredients.length, 1)) * 30;

      // Extra points for quantity/unit completeness
      const completeIngredients = validIngredients.filter(
        (ing: any) => ing.quantity && ing.unit
      );
      if (validIngredients.length > 0) {
        score += (completeIngredients.length / validIngredients.length) * 10;
        maxScore += 10;
      }
    }

    // Instructions quality
    if (structuredData.instructions && Array.isArray(structuredData.instructions)) {
      maxScore += 30;
      const validInstructions = structuredData.instructions.filter(
        (instr: any) => instr.text && instr.text.trim().length > 5
      );
      score += (validInstructions.length / Math.max(structuredData.instructions.length, 1)) * 30;
    }

    // Metadata quality
    if (structuredData.prepTimeMinutes || structuredData.cookTimeMinutes) {
      maxScore += 15;
      score += 15;
    }

    if (structuredData.servings && structuredData.servings > 0) {
      maxScore += 15;
      score += 15;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistency(structuredData?: any): number {
    if (!structuredData) return 0;

    let consistencyScore = 1.0;

    // Check ingredient quantity consistency
    if (structuredData.ingredients && Array.isArray(structuredData.ingredients)) {
      const quantities = structuredData.ingredients
        .map((ing: any) => ing.quantity)
        .filter((q: any) => q !== undefined && q !== null && q > 0);

      if (quantities.length > 1) {
        // Check for reasonable quantity ranges
        const maxQuantity = Math.max(...quantities);
        const minQuantity = Math.min(...quantities);

        // Flag unusual quantity ratios (e.g., 1000 cups vs 1 tsp)
        if (maxQuantity / minQuantity > 1000) {
          consistencyScore -= 0.2;
        }
      }
    }

    // Check time consistency
    if (structuredData.prepTimeMinutes && structuredData.cookTimeMinutes) {
      if (structuredData.prepTimeMinutes < 0 || structuredData.cookTimeMinutes < 0) {
        consistencyScore -= 0.3;
      }
      if (structuredData.prepTimeMinutes > 480) { // 8 hours prep time seems excessive
        consistencyScore -= 0.2;
      }
      if (structuredData.cookTimeMinutes > 1440) { // More than 24 hours cooking time
        consistencyScore -= 0.3;
      }
    }

    // Check servings consistency
    if (structuredData.servings) {
      if (structuredData.servings <= 0 || structuredData.servings > 100) {
        consistencyScore -= 0.2;
      }
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(structuredData?: any): number {
    if (!structuredData) return 0;

    const expectedFields = ['title', 'ingredients', 'instructions', 'servings'];
    let presentFields = 0;

    if (structuredData.title && structuredData.title.trim().length > 0) {
      presentFields++;
    }

    if (structuredData.ingredients && structuredData.ingredients.length > 0) {
      presentFields++;
    }

    if (structuredData.instructions && structuredData.instructions.length > 0) {
      presentFields++;
    }

    if (structuredData.servings && structuredData.servings > 0) {
      presentFields++;
    }

    return presentFields / expectedFields.length;
  }

  /**
   * Get user-friendly confidence description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.6) return 'Fair';
    if (confidence >= 0.5) return 'Low';
    return 'Very Low';
  }

  /**
   * Get color for confidence indicator
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  /**
   * Get icon for confidence level
   */
  getConfidenceIcon(confidence: number): string {
    if (confidence >= 0.8) return '✓';
    if (confidence >= 0.6) return '⚠';
    return '✗';
  }

  /**
   * Determine if AI enhancement is recommended
   */
  shouldEnhance(
    field: string,
    confidence: number,
    thresholds?: Partial<ConfidenceThresholds>
  ): boolean {
    const finalThresholds = { ...this.defaultThresholds, ...thresholds };
    
    // Always recommend enhancement for very low confidence
    if (confidence < finalThresholds.low) return true;

    // Recommend enhancement for certain important fields
    const importantFields = ['title', 'ingredients', 'instructions'];
    if (importantFields.includes(field) && confidence < finalThresholds.medium) {
      return true;
    }

    return false;
  }

  /**
   * Get priority for field review
   */
  getFieldReviewPriority(
    field: string,
    confidence: number,
    importance: 'critical' | 'important' | 'optional' = 'important'
  ): 'high' | 'medium' | 'low' | 'none' {
    const thresholds = this.defaultThresholds;

    // Critical fields always high priority if low confidence
    if (importance === 'critical' && confidence < thresholds.medium) {
      return 'high';
    }

    // Important fields based on confidence
    if (importance === 'important') {
      if (confidence < thresholds.low) return 'high';
      if (confidence < thresholds.medium) return 'medium';
      if (confidence < thresholds.high) return 'low';
    }

    // Optional fields only if very low confidence
    if (importance === 'optional' && confidence < thresholds.low) {
      return 'low';
    }

    return 'none';
  }
}

// Singleton instance
export const confidenceScoringService = new ConfidenceScoringService();