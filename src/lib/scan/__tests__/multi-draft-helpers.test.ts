import {
  getDraftProgress,
  canSaveAll,
  getDraftDisplayStatus,
  DraftProgress,
  DraftDisplayStatus,
} from '../multi-draft-helpers'
import { ScanDraft } from '../scan-draft-service'

// ---------------------------------------------------------------------------
// Test-data factory
// ---------------------------------------------------------------------------

function makeDraft(
  overrides: Partial<ScanDraft> & {
    confidenceScore?: number
  } = {}
): ScanDraft {
  const { confidenceScore = 0.85, ...rest } = overrides
  return {
    id: 'draft-1',
    jobId: 'job-1',
    userId: 'user-1',
    rawText: 'raw text',
    ocrConfidence: 0.9,
    recipe: {} as any,
    fieldConfidence: {} as any,
    overallConfidence: {
      score: confidenceScore,
      status: 'ready',
      fieldScores: [],
      priority: 'high',
      recommendedActions: [],
    },
    status: 'enhanced',
    aiModelVersion: '1.0',
    processingTimeMs: 100,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// getDraftProgress
// ---------------------------------------------------------------------------

describe('getDraftProgress', () => {
  it('returns zeros for an empty array', () => {
    const result: DraftProgress = getDraftProgress([])
    expect(result).toEqual({ saved: 0, total: 0, allSaved: false })
  })

  it('counts a single unsaved draft', () => {
    const result = getDraftProgress([makeDraft({ status: 'enhanced' })])
    expect(result).toEqual({ saved: 0, total: 1, allSaved: false })
  })

  it('counts a single saved (ready) draft', () => {
    const result = getDraftProgress([makeDraft({ status: 'ready' })])
    expect(result).toEqual({ saved: 1, total: 1, allSaved: true })
  })

  it('counts 3 drafts with 1 saved', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'ready' }),
      makeDraft({ id: 'd2', status: 'enhanced' }),
      makeDraft({ id: 'd3', status: 'needs_review' }),
    ]
    const result = getDraftProgress(drafts)
    expect(result).toEqual({ saved: 1, total: 3, allSaved: false })
  })

  it('reports allSaved when every draft is ready', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'ready' }),
      makeDraft({ id: 'd2', status: 'ready' }),
      makeDraft({ id: 'd3', status: 'ready' }),
    ]
    const result = getDraftProgress(drafts)
    expect(result).toEqual({ saved: 3, total: 3, allSaved: true })
  })
})

// ---------------------------------------------------------------------------
// canSaveAll
// ---------------------------------------------------------------------------

describe('canSaveAll', () => {
  it('returns false for a single draft', () => {
    expect(canSaveAll([makeDraft({ confidenceScore: 0.9 })])).toBe(false)
  })

  it('returns true for 2 high-confidence unsaved drafts', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'enhanced', confidenceScore: 0.85 }),
      makeDraft({ id: 'd2', status: 'needs_review', confidenceScore: 0.70 }),
    ]
    expect(canSaveAll(drafts)).toBe(true)
  })

  it('returns false when one draft has low confidence', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'enhanced', confidenceScore: 0.85 }),
      makeDraft({ id: 'd2', status: 'enhanced', confidenceScore: 0.50 }),
    ]
    expect(canSaveAll(drafts)).toBe(false)
  })

  it('returns false when all drafts are already saved', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'ready', confidenceScore: 0.90 }),
      makeDraft({ id: 'd2', status: 'ready', confidenceScore: 0.90 }),
    ]
    expect(canSaveAll(drafts)).toBe(false)
  })

  it('returns false for 3 drafts with mixed confidence where one is below threshold', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'enhanced', confidenceScore: 0.90 }),
      makeDraft({ id: 'd2', status: 'enhanced', confidenceScore: 0.80 }),
      makeDraft({ id: 'd3', status: 'enhanced', confidenceScore: 0.60 }),
    ]
    expect(canSaveAll(drafts)).toBe(false)
  })

  it('returns true for 3 high-confidence drafts with some saved and some not', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'ready', confidenceScore: 0.90 }),
      makeDraft({ id: 'd2', status: 'enhanced', confidenceScore: 0.80 }),
      makeDraft({ id: 'd3', status: 'enhanced', confidenceScore: 0.70 }),
    ]
    expect(canSaveAll(drafts)).toBe(true)
  })

  it('returns false for an empty array', () => {
    expect(canSaveAll([])).toBe(false)
  })

  it('returns true at the exact confidence threshold (0.65)', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'enhanced', confidenceScore: 0.65 }),
      makeDraft({ id: 'd2', status: 'enhanced', confidenceScore: 0.65 }),
    ]
    expect(canSaveAll(drafts)).toBe(true)
  })

  it('returns true after partial batch save (some saved, some still unsaved)', () => {
    // Simulates state after a batch save where 2 of 3 drafts succeeded
    const drafts = [
      makeDraft({ id: 'd1', status: 'ready', confidenceScore: 0.90 }),
      makeDraft({ id: 'd2', status: 'ready', confidenceScore: 0.80 }),
      makeDraft({ id: 'd3', status: 'enhanced', confidenceScore: 0.70 }),
    ]
    expect(canSaveAll(drafts)).toBe(true)
  })

  it('returns false just below the confidence threshold (0.64)', () => {
    const drafts = [
      makeDraft({ id: 'd1', status: 'enhanced', confidenceScore: 0.85 }),
      makeDraft({ id: 'd2', status: 'enhanced', confidenceScore: 0.64 }),
    ]
    expect(canSaveAll(drafts)).toBe(false)
  })

  it('returns false for exactly 1 draft even with high confidence', () => {
    expect(canSaveAll([makeDraft({ status: 'enhanced', confidenceScore: 0.99 })])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getDraftDisplayStatus
// ---------------------------------------------------------------------------

describe('getDraftDisplayStatus', () => {
  it('maps ready → saved', () => {
    const status: DraftDisplayStatus = getDraftDisplayStatus(
      makeDraft({ status: 'ready' })
    )
    expect(status).toBe('saved')
  })

  it('maps needs_review → needs_review', () => {
    expect(getDraftDisplayStatus(makeDraft({ status: 'needs_review' }))).toBe(
      'needs_review'
    )
  })

  it('maps enhanced → pending', () => {
    expect(getDraftDisplayStatus(makeDraft({ status: 'enhanced' }))).toBe(
      'pending'
    )
  })
})
