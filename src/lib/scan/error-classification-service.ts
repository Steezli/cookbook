import { supabase } from "@/lib/supabase"
import { ErrorCategory, ErrorSeverity, JobError } from "./job-status-service"

export interface ErrorClassifier {
  category: ErrorCategory
  severity: ErrorSeverity
  userGuidance: string
  canRetry: boolean
  retryDelay?: number // minutes
  technicalDetails?: string
  escalationThreshold?: number // number of occurrences before escalation
}

export interface ErrorPattern {
  error: string | RegExp
  classifier: ErrorClassifier
  context?: {
    serviceName?: string
    statusCode?: number
    errorCode?: string
  }
}

/**
 * Comprehensive error classification system
 */
export class ErrorClassificationService {
  private static errorPatterns: ErrorPattern[] = [
    // Image/Upload errors
    {
      error: /file too large/i,
      classifier: {
        category: 'user_error',
        severity: 'error',
        userGuidance: 'Your image file is too large. Please use an image under 10MB.',
        canRetry: false,
        technicalDetails: 'File size exceeded maximum allowed limit'
      }
    },
    {
      error: /unsupported file type/i,
      classifier: {
        category: 'user_error',
        severity: 'error',
        userGuidance: 'Unsupported file type. Please use JPG, PNG, or HEIC images.',
        canRetry: false,
        technicalDetails: 'File type not in allowed list'
      }
    },
    {
      error: /image too blurry|blur detection/i,
      classifier: {
        category: 'user_error',
        severity: 'error',
        userGuidance: 'The image appears too blurry. Please take a clearer photo with good lighting.',
        canRetry: true,
        retryDelay: 0,
        technicalDetails: 'Image quality assessment failed - blur detected'
      }
    },
    {
      error: /no text found|empty text|no readable text/i,
      classifier: {
        category: 'user_error',
        severity: 'error',
        userGuidance: 'No readable text found in the image. Please ensure the recipe text is clear and well-lit.',
        canRetry: true,
        retryDelay: 5,
        technicalDetails: 'OCR returned empty or insufficient text'
      }
    },

    // Google Cloud Vision API errors
    {
      error: /quota exceeded|rate limit/i,
      classifier: {
        category: 'rate_limit',
        severity: 'error',
        userGuidance: 'Service temporarily busy. Please try again in a few minutes.',
        canRetry: true,
        retryDelay: 10,
        technicalDetails: 'API rate limit or quota exceeded'
      }
    },
    {
      error: /invalid api key|unauthorized/i,
      classifier: {
        category: 'system_error',
        severity: 'critical',
        userGuidance: 'Service configuration error. Please try again later or contact support.',
        canRetry: false,
        escalationThreshold: 1,
        technicalDetails: 'Invalid API credentials'
      }
    },
    {
      error: /vision api.*error|google cloud vision/i,
      classifier: {
        category: 'api_failure',
        severity: 'error',
        userGuidance: 'AI service encountered an error. Retrying with different parameters.',
        canRetry: true,
        retryDelay: 5,
        technicalDetails: 'Google Cloud Vision API error'
      }
    },

    // Network/Timeout errors
    {
      error: /timeout|timed out/i,
      classifier: {
        category: 'timeout',
        severity: 'error',
        userGuidance: 'Processing took too long. Retrying with optimized settings.',
        canRetry: true,
        retryDelay: 3,
        technicalDetails: 'Operation timeout'
      }
    },
    {
      error: /network error|connection failed|ECONNREFUSED/i,
      classifier: {
        category: 'system_error',
        severity: 'error',
        userGuidance: 'Network connection issue. Please check your connection and try again.',
        canRetry: true,
        retryDelay: 2,
        technicalDetails: 'Network connectivity failure'
      }
    },

    // AI/Processing errors
    {
      error: /ai enhancement failed|parsing failed/i,
      classifier: {
        category: 'system_error',
        severity: 'error',
        userGuidance: 'Recipe enhancement failed. You can still edit the extracted text manually.',
        canRetry: true,
        retryDelay: 5,
        technicalDetails: 'AI processing or parsing error'
      }
    },
    {
      error: /insufficient confidence|low confidence/i,
      classifier: {
        category: 'user_error',
        severity: 'warning',
        userGuidance: 'Text quality is low. The system will enhance results, but manual review may be needed.',
        canRetry: true,
        retryDelay: 0,
        technicalDetails: 'Low OCR confidence score'
      }
    },

    // Database/Storage errors
    {
      error: /storage.*full|disk space/i,
      classifier: {
        category: 'system_error',
        severity: 'critical',
        userGuidance: 'Storage issue detected. Please try again later or contact support.',
        canRetry: false,
        escalationThreshold: 1,
        technicalDetails: 'Storage capacity exceeded'
      }
    },
    {
      error: /database.*error|connection.*pool/i,
      classifier: {
        category: 'system_error',
        severity: 'error',
        userGuidance: 'Database issue detected. Retrying the operation.',
        canRetry: true,
        retryDelay: 2,
        technicalDetails: 'Database connectivity or performance issue'
      }
    },

    // Subscription/Quota errors
    {
      error: /subscription.*required|upgrade required/i,
      classifier: {
        category: 'quota_exceeded',
        severity: 'error',
        userGuidance: 'You\'ve reached your scan limit. Upgrade to premium for unlimited scans.',
        canRetry: false,
        technicalDetails: 'Subscription quota exceeded'
      }
    },
    {
      error: /scan credits.*exceeded|no credits left/i,
      classifier: {
        category: 'quota_exceeded',
        severity: 'error',
        userGuidance: 'You\'ve used all your scan credits. Upgrade your plan or wait for monthly reset.',
        canRetry: false,
        technicalDetails: 'Scan credits exhausted'
      }
    },

    // Generic error patterns
    {
      error: /internal server error|500/i,
      classifier: {
        category: 'system_error',
        severity: 'critical',
        userGuidance: 'System error occurred. Our team has been notified. Please try again later.',
        canRetry: true,
        retryDelay: 15,
        escalationThreshold: 3,
        technicalDetails: 'Internal server error (HTTP 500)'
      }
    },
    {
      error: /bad request|400/i,
      classifier: {
        category: 'user_error',
        severity: 'error',
        userGuidance: 'Invalid request. Please check your image and try again.',
        canRetry: false,
        technicalDetails: 'Bad request (HTTP 400)'
      }
    },
    {
      error: /service unavailable|503/i,
      classifier: {
        category: 'api_failure',
        severity: 'error',
        userGuidance: 'Service temporarily unavailable. Please try again in a few minutes.',
        canRetry: true,
        retryDelay: 10,
        technicalDetails: 'Service unavailable (HTTP 503)'
      }
    }
  ]

  /**
   * Classify an error and return detailed classification
   */
  static classifyError(
    error: Error | string,
    context?: {
      serviceName?: string
      statusCode?: number
      errorCode?: string
      userId?: string
      jobId?: string
      subscriptionTier?: string
    }
  ): ErrorClassifier {
    const errorMessage = error instanceof Error ? error.message : error
    
    // Try to match specific patterns
    for (const pattern of this.errorPatterns) {
      const isMatch = pattern.error instanceof RegExp 
        ? pattern.error.test(errorMessage)
        : errorMessage.toLowerCase().includes(pattern.error.toLowerCase())
      
      if (isMatch) {
        // Check for context-specific matching
        if (pattern.context) {
          if (pattern.context.serviceName && context?.serviceName !== pattern.context.serviceName) {
            continue
          }
          if (pattern.context.statusCode && context?.statusCode !== pattern.context.statusCode) {
            continue
          }
          if (pattern.context.errorCode && context?.errorCode !== pattern.context.errorCode) {
            continue
          }
        }
        
        return {
          ...pattern.classifier,
          technicalDetails: pattern.classifier.technicalDetails || errorMessage
        }
      }
    }
    
    // Default classification for unknown errors
    return this.getDefaultClassification(errorMessage, context)
  }

  /**
   * Get default classification for unknown errors
   */
  private static getDefaultClassification(
    errorMessage: string,
    context?: any
  ): ErrorClassifier {
    // Try to infer severity from message content
    if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      return {
        category: 'system_error',
        severity: 'critical',
        userGuidance: 'A critical error occurred. Please contact support if the issue persists.',
        canRetry: false,
        escalationThreshold: 1,
        technicalDetails: errorMessage
      }
    }
    
    if (errorMessage.includes('warning')) {
      return {
        category: 'user_error',
        severity: 'warning',
        userGuidance: 'A minor issue occurred. You can continue, but review the results carefully.',
        canRetry: true,
        retryDelay: 0,
        technicalDetails: errorMessage
      }
    }
    
    // Default generic error
    return {
      category: 'system_error',
      severity: 'error',
      userGuidance: 'An unexpected error occurred. Please try again or contact support if it continues.',
      canRetry: true,
      retryDelay: 5,
      technicalDetails: errorMessage
    }
  }

  /**
   * Create structured error object for logging
   */
  static createStructuredError(
    jobId: string,
    error: Error | string,
    context?: {
      serviceName?: string
      statusCode?: number
      errorCode?: string
      userId?: string
      subscriptionTier?: string
      additionalContext?: Record<string, any>
    }
  ): Omit<JobError, 'id' | 'timestamp'> {
    const classification = this.classifyError(error, context)
    
    return {
      jobId,
      category: classification.category,
      severity: classification.severity,
      message: error instanceof Error ? error.message : error,
      technicalDetails: classification.technicalDetails,
      userGuidance: classification.userGuidance,
      canRetry: classification.canRetry,
      retryDelay: classification.retryDelay,
      context: {
        serviceName: context?.serviceName,
        statusCode: context?.statusCode,
        errorCode: context?.errorCode,
        subscriptionTier: context?.subscriptionTier,
        ...context?.additionalContext
      }
    }
  }

  /**
   * Check if error should be escalated based on patterns
   */
  static shouldEscalate(
    error: Error | string,
    recentErrors: JobError[] = []
  ): boolean {
    const classification = this.classifyError(error)
    
    // Immediate escalation for critical errors
    if (classification.severity === 'critical' || classification.escalationThreshold === 1) {
      return true
    }
    
    // Count similar errors in recent history
    const similarErrors = recentErrors.filter(recentError => {
      return recentError.category === classification.category &&
        recentError.severity === classification.severity &&
        this.isRecentError(recentError.timestamp)
    })
    
    // Escalate if threshold reached
    const threshold = classification.escalationThreshold || 3
    return similarErrors.length >= threshold
  }

  /**
   * Check if error is recent (within last hour)
   */
  private static isRecentError(timestamp: string): boolean {
    const errorTime = new Date(timestamp).getTime()
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    return errorTime > oneHourAgo
  }

  /**
   * Get user-friendly error message based on classification
   */
  static getUserFriendlyMessage(
    error: Error | string,
    context?: any
  ): string {
    const classification = this.classifyError(error, context)
    return classification.userGuidance
  }

  /**
   * Determine if retry should be attempted based on error classification
   */
  static shouldRetry(
    error: Error | string,
    currentRetryCount: number,
    maxRetries: number,
    context?: any
  ): { shouldRetry: boolean; delayMinutes: number } {
    const classification = this.classifyError(error, context)
    
    if (!classification.canRetry || currentRetryCount >= maxRetries) {
      return { shouldRetry: false, delayMinutes: 0 }
    }
    
    // Calculate exponential backoff with jitter
    const baseDelay = classification.retryDelay || 5
    const exponentialDelay = baseDelay * Math.pow(2, currentRetryCount)
    const jitter = Math.random() * 2 // Add 0-2 minutes of jitter
    const finalDelay = Math.min(exponentialDelay + jitter, 60) // Cap at 60 minutes
    
    return { 
      shouldRetry: true, 
      delayMinutes: Math.round(finalDelay) 
    }
  }

  /**
   * Get error statistics for analytics
   */
  static async getErrorAnalytics(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    topErrorMessages: Array<{ message: string; count: number }>
    retryRate: number
    escalationRate: number
  }> {
    try {
      let query = supabase
        .from('job_errors')
        .select('*')
        .order('created_at', { ascending: false })

      if (userId) {
        // First get user's job IDs
        const { data: userJobs } = await supabase
          .from('scan_jobs')
          .select('id')
          .eq('user_id', userId)
        
        const jobIds = userJobs?.map(job => job.id) || []
        if (jobIds.length > 0) {
          query = query.in('job_id', jobIds)
        } else {
          // User has no jobs, return empty result
          return this.analyzeErrors([])
        }
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString())
      }

      const { data: errors, error } = await query

      if (error) {
        throw error
      }

      return this.analyzeErrors(errors || [])

    } catch (error) {
      console.error('Failed to get error analytics:', error)
      throw error
    }
  }

  /**
   * Analyze error data for statistics
   */
  private static analyzeErrors(errors: any[]): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    topErrorMessages: Array<{ message: string; count: number }>
    retryRate: number
    escalationRate: number
  } {
    const categories: Record<string, number> = {}
    const severities: Record<string, number> = {}
    const messages: Record<string, number> = {}
    let retryableCount = 0
    let escalatedCount = 0

    errors.forEach(error => {
      // Count categories
      categories[error.category] = (categories[error.category] || 0) + 1
      
      // Count severities
      severities[error.severity] = (severities[error.severity] || 0) + 1
      
      // Count messages
      messages[error.message] = (messages[error.message] || 0) + 1
      
      // Count retryable errors
      if (error.can_retry) {
        retryableCount++
      }
      
      // Count escalated errors (critical or repeated patterns)
      if (error.severity === 'critical' || 
          (error.category === 'system_error' && error.severity === 'error')) {
        escalatedCount++
      }
    })

    // Get top error messages
    const topErrorMessages = Object.entries(messages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    return {
      totalErrors: errors.length,
      errorsByCategory: categories as Record<ErrorCategory, number>,
      errorsBySeverity: severities as Record<ErrorSeverity, number>,
      topErrorMessages,
      retryRate: errors.length > 0 ? (retryableCount / errors.length) * 100 : 0,
      escalationRate: errors.length > 0 ? (escalatedCount / errors.length) * 100 : 0
    }
  }

  /**
   * Add custom error pattern for extensibility
   */
  static addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.unshift(pattern) // Add to front for priority
  }

  /**
   * Get all error patterns (for debugging)
   */
  static getErrorPatterns(): ErrorPattern[] {
    return [...this.errorPatterns]
  }
}