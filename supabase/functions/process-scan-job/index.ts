import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from "../_shared/cors.ts"

interface ScanJob {
  id: string
  user_id: string
  photo_url: string
  photo_urls?: string[]
  status: string
  retry_count: number
  max_retries: number
}

interface InlineImage {
  base64: string
  mediaType: string
}

// --- BEGIN SYNCED FROM src/lib/scan/multi-recipe-parser.ts ---
// DO NOT EDIT this section by hand.
// Source of truth: src/lib/scan/multi-recipe-parser.ts
// Regenerate with: npm run sync:scan-parser
// @synced-hash: 0c57b262cd60
// --- END SYNC HEADER ---


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  preparation?: string;
}

interface ScanResult {
  rawText: string;
  confidence: number;
  sourceImageIndex?: number;
  extracted: {
    title?: string;
    ingredients?: Ingredient[];
    instructions?: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseSingleRecipe(parsed: any): ScanResult {
  if (!parsed || typeof parsed !== 'object') {
    return {
      rawText: '',
      confidence: 0.7,
      extracted: {},
    };
  }

  return {
    rawText: parsed.rawText || '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    sourceImageIndex: typeof parsed.sourceImageIndex === 'number' ? parsed.sourceImageIndex : undefined,
    extracted: {
      title: parsed.title || undefined,
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((ing: any) => ({
            name: ing.name || '',
            amount: String(ing.amount || ''),
            unit: ing.unit || '',
            preparation: ing.preparation || '',
          }))
        : undefined,
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : undefined,
      prepTimeMinutes:
        typeof parsed.prepTimeMinutes === 'number' ? parsed.prepTimeMinutes : undefined,
      cookTimeMinutes:
        typeof parsed.cookTimeMinutes === 'number' ? parsed.cookTimeMinutes : undefined,
      servings: typeof parsed.servings === 'number' ? parsed.servings : undefined,
    },
  };
}

function parseMultiScanResult(parsed: any): ScanResult[] {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  // Array format — { recipes: [...] }
  if (Array.isArray(parsed.recipes)) {
    if (parsed.recipes.length === 0) {
      return [];
    }
    return parsed.recipes.map((r: any) => parseSingleRecipe(r));
  }

  // Legacy single-object format — { rawText, title, … }
  // Detect by checking for at least one expected top-level key.
  if (
    parsed.rawText !== undefined ||
    parsed.title !== undefined ||
    parsed.ingredients !== undefined
  ) {
    return [parseSingleRecipe(parsed)];
  }

  // Unrecognised shape — return empty rather than crash.
  return [];
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicateResults(
  results: ScanResult[]
): { deduplicated: ScanResult[]; removedCount: number } {
  if (results.length <= 1) {
    return { deduplicated: results, removedCount: 0 };
  }

  const seen = new Map<string, ScanResult>();

  for (const r of results) {
    const title = r.extracted.title || '';
    const key = normalizeTitle(title);

    // Skip untitled recipes — can't deduplicate without a title
    if (!key) {
      // Still include untitled recipes; they just can't be deduped
      seen.set(`__untitled_${seen.size}`, r);
      continue;
    }

    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher confidence
      if (r.confidence > existing.confidence) {
        seen.set(key, r);
      }
      // else: keep existing, discard r
    } else {
      seen.set(key, r);
    }
  }

  const deduplicated = Array.from(seen.values());
  return {
    deduplicated,
    removedCount: results.length - deduplicated.length,
  };
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const RECIPE_JSON_SCHEMA = `{
  "recipes": [
    {
      "rawText": "the complete text you read from the image for this recipe, preserving original formatting",
      "confidence": 0.0 to 1.0,
      "sourceImageIndex": 1,
      "title": "recipe title",
      "ingredients": [
        { "name": "ingredient name", "amount": "quantity", "unit": "unit of measure", "preparation": "prep notes if any" }
      ],
      "instructions": ["step 1 text", "step 2 text"],
      "prepTimeMinutes": number or null,
      "cookTimeMinutes": number or null,
      "servings": number or null
    }
  ]
}`;

const COMMON_INSTRUCTIONS = `Important:
- For ingredients, always separate amount, unit, and name. E.g. "2 cups flour" → amount: "2", unit: "cups", name: "flour"
- If a fraction like "1/2" or "1 1/2" appears, keep it as a string: "1/2" or "1 1/2"
- If prep/cook time or servings aren't mentioned, use null
- Include ALL ingredients and ALL instructions, don't summarize
- confidence should reflect how legible the image was and how complete the extraction is
- sourceImageIndex is the 1-based index of the image this recipe was found in
- Return at most 5 recipes per response. If you detect more than 5, return the 5 most complete ones.
- Do NOT return the same recipe twice. Each recipe in the array must be a distinct recipe with its own title.
- Always wrap your response in the { "recipes": [...] } format, even for a single recipe.`;

function buildScanPrompt(imageCount: number): string {
  if (imageCount <= 1) {
    return `This is a photo of a recipe. Read ALL the text visible in the image. If the photo contains more than one recipe (e.g. two recipes on one page), return each one separately as a distinct entry in the recipes array. Set sourceImageIndex to 1 for all recipes.

Extract the structured recipe data. Return ONLY valid JSON with this exact schema — no markdown, no code fences, no explanation:

${RECIPE_JSON_SCHEMA}

${COMMON_INSTRUCTIONS}`;
  }

  return `You are looking at ${imageCount} separate photos of recipe pages. The images are labeled Image 1 through Image ${imageCount} in the order they were provided.

IMPORTANT — treat each image independently:
- Each image is a SEPARATE page that may contain one or more recipes.
- Do NOT combine content across images unless text explicitly continues from one image to the next (e.g. "continued on next page").
- A single image may contain multiple recipes — return each as a separate entry.
- Set sourceImageIndex to the 1-based image number where each recipe was found.
- Every distinct recipe across all images should appear exactly once in your response.

Read ALL the text from every image. Return each distinct recipe as its own entry in the recipes array.

Extract the structured recipe data. Return ONLY valid JSON with this exact schema — no markdown, no code fences, no explanation:

${RECIPE_JSON_SCHEMA}

${COMMON_INSTRUCTIONS}`;
}

// --- END SYNCED FROM src/lib/scan/multi-recipe-parser.ts ---

// ---------------------------------------------------------------------------
// Edge function handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const reqBody = await req.json()
    const { jobId, images: inlineImages } = reqBody as {
      jobId: string
      images?: InlineImage[]
    }
    if (!jobId) {
      throw new Error('Job ID is required')
    }

    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    if (job.status !== 'queued' && job.status !== 'processing') {
      throw new Error(`Job ${jobId} is in ${job.status} status, expected queued or processing`)
    }

    if (job.status === 'queued') {
      await supabase
        .from('scan_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    try {
      let results: ScanResult[]

      if (inlineImages?.length) {
        // Native path: images sent as base64 inline (bypasses Storage fetch bug)
        console.log(`Processing ${inlineImages.length} inline image(s) for job ${jobId}`)
        results = await processWithClaudeInline(inlineImages)

        // Save images to Storage server-side so users can reference them later
        const savedUrls = await saveInlineImagesToStorage(supabase, job, inlineImages)
        if (savedUrls.length > 0) {
          await supabase
            .from('scan_jobs')
            .update({
              photo_url: savedUrls[0],
              photo_urls: savedUrls,
            })
            .eq('id', jobId)
        }
      } else {
        // Web path: fetch images from Storage URLs
        const imageUrls: string[] = job.photo_urls?.length ? job.photo_urls : [job.photo_url]
        results = await processWithClaude(imageUrls)
      }

      // Guard: if parsing returned nothing, treat as an error
      if (results.length === 0) {
        throw new Error('Claude response could not be parsed into any recipes')
      }

      const rawTitles = results.map(r => r.extracted.title || '(untitled)')
      console.log(`Parsed ${results.length} recipe(s) for job ${jobId}: ${JSON.stringify(rawTitles)}`)

      // Deduplicate — Claude sometimes returns the same recipe twice in multi-image scans
      const { deduplicated, removedCount } = deduplicateResults(results)
      if (removedCount > 0) {
        console.warn(`Removed ${removedCount} duplicate recipe(s) for job ${jobId}`)
      }
      results = deduplicated

      const finalTitles = results.map(r => r.extracted.title || '(untitled)')
      console.log(`Detected ${results.length} recipe(s) for job ${jobId}: ${JSON.stringify(finalTitles)}`)

      // Insert one scan_drafts row per recipe with sequential draft_index
      for (let i = 0; i < results.length; i++) {
        const result = results[i]

        // Build field confidence from Claude's self-reported confidence
        const fieldConfidence = {
          title: result.extracted.title ? result.confidence * 0.9 : 0,
          ingredients: result.extracted.ingredients?.length ? result.confidence * 0.9 : 0,
          instructions: result.extracted.instructions?.length ? result.confidence * 0.9 : 0,
          prepTime: result.extracted.prepTimeMinutes ? result.confidence * 0.8 : 0,
          cookTime: result.extracted.cookTimeMinutes ? result.confidence * 0.8 : 0,
          servings: result.extracted.servings ? result.confidence * 0.8 : 0,
        }

        const avgConfidence = Object.values(fieldConfidence).reduce((a, b) => a + b, 0) / 6

        const draftStatus = avgConfidence >= 0.75 ? 'ready' : avgConfidence >= 0.5 ? 'needs_review' : 'enhanced'
        const confidenceLevel = avgConfidence >= 0.8 ? 'high' : avgConfidence >= 0.5 ? 'medium' : 'low'

        const draftData = {
          job_id: jobId,
          user_id: job.user_id,
          draft_index: i,
          raw_text: result.rawText,
          ocr_confidence: result.confidence,
          title: result.extracted.title,
          ingredients: result.extracted.ingredients,
          instructions: result.extracted.instructions,
          prep_time_minutes: result.extracted.prepTimeMinutes,
          cook_time_minutes: result.extracted.cookTimeMinutes,
          servings: result.extracted.servings,
          status: draftStatus,
          confidence_level: confidenceLevel,
          structured_data: {
            recipe: result.extracted,
            fieldConfidence,
            overallConfidence: {
              score: avgConfidence,
              status: draftStatus,
              fieldScores: [
                { field: 'title', confidence: fieldConfidence.title, status: fieldConfidence.title >= 0.8 ? 'ready' : 'needs_review' },
                { field: 'ingredients', confidence: fieldConfidence.ingredients, status: fieldConfidence.ingredients >= 0.8 ? 'ready' : 'needs_review' },
                { field: 'instructions', confidence: fieldConfidence.instructions, status: fieldConfidence.instructions >= 0.8 ? 'ready' : 'needs_review' },
              ],
            },
          },
          field_confidence: fieldConfidence,
        }

        const { error: draftError } = await supabase
          .from('scan_drafts')
          .insert(draftData)

        if (draftError) {
          console.error(`Failed to insert draft ${i + 1}/${results.length} (draft_index: ${i}) for job ${jobId}:`, draftError)
          throw new Error(`Draft insert failed for draft_index ${i}: ${draftError.message}`)
        }

        const sourceLabel = result.sourceImageIndex ? ` (from image ${result.sourceImageIndex})` : ''
        console.log(`Inserted draft ${i + 1}/${results.length} for job ${jobId}: "${result.extracted.title || '(untitled)'}"${sourceLabel}`)
      }

      await supabase
        .from('scan_jobs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', jobId)

      return new Response(
        JSON.stringify({ success: true, jobId, draftCount: results.length }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (processError) {
      console.error('Scan processing failed:', processError)

      const errorMessage = processError instanceof Error ? processError.message : 'Unknown error'
      const newRetryCount = job.retry_count + 1
      const canRetry = newRetryCount < job.max_retries

      if (canRetry) {
        // Re-queue for retry: single atomic update preserving the original error message
        console.log(`Re-queuing job ${jobId} for retry (attempt ${newRetryCount}/${job.max_retries}): ${errorMessage}`)
        await supabase
          .from('scan_jobs')
          .update({
            status: 'queued',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
            retry_count: newRetryCount,
          })
          .eq('id', jobId)
      } else {
        // Max retries reached — mark as permanently failed
        console.error(`Job ${jobId} failed permanently after ${newRetryCount} attempt(s): ${errorMessage}`)
        await supabase
          .from('scan_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
            retry_count: newRetryCount,
          })
          .eq('id', jobId)
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage, jobId, retryCount: newRetryCount, willRetry: canRetry }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/**
 * Process recipe image(s) using Claude's vision API.
 * Performs OCR + structured extraction in a single call.
 * Returns an array of ScanResult — one per detected recipe.
 */
async function processWithClaude(imageUrls: string[]): Promise<ScanResult[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to Supabase Edge Function secrets.')
  }

  // Download images and convert to base64
  const imageContents = await Promise.all(
    imageUrls.map(async (url) => {
      console.log(`Fetching image URL: ${url}`)
      const response = await fetch(url)
      console.log(`Fetch response: ${response.status} ${response.statusText}, content-type: ${response.headers.get('content-type')}`)
      if (!response.ok) {
        const body = await response.text()
        console.error(`Image fetch failed body: ${body.substring(0, 500)}`)
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      if (bytes.length < 1000) {
        console.error(`Image suspiciously small (${bytes.length} bytes), might not be a real image`)
      }

      // Detect media type from magic bytes
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
      if (bytes[0] === 0x89 && bytes[1] === 0x50) mediaType = 'image/png'
      else if (bytes[0] === 0x47 && bytes[1] === 0x49) mediaType = 'image/gif'
      else if (bytes[0] === 0x52 && bytes[1] === 0x49) mediaType = 'image/webp'

      // Encode to base64 in chunks to avoid stack overflow
      let base64 = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        base64 += String.fromCharCode(...chunk)
      }
      base64 = btoa(base64)

      console.log(`Image fetched: ${bytes.length} bytes, type: ${mediaType}`)

      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType,
          data: base64,
        },
      }
    })
  )

  const prompt = buildScanPrompt(imageUrls.length)

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!claudeResponse.ok) {
    const errorBody = await claudeResponse.text()
    console.error('Claude API error:', claudeResponse.status, errorBody)
    throw new Error(`Claude API error: ${claudeResponse.status} - ${errorBody}`)
  }

  const claudeData = await claudeResponse.json()
  const content = claudeData.content?.[0]?.text

  if (!content) {
    throw new Error('No content returned from Claude')
  }

  // Parse the JSON response — strip markdown fences if Claude included them
  const jsonStr = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  const parsed = JSON.parse(jsonStr)

  return parseMultiScanResult(parsed)
}

/**
 * Process recipe image(s) from inline base64 data (native upload path).
 * Skips the Storage fetch entirely — images come directly from the client.
 * Returns an array of ScanResult — one per detected recipe.
 */
async function processWithClaudeInline(images: InlineImage[]): Promise<ScanResult[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to Supabase Edge Function secrets.')
  }

  const imageContents = images.map((img) => {
    console.log(`Inline image: ${Math.round(img.base64.length / 1024)}KB base64, type: ${img.mediaType}`)
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: img.base64,
      },
    }
  })

  const prompt = buildScanPrompt(images.length)

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!claudeResponse.ok) {
    const errorBody = await claudeResponse.text()
    console.error('Claude API error:', claudeResponse.status, errorBody)
    throw new Error(`Claude API error: ${claudeResponse.status} - ${errorBody}`)
  }

  const claudeData = await claudeResponse.json()
  const content = claudeData.content?.[0]?.text

  if (!content) {
    throw new Error('No content returned from Claude')
  }

  const jsonStr = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  const parsed = JSON.parse(jsonStr)
  return parseMultiScanResult(parsed)
}

/**
 * Save inline base64 images to Supabase Storage server-side.
 * Returns the public URLs of saved images.
 * Non-fatal: if storage fails, the scan still succeeds.
 */
async function saveInlineImagesToStorage(
  supabase: any,
  job: ScanJob,
  images: InlineImage[]
): Promise<string[]> {
  const savedUrls: string[] = []
  const timestamp = Date.now()

  for (let i = 0; i < images.length; i++) {
    try {
      const ext = images[i].mediaType === 'image/png' ? 'png'
        : images[i].mediaType === 'image/webp' ? 'webp'
        : 'jpg'
      const sequenceNum = String(i + 1).padStart(3, '0')
      const storagePath = `scans/${timestamp}-${sequenceNum}.${ext}`

      // Decode base64 to binary
      const binaryStr = atob(images[i].base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let j = 0; j < binaryStr.length; j++) {
        bytes[j] = binaryStr.charCodeAt(j)
      }

      const { error: uploadError } = await supabase.storage
        .from('scan-photos')
        .upload(storagePath, bytes.buffer, {
          contentType: images[i].mediaType,
          upsert: false,
        })

      if (uploadError) {
        console.warn(`Failed to save inline image ${i + 1} to storage:`, uploadError)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('scan-photos')
        .getPublicUrl(storagePath)

      savedUrls.push(urlData.publicUrl)
      console.log(`Saved inline image ${i + 1} to storage: ${storagePath}`)
    } catch (err) {
      console.warn(`Error saving inline image ${i + 1} to storage:`, err)
    }
  }

  return savedUrls
}
