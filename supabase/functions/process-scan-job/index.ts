import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Google Cloud Vision will be imported dynamically when needed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanJob {
  id: string
  user_id: string
  photo_url: string
  status: string
  retry_count: number
  max_retries: number
}

interface ScanDraft {
  job_id: string
  user_id: string
  raw_text?: string
  ocr_confidence?: number
  title?: string
  ingredients?: any
  instructions?: any
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings?: number
  status: string
  confidence_level: string
  structured_data?: any
  field_confidence?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get job ID from request
    const { jobId } = await req.json()
    if (!jobId) {
      throw new Error('Job ID is required')
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    // Check if job can be processed
    if (job.status !== 'queued') {
      throw new Error(`Job ${jobId} is not in queued status`)
    }

    // Update job status to processing
    await supabase
      .from('scan_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

     try {
       // Process scan
       const result = await processScanImage(job.photo_url, supabase)

       // Use structured AI parsing if available, otherwise use basic parsing
       let structuredData
       let fieldConfidence
       let overallConfidence
       
       try {
         // Try to use the enhanced AI parsing service
         if (Deno.env.get('OPENAI_API_KEY')) {
           const aiResult = await parseRecipeWithAI(result.rawText)
           if (aiResult) {
             // Calculate field-level confidence using OCR confidence as base
             fieldConfidence = {
               title: aiResult.title ? result.confidence * 0.8 : 0,
               ingredients: aiResult.ingredients?.length ? result.confidence * 0.8 : 0,
               instructions: aiResult.instructions?.length ? result.confidence * 0.8 : 0,
               prepTime: aiResult.prepTimeMinutes ? result.confidence * 0.7 : 0,
               cookTime: aiResult.cookTimeMinutes ? result.confidence * 0.7 : 0,
               servings: aiResult.servings ? result.confidence * 0.7 : 0
             }
             
             // Calculate overall confidence score
             const avgConfidence = (
               fieldConfidence.title +
               fieldConfidence.ingredients +
               fieldConfidence.instructions +
               fieldConfidence.prepTime +
               fieldConfidence.cookTime +
               fieldConfidence.servings
             ) / 6
             
             overallConfidence = {
               score: avgConfidence,
               status: avgConfidence >= 0.85 ? 'ready' : avgConfidence >= 0.65 ? 'needs_review' : 'enhanced',
               fieldScores: [
                 { field: 'title', confidence: fieldConfidence.title, status: fieldConfidence.title >= 0.8 ? 'ready' : 'needs_review', issues: [], suggestions: [] },
                 { field: 'ingredients', confidence: fieldConfidence.ingredients, status: fieldConfidence.ingredients >= 0.8 ? 'ready' : 'needs_review', issues: [], suggestions: [] },
                 { field: 'instructions', confidence: fieldConfidence.instructions, status: fieldConfidence.instructions >= 0.8 ? 'ready' : 'needs_review', issues: [], suggestions: [] }
               ],
               priority: 'medium',
               recommendedActions: fieldConfidence.title < 0.8 || fieldConfidence.ingredients < 0.8 || fieldConfidence.instructions < 0.8 
                 ? ['Review low-confidence fields before approval'] 
                 : []
             }
             
             structuredData = {
               title: aiResult.title,
               ingredients: aiResult.ingredients,
               instructions: aiResult.instructions,
               prepTimeMinutes: aiResult.prepTimeMinutes,
               cookTimeMinutes: aiResult.cookTimeMinutes,
               servings: aiResult.servings
             }
           }
         }
       } catch (aiError) {
         console.warn('AI parsing failed, using basic result:', aiError)
       }
       
       // Fallback to basic extraction if AI parsing failed
       if (!structuredData) {
         structuredData = result.extracted
         fieldConfidence = {
           title: result.extracted?.title ? 0.8 : 0,
           ingredients: result.extracted?.ingredients ? 0.8 : 0,
           instructions: result.extracted?.instructions ? 0.8 : 0,
           prepTime: result.extracted?.prepTimeMinutes ? 0.7 : 0,
           cookTime: result.extracted?.cookTimeMinutes ? 0.7 : 0,
           servings: result.extracted?.servings ? 0.7 : 0
         }
         
         const avgConfidence = (
           fieldConfidence.title +
           fieldConfidence.ingredients +
           fieldConfidence.instructions
         ) / 6
         
         overallConfidence = {
           score: avgConfidence,
           status: avgConfidence >= 0.85 ? 'ready' : avgConfidence >= 0.65 ? 'needs_review' : 'enhanced',
           fieldScores: [],
           priority: 'medium',
           recommendedActions: []
         }
       }
       
       // Create scan draft with results and confidence data
       const draftData: Partial<ScanDraft> = {
         job_id: jobId,
         user_id: job.user_id,
         raw_text: result.rawText,
         ocr_confidence: result.confidence,
         title: structuredData?.title,
         ingredients: structuredData?.ingredients,
         instructions: structuredData?.instructions,
         prep_time_minutes: structuredData?.prepTimeMinutes,
         cook_time_minutes: structuredData?.cookTimeMinutes,
         servings: structuredData?.servings,
         status: overallConfidence?.status || 'needs_review',
         confidence_level: overallConfidence?.score ? (overallConfidence.score >= 0.8 ? 'high' : overallConfidence.score >= 0.5 ? 'medium' : 'low') : 'medium',
         // Store structured data and field confidence for enhancement
         structured_data: {
           recipe: structuredData,
           fieldConfidence,
           overallConfidence
         },
         field_confidence: fieldConfidence
       }
       
       const { error: draftError } = await supabase
         .from('scan_drafts')
         .insert(draftData)

       if (draftError) {
         throw draftError
       }

       // Update job status to completed
       await supabase
         .from('scan_jobs')
         .update({ 
           status: 'completed', 
           updated_at: new Date().toISOString(),
           error_message: null
         })
         .eq('id', jobId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId,
          draftId: 'created' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (processError) {
      console.error('Scan processing failed:', processError)

      // Update job status to failed
      const errorMessage = processError instanceof Error ? processError.message : 'Unknown error'
      
      await supabase
        .from('scan_jobs')
        .update({ 
          status: 'failed', 
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
          retry_count: job.retry_count + 1
        })
        .eq('id', jobId)

      // If retries remain, re-queue the job
      if (job.retry_count < job.max_retries) {
        // Calculate exponential backoff delay (in minutes)
        const delayMinutes = Math.pow(2, job.retry_count) * 5 // 5, 10, 20 minutes
        
        await supabase
          .from('scan_jobs')
          .update({ 
            status: 'queued',
            error_message: `Retrying in ${delayMinutes} minutes...`
          })
          .eq('id', jobId)
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          jobId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function processScanImage(imageUrl: string, supabase: any): Promise<{
  rawText: string
  confidence: number
  extracted?: {
    title?: string
    ingredients?: any[]
    instructions?: any[]
    prepTimeMinutes?: number
    cookTimeMinutes?: number
    servings?: number
  }
}> {
  console.log(`Processing scan image: ${imageUrl}`)

  const hasVisionCreds = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON') || Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')

  if (!hasVisionCreds) {
    console.warn('No OCR credentials configured — using mock extraction')
    return getMockScanResult()
  }

  try {
    // Import Google Cloud Vision dynamically for Deno compatibility
    const visionModule = await import('https://esm.sh/@google-cloud/vision@5.3.4')
    const ImageAnnotatorClient = visionModule.ImageAnnotatorClient

    // Initialize client with credentials
    const clientOptions: any = {}
    const credentialsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')
    if (credentialsJson) {
      clientOptions.credentials = JSON.parse(credentialsJson)
    } else {
      clientOptions.projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')
    }

    const visionClient = new ImageAnnotatorClient(clientOptions)

    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Perform OCR with Google Cloud Vision API
    const [result] = await visionClient.textDetection({
      image: { content: base64Image }
    })

    if (!result.fullTextAnnotation) {
      throw new Error('No text detected in image')
    }

    const fullTextAnnotation = result.fullTextAnnotation
    const rawText = fullTextAnnotation.text || ''

    // Calculate confidence from pages
    const pages = fullTextAnnotation.pages || []
    const overallConfidence = pages.length > 0
      ? pages.reduce((sum: number, page: any) => sum + (page.confidence || 0), 0) / pages.length
      : 0

    console.log(`OCR completed. Confidence: ${overallConfidence}, Text length: ${rawText.length}`)

    // Parse structured recipe data from OCR text using AI
    const extracted = await parseRecipeFromText(rawText)

    return {
      rawText,
      confidence: Math.round(overallConfidence * 100) / 100,
      extracted
    }

  } catch (error) {
    console.error('Image processing failed:', error)

    if (error instanceof Error) {
      if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Google Cloud Vision API quota exceeded. Please try again later.')
      }
      if (error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Permission denied accessing Google Cloud Vision API. Check service account credentials.')
      }
      if (error.message.includes('INVALID_ARGUMENT')) {
        throw new Error('Invalid image format or corrupted image file.')
      }
    }

    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function getMockScanResult() {
  return {
    rawText: "Grandma's Chocolate Chip Cookies\n\nIngredients:\n- 2 1/4 cups all-purpose flour\n- 1 tsp baking soda\n- 1 tsp salt\n- 1 cup butter, softened\n- 3/4 cup sugar\n- 3/4 cup brown sugar\n- 2 large eggs\n- 2 tsp vanilla extract\n- 2 cups chocolate chips\n\nInstructions:\n1. Preheat oven to 375°F.\n2. Mix flour, baking soda, and salt in a bowl.\n3. Beat butter and sugars until creamy.\n4. Add eggs and vanilla to butter mixture.\n5. Gradually blend in flour mixture.\n6. Stir in chocolate chips.\n7. Drop rounded tablespoons onto baking sheets.\n8. Bake 9 to 11 minutes or until golden brown.\n\nPrep time: 15 minutes\nCook time: 11 minutes\nServings: 48 cookies",
    confidence: 0.72,
    extracted: {
      title: "Grandma's Chocolate Chip Cookies",
      ingredients: [
        { name: "all-purpose flour", amount: "2 1/4", unit: "cups" },
        { name: "baking soda", amount: "1", unit: "tsp" },
        { name: "salt", amount: "1", unit: "tsp" },
        { name: "butter, softened", amount: "1", unit: "cup" },
        { name: "sugar", amount: "3/4", unit: "cup" },
        { name: "brown sugar", amount: "3/4", unit: "cup" },
        { name: "large eggs", amount: "2", unit: "count" },
        { name: "vanilla extract", amount: "2", unit: "tsp" },
        { name: "chocolate chips", amount: "2", unit: "cups" }
      ],
      instructions: [
        "Preheat oven to 375°F.",
        "Mix flour, baking soda, and salt in a bowl.",
        "Beat butter and sugars until creamy.",
        "Add eggs and vanilla to butter mixture.",
        "Gradually blend in flour mixture.",
        "Stir in chocolate chips.",
        "Drop rounded tablespoons onto baking sheets.",
        "Bake 9 to 11 minutes or until golden brown."
      ],
      prepTimeMinutes: 15,
      cookTimeMinutes: 11,
      servings: 48
    }
  }
}

// Vision client is initialized dynamically in processScanImage function

// Enhanced recipe parsing function with AI fallback
async function parseRecipeFromText(text: string): Promise<{
  title?: string
  ingredients?: any[]
  instructions?: any[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
}> {
  try {
    // Try to use OpenAI for better parsing first
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (openaiKey) {
      const result = await parseRecipeWithAI(text)
      if (result) {
        return result
      }
    }
  } catch (error) {
    console.warn('AI parsing failed, falling back to basic parsing:', error)
  }
  
  // Fallback to basic parsing
  return parseRecipeBasic(text)
}

// Convert AI service result to expected format
function convertFromAIRService(result: any): {
  title?: string
  ingredients?: any[]
  instructions?: any[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
} {
  return {
    title: result.recipe?.title,
    ingredients: result.recipe?.ingredients?.map((ing: any) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      preparation: ing.preparation,
      confidence: ing.confidence
    })),
    instructions: result.recipe?.instructions,
    prepTimeMinutes: result.recipe?.prepTimeMinutes,
    cookTimeMinutes: result.recipe?.cookTimeMinutes,
    servings: result.recipe?.servings
  }
}

// AI-powered recipe parsing using OpenAI
async function parseRecipeWithAI(text: string): Promise<{
  title?: string
  ingredients?: any[]
  instructions?: any[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
} | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: `Extract structured recipe data from the OCR text. Return JSON with: title, ingredients (array of {name, amount, unit, preparation}), instructions (array of steps), prepTimeMinutes, cookTimeMinutes, servings. Only return valid JSON.`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      throw new Error('No content from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate and normalize the result
    return {
      title: parsed.title || undefined,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map((ing: any) => ({
        name: ing.name || '',
        amount: ing.amount || '',
        unit: ing.unit || '',
        preparation: ing.preparation || ''
      })) : undefined,
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : undefined,
      prepTimeMinutes: typeof parsed.prepTimeMinutes === 'number' ? parsed.prepTimeMinutes : undefined,
      cookTimeMinutes: typeof parsed.cookTimeMinutes === 'number' ? parsed.cookTimeMinutes : undefined,
      servings: typeof parsed.servings === 'number' ? parsed.servings : undefined
    }
    
  } catch (error) {
    console.error('AI parsing failed:', error)
    return null
  }
}

// Basic recipe parsing function (fallback)
function parseRecipeBasic(text: string): {
  title?: string
  ingredients?: any[]
  instructions?: any[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
} {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Try to extract title (first non-ingredient line)
  const title = lines.find(line => 
    !line.toLowerCase().includes('ingredient') && 
    !line.toLowerCase().includes('instruction') &&
    !line.match(/^\d+\./) &&
    !line.startsWith('-') &&
    line.length < 100
  )
  
  // Extract ingredients (lines with hyphens or numbers)
  const ingredients: any[] = []
  const ingredientsSection = lines.findIndex(line => 
    line.toLowerCase().includes('ingredient')
  )
  
  if (ingredientsSection !== -1) {
    for (let i = ingredientsSection + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.toLowerCase().includes('instruction') || line.match(/^\d+\./)) break
      
      if (line.startsWith('-') || line.match(/^\d+\./)) {
        const cleaned = line.replace(/^[-\d.]\s*/, '').trim()
        const parsed = parseIngredient(cleaned)
        if (parsed) {
          ingredients.push(parsed)
        }
      }
    }
  }
  
  // Extract instructions (numbered lines)
  const instructions: string[] = []
  const instructionsSection = lines.findIndex(line => 
    line.toLowerCase().includes('instruction') || line.toLowerCase().includes('direction')
  )
  
  if (instructionsSection !== -1) {
    for (let i = instructionsSection + 1; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(/^(\d+)\.\s*(.+)$/)
      if (match) {
        instructions.push(match[2])
      } else if (line.startsWith('-') || line.toLowerCase().includes('ingredient')) {
        break
      }
    }
  }
  
  // Try to extract time information
  let prepTimeMinutes: number | undefined
  let cookTimeMinutes: number | undefined
  let servings: number | undefined
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    
    if (lowerLine.includes('prep') && lowerLine.includes('min')) {
      const match = lowerLine.match(/(\d+)\s*min/)
      if (match) prepTimeMinutes = parseInt(match[1])
    }
    
    if (lowerLine.includes('cook') && lowerLine.includes('min')) {
      const match = lowerLine.match(/(\d+)\s*min/)
      if (match) cookTimeMinutes = parseInt(match[1])
    }
    
    if (lowerLine.includes('serv') || lowerLine.includes('yield')) {
      const match = lowerLine.match(/(\d+)/)
      if (match) servings = parseInt(match[1])
    }
  }
  
  return {
    title: title || undefined,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    instructions: instructions.length > 0 ? instructions : undefined,
    prepTimeMinutes,
    cookTimeMinutes,
    servings
  }
}

function parseIngredient(text: string): any {
  // Simple ingredient parsing - in production this would be more sophisticated
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*(cup|cups|tsp|tsp|tbsp|tbsps|oz|lb|lbs)\s+(.+)$/i,
    /^(\d+(?:\/\d+)?)\s*(cup|cups|tsp|tsp|tbsp|tbsps|oz|lb|lbs)\s+(.+)$/i,
    /^(\d+)\s+(.+)$/i
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = match[1]
      const unit = match[2] || 'count'
      const name = match[3] || match[2]
      
      return {
        name: name.trim(),
        amount: amount,
        unit: unit.toLowerCase()
      }
    }
  }
  
  // If no pattern matches, treat whole line as name
  return {
    name: text.trim(),
    amount: '1',
    unit: 'count'
  }
}

function determineDraftStatus(confidence: number, extracted?: any): string {
  if (!extracted) return 'needs_review'
  
  const hasTitle = !!extracted.title
  const hasIngredients = extracted.ingredients && extracted.ingredients.length > 0
  const hasInstructions = extracted.instructions && extracted.instructions.length > 0
  
  // More sophisticated status determination
  if (confidence >= 0.85 && hasTitle && hasIngredients && hasInstructions) {
    return 'ready'  // High confidence - ready for approval
  } else if (confidence >= 0.65 && hasIngredients && hasInstructions) {
    return 'needs_review'  // Medium confidence - needs user review
  } else {
    return 'enhanced'  // Low confidence - needs AI enhancement or manual correction
  }
}

function determineConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}