import { supabase } from '@/lib/supabase'
import { ParsedRecipe, FieldConfidence, OverallConfidence } from '@/features/scan/types'

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
  oldValue?: any
  newValue?: any
  timestamp: string
  userId: string
}

export class ScanDraftService {
  /**
   * Map a database record to a ScanDraft interface object
   */
  private mapRecordToDraft(record: any): ScanDraft {
    return {
      id: record.id,
      jobId: record.job_id,
      userId: record.user_id,
      rawText: record.raw_text,
      ocrConfidence: record.ocr_confidence,
      recipe: record.structured_data?.recipe || {},
      fieldConfidence: record.field_confidence || {},
      overallConfidence: record.structured_data?.overallConfidence || {},
      status: record.status,
      aiModelVersion: record.ai_model_version || '1.0',
      processingTimeMs: record.processing_time_ms || 0,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      draftIndex: record.draft_index ?? undefined,
    }
  }

  /**
   * Create a new scan draft from OCR results
   */
  async createDraft(input: ScanDraftInput): Promise<ScanDraft> {
    try {
      console.log(`Creating scan draft for job ${input.jobId}`)

      const startTime = Date.now()

      // Prepare draft data
      const draftData = {
        job_id: input.jobId,
        user_id: input.userId,
        raw_text: input.rawText,
        ocr_confidence: input.ocrConfidence,
        structured_data: {
          recipe: input.recipe,
          fieldConfidence: input.fieldConfidence,
          overallConfidence: input.overallConfidence
        },
        field_confidence: input.fieldConfidence,
        status: input.overallConfidence.status,
        confidence_level: this.mapConfidenceToLevel(input.overallConfidence.score),
        ai_model_version: '1.0',
        processing_time_ms: Date.now() - startTime
      }

      // Insert draft into database
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

      // Convert database record to ScanDraft format
      const scanDraft = this.mapRecordToDraft(data)

      console.log(`Scan draft created successfully: ${scanDraft.id}`)

      return scanDraft

    } catch (error) {
      console.error('Failed to create scan draft:', error)
      throw new Error(`Scan draft creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a scan draft by ID
   */
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
      console.error('Failed to get scan draft:', error)
      throw new Error(`Failed to fetch scan draft: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the first scan draft by job ID (returns draft_index 0 when multiple drafts exist)
   */
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
      console.error('Failed to get scan draft by job ID:', error)
      throw new Error(`Failed to fetch scan draft by job ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all scan drafts for a job, ordered by draft_index ascending.
   * Returns empty array when no drafts exist.
   */
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

      return (data || []).map((record: any) => this.mapRecordToDraft(record))
    } catch (error) {
      console.error('Failed to get scan drafts by job ID:', error)
      throw new Error(`Failed to fetch scan drafts by job ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all drafts for a user
   */
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

      return (data || []).map((record: any) => this.mapRecordToDraft(record))

    } catch (error) {
      console.error('Failed to get user drafts:', error)
      throw new Error(`Failed to fetch user drafts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update draft status
   */
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

      console.log(`Draft ${draftId} status updated to ${status}`)

    } catch (error) {
      console.error('Failed to update draft status:', error)
      throw new Error(`Failed to update draft status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update draft recipe data
   */
  async updateDraftRecipe(
    draftId: string,
    userId: string,
    recipe: ParsedRecipe,
    fieldConfidence?: FieldConfidence
  ): Promise<void> {
    try {
      // Get current draft to preserve existing data
      const currentDraft = await this.getDraft(draftId, userId)
      if (!currentDraft) {
        throw new Error('Draft not found')
      }

      // Recalculate overall confidence if field confidence provided
      let overallConfidence = currentDraft.overallConfidence
      if (fieldConfidence) {
        // This is a simplified recalculation - in practice you'd use the confidence scoring service
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
        structured_data: {
          recipe,
          fieldConfidence: fieldConfidence || currentDraft.fieldConfidence,
          overallConfidence
        },
        field_confidence: fieldConfidence || currentDraft.fieldConfidence,
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

      console.log(`Draft ${draftId} recipe updated successfully`)

    } catch (error) {
      console.error('Failed to update draft recipe:', error)
      throw new Error(`Failed to update draft recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a draft
   */
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

      console.log(`Draft ${draftId} deleted successfully`)

    } catch (error) {
      console.error('Failed to delete draft:', error)
      throw new Error(`Failed to delete draft: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get drafts by status for processing queue
   */
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

      return (data || []).map((record: any) => this.mapRecordToDraft(record))

    } catch (error) {
      console.error('Failed to get drafts by status:', error)
      throw new Error(`Failed to fetch drafts by status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert draft to recipe (for approved drafts)
   */
  async convertToRecipe(
    draftId: string,
    userId: string,
    recipeData: {
      title: string
      description?: string
      ingredients: any[]
      instructions: string[]
      prepTimeMinutes?: number
      cookTimeMinutes?: number
      servings?: number
      category?: string
      tags?: string[]
    }
  ): Promise<{ recipeId: string }> {
    try {
      // Verify draft exists and belongs to user
      const draft = await this.getDraft(draftId, userId)
      if (!draft) {
        throw new Error('Draft not found')
      }

      // Transform ParsedIngredient[] → RecipeIngredient[] (with text field)
      const ingredients = recipeData.ingredients.map((ing: any, i: number) => ({
        text: ing.text || [ing.amount, ing.unit, ing.name, ing.preparation].filter(Boolean).join(' '),
        sort_order: i,
        amount: ing.quantity ?? (ing.amount ? parseFloat(ing.amount) : null) ?? null,
        unit: ing.unit || null,
        original_text: ing.text || null,
        is_ambiguous: false,
      }))

      // Transform string[] → RecipeStep[] (with text field)
      const steps = recipeData.instructions.map((instruction: any, i: number) => ({
        text: typeof instruction === 'string' ? instruction : instruction.text || String(instruction),
        sort_order: i,
      }))

      // Create recipe from draft
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          owner_user_id: userId,
          title: recipeData.title,
          description: recipeData.description || null,
          ingredients,
          steps,
          prep_time_minutes: recipeData.prepTimeMinutes || null,
          cook_time_minutes: recipeData.cookTimeMinutes || null,
          servings: recipeData.servings || null,
          tags: recipeData.tags || [],
          visibility: 'private',
          family_id: null,
          source_story: null,
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create recipe from draft: ${error.message}`)
      }

      if (!data) {
        throw new Error('No data returned from recipe creation')
      }

      // Update draft status to indicate it was converted
      await this.updateDraftStatus(draftId, userId, 'ready')

      console.log(`Draft ${draftId} converted to recipe ${data.id}`)

      return { recipeId: data.id }

    } catch (error) {
      console.error('Failed to convert draft to recipe:', error)
      throw new Error(`Failed to convert draft to recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get draft statistics for a user
   */
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

      data?.forEach((draft: any) => {
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
      console.error('Failed to get user draft stats:', error)
      throw new Error(`Failed to fetch draft stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Map confidence score to level
   */
  private mapConfidenceToLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.85) return 'high'
    if (confidence >= 0.65) return 'medium'
    return 'low'
  }

  /**
   * Map score to status
   */
  private mapScoreToStatus(score: number): 'ready' | 'needs_review' | 'enhanced' {
    if (score >= 0.8) return 'ready'
    if (score >= 0.5) return 'needs_review'
    return 'enhanced'
  }
}

// Export singleton instance
export const scanDraftService = new ScanDraftService()