import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import { createScanJob, createMultiPhotoScanJob } from "./scan-service";

export type ScanPhoto = {
  id: string;
  job_id: string;
  storage_path: string;
  created_at: string;
};

/**
 * Get public URL for a scan photo
 */
export function getScanPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("scan-photos")
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

/**
 * Get thumbnail URL for scan photo
 */
export function getScanThumbnailUrl(storagePath: string, width: number = 400): string {
  const url = getScanPhotoUrl(storagePath);
  return `${url}?width=${width}&quality=85`;
}

/**
 * Upload multiple photos for scanning (React Native compatible)
 */
export async function uploadScanPhotos(
  files: { uri: string; name: string; type: string }[],
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    enableCompression?: boolean;
  } = {}
): Promise<{ jobId: string; photoUrls: string[] }> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    enableCompression = true
  } = options;

  // Generate base timestamp for this batch
  const batchTimestamp = Date.now();
  const uploadedPhotos: Array<{ photoUrl: string; storagePath: string }> = [];
  const failedUploads: Array<{ index: number; name: string; error: string }> = [];

  // Upload photos with controlled concurrency (max 3 simultaneous)
  const MAX_CONCURRENT = 3;
  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const batch = files.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;
      try {
        // Generate filename with sequence number
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const sequenceNum = String(fileIndex + 1).padStart(3, '0');
        const fileName = `${batchTimestamp}-${sequenceNum}.${fileExt}`;
        const storagePath = `scans/${fileName}`;

        let fileData: any = file.uri;

        // For web platform, convert to blob if needed
        if (Platform.OS === "web") {
          if (enableCompression) {
            const compressedFile = await compressImageWeb(file, maxWidth, maxHeight, quality);
            fileData = compressedFile.uri;
          } else {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            fileData = blob;
          }
        }

        // Upload to scan-photos bucket
        const { error: uploadError } = await supabase.storage
          .from("scan-photos")
          .upload(storagePath, fileData, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL for the scan photo
        const { data: urlData } = supabase.storage
          .from("scan-photos")
          .getPublicUrl(storagePath);

        const photoUrl = urlData.publicUrl;

        return { photoUrl, storagePath, index: fileIndex };
      } catch (error) {
        console.error(`Failed to upload photo ${fileIndex + 1}:`, error);
        failedUploads.push({
          index: fileIndex,
          name: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Collect successful uploads
    batchResults.forEach(result => {
      if (result) {
        uploadedPhotos.push(result);
      }
    });

    console.log(`Uploaded batch ${Math.floor(i / MAX_CONCURRENT) + 1}: ${batchResults.filter(r => r).length}/${batch.length} successful`);
  }

  // Check if we have at least one successful upload
  if (uploadedPhotos.length === 0) {
    throw new Error('All photo uploads failed. Please try again.');
  }

  // Sort by index to maintain order
  uploadedPhotos.sort((a, b) => a.index! - b.index!);
  const photoUrls = uploadedPhotos.map(p => p.photoUrl);

  // Create multi-photo scan job
  const job = await createMultiPhotoScanJob(photoUrls);

  // Trigger queue processing (fire-and-forget)
  supabase.functions.invoke('queue-worker').catch((err: unknown) => {
    console.warn('Queue trigger failed (will retry on next poll):', err);
  });

  // If some uploads failed, log warning
  if (failedUploads.length > 0) {
    console.warn(`${failedUploads.length} photo(s) failed to upload:`, failedUploads);
  }

  return {
    jobId: job.id,
    photoUrls
  };
}

/**
 * Upload a single photo for scanning (React Native compatible)
 * Maintained for backward compatibility
 */
export async function uploadScanPhoto(
  file: { uri: string; name: string; type: string },
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    enableCompression?: boolean;
  } = {}
): Promise<{ jobId: string; photoUrl: string }> {
  // Use multi-photo upload with single file
  const result = await uploadScanPhotos([file], options);

  return {
    jobId: result.jobId,
    photoUrl: result.photoUrls[0]
  };
}

/**
 * Compress image using canvas API (web only)
 */
async function compressImageWeb(
  file: { uri: string; name: string; type: string },
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<{ uri: string; name: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not compress image'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });

          resolve({
            uri: URL.createObjectURL(compressedFile),
            name: file.name,
            type: file.type
          });
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = file.uri;
  });
}

/**
 * Estimate image quality for React Native
 */
export async function estimateImageQuality(file: { uri: string; name: string; type: string; size?: number }): Promise<{
  quality: 'low' | 'medium' | 'high';
  confidence: number;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  let quality: 'low' | 'medium' | 'high' = 'high';
  let confidence = 1.0;

  // Check file size
  const fileSizeKB = (file.size || 0) / 1024;
  
  if (fileSizeKB < 50) {
    quality = 'low';
    confidence = Math.min(confidence, 0.3);
    recommendations.push('Image is very small, may lack detail for OCR');
  } else if (fileSizeKB < 200) {
    quality = 'medium';
    confidence = Math.min(confidence, 0.6);
    recommendations.push('Small image size, larger images give better results');
  }

  // For React Native, we can't easily analyze image dimensions without additional libraries
  // So we provide basic recommendations based on file size
  if (fileSizeKB > 5 * 1024) {
    recommendations.push('Large image file detected, ensure good lighting and focus');
  }

  return {
    quality,
    confidence,
    recommendations
  };
}

/**
 * Delete scan photos and associated job
 */
export async function deleteScanPhoto(jobId: string): Promise<void> {
  // Get job to find photo URLs
  const { data: job, error: fetchError } = await supabase
    .from('scan_jobs')
    .select('photo_url, photo_urls')
    .eq('id', jobId)
    .single();

  if (fetchError) throw fetchError;
  if (!job) throw new Error('Scan job not found');

  // Get all photo URLs (multi-photo or single)
  const photoUrls = job.photo_urls || [job.photo_url];

  // Extract storage paths from URLs
  const storagePaths = photoUrls.map(photoUrl => {
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return `scans/${fileName}`;
  });

  // Delete all photos from storage
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("scan-photos")
      .remove(storagePaths);

    if (storageError) console.warn('Failed to delete scan photos from storage:', storageError);
  }

  // Delete job (cascade will delete draft)
  const { error: deleteError } = await supabase
    .from('scan_jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) throw deleteError;
}