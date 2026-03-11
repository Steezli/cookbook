import { ScanDraft } from './scan-draft-service'

/**
 * Multi-draft list helpers — pure functions consumed by DraftListView and RecentScans.
 * No side effects, no database calls. All logic derives from the ScanDraft[] array.
 */

export interface DraftProgress {
  saved: number
  total: number
  allSaved: boolean
}

/**
 * Calculate save progress for a set of drafts.
 * A draft is "saved" when its status is 'ready' (set after convertToRecipe).
 */
export function getDraftProgress(drafts: ScanDraft[]): DraftProgress {
  const total = drafts.length
  const saved = drafts.filter((d) => d.status === 'ready').length
  return {
    saved,
    total,
    allSaved: total > 0 && saved === total,
  }
}

/** Confidence threshold for save-all eligibility */
const SAVE_ALL_CONFIDENCE_THRESHOLD = 0.65

/**
 * Determine whether "Save All as Recipes" should be enabled.
 * True when:
 *  - there are ≥2 drafts
 *  - every draft has overallConfidence.score >= 0.65
 *  - at least one draft has NOT been saved yet (status !== 'ready')
 */
export function canSaveAll(drafts: ScanDraft[]): boolean {
  if (drafts.length < 2) return false

  const allHighConfidence = drafts.every(
    (d) => d.overallConfidence.score >= SAVE_ALL_CONFIDENCE_THRESHOLD
  )
  if (!allHighConfidence) return false

  const hasUnsaved = drafts.some((d) => d.status !== 'ready')
  return hasUnsaved
}

export type DraftDisplayStatus = 'pending' | 'saved' | 'needs_review'

/**
 * Map internal draft status to a display-friendly label.
 *  - ready    → 'saved'
 *  - needs_review → 'needs_review'
 *  - enhanced → 'pending'
 */
export function getDraftDisplayStatus(draft: ScanDraft): DraftDisplayStatus {
  switch (draft.status) {
    case 'ready':
      return 'saved'
    case 'needs_review':
      return 'needs_review'
    case 'enhanced':
      return 'pending'
    default:
      return 'pending'
  }
}
