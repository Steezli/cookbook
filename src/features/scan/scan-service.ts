import { supabase } from "@/lib/supabase";

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

/**
 * Create a new scan job for multiple photos
 */
export async function createMultiPhotoScanJob(photoUrls: string[]): Promise<ScanJob> {
  if (photoUrls.length === 0) {
    throw new Error('At least one photo URL is required');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as ScanJob[]) || [];
}

/**
 * Get a single scan job by ID
 */
export async function getJobById(jobId: string): Promise<ScanJob> {
  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Scan job not found');
  return data as ScanJob;
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
    .subscribe();

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
    .subscribe();

  return channel;
}

/**
 * Check if user has reached concurrent job limit
 */
export async function checkJobLimit(): Promise<{ canCreate: boolean; activeCount: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

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