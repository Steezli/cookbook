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
 * Read a file URI as a base64 string.
 * Works on both web (fetch → arrayBuffer) and React Native (FileReader on XHR blob).
 */
async function readFileAsBase64(uri: string): Promise<{ base64: string; mediaType: string }> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const mediaType = detectMediaType(bytes);
    const base64 = uint8ArrayToBase64(bytes);
    return { base64, mediaType };
  }

  // React Native (iOS/Android): read blob via XHR, then use FileReader
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to read image file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

  const base64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:...;base64," prefix
      const b64 = dataUrl.split(',')[1];
      if (!b64) {
        reject(new Error('FileReader produced empty base64'));
        return;
      }
      resolve(b64);
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

  // Detect media type from the first bytes (decode a small prefix)
  const sampleBytes = Uint8Array.from(atob(base64.slice(0, 16)), c => c.charCodeAt(0));
  const mediaType = detectMediaType(sampleBytes);

  return { base64, mediaType };
}

/**
 * Detect image media type from magic bytes.
 */
function detectMediaType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Convert Uint8Array to base64 string (chunk-safe).
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Upload multiple photos for scanning (React Native compatible).
 *
 * On native platforms, images are sent as base64 directly to the edge function
 * to avoid Supabase Storage upload issues (0-byte files on iOS).
 * On web, images are still uploaded to Storage for URL-based processing.
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

  // --- Native path: skip Storage, send base64 inline ---
  if (Platform.OS !== "web") {
    return uploadScanPhotosInline(files);
  }

  // --- Web path: upload to Storage as before ---
  const batchTimestamp = Date.now();
  const uploadedPhotos: Array<{ photoUrl: string; storagePath: string; index: number }> = [];
  const failedUploads: Array<{ index: number; name: string; error: string }> = [];

  const MAX_CONCURRENT = 3;
  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const batch = files.slice(i, i + MAX_CONCURRENT);
    const batchPromises = batch.map(async (file, batchIndex) => {
      const fileIndex = i + batchIndex;
      try {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const sequenceNum = String(fileIndex + 1).padStart(3, '0');
        const fileName = `${batchTimestamp}-${sequenceNum}.${fileExt}`;
        const storagePath = `scans/${fileName}`;

        let fileData: ArrayBuffer;

        if (enableCompression) {
          const compressedFile = await compressImageWeb(file, maxWidth, maxHeight, quality);
          const response = await fetch(compressedFile.uri);
          fileData = await response.arrayBuffer();
        } else {
          const response = await fetch(file.uri);
          fileData = await response.arrayBuffer();
        }

        const { error: uploadError } = await supabase.storage
          .from("scan-photos")
          .upload(storagePath, fileData, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

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
    batchResults.forEach(result => {
      if (result) uploadedPhotos.push(result);
    });

    console.log(`Uploaded batch ${Math.floor(i / MAX_CONCURRENT) + 1}: ${batchResults.filter(r => r).length}/${batch.length} successful`);
  }

  if (uploadedPhotos.length === 0) {
    throw new Error('All photo uploads failed. Please try again.');
  }

  uploadedPhotos.sort((a, b) => a.index - b.index);
  const photoUrls = uploadedPhotos.map(p => p.photoUrl);

  const job = await createMultiPhotoScanJob(photoUrls);

  supabase.functions.invoke('process-scan-job', {
    body: { jobId: job.id }
  }).catch((err: unknown) => {
    console.warn('Scan processing trigger failed:', err);
  });

  if (failedUploads.length > 0) {
    console.warn(`${failedUploads.length} photo(s) failed to upload:`, failedUploads);
  }

  return { jobId: job.id, photoUrls };
}

/**
 * Native-only: read images as base64 and send them inline to the edge function.
 * Avoids the 0-byte Supabase Storage upload bug on iOS.
 * The edge function saves images to Storage server-side and updates photo_urls.
 */
async function uploadScanPhotosInline(
  files: { uri: string; name: string; type: string }[]
): Promise<{ jobId: string; photoUrls: string[] }> {
  // Read all images as base64
  const images: Array<{ base64: string; mediaType: string }> = [];
  const failedReads: Array<{ index: number; name: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await readFileAsBase64(files[i].uri);
      if (!result.base64 || result.base64.length < 100) {
        throw new Error(`Base64 data too small (${result.base64?.length || 0} chars)`);
      }
      images.push(result);
      console.log(`Read photo ${i + 1}: ${Math.round(result.base64.length / 1024)}KB base64, type: ${result.mediaType}`);
    } catch (error) {
      console.error(`Failed to read photo ${i + 1}:`, error);
      failedReads.push({
        index: i,
        name: files[i].name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (images.length === 0) {
    throw new Error('Failed to read all photos. Please try again.');
  }

  // Create scan job with placeholder URLs — edge function will update with real URLs
  const placeholderUrls = images.map((_, i) => `inline://photo-${i + 1}`);
  const job = await createMultiPhotoScanJob(placeholderUrls);

  // Send images inline to the edge function (it will save to Storage server-side)
  supabase.functions.invoke('process-scan-job', {
    body: {
      jobId: job.id,
      images: images.map(img => ({
        base64: img.base64,
        mediaType: img.mediaType,
      })),
    }
  }).catch((err: unknown) => {
    console.warn('Scan processing trigger failed:', err);
  });

  if (failedReads.length > 0) {
    console.warn(`${failedReads.length} photo(s) failed to read:`, failedReads);
  }

  return { jobId: job.id, photoUrls: placeholderUrls };
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

      if (!width || !height) {
        reject(new Error('Invalid image dimensions'));
        return;
      }

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

  // Extract storage paths from URLs (skip inline:// placeholders)
  const storagePaths = photoUrls
    .filter((photoUrl: string) => !photoUrl.startsWith('inline://'))
    .map((photoUrl: string) => {
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