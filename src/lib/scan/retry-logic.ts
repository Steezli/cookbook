/**
 * Pure retry decision logic for scan jobs.
 *
 * Extracted from the edge function so it can be unit-tested with Jest.
 * The edge function (supabase/functions/process-scan-job/index.ts) should
 * mirror this logic — keep the two in sync.
 */

export interface RetryDecision {
  /** Whether the job should be re-queued for another attempt */
  canRetry: boolean
  /** The new retry_count to persist (always current + 1) */
  newRetryCount: number
  /** Status to set on the scan_jobs row */
  status: 'queued' | 'failed'
  /** Error message to persist — always the original, never overwritten */
  errorMessage: string
}

/**
 * Determine whether a failed scan job should be retried.
 *
 * Rules:
 * - retry_count is incremented BEFORE comparison (post-increment)
 * - A job can retry when newRetryCount < max_retries
 * - The original error message is always preserved (never replaced with "Retrying...")
 * - Jobs already at or above max_retries are never re-queued
 *
 * @param retryCount  - current retry_count from the scan_jobs row
 * @param maxRetries  - max_retries from the scan_jobs row
 * @param errorMessage - the error that caused this failure
 */
export function computeRetryDecision(
  retryCount: number,
  maxRetries: number,
  errorMessage: string
): RetryDecision {
  const newRetryCount = retryCount + 1
  const canRetry = newRetryCount < maxRetries

  return {
    canRetry,
    newRetryCount,
    status: canRetry ? 'queued' : 'failed',
    errorMessage,
  }
}
