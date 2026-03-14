import { computeRetryDecision } from '../retry-logic'

describe('computeRetryDecision', () => {
  const ERROR_MSG = 'Claude API error: 500 - Internal Server Error'

  describe('retry boundary (off-by-one prevention)', () => {
    it('allows retry when newRetryCount < maxRetries', () => {
      // retry_count=0, max_retries=3 → newRetryCount=1, 1<3 → can retry
      const result = computeRetryDecision(0, 3, ERROR_MSG)
      expect(result.canRetry).toBe(true)
      expect(result.newRetryCount).toBe(1)
      expect(result.status).toBe('queued')
    })

    it('allows retry at penultimate attempt', () => {
      // retry_count=1, max_retries=3 → newRetryCount=2, 2<3 → can retry
      const result = computeRetryDecision(1, 3, ERROR_MSG)
      expect(result.canRetry).toBe(true)
      expect(result.newRetryCount).toBe(2)
      expect(result.status).toBe('queued')
    })

    it('denies retry when newRetryCount equals maxRetries', () => {
      // retry_count=2, max_retries=3 → newRetryCount=3, 3<3 is false → no retry
      const result = computeRetryDecision(2, 3, ERROR_MSG)
      expect(result.canRetry).toBe(false)
      expect(result.newRetryCount).toBe(3)
      expect(result.status).toBe('failed')
    })

    it('denies retry when already past maxRetries', () => {
      // retry_count=5, max_retries=3 → newRetryCount=6, 6<3 is false
      const result = computeRetryDecision(5, 3, ERROR_MSG)
      expect(result.canRetry).toBe(false)
      expect(result.newRetryCount).toBe(6)
      expect(result.status).toBe('failed')
    })

    it('denies retry when maxRetries is 0 (no retries allowed)', () => {
      // retry_count=0, max_retries=0 → newRetryCount=1, 1<0 is false
      const result = computeRetryDecision(0, 0, ERROR_MSG)
      expect(result.canRetry).toBe(false)
      expect(result.newRetryCount).toBe(1)
      expect(result.status).toBe('failed')
    })

    it('allows exactly max_retries-1 retries total (max_retries=1)', () => {
      // retry_count=0, max_retries=1 → newRetryCount=1, 1<1 is false → no retry
      // This means max_retries=1 allows only the initial attempt (0 retries)
      const result = computeRetryDecision(0, 1, ERROR_MSG)
      expect(result.canRetry).toBe(false)
      expect(result.newRetryCount).toBe(1)
      expect(result.status).toBe('failed')
    })
  })

  describe('error message preservation', () => {
    it('preserves original error message on retry', () => {
      const result = computeRetryDecision(0, 3, ERROR_MSG)
      expect(result.errorMessage).toBe(ERROR_MSG)
      expect(result.errorMessage).not.toBe('Retrying...')
    })

    it('preserves original error message on final failure', () => {
      const result = computeRetryDecision(2, 3, ERROR_MSG)
      expect(result.errorMessage).toBe(ERROR_MSG)
    })

    it('handles empty error message', () => {
      const result = computeRetryDecision(0, 3, '')
      expect(result.errorMessage).toBe('')
    })
  })

  describe('newRetryCount always increments', () => {
    it('increments from 0', () => {
      expect(computeRetryDecision(0, 3, ERROR_MSG).newRetryCount).toBe(1)
    })

    it('increments from arbitrary value', () => {
      expect(computeRetryDecision(7, 10, ERROR_MSG).newRetryCount).toBe(8)
    })
  })

  describe('full retry sequence simulation', () => {
    it('allows exactly max_retries-1 re-queues for max_retries=3', () => {
      // Simulates a job that fails every time with max_retries=3
      // Attempt 0 (initial): fails → retry_count becomes 1, canRetry=true (1<3)
      // Attempt 1 (1st retry): fails → retry_count becomes 2, canRetry=true (2<3)
      // Attempt 2 (2nd retry): fails → retry_count becomes 3, canRetry=false (3<3 is false)
      // Total: 3 attempts, 2 re-queues
      let retryCount = 0
      const maxRetries = 3
      const attempts: boolean[] = []

      for (let attempt = 0; attempt < 5; attempt++) {
        const decision = computeRetryDecision(retryCount, maxRetries, ERROR_MSG)
        attempts.push(decision.canRetry)
        retryCount = decision.newRetryCount
        if (!decision.canRetry) break
      }

      expect(attempts).toEqual([true, true, false])
      expect(retryCount).toBe(3)
    })
  })
})
