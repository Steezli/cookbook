import { supabase } from "@/lib/supabase"

// Enhanced job status types with detailed progress states
export type DetailedJobStatus = 
  | 'queued'           // In queue, waiting to start
  | 'validating'        // Validating image format and quality
  | 'preprocessing'     // Resizing/compressing image
  | 'uploading'         // Uploading to AI service
  | 'ocr_processing'    // OCR extraction in progress
  | 'ai_enhancing'      // AI enhancement and structuring
  | 'finalizing'        // Creating draft and saving results
  | 'completed'         // Successfully completed
  | 'failed'            // Failed with error
  | 'cancelled'         // Cancelled by user
  | 'retrying'          // Automatic retry in progress

export type ErrorSeverity = 'warning' | 'error' | 'critical'

export type ErrorCategory = 
  | 'user_error'        // User-provided data issue
  | 'system_error'      // Internal system failure
  | 'api_failure'       // External API failure
  | 'timeout'           // Operation timed out
  | 'rate_limit'         // Rate limiting applied
  | 'quota_exceeded'     // User quota exceeded

export interface JobProgress {
  percentage: number
  currentStep: string
  totalSteps: number
  estimatedMinutesRemaining?: number
}

export interface JobStatusHistory {
  id: string
  jobId: string
  status: DetailedJobStatus
  message?: string
  timestamp: string
  progress?: JobProgress
  metadata?: Record<string, any>
}

export interface JobError {
  id: string
  jobId: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  technicalDetails?: string
  userGuidance: string
  canRetry: boolean
  retryDelay?: number // minutes to wait before retry
  timestamp: string
  context?: Record<string, any>
}

export interface EnhancedJobStatus {
  id: string
  userId: string
  photoUrl: string
  status: DetailedJobStatus
  progress: JobProgress
  createdAt: string
  updatedAt: string
  priority: number // 1=low, 2=normal, 3=high, 4=urgent
  retryCount: number
  maxRetries: number
  canRetry: boolean
  canCancel: boolean
  userGuidance: string
  nextSteps: string[]
  estimatedCompletion?: string
  errors: JobError[]
  history: JobStatusHistory[]
  subscriptionTier: 'basic' | 'premium' | 'unlimited'
}

export interface JobStatusUpdate {
  status: DetailedJobStatus
  progress?: Partial<JobProgress>
  message?: string
  error?: Omit<JobError, 'id' | 'jobId' | 'timestamp'>
  metadata?: Record<string, any>
}

/**
 * Enhanced job status management service
 */
export class JobStatusService {
  /**
   * Get enhanced status for a job with all details
   */
  static async getEnhancedJobStatus(jobId: string): Promise<EnhancedJobStatus | null> {
    try {
      // Get job details with user subscription info
      const { data: job, error: jobError } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (jobError || !job) {
        console.error('Failed to fetch job:', jobError)
        return null
      }

      // Get status history
      const { data: history, error: historyError } = await supabase
        .from('job_status_history')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: true })

      if (historyError) {
        console.error('Failed to fetch job history:', historyError)
      }

      // Get errors for this job
      const { data: errors, error: errorsError } = await supabase
        .from('job_errors')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: false })

      if (errorsError) {
        console.error('Failed to fetch job errors:', errorsError)
      }

      // Build enhanced status
      const enhanced = await this.buildEnhancedStatus(
        job,
        history || [],
        errors || []
      )

      return enhanced

    } catch (error) {
      console.error('Failed to get enhanced job status:', error)
      return null
    }
  }

  /**
   * Update job status with progress tracking
   */
  static async updateJobStatus(
    jobId: string, 
    update: JobStatusUpdate
  ): Promise<void> {
    try {
      // Start transaction for atomic updates
      const { error: updateError } = await supabase.rpc('update_job_status_enhanced', {
        job_id: jobId,
        new_status: update.status,
        progress_percentage: update.progress?.percentage,
        current_step: update.progress?.currentStep,
        total_steps: update.progress?.totalSteps,
        estimated_minutes: update.progress?.estimatedMinutesRemaining,
        message: update.message,
        metadata: update.metadata || {}
      })

      if (updateError) {
        console.error('Failed to update job status:', updateError)
        throw updateError
      }

      // Add to history
      await this.addStatusHistory(jobId, {
        status: update.status,
        message: update.message,
        progress: update.progress as JobProgress | undefined,
        metadata: update.metadata
      })

      // Log error if provided
      if (update.error) {
        await this.logJobError(jobId, update.error)
      }

      console.log(`Job ${jobId} updated to ${update.status}`)

    } catch (error) {
      console.error('Failed to update job status:', error)
      throw error
    }
  }

  /**
   * Add entry to status history
   */
  private static async addStatusHistory(
    jobId: string,
    entry: {
      status: DetailedJobStatus
      message?: string
      progress?: JobProgress
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('job_status_history')
      .insert({
        job_id: jobId,
        status: entry.status,
        message: entry.message,
        progress_percentage: entry.progress?.percentage,
        current_step: entry.progress?.currentStep,
        total_steps: entry.progress?.totalSteps,
        metadata: entry.metadata || {}
      })

    if (error) {
      console.error('Failed to add status history:', error)
    }
  }

  /**
   * Log an error for a job with classification
   */
  private static async logJobError(
    jobId: string,
    error: Omit<JobError, 'id' | 'jobId' | 'timestamp'>
  ): Promise<void> {
    const { error: insertError } = await supabase
      .from('job_errors')
      .insert({
        job_id: jobId,
        category: error.category,
        severity: error.severity,
        message: error.message,
        technical_details: error.technicalDetails,
        user_guidance: error.userGuidance,
        can_retry: error.canRetry,
        retry_delay: error.retryDelay,
        context: error.context || {}
      })

    if (insertError) {
      console.error('Failed to log job error:', insertError)
    }
  }

  /**
   * Build enhanced job status object
   */
  private static async buildEnhancedStatus(
    job: any,
    history: any[],
    errors: any[]
  ): Promise<EnhancedJobStatus> {
    const status = job.status as DetailedJobStatus
    const retryCount = job.retry_count || 0
    const maxRetries = job.max_retries || 3
    
    // Calculate progress based on status
    const progress = this.calculateProgress(status, retryCount, maxRetries)
    
    // Generate user guidance and next steps
    const guidance = this.generateUserGuidance(status, errors[0])
    const nextSteps = this.generateNextSteps(status, job, errors)
    
    // Estimate completion time
    const estimatedCompletion = this.estimateCompletion(status, job.created_at, progress)

    return {
      id: job.id,
      userId: job.user_id,
      photoUrl: job.photo_url,
      status,
      progress,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      priority: job.priority || 2,
      retryCount,
      maxRetries,
      canRetry: status === 'failed' && retryCount < maxRetries,
      canCancel: ['queued', 'validating', 'preprocessing'].includes(status),
      userGuidance: guidance,
      nextSteps,
      estimatedCompletion,
      errors: errors.map(record => this.mapErrorRecord(record)),
      history: history.map(record => this.mapHistoryRecord(record)),
      subscriptionTier: job.subscription_tier || 'basic'
    }
  }

  /**
   * Calculate progress percentage and details
   */
  private static calculateProgress(
    status: DetailedJobStatus,
    retryCount: number,
    maxRetries: number
  ): JobProgress {
    const statusProgress: Record<DetailedJobStatus, { step: string; of: number; pct: number }> = {
      'queued': { step: 'Waiting in queue', of: 7, pct: 5 },
      'validating': { step: 'Validating image', of: 7, pct: 10 },
      'preprocessing': { step: 'Processing image', of: 7, pct: 20 },
      'uploading': { step: 'Uploading to AI service', of: 7, pct: 30 },
      'ocr_processing': { step: 'Extracting text with OCR', of: 7, pct: 50 },
      'ai_enhancing': { step: 'Enhancing with AI', of: 7, pct: 75 },
      'finalizing': { step: 'Creating recipe draft', of: 7, pct: 90 },
      'completed': { step: 'Completed', of: 7, pct: 100 },
      'failed': { step: 'Failed', of: 7, pct: retryCount >= maxRetries ? 0 : 30 },
      'cancelled': { step: 'Cancelled', of: 7, pct: 0 },
      'retrying': { step: 'Retrying', of: 7, pct: 25 }
    }

    const progressInfo = statusProgress[status]

    return {
      percentage: progressInfo.pct,
      currentStep: progressInfo.step,
      totalSteps: progressInfo.of,
      estimatedMinutesRemaining: this.estimateTimeRemaining(status, progressInfo.pct)
    }
  }

  /**
   * Estimate remaining time based on status and progress
   */
  private static estimateTimeRemaining(status: DetailedJobStatus, progressPct: number): number | undefined {
    // Time estimates in minutes
    const stepDurations: Record<string, number> = {
      'queued': 2,           // Queue wait time
      'validating': 0.5,     // Image validation
      'preprocessing': 1,     // Image compression
      'uploading': 1.5,      // Upload to AI service
      'ocr_processing': 3,    // OCR processing
      'ai_enhancing': 2,     // AI enhancement
      'finalizing': 0.5       // Save results
    }

    const stepKey = status.replace('_processing', '').replace('_enhancing', '')
    const stepTime = stepDurations[stepKey] || 2

    // Estimate remaining time based on current progress
    if (progressPct >= 95) return 0.5
    if (progressPct >= 75) return stepTime
    if (progressPct >= 50) return stepTime * 2
    if (progressPct >= 25) return stepTime * 4
    
    return stepTime * 6
  }

  /**
   * Generate user-friendly guidance for current status
   */
  private static generateUserGuidance(status: DetailedJobStatus, latestError?: any): string {
    const guidance: Record<DetailedJobStatus, string> = {
      'queued': 'Your scan is in the queue and will start processing shortly.',
      'validating': 'We\'re checking your image to ensure it meets quality requirements.',
      'preprocessing': 'Your image is being optimized for best OCR results.',
      'uploading': 'Your image is being uploaded to our AI service for processing.',
      'ocr_processing': 'We\'re extracting text from your recipe image using advanced OCR.',
      'ai_enhancing': 'AI is enhancing and structuring your recipe data.',
      'finalizing': 'Creating your recipe draft with all the extracted information.',
      'completed': 'Your recipe scan is complete! You can now review and edit the draft.',
      'failed': latestError?.user_guidance || 'Your scan failed. Please check the error details and try again.',
      'cancelled': 'Your scan was cancelled as requested.',
      'retrying': 'Your scan is being retried with adjusted parameters.'
    }

    return guidance[status] || 'Processing your scan...'
  }

  /**
   * Generate next steps for user
   */
  private static generateNextSteps(
    status: DetailedJobStatus,
    job: any,
    errors: any[]
  ): string[] {
    const retryCount = job.retry_count || 0
    const maxRetries = job.max_retries || 3

    switch (status) {
      case 'queued':
        return ['Wait for processing to start', 'You can cancel if needed']
      
      case 'validating':
      case 'preprocessing':
      case 'uploading':
      case 'preprocessing':
      case 'uploading':
      case 'ocr_processing':
      case 'ai_enhancing':
      case 'finalizing':
        return ['Wait for completion', 'Progress updates will appear here']
      
      case 'completed':
        return ['Review the recipe draft', 'Edit any fields as needed', 'Save as recipe when ready']
      
      case 'failed':
        const steps = []
        if (retryCount < maxRetries) {
          steps.push('Try the scan again')
          steps.push('Check image quality and try a clearer photo')
        } else {
          steps.push('Maximum retries reached')
          steps.push('Try with a different photo')
          steps.push('Contact support if issue persists')
        }
        
        if (errors.length > 0) {
          steps.push('Review error details below')
        }
        
        return steps
      
      case 'cancelled':
        return ['Start a new scan if you still want to process this recipe']
      
      case 'retrying':
        return ['Wait for retry to complete', 'Different parameters will be used']
      
      default:
        return []
    }
  }

  /**
   * Estimate completion time
   */
  private static estimateCompletion(
    status: DetailedJobStatus,
    createdAt: string,
    progress: JobProgress
  ): string | undefined {
    if (status === 'completed') return undefined
    if (status === 'failed' || status === 'cancelled') return undefined

    const remainingMinutes = progress.estimatedMinutesRemaining
    if (!remainingMinutes) return undefined

    const completionTime = new Date(Date.now() + remainingMinutes * 60 * 1000)
    return completionTime.toISOString()
  }

  /**
   * Map database error record to JobError interface
   */
  private static mapErrorRecord(record: any): JobError {
    return {
      id: record.id,
      jobId: record.job_id,
      category: record.category,
      severity: record.severity,
      message: record.message,
      technicalDetails: record.technical_details,
      userGuidance: record.user_guidance,
      canRetry: record.can_retry,
      retryDelay: record.retry_delay,
      timestamp: record.created_at,
      context: record.context
    }
  }

  /**
   * Map database history record to JobStatusHistory interface
   */
  private static mapHistoryRecord(record: any): JobStatusHistory {
    return {
      id: record.id,
      jobId: record.job_id,
      status: record.status,
      message: record.message,
      timestamp: record.created_at,
      progress: record.progress_percentage ? {
        percentage: record.progress_percentage,
        currentStep: record.current_step,
        totalSteps: record.total_steps,
        estimatedMinutesRemaining: record.estimated_minutes
      } : undefined,
      metadata: record.metadata
    }
  }

  /**
   * Get all jobs for a user with enhanced status
   */
  static async getUserJobsEnhanced(
    status?: DetailedJobStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<EnhancedJobStatus[]> {
    try {
      let query = supabase
        .from('scan_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: jobs, error } = await query

      if (error) {
        throw error
      }

      const enhancedJobs: EnhancedJobStatus[] = []

      for (const job of jobs || []) {
        // Get history and errors for each job
        const { data: history } = await supabase
          .from('job_status_history')
          .select('*')
          .eq('job_id', job.id)
          .order('timestamp', { ascending: true })

        const { data: errors } = await supabase
          .from('job_errors')
          .select('*')
          .eq('job_id', job.id)
          .order('timestamp', { ascending: false })

        const enhanced = await this.buildEnhancedStatus(
          job,
          history || [],
          errors || []
        )

        enhancedJobs.push(enhanced)
      }

      return enhancedJobs

    } catch (error) {
      console.error('Failed to get user jobs enhanced:', error)
      throw error
    }
  }

  /**
   * Set job priority (admin function)
   */
  static async setJobPriority(
    jobId: string,
    priority: number // 1=low, 2=normal, 3=high, 4=urgent
  ): Promise<void> {
    const { error } = await supabase
      .from('scan_jobs')
      .update({ priority })
      .eq('id', jobId)

    if (error) {
      throw error
    }

    console.log(`Job ${jobId} priority set to ${priority}`)
  }

  /**
   * Get job statistics for dashboard
   */
  static async getJobStats(userId?: string): Promise<{
    total: number
    byStatus: Record<DetailedJobStatus, number>
    bySeverity: Record<ErrorSeverity, number>
    avgProcessingTime: number
    successRate: number
  }> {
    try {
      let query = supabase
        .from('scan_jobs')
        .select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: jobs, error } = await query

      if (error) {
        throw error
      }

      const stats = {
        total: jobs?.length || 0,
        byStatus: {} as Record<DetailedJobStatus, number>,
        bySeverity: {} as Record<ErrorSeverity, number>,
        avgProcessingTime: 0,
        successRate: 0
      }

      // Initialize counters
      const statuses: DetailedJobStatus[] = [
        'queued', 'validating', 'preprocessing', 'uploading', 
        'ocr_processing', 'ai_enhancing', 'finalizing', 
        'completed', 'failed', 'cancelled', 'retrying'
      ]
      const severities: ErrorSeverity[] = ['warning', 'error', 'critical']

      statuses.forEach(status => {
        stats.byStatus[status] = 0
      })
      severities.forEach(severity => {
        stats.bySeverity[severity] = 0
      })

      // Count by status
      jobs?.forEach(job => {
        stats.byStatus[job.status as DetailedJobStatus]++
      })

      // Count error severities
      const { data: errors } = await supabase
        .from('job_errors')
        .select('severity')
        .in('job_id', jobs?.map(j => j.id) || [])

      errors?.forEach(error => {
        stats.bySeverity[error.severity as ErrorSeverity]++
      })

      // Calculate success rate
      const completed = stats.byStatus.completed
      const failed = stats.byStatus.failed
      const totalFinished = completed + failed
      stats.successRate = totalFinished > 0 ? (completed / totalFinished) * 100 : 0

      return stats

    } catch (error) {
      console.error('Failed to get job stats:', error)
      throw error
    }
  }
}