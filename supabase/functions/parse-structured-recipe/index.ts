import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recipeParserService, StructuredRecipeData, FieldConfidence } from '../services/recipe-parser.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParseRequest {
  scanDraftId: string
  rawText: string
  enhancementOptions?: {
    lowConfidenceThreshold?: number
    enableAIEnhancement?: boolean
  }
}

interface ParseResponse {
  success: boolean
  structuredData?: StructuredRecipeData
  fieldConfidence?: FieldConfidence
  overallConfidence?: number
  status?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    
    // Parse request
    const { scanDraftId, rawText, enhancementOptions }: ParseRequest = await req.json()
    
    if (!scanDraftId || !rawText) {
      return new Response(
        JSON.stringify({ error: 'Missing scanDraftId or rawText' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Update draft status to processing
    await supabaseClient
      .from('scan_drafts')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', scanDraftId)

    // Perform structured parsing
    const parseResult = await recipeParserService.parseOCRText(rawText, {
      language: 'en',
      minConfidence: enhancementOptions?.lowConfidenceThreshold || 0.5,
      enableAIGuessing: enhancementOptions?.enableAIEnhancement || true,
    })

    const { data: structuredData, confidence: fieldConfidence } = parseResult

    // Calculate overall confidence
    const confidenceValues = Object.values(fieldConfidence).filter(c => c !== undefined) as number[]
    const overallConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
      : 0

    // Determine status based on confidence
    let status = 'ready'
    if (overallConfidence < 0.5) {
      status = 'enhanced'
    } else if (overallConfidence < 0.8) {
      status = 'needs_review'
    }

    // Enhance low-confidence fields if requested
    if (enhancementOptions?.enableAIEnhancement) {
      const lowConfidenceThreshold = enhancementOptions.lowConfidenceThreshold || 0.6
      
      // Enhance title if confidence is low
      if (fieldConfidence.title && fieldConfidence.title < lowConfidenceThreshold && structuredData.title) {
        const enhancement = await recipeParserService.enhanceField('title', structuredData.title)
        if (enhancement.confidence > fieldConfidence.title) {
          structuredData.title = enhancement.enhanced
          fieldConfidence.title = enhancement.confidence
        }
      }

      // Enhance ingredients if confidence is low
      if (fieldConfidence.ingredients && fieldConfidence.ingredients < lowConfidenceThreshold && structuredData.ingredients) {
        const enhancedIngredients = []
        for (const ingredient of structuredData.ingredients) {
          if (ingredient.confidence < lowConfidenceThreshold) {
            const enhancement = await recipeParserService.enhanceField('ingredients', ingredient.text)
            if (enhancement.confidence > ingredient.confidence) {
              enhancedIngredients.push({
                ...ingredient,
                text: enhancement.enhanced,
                confidence: enhancement.confidence,
                suggestions: enhancement.suggestions,
              })
            } else {
              enhancedIngredients.push(ingredient)
            }
          } else {
            enhancedIngredients.push(ingredient)
          }
        }
        structuredData.ingredients = enhancedIngredients
      }

      // Enhance instructions if confidence is low
      if (fieldConfidence.instructions && fieldConfidence.instructions < lowConfidenceThreshold && structuredData.instructions) {
        const enhancedInstructions = []
        for (const instruction of structuredData.instructions) {
          if (instruction.confidence < lowConfidenceThreshold) {
            const enhancement = await recipeParserService.enhanceField('instructions', instruction.text)
            if (enhancement.confidence > instruction.confidence) {
              enhancedInstructions.push({
                ...instruction,
                text: enhancement.enhanced,
                confidence: enhancement.confidence,
                suggestions: enhancement.suggestions,
              })
            } else {
              enhancedInstructions.push(instruction)
            }
          } else {
            enhancedInstructions.push(instruction)
          }
        }
        structuredData.instructions = enhancedInstructions
      }

      // Recalculate confidence and status
      const newConfidenceValues = Object.values(fieldConfidence).filter(c => c !== undefined) as number[]
      const newOverallConfidence = newConfidenceValues.length > 0
        ? newConfidenceValues.reduce((sum, c) => sum + c, 0) / newConfidenceValues.length
        : 0

      if (newOverallConfidence < 0.5) {
        status = 'enhanced'
      } else if (newOverallConfidence < 0.8) {
        status = 'needs_review'
      } else {
        status = 'ready'
      }
    }

    const processingTime = Date.now() - startTime

    // Update draft with structured data
    const { error: updateError } = await supabaseClient
      .from('scan_drafts')
      .update({
        structured_data: structuredData,
        field_confidence: fieldConfidence,
        status: status,
        processing_time_ms: processingTime,
        ai_model_version: '1.0',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scanDraftId)

    if (updateError) {
      console.error('Failed to update scan draft:', updateError)
      throw new Error('Failed to update scan draft')
    }

    const response: ParseResponse = {
      success: true,
      structuredData,
      fieldConfidence,
      overallConfidence,
      status,
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Recipe parsing error:', error)
    
    // Try to update draft status to failed if we have the ID
    try {
      const { scanDraftId } = await req.json()
      if (scanDraftId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: req.headers.get('Authorization')! },
            },
          }
        )

        await supabaseClient
          .from('scan_drafts')
          .update({ 
            status: 'enhanced', // Use 'enhanced' as fallback status
            updated_at: new Date().toISOString()
          })
          .eq('id', scanDraftId)
      }
    } catch (updateError) {
      console.error('Failed to update draft status:', updateError)
    }

    const response: ParseResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})