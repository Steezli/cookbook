import { supabase } from "@/lib/supabase"
import { ErrorCategory, ErrorSeverity } from "./job-status-service"

export interface ErrorFeedback {
  jobId: string
  errorId?: string
  feedbackType: 'helpful' | 'not_helpful' | 'confusing' | 'wrong' | 'other'
  feedbackText?: string
  rating?: number // 1-5 stars
  wasResolved?: boolean
  resolutionMethod?: string
}

export interface ErrorTrend {
  id: string
  errorCategory: ErrorCategory
  errorSeverity: ErrorSeverity
  errorPattern: string
  occurrenceCount: number
  lastOccurrence: string
  resolutionRate: number
  avgRetryAttempts: number
  userImpactScore: number
  createdAt: string
  updatedAt: string
}

export interface ErrorAlert {
  id: string
  alertType: 'critical_error' | 'escalation_required' | 'pattern_detected' | 'performance_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  errorPattern?: string
  affectedJobs: string[]
  thresholdExceeded: Record<string, any>
  autoResolve: boolean
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface ErrorInvestigation {
  id: string
  errorId: string
  investigatorId: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  findings?: string
  rootCause?: string
  correctiveAction?: string
  preventionAction?: string
  estimatedImpact?: string
  affectedUsers?: number
  investigationNotes?: Record<string, any>
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface AnalyticsDashboard {
  periodStart: string
  periodEnd: string
  totalJobs: number
  totalErrors: number
  errorRate: number
  topErrorCategories: Record<string, number>
  topErrorMessages: Record<string, number>
  retryRate: number
  recoveryRate: number
  userSatisfactionScore: number
  criticalAlertsCount: number
  openInvestigationsCount: number
}

/**
 * Error reporting and analytics service
 */
export class ErrorReportingService {
  /**
   * Submit user feedback on an error
   */
  static async submitErrorFeedback(feedback: ErrorFeedback): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { data, error } = await supabase
        .rpc('submit_error_feedback', {
          job_id: feedback.jobId,
          error_id: feedback.errorId,
          feedback_type: feedback.feedbackType,
          feedback_text: feedback.feedbackText,
          rating: feedback.rating
        })

      if (error) {
        throw error
      }

      return {
        success: data[0]?.success || false,
        message: data[0]?.message || 'Unknown response'
      }

    } catch (error) {
      console.error('Failed to submit error feedback:', error)
      return {
        success: false,
        message: 'Failed to submit feedback: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Get comprehensive error analytics for dashboard
   */
  static async getAnalyticsDashboard(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<AnalyticsDashboard[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_error_analytics_dashboard', {
          start_date: startDate?.toISOString().split('T')[0],
          end_date: endDate?.toISOString().split('T')[0],
          user_id_filter: userId
        })

      if (error) {
        throw error
      }

      return (data || []).map((row: any) => ({
        periodStart: row.period_start,
        periodEnd: row.period_end,
        totalJobs: row.total_jobs,
        totalErrors: row.total_errors,
        errorRate: row.error_rate,
        topErrorCategories: row.top_error_categories,
        topErrorMessages: row.top_error_messages,
        retryRate: row.retry_rate,
        recoveryRate: row.recovery_rate,
        userSatisfactionScore: row.user_satisfaction_score,
        criticalAlertsCount: row.critical_alerts_count,
        openInvestigationsCount: row.open_investigations_count
      }))

    } catch (error) {
      console.error('Failed to get analytics dashboard:', error)
      throw error
    }
  }

  /**
   * Get error trends for analysis
   */
  static async getErrorTrends(
    limit: number = 50,
    category?: ErrorCategory,
    severity?: ErrorSeverity
  ): Promise<ErrorTrend[]> {
    try {
      let query = supabase
        .from('error_trends')
        .select('*')
        .order('last_occurrence', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('error_category', category)
      }

      if (severity) {
        query = query.eq('error_severity', severity)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []).map(trend => ({
        id: trend.id,
        errorCategory: trend.error_category,
        errorSeverity: trend.error_severity,
        errorPattern: trend.error_pattern,
        occurrenceCount: trend.occurrence_count,
        lastOccurrence: trend.last_occurrence,
        resolutionRate: trend.resolution_rate,
        avgRetryAttempts: trend.avg_retry_attempts,
        userImpactScore: trend.user_impact_score,
        createdAt: trend.created_at,
        updatedAt: trend.updated_at
      }))

    } catch (error) {
      console.error('Failed to get error trends:', error)
      throw error
    }
  }

  /**
   * Get active error alerts for admin dashboard
   */
  static async getErrorAlerts(
    resolved: boolean = false,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<ErrorAlert[]> {
    try {
      let query = supabase
        .from('error_alerts')
        .select('*')
        .eq('resolved', resolved)
        .order('created_at', { ascending: false })

      if (severity) {
        query = query.eq('severity', severity)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []).map(alert => ({
        id: alert.id,
        alertType: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        errorPattern: alert.error_pattern,
        affectedJobs: alert.affected_jobs,
        thresholdExceeded: alert.threshold_exceeded,
        autoResolve: alert.auto_resolve,
        resolved: alert.resolved,
        resolvedAt: alert.resolved_at,
        resolvedBy: alert.resolved_by,
        resolutionNotes: alert.resolution_notes,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }))

    } catch (error) {
      console.error('Failed to get error alerts:', error)
      throw error
    }
  }

  /**
   * Get error investigations for admin dashboard
   */
  static async getErrorInvestigations(
    status?: 'open' | 'investigating' | 'resolved' | 'closed',
    priority?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<ErrorInvestigation[]> {
    try {
      let query = supabase
        .from('admin_error_investigation')
        .select('*')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (priority) {
        query = query.eq('priority', priority)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []).map(investigation => ({
        id: investigation.id,
        errorId: investigation.error_id,
        investigatorId: investigation.investigator_id,
        status: investigation.status,
        priority: investigation.priority,
        findings: investigation.findings,
        rootCause: investigation.root_cause,
        correctiveAction: investigation.corrective_action,
        preventionAction: investigation.prevention_action,
        estimatedImpact: investigation.estimated_impact,
        affectedUsers: investigation.affected_users,
        investigationNotes: investigation.investigation_notes,
        createdAt: investigation.created_at,
        updatedAt: investigation.updated_at,
        resolvedAt: investigation.resolved_at
      }))

    } catch (error) {
      console.error('Failed to get error investigations:', error)
      throw error
    }
  }

  /**
   * Get user error history with feedback status
   */
  static async getUserErrorHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<Array<{
    jobId: string
    errorId?: string
    errorMessage: string
    errorCategory: ErrorCategory
    errorSeverity: ErrorSeverity
    userGuidance: string
    canRetry: boolean
    feedbackGiven: boolean
    feedbackType?: string
    feedbackRating?: number
    occurredAt: string
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_error_history', {
          limit_count: limit,
          offset_count: offset
        })

      if (error) {
        throw error
      }

      return data || []

    } catch (error) {
      console.error('Failed to get user error history:', error)
      throw error
    }
  }

  /**
   * Create automated error alert based on patterns
   */
  static async createErrorAlert(
    alertType: ErrorAlert['alertType'],
    severity: ErrorAlert['severity'],
    title: string,
    description: string,
    options?: {
      errorPattern?: string
      affectedJobs?: string[]
      thresholdExceeded?: Record<string, any>
      autoResolve?: boolean
    }
  ): Promise<{
    success: boolean
    alertId?: string
    message: string
  }> {
    try {
      const alertData = {
        alert_type: alertType,
        severity,
        title,
        description,
        error_pattern: options?.errorPattern,
        affected_jobs: options?.affectedJobs || [],
        threshold_exceeded: options?.thresholdExceeded || {},
        auto_resolve: options?.autoResolve || false
      }

      const { data, error } = await supabase
        .from('error_alerts')
        .insert(alertData)
        .select('id')
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        alertId: data.id,
        message: 'Error alert created successfully'
      }

    } catch (error) {
      console.error('Failed to create error alert:', error)
      return {
        success: false,
        message: 'Failed to create error alert: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Create error investigation record
   */
  static async createErrorInvestigation(
    errorId: string,
    priority: ErrorInvestigation['priority'],
    investigatorNotes?: Record<string, any>
  ): Promise<{
    success: boolean
    investigationId?: string
    message: string
  }> {
    try {
      const investigationData = {
        error_id: errorId,
        priority,
        status: 'open',
        investigation_notes: investigatorNotes || {}
      }

      const { data, error } = await supabase
        .from('admin_error_investigation')
        .insert(investigationData)
        .select('id')
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        investigationId: data.id,
        message: 'Error investigation created successfully'
      }

    } catch (error) {
      console.error('Failed to create error investigation:', error)
      return {
        success: false,
        message: 'Failed to create investigation: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Update error investigation
   */
  static async updateErrorInvestigation(
    investigationId: string,
    updates: Partial<Pick<ErrorInvestigation, 
      'status' | 'findings' | 'rootCause' | 'correctiveAction' | 
      'preventionAction' | 'estimatedImpact' | 'affectedUsers' | 'investigationNotes'
    >>
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const updateData: any = {}

      if (updates.status) updateData.status = updates.status
      if (updates.findings) updateData.findings = updates.findings
      if (updates.rootCause) updateData.root_cause = updates.rootCause
      if (updates.correctiveAction) updateData.corrective_action = updates.correctiveAction
      if (updates.preventionAction) updateData.prevention_action = updates.preventionAction
      if (updates.estimatedImpact) updateData.estimated_impact = updates.estimatedImpact
      if (updates.affectedUsers) updateData.affected_users = updates.affectedUsers
      if (updates.investigationNotes) updateData.investigation_notes = updates.investigationNotes

      // Set resolved_at if status is resolved or closed
      if (updates.status && ['resolved', 'closed'].includes(updates.status)) {
        updateData.resolved_at = new Date().toISOString()
      }

      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('admin_error_investigation')
        .update(updateData)
        .eq('id', investigationId)

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Investigation updated successfully'
      }

    } catch (error) {
      console.error('Failed to update error investigation:', error)
      return {
        success: false,
        message: 'Failed to update investigation: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Resolve error alert
   */
  static async resolveErrorAlert(
    alertId: string,
    resolutionNotes?: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await supabase
        .from('error_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Error alert resolved successfully'
      }

    } catch (error) {
      console.error('Failed to resolve error alert:', error)
      return {
        success: false,
        message: 'Failed to resolve alert: ' + (error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Get error impact metrics
   */
  static async getErrorImpactMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalAffectedUsers: number
    errorsByCategory: Record<ErrorCategory, { count: number; users: number }>
    avgResolutionTime: number // in hours
    userSatisfactionByCategory: Record<ErrorCategory, number>
    topContributingErrors: Array<{
      pattern: string
      impact: number
      count: number
    }>
  }> {
    try {
      // This would typically involve complex analytics queries
      // For now, returning a simplified version
      const { data: errors } = await supabase
        .from('job_errors')
        .select(`
          category,
          severity,
          created_at,
          scan_jobs!inner (
            user_id
          )
        `)
        .gte('created_at', startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', endDate?.toISOString() || new Date().toISOString())

      // Simple metrics calculation (in production, this would be more sophisticated)
      const uniqueUsers = new Set((errors || []).map((e: any) => e.scan_jobs.user_id)).size
      const errorsByCategory: Record<string, number> = {}
      
      (errors || []).forEach((error: any) => {
        errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1
      })

      return {
        totalAffectedUsers: uniqueUsers,
        errorsByCategory: {} as Record<ErrorCategory, { count: number; users: number }>,
        avgResolutionTime: 2.5, // Placeholder
        userSatisfactionByCategory: {}, // Would come from feedback analysis
        topContributingErrors: [] // Would come from trend analysis
      }

    } catch (error) {
      console.error('Failed to get error impact metrics:', error)
      throw error
    }
  }

  /**
   * Generate automated alerts based on error patterns
   */
  static async generateAutomatedAlerts(): Promise<void> {
    try {
      // Check for critical error patterns
      const recentCriticalErrors = await supabase
        .from('job_errors')
        .select('job_id, message, category')
        .eq('severity', 'critical')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

      if ((recentCriticalErrors || []).length > 0) {
        await this.createErrorAlert(
          'critical_error',
          'critical',
          'Critical Errors Detected',
          `${recentCriticalErrors.length} critical errors occurred in the last hour. Immediate attention required.`,
          {
            affectedJobs: recentCriticalErrors.map(e => e.job_id),
            errorPattern: 'critical_errors_spike'
          }
        )
      }

      // Check for repeated error patterns
      const { data: trends } = await supabase
        .from('error_trends')
        .select('*')
        .gt('occurrence_count', 5) // More than 5 occurrences
        .gte('last_occurrence', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      for (const trend of trends || []) {
        if (trend.errorCategory === 'system_error' && trend.occurrenceCount > 10) {
          await this.createErrorAlert(
            'pattern_detected',
            'high',
            'System Error Pattern Detected',
            `Pattern "${trend.error_pattern.substring(0, 50)}..." has occurred ${trend.occurrence_count} times.`,
            {
              errorPattern: trend.error_pattern,
              thresholdExceeded: { count: trend.occurrence_count }
            }
          )
        }
      }

      console.log('Automated alert generation completed')

    } catch (error) {
      console.error('Failed to generate automated alerts:', error)
    }
  }

  /**
   * Get error improvement suggestions based on analytics
   */
  static async getImprovementSuggestions(): Promise<Array<{
    category: string
    suggestion: string
    impact: 'high' | 'medium' | 'low'
    estimatedEffort: 'high' | 'medium' | 'low'
    priority: number
  }>> {
    try {
      // Analyze error trends and user feedback to generate suggestions
      const trends = await this.getErrorTrends(20)
      const suggestions = []

      // Analyze top error categories
      const categoryCounts: Record<string, number> = {}
      trends.forEach(trend => {
        categoryCounts[trend.errorCategory] = (categoryCounts[trend.errorCategory] || 0) + trend.occurrence_count
      })

      // Generate suggestions based on patterns
      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (category === 'user_error' && count > 50) {
          suggestions.push({
            category: 'User Education',
            suggestion: 'Improve image quality guidelines and provide real-time feedback during upload',
            impact: 'high',
            estimatedEffort: 'medium',
            priority: 1
          })
        }

        if (category === 'system_error' && count > 30) {
          suggestions.push({
            category: 'System Reliability',
            suggestion: 'Implement circuit breaker pattern and improve error handling for external services',
            impact: 'high',
            estimatedEffort: 'high',
            priority: 2
          })
        }

        if (category === 'api_failure' && count > 40) {
          suggestions.push({
            category: 'API Resilience',
            suggestion: 'Add multiple AI service providers with failover mechanism',
            impact: 'high',
            estimatedEffort: 'high',
            priority: 3
          })
        }
      })

      return (suggestions as any[]).sort((a: any, b: any) => a.priority - b.priority)

    } catch (error) {
      console.error('Failed to get improvement suggestions:', error)
      return []
    }
  }
}