import { supabase } from "@/lib/supabase";
import { incrementScanCount } from "@/features/subscriptions/scan-count";

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

export interface CreateMultiPhotoScanJobOptions {
  userId: string;
  photoUris: string[];
  isSubscriber?: boolean;
}

export async function createMultiPhotoScanJob(
  optionsOrPhotoUrls: CreateMultiPhotoScanJobOptions | string[]
): Promise<ScanJob> {
  // Normalise: support legacy string[] call-site and new options object
  const photoUrls = Array.isArray(optionsOrPhotoUrls)
    ? optionsOrPhotoUrls
    : optionsOrPhotoUrls.photoUris;
  const isSubscriber = Array.isArray(optionsOrPhotoUrls)
    ? undefined
    : optionsOrPhotoUrls.isSubscriber;

  if (photoUrls.length === 0) {
    throw new Error('At least one photo URL is required');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!isSubscriber) {
    await incrementScanCount(user.id);
  }

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

/** Backward-compatible single-photo wrapper. */
export async function createScanJob(photoUrl: string): Promise<ScanJob> {
  return createMultiPhotoScanJob([photoUrl]);
}

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

export async function getJobPhotos(jobId: string): Promise<string[]> {
  const { data: job, error } = await supabase
    .from('scan_jobs')
    .select('photo_url, photo_urls')
    .eq('id', jobId)
    .single();

  if (error) throw error;
  if (!job) throw new Error('Scan job not found');

  return job.photo_urls || [job.photo_url];
}

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

export async function deleteScanJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('scan_jobs')
    .delete()
    .eq('id', jobId);
  if (error) throw error;
}

/** Max 3 concurrent jobs per user. */
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