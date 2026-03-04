import React, { useState, useEffect } from 'react';
import { ScanJob, ScanJobStatus, subscribeToScanJob, getScanJobStatus } from '@/features/scans/scan-upload';

interface ScanJobProgressProps {
  jobId: string;
  onComplete?: (jobId: string) => void;
  onError?: (jobId: string, error: string) => void;
}

export function ScanJobProgress({ jobId, onComplete, onError }: ScanJobProgressProps) {
  const [job, setJob] = useState<ScanJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Load initial status
    const loadStatus = async () => {
      try {
        const status = await getScanJobStatus(jobId);
        setJob(status as any);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading job status:', error);
        setIsLoading(false);
      }
    };

    loadStatus();

    // Subscribe to real-time updates
    const sub = subscribeToScanJob(jobId, (updatedJob) => {
      setJob(updatedJob);
      
      // Trigger callbacks
      if (updatedJob.status === 'completed' && onComplete) {
        onComplete(jobId);
      } else if (updatedJob.status === 'failed' && onError) {
        onError(jobId, updatedJob.error_message || 'Unknown error');
      }
    });

    setSubscription(sub);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [jobId, onComplete, onError]);

  const getProgressPercentage = () => {
    if (!job) return 0;
    
    switch (job.status) {
      case 'queued': return 10;
      case 'processing': return 50;
      case 'completed': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (!job) return null;
    
    if (job.status === 'queued') {
      // Estimate based on queue position (simplified)
      return '1-2 minutes';
    } else if (job.status === 'processing') {
      return '30-60 seconds';
    }
    
    return null;
  };

  const getStatusMessage = () => {
    if (!job) return 'Loading...';
    
    switch (job.status) {
      case 'queued':
        return 'Your scan is queued and will start processing soon...';
      case 'processing':
        return 'Analyzing your recipe photo...';
      case 'completed':
        return 'Scan completed successfully!';
      case 'failed':
        return `Scan failed: ${job.error_message || 'Unknown error'}`;
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    if (!job) return 'text-gray-600';
    
    switch (job.status) {
      case 'queued': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-medium ${getStatusColor()}`}>
            Scan Progress
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {getStatusMessage()}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          job?.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
          job?.status === 'processing' ? 'bg-blue-100 text-blue-800' :
          job?.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {job?.status || 'Unknown'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              job?.status === 'completed' ? 'bg-green-500' :
              job?.status === 'failed' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Estimated time */}
      {getEstimatedTimeRemaining() && (
        <div className="text-sm text-gray-600 mb-4">
          <span className="font-medium">Estimated time remaining:</span>{' '}
          {getEstimatedTimeRemaining()}
        </div>
      )}

      {/* Retry info for failed jobs */}
      {job?.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-50 rounded-md">
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Failed Details:</p>
            <p className="text-xs mb-2">{job.error_message}</p>
            <p className="text-xs">
              Attempts: {job.retry_count}/{job.max_retries}
              {job.retry_count < job.max_retries && (
                <span className="ml-2">You can retry this scan.</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Created time */}
      {job && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Started: {new Date(job.created_at).toLocaleString()}
            {job.updated_at !== job.created_at && (
              <span className="ml-2">
                Updated: {new Date(job.updated_at).toLocaleString()}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}