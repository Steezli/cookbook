export interface StructuredRecipeData {
  title?: string;
  ingredients?: Array<{
    text: string;
    quantity?: number;
    unit?: string;
    preparation?: string;
    confidence: number;
  }>;
  instructions?: Array<{
    step: number;
    text: string;
    confidence: number;
  }>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  metadata?: {
    detectedSections: string[];
    confidence: number;
  };
}

export interface FieldConfidence {
  title?: number;
  ingredients?: number;
  instructions?: number;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

export interface ParseOptions {
  language?: string;
  minConfidence?: number;
  enableAIGuessing?: boolean;
}

export class RecipeParserService {
  private commonIngredients = [
    'flour', 'sugar', 'salt', 'pepper', 'butter', 'oil', 'egg', 'eggs',
    'milk', 'water', 'onion', 'garlic', 'tomato', 'potato', 'carrot',
    'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta', 'bread', 'cheese'
  ];

  private commonUnits = [
    'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
    'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds', 'g', 'gram', 'grams',
    'kg', 'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters',
    'l', 'liter', 'liters', 'pinch', 'dash', 'clove', 'cloves'
  ];

  private cookingVerbs = [
    'preheat', 'heat', 'cook', 'bake', 'boil', 'simmer', 'fry', 'saute',
    'roast', 'grill', 'steam', 'stir', 'mix', 'whisk', 'fold', 'combine',
    'add', 'remove', 'pour', 'drain', 'season', 'sprinkle', 'garnish'
  ];

  private timeUnits = ['minutes', 'minute', 'mins', 'min', 'hours', 'hour', 'hrs', 'hr'];

  /**
   * Parse OCR text into structured recipe data
   */
  async parseOCRText(
    ocrText: string,
    options: ParseOptions = {}
  ): Promise<{ data: StructuredRecipeData; confidence: FieldConfidence }> {
    const normalizedText = this.normalizeText(ocrText);
    const sections = this.identifySections(normalizedText);

    const result: StructuredRecipeData = {
      metadata: {
        detectedSections: Object.keys(sections),
        confidence: 0,
      },
    };

    const confidence: FieldConfidence = {};

    // Extract title
    if (sections.title) {
      const titleResult = this.extractTitle(sections.title);
      result.title = titleResult.text;
      confidence.title = titleResult.confidence;
    }

    // Extract ingredients
    if (sections.ingredients) {
      const ingredientsResult = this.extractIngredients(sections.ingredients);
      result.ingredients = ingredientsResult.items;
      confidence.ingredients = ingredientsResult.confidence;
    }

    // Extract instructions
    if (sections.instructions) {
      const instructionsResult = this.extractInstructions(sections.instructions);
      result.instructions = instructionsResult.steps;
      confidence.instructions = instructionsResult.confidence;
    }

    // Extract time information
    const timeResult = this.extractTimeInfo(normalizedText);
    if (timeResult.prepTime) {
      result.prepTimeMinutes = timeResult.prepTime;
      confidence.prepTime = timeResult.prepTimeConfidence;
    }
    if (timeResult.cookTime) {
      result.cookTimeMinutes = timeResult.cookTime;
      confidence.cookTime = timeResult.cookTimeConfidence;
    }

    // Extract servings
    const servingsResult = this.extractServings(normalizedText);
    if (servingsResult.servings) {
      result.servings = servingsResult.servings;
      confidence.servings = servingsResult.confidence;
    }

    // Calculate overall confidence
    const confidenceScores = Object.values(confidence).filter(c => c !== undefined) as number[];
    result.metadata!.confidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
      : 0;

    return { data: result, confidence };
  }

  /**
   * Normalize OCR text by fixing common errors
   */
  private normalizeText(text: string): string {
    return text
      // Fix common OCR substitutions
      .replace(/1!/g, 'l')
      .replace(/0/g, 'o')
      .replace(/5/g, 's')
      .replace(/3/g, 'e')
      .replace(/8/g, 'b')
      // Fix spacing
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Identify different sections in the recipe
   */
  private identifySections(text: string): Record<string, string> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const sections: Record<string, string> = {};

    let currentSection = 'intro';
    let sectionContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // Detect section headers
      if (this.isSectionHeader(line)) {
        // Save previous section
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n');
        }

        // Start new section
        currentSection = this.getSectionType(line);
        sectionContent = [];
      } else {
        sectionContent.push(lines[i]);
      }
    }

    // Save last section
    if (sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n');
    }

    return sections;
  }

  /**
   * Check if a line is a section header
   */
  private isSectionHeader(line: string): boolean {
    const headerPatterns = [
      /^(ingredients|ingr|ing)/i,
      /^(instructions|directions|steps|method)/i,
      /^(title|name)/i,
      /^(preparation|prep|prepare)/i,
      /^(cooking|cook|bake)/i,
    ];

    return headerPatterns.some(pattern => pattern.test(line)) && line.length < 30;
  }

  /**
   * Determine section type from header
   */
  private getSectionType(line: string): string {
    if (/ingredients|ingr|ing/i.test(line)) return 'ingredients';
    if (/instructions|directions|steps|method/i.test(line)) return 'instructions';
    if (/title|name/i.test(line)) return 'title';
    if (/preparation|prep|prepare/i.test(line)) return 'prep';
    if (/cooking|cook|bake/i.test(line)) return 'cook';
    return 'other';
  }

  /**
   * Extract recipe title
   */
  private extractTitle(titleText: string): { text: string; confidence: number } {
    const lines = titleText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // The title is usually the first line that's not too long
    for (const line of lines) {
      if (line.length > 5 && line.length < 60 && !this.isSectionHeader(line)) {
        return {
          text: line,
          confidence: 0.8,
        };
      }
    }

    return {
      text: '',
      confidence: 0,
    };
  }

  /**
   * Extract ingredients from text
   */
  private extractIngredients(ingredientsText: string): { items: StructuredRecipeData['ingredients']; confidence: number } {
    const lines = ingredientsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !this.isSectionHeader(line));

    const ingredients: StructuredRecipeData['ingredients'] = [];
    let totalConfidence = 0;

    for (const line of lines) {
      const ingredient = this.parseIngredientLine(line);
      if (ingredient) {
        ingredients.push(ingredient);
        totalConfidence += ingredient.confidence;
      }
    }

    const confidence = ingredients.length > 0 ? totalConfidence / ingredients.length : 0;

    return { items: ingredients, confidence };
  }

  /**
   * Parse a single ingredient line
   */
  private parseIngredientLine(line: string): NonNullable<StructuredRecipeData['ingredients']>[0] | null {
    // Remove bullet points and numbers
    const cleanLine = line.replace(/^[\d\.\-\*]+\s*/, '').trim();
    
    if (cleanLine.length < 2) return null;

    // Try to extract quantity and unit
    const quantityPattern = /^(\d+\/\d+|\d+\.?\d*)\s*([a-zA-Z\.]+)?\s*(.+)$/;
    const match = cleanLine.match(quantityPattern);

    let quantity: number | undefined;
    let unit: string | undefined;
    let text: string;
    let confidence = 0.5; // Base confidence

    if (match) {
      const [, rawQuantity, rawUnit, rawText] = match;
      
      // Parse quantity
      if (rawQuantity) {
        const parsedQuantity = this.parseQuantity(rawQuantity);
        if (parsedQuantity !== null) {
          quantity = parsedQuantity;
          confidence += 0.2;
        }
      }

      // Parse unit
      if (rawUnit) {
        const normalizedUnit = this.normalizeUnit(rawUnit);
        if (this.commonUnits.some(u => normalizedUnit.includes(u))) {
          unit = normalizedUnit;
          confidence += 0.2;
        }
      }

      text = rawText.trim();
    } else {
      text = cleanLine;
    }

    // Check if it contains a common ingredient
    const hasCommonIngredient = this.commonIngredients.some(ing => 
      text.toLowerCase().includes(ing)
    );
    if (hasCommonIngredient) {
      confidence += 0.2;
    }

    // Extract preparation notes (in parentheses, commas)
    const preparationMatch = text.match(/[,\(].*[\)\)]?$/);
    let preparation: string | undefined;
    if (preparationMatch) {
      preparation = preparationMatch[0].trim();
      text = text.replace(preparationMatch[0], '').trim();
      confidence += 0.1;
    }

    // Ensure confidence is within bounds
    confidence = Math.min(Math.max(confidence, 0), 1);

    return {
      text,
      quantity,
      unit,
      preparation,
      confidence,
    };
  }

  /**
   * Parse quantity string to number
   */
  private parseQuantity(quantity: string): number | null {
    if (quantity.includes('/')) {
      const [num, denom] = quantity.split('/');
      const parsedNum = parseInt(num);
      const parsedDenom = parseInt(denom);
      if (!isNaN(parsedNum) && !isNaN(parsedDenom) && parsedDenom > 0) {
        return parsedNum / parsedDenom;
      }
    }

    const parsed = parseFloat(quantity);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Normalize unit to standard form
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().replace(/\.$/, '');
    const unitMap: Record<string, string> = {
      'tbsp': 'tablespoon',
      'tsp': 'teaspoon',
      'oz': 'ounce',
      'lb': 'pound',
      'g': 'gram',
      'kg': 'kilogram',
      'l': 'liter',
      'ml': 'milliliter',
    };

    return unitMap[normalized] || normalized;
  }

  /**
   * Extract cooking instructions
   */
  private extractInstructions(instructionsText: string): { steps: StructuredRecipeData['instructions']; confidence: number } {
    const lines = instructionsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !this.isSectionHeader(line));

    const steps: StructuredRecipeData['instructions'] = [];
    let totalConfidence = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Remove numbering
      const cleanLine = line.replace(/^[\d\.\-]+\s*/, '');
      
      if (cleanLine.length > 5) {
        // Check if line contains cooking verbs
        const hasCookingVerb = this.cookingVerbs.some(verb => 
          cleanLine.toLowerCase().includes(verb)
        );

        const confidence = hasCookingVerb ? 0.8 : 0.5;
        
        steps.push({
          step: steps.length + 1,
          text: cleanLine,
          confidence,
        });
        
        totalConfidence += confidence;
      }
    }

    const averageConfidence = steps.length > 0 ? totalConfidence / steps.length : 0;

    return { steps, confidence: averageConfidence };
  }

  /**
   * Extract time information from text
   */
  private extractTimeInfo(text: string): {
    prepTime?: number;
    prepTimeConfidence: number;
    cookTime?: number;
    cookTimeConfidence: number;
  } {
    const timePattern = new RegExp(
      `(prep|preparation|cook|cooking|bake|baking|simmer|boil)\\s+(time)?\\s*[:\\-]?\\s*(\\d+)\\s*(${this.timeUnits.join('|')})`,
      'gi'
    );

    const matches = Array.from(text.matchAll(timePattern));
    
    let prepTime: number | undefined;
    let prepTimeConfidence = 0;
    let cookTime: number | undefined;
    let cookTimeConfidence = 0;

    for (const match of matches) {
      const [, type, , amount, unit] = match;
      const minutes = this.convertToMinutes(parseInt(amount), unit.toLowerCase());
      
      if (type.toLowerCase().includes('prep')) {
        prepTime = minutes;
        prepTimeConfidence = 0.7;
      } else if (type.toLowerCase().match(/cook|bake|simmer|boil/)) {
        cookTime = minutes;
        cookTimeConfidence = 0.7;
      }
    }

    return {
      prepTime,
      prepTimeConfidence,
      cookTime,
      cookTimeConfidence,
    };
  }

  /**
   * Extract servings information
   */
  private extractServings(text: string): { servings?: number; confidence: number } {
    const servingsPattern = /(serves|serving|servings?|yields?|makes?)\s*[:\\-]?\\s*(\\d+)/i;
    const match = text.match(servingsPattern);

    if (match) {
      const servings = parseInt(match[2]);
      if (!isNaN(servings) && servings > 0 && servings <= 50) {
        return { servings, confidence: 0.8 };
      }
    }

    return { confidence: 0 };
  }

  /**
   * Convert time to minutes
   */
  private convertToMinutes(amount: number, unit: string): number {
    if (unit.includes('hour') || unit.includes('hr')) {
      return amount * 60;
    }
    return amount;
  }

  /**
   * Enhance low-confidence fields with AI assistance
   */
  async enhanceField(
    field: string,
    text: string,
    context?: string
  ): Promise<{ enhanced: string; confidence: number; suggestions: string[] }> {
    // This would integrate with an AI service for enhancement
    // For now, provide basic enhancement logic
    
    switch (field) {
      case 'title':
        return this.enhanceTitle(text);
      case 'ingredients':
        return this.enhanceIngredients(text);
      case 'instructions':
        return this.enhanceInstructions(text);
      default:
        return {
          enhanced: text,
          confidence: 0.5,
          suggestions: [text],
        };
    }
  }

  private enhanceTitle(text: string): { enhanced: string; confidence: number; suggestions: string[] } {
    const enhanced = text
      .replace(/\b\w/g, l => l.toUpperCase()) // Title case
      .replace(/\s+/g, ' ')
      .trim();

    return {
      enhanced,
      confidence: enhanced.length > 5 ? 0.8 : 0.4,
      suggestions: [enhanced],
    };
  }

  private enhanceIngredients(text: string): { enhanced: string; confidence: number; suggestions: string[] } {
    // Try to match with common ingredient database
    const suggestions = [text];
    let confidence = 0.5;

    // Basic enhancement logic
    const enhanced = text
      .replace(/\b(\d+)\s*([a-z])\b/gi, '$1 $2') // Add space between number and unit
      .replace(/\b(tbsp|tsp|oz|lb|g|kg)\b/gi, match => match.toLowerCase())
      .trim();

    if (enhanced !== text) {
      confidence += 0.2;
      suggestions.push(enhanced);
    }

    return {
      enhanced: suggestions.length > 0 ? suggestions[suggestions.length - 1] : text,
      confidence,
      suggestions,
    };
  }

  private enhanceInstructions(text: string): { enhanced: string; confidence: number; suggestions: string[] } {
    // Ensure instruction starts with a verb
    const words = text.trim().split(' ');
    const firstWord = words[0]?.toLowerCase();

    if (!this.cookingVerbs.includes(firstWord)) {
      const enhanced = `Add ${text}`;
      return {
        enhanced,
        confidence: 0.6,
        suggestions: [text, enhanced],
      };
    }

    return {
      enhanced: text,
      confidence: 0.7,
      suggestions: [text],
    };
  }
}

// Singleton instance
export const recipeParserService = new RecipeParserService();