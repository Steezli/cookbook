import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ImageAnnotatorClient } from 'https://npmjs.com/@google-cloud/vision@4.0.2'
import { corsHeaders, handleCors } from "../_shared/cors.ts"

interface OCRRequest {
  imageBase64: string
  scanJobId: string
}

interface OCRResponse {
  success: boolean
  text?: string
  confidence?: number
  error?: string
  processingTime?: number
}

// Initialize Vision client
let visionClient: ImageAnnotatorClient | null = null

function getVisionClient() {
  if (!visionClient) {
    const credentialsStr = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS')
    if (!credentialsStr) {
      throw new Error('Server misconfigured: missing GOOGLE_CLOUD_CREDENTIALS')
    }
    const credentials = JSON.parse(credentialsStr)
    visionClient = new ImageAnnotatorClient({ credentials })
  }
  return visionClient
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    
    // Parse request
    const { imageBase64, scanJobId }: OCRRequest = await req.json()
    
    if (!imageBase64 || !scanJobId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64 or scanJobId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: missing required env vars' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Update job status to processing
    const { error: statusError } = await supabaseClient
      .from('scan_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', scanJobId)
    if (statusError) {
      console.warn(`Failed to mark job ${scanJobId} as processing:`, statusError)
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Validate image
    const validation = await validateImage(imageBuffer)
    if (!validation.valid) {
      throw new Error(validation.reason)
    }

    // Perform OCR with timeout
    const visionClient = getVisionClient()
    const visionPromise = visionClient.textDetection({
      image: { content: imageBuffer },
      imageContext: {
        languageHints: ['en'],
      },
    })
    const visionTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Google Vision timed out after 30s')), 30_000)
    )
    const [result] = await Promise.race([visionPromise, visionTimeout]) as Awaited<typeof visionPromise>

    const fullTextAnnotation = result.fullTextAnnotation
    
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      throw new Error('No text found in image')
    }

    // Calculate confidence
    const boundingBoxes = fullTextAnnotation.pages?.flatMap(page =>
      page.blocks?.flatMap(block =>
        block.paragraphs?.flatMap(paragraph =>
          paragraph.words?.map(word => word.confidence || 0) || []
        ) || []
      ) || []
    ) || []

    const overallConfidence = boundingBoxes.length > 0
      ? boundingBoxes.reduce((sum, conf) => sum + conf, 0) / boundingBoxes.length
      : 0

    const processingTime = Date.now() - startTime

    // Store OCR result
    const { error: ocrError } = await supabaseClient
      .from('scan_drafts')
      .insert({
        scan_job_id: scanJobId,
        raw_text: fullTextAnnotation.text,
        ocr_confidence: overallConfidence,
        structured_data: {},
        status: 'needs_review',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (ocrError) {
      console.error('Failed to store OCR result:', ocrError)
      throw new Error('Failed to store OCR result')
    }

    // Update job status to completed
    const { error: completionError } = await supabaseClient
      .from('scan_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scanJobId)
    if (completionError) {
      console.error(`Failed to mark job ${scanJobId} as completed:`, completionError)
    }

    const response: OCRResponse = {
      success: true,
      text: fullTextAnnotation.text,
      confidence: overallConfidence,
      processingTime,
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('OCR processing error:', error)
    
    // Update job status to failed if we have a scanJobId
    try {
      const { scanJobId } = await req.json()
      if (scanJobId) {
        const errorSupabaseUrl = Deno.env.get('SUPABASE_URL')
        const errorAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
        if (!errorSupabaseUrl || !errorAnonKey) {
          throw new Error('Missing env vars for error status update')
        }
        const supabaseClient = createClient(
          errorSupabaseUrl,
          errorAnonKey,
          {
            global: {
              headers: { Authorization: req.headers.get('Authorization')! },
            },
          }
        )

        const { error: failError } = await supabaseClient
          .from('scan_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', scanJobId)
        if (failError) {
          console.warn(`Failed to mark job ${scanJobId} as failed:`, failError)
        }
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError)
    }

    const response: OCRResponse = {
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

async function validateImage(imageBuffer: Uint8Array): Promise<{ valid: boolean; reason?: string }> {
  // Check file size (max 10MB)
  if (imageBuffer.length > 10 * 1024 * 1024) {
    return { valid: false, reason: 'Image too large (max 10MB)' }
  }

  // Check minimum size
  if (imageBuffer.length < 1024) { // 1KB minimum
    return { valid: false, reason: 'Image too small' }
  }

  // Basic image format validation
  const signatures = [
    [0xFF, 0xD8, 0xFF], // JPEG
    [0x89, 0x50, 0x4E, 0x47], // PNG
    [0x47, 0x49, 0x46, 0x38], // GIF
    [0x42, 0x4D], // BMP
  ]

  const isValidFormat = signatures.some(sig => 
    sig.every((byte, index) => imageBuffer[index] === byte)
  )

  if (!isValidFormat) {
    return { valid: false, reason: 'Unsupported image format' }
  }

  return { valid: true }
}