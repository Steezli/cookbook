import { OpenAI } from 'openai'

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

export class RecipeParsingService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * Parse OCR text into structured recipe data using AI
   */
  async parseFromOCR(ocrText: string, ocrConfidence: number): Promise<{
    recipe: ParsedRecipe
    confidence: FieldConfidence
    rawText: string
  }> {
    try {
      console.log(`Parsing recipe from OCR text. Confidence: ${ocrConfidence}, Length: ${ocrText.length}`)

      // Clean and prepare OCR text
      const cleanedText = this.cleanOCRText(ocrText)
      
      // First, try to extract with a structured prompt
      const structuredResult = await this.extractStructuredRecipe(cleanedText)
      
      // Calculate field-level confidence based on OCR quality and AI confidence
      const confidence = this.calculateFieldConfidence(structuredResult, ocrConfidence)
      
      console.log(`Recipe parsing completed. Fields extracted: title=${!!structuredResult.title}, ingredients=${structuredResult.ingredients.length}, instructions=${structuredResult.instructions.length}`)
      
      return {
        recipe: structuredResult,
        confidence,
        rawText: cleanedText
      }
      
    } catch (error) {
      console.error('Recipe parsing failed:', error)
      
      // Fallback to basic parsing if AI fails
      const fallbackRecipe = this.basicRecipeParsing(ocrText)
      const fallbackConfidence = this.calculateFieldConfidence(fallbackRecipe, ocrConfidence * 0.7) // Lower confidence for fallback
      
      return {
        recipe: fallbackRecipe,
        confidence: fallbackConfidence,
        rawText: ocrText
      }
    }
  }

  /**
   * Clean OCR text to improve parsing accuracy
   */
  private cleanOCRText(text: string): string {
    return text
      .normalize('NFKD')
      // Fix common OCR errors
      .replace(/1\/2/g, '½')
      .replace(/1\/4/g, '¼')
      .replace(/3\/4/g, '¾')
      .replace(/1\/3/g, '⅓')
      .replace(/2\/3/g, '⅔')
      // Fix common number-to-letter confusions
      .replace(/0l/g, 'ol') // 0 -> o
      .replace(/1l/g, 'll') // 1 -> l
      .replace(/5\s*s/g, 's') // 5 -> s in teaspoons
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Use AI to extract structured recipe from text
   */
  private async extractStructuredRecipe(text: string): Promise<ParsedRecipe> {
    const systemPrompt = `You are an expert recipe parser that extracts structured recipe information from OCR text. 
Your task is to analyze the provided text and extract recipe components with high accuracy.

Rules:
1. Return ONLY valid JSON
2. For ingredients, extract: name, amount, unit, and any preparation notes
3. Standardize units (cup, cups, tbsp, tsp, oz, lb, etc.)
4. Convert fractions to decimals where appropriate
5. Instructions should be numbered steps
6. Be conservative - if you're not confident about a field, omit it
7. Handle common OCR errors intelligently
8. If multiple recipes are detected, parse the first complete one

JSON format:
{
  "title": "Recipe title",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "amount as text",
      "unit": "standardized unit",
      "preparation": "preparation notes if any",
      "quantity": numeric_amount,
      "confidence": 0.95
    }
  ],
  "instructions": ["step 1", "step 2", ...],
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "servings": number,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type if identifiable",
  "category": "recipe category if identifiable",
  "notes": ["additional notes if any"]
}`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI model')
    }

    try {
      const parsed = JSON.parse(content)
      return this.validateAndNormalizeRecipe(parsed)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      throw new Error('Invalid JSON response from AI model')
    }
  }

  /**
   * Validate and normalize parsed recipe data
   */
  private validateAndNormalizeRecipe(data: any): ParsedRecipe {
    const recipe: ParsedRecipe = {
      ingredients: [],
      instructions: []
    }

    // Title
    if (typeof data.title === 'string' && data.title.length > 0) {
      recipe.title = data.title.trim()
    }

    // Ingredients
    if (Array.isArray(data.ingredients)) {
      recipe.ingredients = data.ingredients
        .filter((ing: any) => ing && typeof ing.name === 'string')
        .map((ing: any) => ({
          name: ing.name.trim(),
          amount: ing.amount || undefined,
          unit: ing.unit || undefined,
          preparation: ing.preparation || undefined,
          quantity: typeof ing.quantity === 'number' ? ing.quantity : undefined,
          confidence: typeof ing.confidence === 'number' ? Math.min(1, Math.max(0, ing.confidence)) : 0.5,
          alternatives: Array.isArray(ing.alternatives) ? ing.alternatives : undefined
        }))
    }

    // Instructions
    if (Array.isArray(data.instructions)) {
      recipe.instructions = data.instructions
        .filter((inst: any) => inst && typeof inst === 'string')
        .map((inst: string) => inst.trim())
        .filter((inst: string) => inst.length > 0)
    }

    // Times
    if (typeof data.prepTimeMinutes === 'number' && data.prepTimeMinutes > 0) {
      recipe.prepTimeMinutes = Math.min(999, data.prepTimeMinutes)
    }
    if (typeof data.cookTimeMinutes === 'number' && data.cookTimeMinutes > 0) {
      recipe.cookTimeMinutes = Math.min(999, data.cookTimeMinutes)
    }

    // Calculate total time
    if (recipe.prepTimeMinutes && recipe.cookTimeMinutes) {
      recipe.totalTimeMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes
    } else if (recipe.prepTimeMinutes) {
      recipe.totalTimeMinutes = recipe.prepTimeMinutes
    } else if (recipe.cookTimeMinutes) {
      recipe.totalTimeMinutes = recipe.cookTimeMinutes
    }

    // Servings
    if (typeof data.servings === 'number' && data.servings > 0) {
      recipe.servings = Math.min(99, data.servings)
    }

    // Difficulty
    if (typeof data.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(data.difficulty.toLowerCase())) {
      recipe.difficulty = data.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'
    }

    // Cuisine
    if (typeof data.cuisine === 'string' && data.cuisine.length > 0) {
      recipe.cuisine = data.cuisine.trim()
    }

    // Category
    if (typeof data.category === 'string' && data.category.length > 0) {
      recipe.category = data.category.trim()
    }

    // Notes
    if (Array.isArray(data.notes)) {
      recipe.notes = data.notes
        .filter((note: any) => note && typeof note === 'string')
        .map((note: string) => note.trim())
        .filter((note: string) => note.length > 0)
    }

    return recipe
  }

  /**
   * Fallback basic parsing when AI is not available
   */
  private basicRecipeParsing(text: string): ParsedRecipe {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    const recipe: ParsedRecipe = {
      ingredients: [],
      instructions: []
    }

    // Find title (first line that looks like a title)
    for (const line of lines) {
      if (line.length < 100 && 
          !line.toLowerCase().includes('ingredient') &&
          !line.toLowerCase().includes('instruction') &&
          !line.match(/^\d+\./) &&
          !line.startsWith('-') &&
          !line.match(/^(cup|tsp|tbsp)/i)) {
        recipe.title = line
        break
      }
    }

    // Extract ingredients (look for patterns)
    let inIngredients = false
    let inInstructions = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      // Detect sections
      if (line.includes('ingredient') || line.includes('materials')) {
        inIngredients = true
        inInstructions = false
        continue
      }
      if (line.includes('instruction') || line.includes('direction') || line.includes('method')) {
        inInstructions = true
        inIngredients = false
        continue
      }
      
      // Parse ingredients
      if (inIngredients) {
        const ingredient = this.parseIngredientLine(lines[i])
        if (ingredient) {
          recipe.ingredients.push({
            ...ingredient,
            confidence: 0.6 // Lower confidence for basic parsing
          })
        }
      }
      
      // Parse instructions
      if (inInstructions) {
        const match = lines[i].match(/^(\d+)\.\s*(.+)$/)
        if (match) {
          recipe.instructions.push(match[2])
        }
      }
    }

    return recipe
  }

  /**
   * Parse a single ingredient line
   */
  private parseIngredientLine(line: string): Omit<ParsedIngredient, 'confidence'> | null {
    const patterns = [
      // Fraction amount + unit + ingredient
      /^(\d+(?:\/\d+)?)\s*(cup|cups|tsp|tsp|tbsp|tbsps|oz|lb|lbs|g|kg|ml|l)\s+(.+)$/i,
      // Decimal amount + unit + ingredient
      /^(\d+(?:\.\d+)?)\s*(cup|cups|tsp|tsp|tbsp|tbsps|oz|lb|lbs|g|kg|ml|l)\s+(.+)$/i,
      // Whole number + ingredient
      /^(\d+)\s+(.+)$/,
      // Just ingredient
      /^(.+)$/
    ]

    for (let i = 0; i < patterns.length; i++) {
      const match = line.match(patterns[i])
      if (match) {
        if (i === 3) {
          // Just ingredient name
          return {
            name: match[1].trim(),
            amount: undefined,
            unit: undefined,
            preparation: undefined,
            quantity: undefined
          }
        }

        const amount = match[1]
        const unit = match[2] || (i === 2 ? 'count' : undefined)
        const ingredientText = match[3] || match[2]
        
        // Split ingredient from preparation
        const prepMatch = ingredientText.match(/^(.+?)(?:,\s*(.+))?$/)
        const name = prepMatch ? prepMatch[1].trim() : ingredientText.trim()
        const preparation = prepMatch && prepMatch[2] ? prepMatch[2].trim() : undefined

        // Convert to decimal quantity
        let quantity: number | undefined
        if (amount.includes('/')) {
          const [num, den] = amount.split('/')
          quantity = parseFloat(num) / parseFloat(den)
        } else {
          const parsed = parseFloat(amount)
          if (!isNaN(parsed)) {
            quantity = parsed
          }
        }

        return {
          name,
          amount: amount,
          unit: unit?.toLowerCase(),
          preparation,
          quantity
        }
      }
    }

    return null
  }

  /**
   * Calculate field-level confidence scores
   */
  private calculateFieldConfidence(recipe: ParsedRecipe, ocrConfidence: number): FieldConfidence {
    const baseConfidence = ocrConfidence * 0.9 // Account for parsing errors
    
    return {
      title: recipe.title ? baseConfidence * 0.8 : 0,
      ingredients: recipe.ingredients.length > 0 
        ? baseConfidence * (recipe.ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / recipe.ingredients.length)
        : 0,
      instructions: recipe.instructions.length > 0 ? baseConfidence * 0.9 : 0,
      prepTime: recipe.prepTimeMinutes ? baseConfidence * 0.7 : 0,
      cookTime: recipe.cookTimeMinutes ? baseConfidence * 0.7 : 0,
      servings: recipe.servings ? baseConfidence * 0.7 : 0
    }
  }

  /**
   * Enhance low-confidence fields using AI
   */
  async enhanceField(
    fieldType: 'ingredients' | 'instructions' | 'title',
    data: string | string[],
    context: string
  ): Promise<{
    enhanced: string | string[]
    confidence: number
    suggestions: string[]
  }> {
    try {
      const prompt = `You are enhancing OCR-extracted recipe data. The field "${fieldType}" has low confidence.

Context recipe:
${context}

Current ${fieldType} data:
${Array.isArray(data) ? data.join('\n') : data}

Provide:
1. Enhanced/corrected version
2. Confidence score (0-1)
3. Alternative suggestions if applicable

Return as JSON with fields: enhanced, confidence, suggestions`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        enhanced: result.enhanced || data,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      }
      
    } catch (error) {
      console.error(`Failed to enhance ${fieldType}:`, error)
      return {
        enhanced: data,
        confidence: 0.3,
        suggestions: []
      }
    }
  }

  /**
   * Validate recipe completeness and coherence
   */
  validateRecipe(recipe: ParsedRecipe): {
    isValid: boolean
    issues: string[]
    warnings: string[]
  } {
    const issues: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!recipe.title || recipe.title.length < 3) {
      issues.push('Recipe title is missing or too short')
    }
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      issues.push('No ingredients found')
    }
    if (!recipe.instructions || recipe.instructions.length === 0) {
      issues.push('No instructions found')
    }

    // Warnings
    if (recipe.ingredients && recipe.ingredients.length < 3) {
      warnings.push('Recipe has very few ingredients')
    }
    if (recipe.instructions && recipe.instructions.length < 3) {
      warnings.push('Recipe has very few instructions')
    }
    if (recipe.prepTimeMinutes && recipe.prepTimeMinutes > 300) {
      warnings.push('Prep time seems very high (over 5 hours)')
    }
    if (recipe.cookTimeMinutes && recipe.cookTimeMinutes > 480) {
      warnings.push('Cook time seems very high (over 8 hours)')
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    }
  }
}

// Export singleton instance
export const recipeParsingService = new RecipeParsingService()