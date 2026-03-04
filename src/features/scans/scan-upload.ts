import { supabase } from "@/lib/supabase";

export interface ScanJob {
  id: string;
  user_id: string;
  photo_url: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export interface ScanJobStatus {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
  can_cancel: boolean;
}

/**
 * Compress image before upload
 * @param file - File object
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param quality - JPEG quality (0-1, default: 0.8)
 * @returns Compressed file blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<{ blob: Blob; width: number; height: number; size: number }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve({
            blob: blob!,
            width,
            height,
            size: blob!.size
          });
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Estimate image quality (simplified - could use more sophisticated analysis)
 * @param file - Image file
 * @returns Quality score (0-1)
 */
export function estimateImageQuality(file: File): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      // Simple quality heuristics
      const resolution = img.width * img.height;
      const aspectRatio = img.width / img.height;
      const isStandardAspect = Math.abs(aspectRatio - 4/3) < 0.5 || 
                               Math.abs(aspectRatio - 16/9) < 0.5 ||
                               Math.abs(aspectRatio - 1) < 0.2;
      
      let quality = 0.5; // Base score
      
      // Resolution bonus (up to 0.3)
      if (resolution >= 2048 * 1536) quality += 0.3; // >= 3MP
      else if (resolution >= 1024 * 768) quality += 0.2; // >= 0.78MP
      else if (resolution >= 640 * 480) quality += 0.1; // >= 0.3MP
      
      // Aspect ratio bonus (0.2)
      if (isStandardAspect) quality += 0.2;
      
      // File size penalty/bonus
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 5) quality -= 0.2; // Too large might be uncompressed
      else if (sizeMB < 0.1) quality -= 0.1; // Too small might be low quality
      
      resolve(Math.max(0, Math.min(1, quality)));
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(0.1); // Very low score if can't load
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload photo for scanning with compression
 * @param file - Photo file
 * @returns Scan job ID and compressed photo info
 */
export async function uploadScanPhoto(file: File): Promise<{
  jobId: string;
  photoUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
  quality: number;
}> {
  // Estimate quality first
  const quality = await estimateImageQuality(file);
  
  // Compress image
  const { blob: compressedBlob, width, height } = await compressImage(file);
  
  // Generate unique filename
  const fileName = `scan-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const storagePath = `scans/${fileName}`;
  
  // Upload compressed image to storage
  const { error: uploadError } = await supabase.storage
    .from("scan-photos")
    .upload(storagePath, compressedBlob, {
      contentType: 'image/jpeg',
      upsert: false
    });
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("scan-photos")
    .getPublicUrl(storagePath);
  
  // Create scan job via Edge Function
  const { data, error } = await supabase.functions.invoke('create-scan-job', {
    body: {
      photoUrl: publicUrl,
      metadata: {
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        dimensions: { width, height },
        quality,
        compressionRatio: compressedBlob.size / file.size
      }
    }
  });
  
  if (error) {
    // Cleanup uploaded photo if job creation fails
    await supabase.storage.from("scan-photos").remove([storagePath]);
    throw error;
  }
  
  return {
    jobId: data.jobId,
    photoUrl: publicUrl,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    compressionRatio: compressedBlob.size / file.size,
    dimensions: { width, height },
    quality
  };
}

/**
 * Get scan job status
 */
export async function getScanJobStatus(jobId: string): Promise<ScanJobStatus> {
  const { data, error } = await supabase
    .rpc('get_job_status', { job_id: jobId });
  
  if (error) throw error;
  return data;
}

/**
 * Get all scan jobs for current user
 */
export async function getUserScanJobs(): Promise<ScanJob[]> {
  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Cancel a queued scan job
 */
export async function cancelScanJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('scan_jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId)
    .eq('status', 'queued'); // Only allow cancelling queued jobs
  
  if (error) throw error;
}

/**
 * Retry a failed scan job
 */
export async function retryScanJob(jobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('retry-scan-job', {
    body: { jobId }
  });
  
  if (error) throw error;
}

/**
 * Subscribe to real-time updates for a scan job
 */
export function subscribeToScanJob(
  jobId: string,
  onStatusChange: (job: ScanJob) => void
) {
  return supabase
    .channel(`scan-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scan_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          onStatusChange(payload.new as ScanJob);
        }
      }
    )
    .subscribe();
}