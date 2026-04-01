import { supabase } from '@/lib/supabase'
import type { Json, Tables, TablesInsert } from '@/lib/database.types'
import { ParsedRecipe, FieldConfidence, OverallConfidence, ParsedIngredient } from '@/features/scan/types'

/** Cast a typed object to Supabase Json for jsonb columns */
function toJson<T>(value: T): Json {
  return value as unknown as Json
}

// ---------------------------------------------------------------------------
// Database row type aliases
// ---------------------------------------------------------------------------

/** Full scan_drafts row as returned by Supabase queries */
type ScanDraftRow = Tables<'scan_drafts'>

/** Full recipes row as returned by Supabase queries */
type RecipeRow = Tables<'recipes'>

/** Insertable scan_drafts record */
type ScanDraftInsert = TablesInsert<'scan_drafts'>

/** Insertable recipes record */
type RecipeInsert = TablesInsert<'recipes'>

// ---------------------------------------------------------------------------
// Application-level types
// ---------------------------------------------------------------------------

export interface ScanDraftInput {
  jobId: string
  userId: string
  rawText: string
  ocrConfidence: number
  recipe: ParsedRecipe
  fieldConfidence: FieldConfidence
  overallConfidence: OverallConfidence
}

export interface ScanDraft {
  id: string
  jobId: string
  userId: string
  rawText: string
  ocrConfidence: number
  recipe: ParsedRecipe
  fieldConfidence: FieldConfidence
  overallConfidence: OverallConfidence
  status: 'ready' | 'needs_review' | 'enhanced'
  aiModelVersion: string
  processingTimeMs: number
  createdAt: string
  updatedAt: string
  draftIndex?: number
}

export interface DraftEnhancement {
  field: string
  originalValue: string | string[]
  enhancedValue: string | string[]
  confidenceImprovement: number
  aiSuggestions: string[]
  appliedAt: string
}

export interface DraftReviewAction {
  type: 'approve' | 'edit' | 'enhance' | 'reject'
  field?: string
  oldValue?: string | string[] | number | null
  newValue?: string | string[] | number | null
  timestamp: string
  userId: string
}

/** Shape of ingredients stored in the recipes table (jsonb) */
interface RecipeIngredientRow {
  text: string
  sort_order: number
  amount: number | null
  unit: string | null
  original_text: string | null
  is_ambiguous: boolean
}

/** Shape of steps stored in the recipes table (jsonb) */
interface RecipeStepRow {
  text: string
  sort_order: number
}

export class ScanDraftService {
  private mapRecordToDraft(record: ScanDraftRow): ScanDraft {
    const structuredData = record.structured_data as Record<string, unknown> | null
    return {
      id: record.id,
      jobId: record.job_id,
      userId: record.user_id,
      rawText: record.raw_text ?? '',
      ocrConfidence: record.ocr_confidence ?? 0,
      recipe: (structuredData?.recipe as ParsedRecipe) || {} as ParsedRecipe,
      fieldConfidence: (record.field_confidence as FieldConfidence | null) || {} as FieldConfidence,
      overallConfidence: (structuredData?.overallConfidence as OverallConfidence) || {} as OverallConfidence,
      status: record.status as ScanDraft['status'],
      aiModelVersion: record.ai_model_version || '1.0',
      processingTimeMs: record.processing_time_ms || 0,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      draftIndex: record.draft_index ?? undefined,
    }
  }

  async createDraft(input: ScanDraftInput): Promise<ScanDraft> {
    try {
      const startTime = Date.now()

      const draftData: ScanDraftInsert = {
        job_id: input.jobId,
        user_id: input.userId,
        raw_text: input.rawText,
        ocr_confidence: input.ocrConfidence,
        structured_data: toJson({
          recipe: input.recipe,
          fieldConfidence: input.fieldConfidence,
          overallConfidence: input.overallConfidence
        }),
        field_confidence: toJson(input.fieldConfidence),
        status: input.overallConfidence.status,
        confidence_level: this.mapConfidenceToLevel(input.overallConfidence.score),
        ai_model_version: '1.0',
        processing_time_ms: Date.now() - startTime
      }

      const { data, error } = await supabase
        .from('scan_drafts')
        .insert(draftData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create scan draft: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from draft creation')
      }

      return this.mapRecordToDraft(data)

    } catch (error) {
      throw new Error(`Scan draft creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDraft(draftId: string, userId: string): Promise<ScanDraft | null> {
    try {
      const { data, error } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to fetch scan draft: ${error.message}`)
      }

      if (!data) {
        return null
      }

      return this.mapRecordToDraft(data)

    } catch (error) {
      throw new Error(`Failed to fetch scan draft: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /** Returns draft_index 0 when multiple drafts exist for a job. */
  async getDraftByJobId(jobId: string, userId: string): Promise<ScanDraft | null> {
    try {
      const { data, error } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .order('draft_index', { ascending: true })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch scan draft by job ID: ${error.message}`)
      }

      if (!data) {
        return null
      }

      return this.mapRecordToDraft(data)
    } catch (error) {
      throw new Error(`Failed to fetch scan draft by job ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDraftsByJobId(jobId: string, userId: string): Promise<ScanDraft[]> {
    try {
      const { data, error } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .order('draft_index', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch scan drafts by job ID: ${error.message}`)
      }

      return (data || []).map((record) => this.mapRecordToDraft(record))
    } catch (error) {
      throw new Error(`Failed to fetch scan drafts by job ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getUserDrafts(
    userId: string,
    status?: 'ready' | 'needs_review' | 'enhanced',
    limit: number = 20,
    offset: number = 0
  ): Promise<ScanDraft[]> {
    try {
      let query = supabase
        .from('scan_drafts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch user drafts: ${error.message}`)
      }

      return (data || []).map((record) => this.mapRecordToDraft(record))

    } catch (error) {
      throw new Error(`Failed to fetch user drafts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateDraftStatus(
    draftId: string,
    userId: string,
    status: 'ready' | 'needs_review' | 'enhanced'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('scan_drafts')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to update draft status: ${error.message}`)
      }

    } catch (error) {
      throw new Error(`Failed to update draft status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateDraftRecipe(
    draftId: string,
    userId: string,
    recipe: ParsedRecipe,
    fieldConfidence?: FieldConfidence
  ): Promise<void> {
    try {
      const currentDraft = await this.getDraft(draftId, userId)
      if (!currentDraft) {
        throw new Error('Draft not found')
      }

      // Recalculate overall confidence — simplified average, not the full scoring service
      let overallConfidence = currentDraft.overallConfidence
      if (fieldConfidence) {
        const avgConfidence = (
          fieldConfidence.title +
          fieldConfidence.ingredients +
          fieldConfidence.instructions +
          fieldConfidence.prepTime +
          fieldConfidence.cookTime +
          fieldConfidence.servings
        ) / 6

        overallConfidence = {
          ...currentDraft.overallConfidence,
          score: avgConfidence,
          status: this.mapScoreToStatus(avgConfidence)
        }
      }

      const updateData = {
        structured_data: toJson({
          recipe,
          fieldConfidence: fieldConfidence || currentDraft.fieldConfidence,
          overallConfidence
        }),
        field_confidence: toJson(fieldConfidence || currentDraft.fieldConfidence),
        status: overallConfidence.status as 'ready' | 'needs_review' | 'enhanced',
        confidence_level: this.mapConfidenceToLevel(overallConfidence.score),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('scan_drafts')
        .update(updateData)
        .eq('id', draftId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to update draft recipe: ${error.message}`)
      }

    } catch (error) {
      throw new Error(`Failed to update draft recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteDraft(draftId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scan_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to delete draft: ${error.message}`)
      }

    } catch (error) {
      throw new Error(`Failed to delete draft: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDraftsByStatus(
    status: 'ready' | 'needs_review' | 'enhanced',
    limit: number = 10
  ): Promise<ScanDraft[]> {
    try {
      const { data, error } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch drafts by status: ${error.message}`)
      }

      return (data || []).map((record) => this.mapRecordToDraft(record))

    } catch (error) {
      throw new Error(`Failed to fetch drafts by status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async convertToRecipe(
    draftId: string,
    userId: string,
    recipeData: {
      title: string
      description?: string
      ingredients: ParsedIngredient[]
      instructions: string[]
      prepTimeMinutes?: number
      cookTimeMinutes?: number
      servings?: number
      category?: string
      tags?: string[]
    }
  ): Promise<{ recipeId: string }> {
    try {
      const draft = await this.getDraft(draftId, userId)
      if (!draft) {
        throw new Error('Draft not found')
      }

      const ingredients: RecipeIngredientRow[] = recipeData.ingredients.map((ing, i) => ({
        text: [ing.amount, ing.unit, ing.name, ing.preparation].filter(Boolean).join(' '),
        sort_order: i,
        amount: ing.quantity ?? (ing.amount ? parseFloat(ing.amount) : null) ?? null,
        unit: ing.unit || null,
        original_text: null,
        is_ambiguous: false,
      }))

      const steps: RecipeStepRow[] = recipeData.instructions.map((instruction, i) => ({
        text: instruction,
        sort_order: i,
      }))

      const insertData: RecipeInsert = {
        owner_user_id: userId,
        title: recipeData.title,
        description: recipeData.description || null,
        ingredients: toJson(ingredients),
        steps: toJson(steps),
        prep_time_minutes: recipeData.prepTimeMinutes || null,
        cook_time_minutes: recipeData.cookTimeMinutes || null,
        servings: recipeData.servings || null,
        tags: recipeData.tags || [],
        visibility: 'private',
        family_id: null,
        source_story: null,
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert(insertData)
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create recipe from draft: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from recipe creation')
      }

      await this.deleteDraft(draftId, userId)

      return { recipeId: data.id }

    } catch (error) {
      throw new Error(`Failed to convert draft to recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getUserDraftStats(userId: string): Promise<{
    total: number
    ready: number
    needsReview: number
    enhanced: number
  }> {
    try {
      const { data, error } = await supabase
        .from('scan_drafts')
        .select('status')
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to fetch draft stats: ${error.message}`)
      }

      const stats = {
        total: data?.length || 0,
        ready: 0,
        needsReview: 0,
        enhanced: 0
      }

      data?.forEach((draft) => {
        switch (draft.status) {
          case 'ready':
            stats.ready++
            break
          case 'needs_review':
            stats.needsReview++
            break
          case 'enhanced':
            stats.enhanced++
            break
        }
      })

      return stats

    } catch (error) {
      throw new Error(`Failed to fetch draft stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private mapConfidenceToLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.85) return 'high'
    if (confidence >= 0.65) return 'medium'
    return 'low'
  }

  private mapScoreToStatus(score: number): 'ready' | 'needs_review' | 'enhanced' {
    if (score >= 0.8) return 'ready'
    if (score >= 0.5) return 'needs_review'
    return 'enhanced'
  }
}

export const scanDraftService = new ScanDraftService()
