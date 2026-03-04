import { supabase } from "@/lib/supabase"
import { DetailedJobStatus, ErrorCategory, ErrorSeverity } from "./job-status-service"
import { ErrorClassificationService } from "./error-classification-service"

export interface RetryStrategy {
  maxRetries: number
  baseDelayMinutes: number
  maxDelayMinutes: number
  backoffMultiplier: number
  jitter: boolean
}

export interface RetryAttempt {
  attemptNumber: number
  timestamp: string
  errorCategory: ErrorCategory
  errorSeverity: ErrorSeverity
  errorMessage: string
  delayMinutes: number
  success: boolean
}

export interface RecoveryAction {
  type: 'retry' | 'partial_recovery' | 'manual_intervention' | 'escalate'
  description: string
  requiresUserAction: boolean
  estimatedSuccessRate?: number
}

export interface PartialRecoveryResult {
  recovered: boolean
  recoveredData?: {
    rawText?: string
    structuredData?: any
    partialSuccess?: boolean
  }
  remainingWork?: string[]
  userGuidance: string
}

/**
 * Intelligent retry and recovery service
 */
export class RetryRecoveryService {
  private static readonly DEFAULT_STRATEGY: RetryStrategy = {
    maxRetries: 3,
    baseDelayMinutes: 1,
    maxDelayMinutes: 60,
    backoffMultiplier: 2,
    jitter: true
  }

  private static readonly SUBSCRIPTION_STRATEGIES: Record<string, RetryStrategy> = {
    'basic': {
      maxRetries: 2,
      baseDelayMinutes: 2,
      maxDelayMinutes: 30,
      backoffMultiplier: 2,
      jitter: true
    },
    'premium': {
      maxRetries: 4,
      baseDelayMinutes: 1,
      maxDelayMinutes: 45,
      backoffMultiplier: 2,
      jitter: true
    },
    'unlimited': {
      maxRetries: 6,
      baseDelayMinutes: 0.5,
      maxDelayMinutes: 60,
      backoffMultiplier: 1.5,
      jitter: true
    }
  }

  /**
   * Attempt to retry a failed job with intelligent backoff
   */
  static async retryJob(
    jobId: string,
    userId: string,
    forceRetry: boolean = false
  ): Promise<{
    success: boolean
    scheduled: boolean
    nextRetryTime?: string
    message: string
    retryCount: number
    maxRetries: number
  }> {
    try {
      // Get current job status and user subscription
      const { data: job, error: jobError } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single()

      if (jobError || !job) {
        return {
          success: false,
          scheduled: false,
          message: 'Job not found or access denied',
          retryCount: 0,
          maxRetries: 3
        }
      }

      const strategy = this.getRetryStrategy(job.subscription_tier)
      const retryCount = job.retry_count || 0

      // Check if retry is allowed
      if (!forceRetry && !this.canRetry(job, retryCount, strategy)) {
        return {
          success: false,
          scheduled: false,
          message: 'Retry not allowed: job not failed or max retries reached',
          retryCount,
          maxRetries: strategy.maxRetries
        }
      }

      // Get latest error to determine retry strategy
      const { data: latestError } = await supabase
        .from('job_errors')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestError && !latestError.can_retry && !forceRetry) {
        return {
          success: false,
          scheduled: false,
          message: 'Error is not retryable: ' + latestError.user_guidance,
          retryCount,
          maxRetries: strategy.maxRetries
        }
      }

      // Calculate retry delay
      const delayMinutes = this.calculateRetryDelay(
        retryCount,
        strategy,
        latestError
      )

      const nextRetryTime = new Date(Date.now() + delayMinutes * 60 * 1000)

      // Update job for retry
      const { error: updateError } = await supabase
        .from('scan_jobs')
        .update({
          status: 'retrying',
          retry_count: retryCount + 1,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }

      // Add retry attempt to history
      await this.addRetryAttempt(jobId, {
        attemptNumber: retryCount + 1,
        errorCategory: latestError?.category || 'system_error',
        errorSeverity: latestError?.severity || 'error',
        errorMessage: latestError?.message || 'Unknown error',
        delayMinutes,
        success: false
      })

      // Schedule retry (in a real system, this would use a job queue)
      console.log(`Job ${jobId} scheduled for retry at ${nextRetryTime.toISOString()}`)

      return {
        success: true,
        scheduled: true,
        nextRetryTime: nextRetryTime.toISOString(),
        message: `Retry scheduled in ${Math.round(delayMinutes)} minutes`,
        retryCount: retryCount + 1,
        maxRetries: strategy.maxRetries
      }

    } catch (error) {
      console.error('Failed to retry job:', error)
      return {
        success: false,
        scheduled: false,
        message: 'Failed to schedule retry: ' + (error instanceof Error ? error.message : 'Unknown error'),
        retryCount: 0,
        maxRetries: 3
      }
    }
  }

  /**
   * Attempt partial recovery for partially successful scans
   */
  static async attemptPartialRecovery(
    jobId: string,
    userId: string
  ): Promise<PartialRecoveryResult> {
    try {
      // Get job and any existing draft
      const { data: job } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single()

      if (!job) {
        return {
          recovered: false,
          userGuidance: 'Job not found'
        }
      }

      const { data: draft } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('job_id', jobId)
        .single()

      if (!draft) {
        return {
          recovered: false,
          userGuidance: 'No partial data found for recovery'
        }
      }

      // Analyze what data is available
      const recovery = await this.analyzeAndRecoverData(draft)

      if (recovery.recovered) {
        // Update job status to indicate partial recovery
        await supabase
          .from('scan_jobs')
          .update({
            status: 'completed',
            error_message: 'Partially recovered - manual review recommended',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)

        // Update draft status
        await supabase
          .from('scan_drafts')
          .update({
            status: 'needs_review',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
      }

      return recovery

    } catch (error) {
      console.error('Failed to attempt partial recovery:', error)
      return {
        recovered: false,
        userGuidance: 'Recovery failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Get recommended recovery actions for a failed job
   */
  static async getRecoveryActions(
    jobId: string,
    userId: string
  ): Promise<RecoveryAction[]> {
    try {
      // Get job status and error history
      const { data: job } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single()

      if (!job) {
        return []
      }

      const { data: errors } = await supabase
        .from('job_errors')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      const { data: draft } = await supabase
        .from('scan_drafts')
        .select('*')
        .eq('job_id', jobId)
        .single()

      const actions: RecoveryAction[] = []

      // Analyze errors and job state to determine actions
      const strategy = this.getRetryStrategy(job.subscription_tier)
      const retryCount = job.retry_count || 0
      const latestError = errors?.[0]

      // Retry action
      if (job.status === 'failed' && retryCount < strategy.maxRetries && 
          (!latestError || latestError.can_retry)) {
        const retryDelay = this.calculateRetryDelay(retryCount, strategy, latestError)
        
        actions.push({
          type: 'retry',
          description: `Retry scan in ${Math.round(retryDelay)} minutes with adjusted parameters`,
          requiresUserAction: false,
          estimatedSuccessRate: this.calculateRetrySuccessRate(retryCount, latestError)
        })
      }

      // Partial recovery action
      if (draft && this.hasRecoverableData(draft)) {
        actions.push({
          type: 'partial_recovery',
          description: 'Recover partially extracted data and complete manually',
          requiresUserAction: true,
          estimatedSuccessRate: 0.85
        })
      }

      // Manual intervention action
      if (latestError?.category === 'user_error' || 
          (latestError?.severity === 'critical' && retryCount >= strategy.maxRetries)) {
        actions.push({
          type: 'manual_intervention',
          description: 'Manual intervention required. Contact support or try with a different image.',
          requiresUserAction: true,
          estimatedSuccessRate: 0.3
        })
      }

      // Escalation action
      if (ErrorClassificationService.shouldEscalate(
        latestError?.message || 'Unknown error',
        errors || []
      )) {
        actions.push({
          type: 'escalate',
          description: 'Issue escalated to support team due to repeated failures',
          requiresUserAction: false,
          estimatedSuccessRate: 0.7
        })
      }

      return actions

    } catch (error) {
      console.error('Failed to get recovery actions:', error)
      return []
    }
  }

  /**
   * Get retry strategy based on subscription tier
   */
  private static getRetryStrategy(subscriptionTier: string): RetryStrategy {
    return this.SUBSCRIPTION_STRATEGIES[subscriptionTier] || this.DEFAULT_STRATEGY
  }

  /**
   * Check if job can be retried
   */
  private static canRetry(
    job: any,
    retryCount: number,
    strategy: RetryStrategy
  ): boolean {
    return job.status === 'failed' && 
           retryCount < strategy.maxRetries &&
           !this.isJobTooOld(job.created_at)
  }

  /**
   * Check if job is too old to retry (older than 24 hours)
   */
  private static isJobTooOld(createdAt: string): boolean {
    const jobTime = new Date(createdAt).getTime()
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    return jobTime < twentyFourHoursAgo
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private static calculateRetryDelay(
    retryCount: number,
    strategy: RetryStrategy,
    latestError?: any
  ): number {
    // Use error-specific delay if available
    if (latestError?.retry_delay) {
      return latestError.retry_delay
    }

    // Calculate exponential backoff
    let delay = strategy.baseDelayMinutes * Math.pow(strategy.backoffMultiplier, retryCount)
    
    // Apply jitter to prevent thundering herd
    if (strategy.jitter) {
      const jitterAmount = delay * 0.2 // 20% jitter
      delay += (Math.random() * 2 - 1) * jitterAmount
    }

    // Cap at maximum delay
    delay = Math.min(delay, strategy.maxDelayMinutes)

    return Math.max(0, delay)
  }

  /**
   * Add retry attempt to tracking
   */
  private static async addRetryAttempt(
    jobId: string,
    attempt: Omit<RetryAttempt, 'timestamp'>
  ): Promise<void> {
    await supabase
      .from('job_retry_attempts')
      .insert({
        job_id: jobId,
        attempt_number: attempt.attemptNumber,
        error_category: attempt.errorCategory,
        error_severity: attempt.errorSeverity,
        error_message: attempt.errorMessage,
        delay_minutes: attempt.delayMinutes,
        success: attempt.success,
        created_at: new Date().toISOString()
      })
  }

  /**
   * Analyze and recover data from partial draft
   */
  private static async analyzeAndRecoverData(
    draft: any
  ): Promise<PartialRecoveryResult> {
    try {
      const recoveredData: any = {}
      const remainingWork: string[] = []

      // Check what data is available and recoverable
      if (draft.raw_text && draft.raw_text.trim().length > 0) {
        recoveredData.rawText = draft.raw_text
        
        // Try to extract any structured data
        if (draft.structured_data) {
          if (draft.structured_data.recipe?.title) {
            recoveredData.structuredData = {
              ...recoveredData.structuredData,
              title: draft.structured_data.recipe.title
            }
          }
          
          if (draft.structured_data.recipe?.ingredients?.length > 0) {
            recoveredData.structuredData = {
              ...recoveredData.structuredData,
              ingredients: draft.structured_data.recipe.ingredients
            }
          }
          
          if (draft.structured_data.recipe?.instructions?.length > 0) {
            recoveredData.structuredData = {
              ...recoveredData.structuredData,
              instructions: draft.structured_data.recipe.instructions
            }
          }
        }
      }

      // Determine what work remains
      if (!recoveredData.structuredData?.title) {
        remainingWork.push('Extract recipe title')
      }
      
      if (!recoveredData.structuredData?.ingredients?.length) {
        remainingWork.push('Extract ingredients manually')
      }
      
      if (!recoveredData.structuredData?.instructions?.length) {
        remainingWork.push('Extract instructions manually')
      }

      const hasRecoverableData = Object.keys(recoveredData).length > 0
      
      if (hasRecoverableData) {
        return {
          recovered: true,
          recoveredData,
          remainingWork,
          userGuidance: `Partial data recovered. ${remainingWork.length > 0 ? 
            'Please complete the missing fields: ' + remainingWork.join(', ') : 
            'Review the extracted data and save as recipe.'}`
        }
      } else {
        return {
          recovered: false,
          userGuidance: 'No recoverable data found. Please try with a clearer image.'
        }
      }

    } catch (error) {
      console.error('Failed to analyze and recover data:', error)
      return {
        recovered: false,
        userGuidance: 'Failed to recover data. Please try again with a different image.'
      }
    }
  }

  /**
   * Check if draft has recoverable data
   */
  private static hasRecoverableData(draft: any): boolean {
    return !!(draft.raw_text && draft.raw_text.trim().length > 0) ||
           !!(draft.structured_data && (
             draft.structured_data.recipe?.title ||
             draft.structured_data.recipe?.ingredients?.length > 0 ||
             draft.structured_data.recipe?.instructions?.length > 0
           ))
  }

  /**
   * Calculate success rate for retry attempt
   */
  private static calculateRetrySuccessRate(
    retryCount: number,
    latestError?: any
  ): number {
    let baseSuccessRate = 0.7 // 70% base success rate

    // Reduce success rate based on retry count
    baseSuccessRate *= Math.pow(0.8, retryCount) // 20% reduction per retry

    // Adjust based on error category
    if (latestError) {
      switch (latestError.category) {
        case 'user_error':
          baseSuccessRate *= 0.3 // User errors less likely to succeed on retry
          break
        case 'system_error':
          baseSuccessRate *= 0.6 // System errors moderate chance
          break
        case 'api_failure':
          baseSuccessRate *= 0.8 // API failures good chance on retry
          break
        case 'timeout':
          baseSuccessRate *= 0.7 // Timeout decent chance on retry
          break
        case 'rate_limit':
          baseSuccessRate *= 0.9 // Rate limiting excellent chance on retry
          break
        case 'quota_exceeded':
          baseSuccessRate *= 0.1 // Quota issues unlikely to succeed
          break
      }

      // Adjust based on severity
      switch (latestError.severity) {
        case 'critical':
          baseSuccessRate *= 0.2
          break
        case 'error':
          baseSuccessRate *= 0.6
          break
        case 'warning':
          baseSuccessRate *= 0.9
          break
      }
    }

    return Math.max(0.05, Math.min(0.95, baseSuccessRate)) // Clamp between 5% and 95%
  }

  /**
   * Get retry history for a job
   */
  static async getRetryHistory(jobId: string): Promise<RetryAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('job_retry_attempts')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data || []).map(attempt => ({
        attemptNumber: attempt.attempt_number,
        timestamp: attempt.created_at,
        errorCategory: attempt.error_category,
        errorSeverity: attempt.error_severity,
        errorMessage: attempt.error_message,
        delayMinutes: attempt.delay_minutes,
        success: attempt.success
      }))

    } catch (error) {
      console.error('Failed to get retry history:', error)
      return []
    }
  }

  /**
   * Cancel pending retry for a job
   */
  static async cancelRetry(jobId: string, userId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await supabase
        .from('scan_jobs')
        .update({
          status: 'failed',
          error_message: 'Retry cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId)
        .in('status', ['retrying', 'queued'])

      if (error) {
        return {
          success: false,
          message: 'Failed to cancel retry: ' + error.message
        }
      }

      return {
        success: true,
        message: 'Retry cancelled successfully'
      }

    } catch (error) {
      console.error('Failed to cancel retry:', error)
      return {
        success: false,
        message: 'Failed to cancel retry'
      }
    }
  }
}