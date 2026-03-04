import { supabase } from "@/lib/supabase";
import { RetryRecoveryService } from "@/lib/scan/retry-recovery-service";

export type ScanJob = {
  id: string;
  user_id: string;
  photo_url: string; // Primary photo for backward compatibility
  photo_urls?: string[]; // All photos for multi-photo jobs
  photo_count?: number; // Number of photos in the job
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
};

export type JobStatus = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
  can_cancel: boolean;
};

/**
 * Create a new scan job for multiple photos
 */
export async function createMultiPhotoScanJob(photoUrls: string[]): Promise<ScanJob> {
  if (photoUrls.length === 0) {
    throw new Error('At least one photo URL is required');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scan_jobs')
    .insert({
      user_id: user.id,
      photo_url: photoUrls[0], // Primary photo for backward compatibility
      photo_urls: photoUrls, // All photos
      photo_count: photoUrls.length,
      status: 'queued'
    })
    .select()
    .single();

  if (error) throw error;
  return data as ScanJob;
}

/**
 * Create a new scan job for a single photo
 * Maintained for backward compatibility
 */
export async function createScanJob(photoUrl: string): Promise<ScanJob> {
  // Use multi-photo function with single URL
  return createMultiPhotoScanJob([photoUrl]);
}

/**
 * Get all scan jobs for current user
 */
export async function getUserScanJobs(): Promise<ScanJob[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ScanJob[]) || [];
}

/**
 * Get detailed status for a specific job
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const { data, error } = await supabase
    .rpc('get_job_status', { job_id: jobId });

  if (error) throw error;
  return data[0] as JobStatus;
}

/**
 * Cancel a queued job
 */
export async function cancelScanJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('scan_jobs')
    .update({ status: 'failed', error_message: 'Cancelled by user' })
    .eq('id', jobId)
    .eq('status', 'queued'); // Only allow cancelling queued jobs

  if (error) throw error;
}

/**
 * Retry a failed job
 */
export async function retryScanJob(jobId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result = await RetryRecoveryService.retryJob(jobId, user.id);
  if (!result.success) {
    throw new Error(result.message);
  }
}

/**
 * Get all photo URLs for a job
 */
export async function getJobPhotos(jobId: string): Promise<string[]> {
  const { data: job, error } = await supabase
    .from('scan_jobs')
    .select('photo_url, photo_urls')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  if (!job) throw new Error('Scan job not found');

  // Return photo_urls if available (multi-photo job), otherwise fallback to single photo_url
  return job.photo_urls || [job.photo_url];
}



/**
 * Subscribe to all jobs for current user (React Native compatible)
 */
export function subscribeToUserJobs(
  userId: string,
  callback: (job: ScanJob) => void
) {
  const channel = supabase
    .channel('user_scan_jobs')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scan_jobs',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          callback(payload.new as ScanJob);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to user scan jobs');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to user scan jobs');
      }
    });

  return channel;
}

/**
 * Subscribe to a specific job for real-time updates
 */
export function subscribeToJob(
  jobId: string,
  callback: (job: ScanJob) => void
) {
  const channel = supabase
    .channel(`scan_job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scan_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          callback(payload.new as ScanJob);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to job ${jobId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to connect to job ${jobId}`);
      }
    });

  return channel;
}

/**
 * Check if user has reached concurrent job limit
 */
export async function checkJobLimit(): Promise<{ canCreate: boolean; activeCount: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scan_jobs')
    .select('id')
    .in('status', ['queued', 'processing'])
    .eq('user_id', user.id);

  if (error) throw error;
  
  const activeCount = data?.length || 0;
  return {
    canCreate: activeCount < 3,
    activeCount
  };
}