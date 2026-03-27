import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import { createScanJob, createMultiPhotoScanJob } from "./scan-service";

export type ScanPhoto = {
  id: string;
  job_id: string;
  storage_path: string;
  created_at: string;
};

export function getScanPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("scan-photos")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

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
 * HEIC files are reported as image/jpeg since Claude's API only accepts
 * jpeg/png/gif/webp. iOS typically converts HEIC to JPEG when quality < 1
 * is set on the image picker, so the raw bytes should already be JPEG.
 */
function detectMediaType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return 'image/webp';
  // HEIC magic: bytes 4-7 are 'ftyp' — treat as jpeg for Claude compatibility
  // (iOS picker with quality < 1 converts to JPEG anyway, but just in case)
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
    isSubscriber?: boolean;
  } = {}
): Promise<{ jobId: string; photoUrls: string[] }> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    enableCompression = true,
    isSubscriber
  } = options;

  // Native: send base64 inline to edge function (avoids 0-byte Storage bug on iOS)
  if (Platform.OS !== "web") {
    return uploadScanPhotosInline(files, isSubscriber);
  }

  // Web: upload to Storage then invoke edge function
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


  }

  if (uploadedPhotos.length === 0) {
    throw new Error('All photo uploads failed. Please try again.');
  }

  uploadedPhotos.sort((a, b) => a.index - b.index);
  const photoUrls = uploadedPhotos.map(p => p.photoUrl);

  const job = await createMultiPhotoScanJob({ userId: '', photoUris: photoUrls, isSubscriber });

  supabase.functions.invoke('process-scan-job', {
    body: { jobId: job.id }
  }).catch(async (err) => {
    console.warn('[scan-photos] Edge function invocation failed (web path):', err);
    try {
      await supabase
        .from('scan_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start processing. Please try again.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch {
      // Best effort — job will appear stuck, but at least the error is logged above
    }
  });

  return { jobId: job.id, photoUrls };
}

/**
 * Native-only path: sends base64 images inline to the edge function to avoid
 * the 0-byte Supabase Storage upload bug on iOS. The edge function persists
 * images to Storage server-side.
 */
async function uploadScanPhotosInline(
  files: { uri: string; name: string; type: string }[],
  isSubscriber?: boolean
): Promise<{ jobId: string; photoUrls: string[] }> {
  const images: Array<{ base64: string; mediaType: string }> = [];
  const failedReads: Array<{ index: number; name: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await readFileAsBase64(files[i].uri);
      if (!result.base64 || result.base64.length < 100) {
        throw new Error(`Base64 data too small (${result.base64?.length || 0} chars)`);
      }
      images.push(result);
    } catch (error) {
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

  // Placeholder URLs — the edge function replaces them with real Storage URLs
  const placeholderUrls = images.map((_, i) => `inline://photo-${i + 1}`);
  const job = await createMultiPhotoScanJob({ userId: '', photoUris: placeholderUrls, isSubscriber });

  // Inline jobs can't be retried by the queue worker (no image data), so mark
  // as failed immediately on invocation error rather than leaving them stuck.
  supabase.functions.invoke('process-scan-job', {
    body: {
      jobId: job.id,
      images: images.map(img => ({
        base64: img.base64,
        mediaType: img.mediaType,
      })),
    }
  }).catch(async (err) => {
    console.warn('[scan-photos] Edge function invocation failed:', err);
    try {
      await supabase
        .from('scan_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start processing. Please try again.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch { /* best effort */ }
  });

  return { jobId: job.id, photoUrls: placeholderUrls };
}

/** Backward-compatible single-photo wrapper. */
export async function uploadScanPhoto(
  file: { uri: string; name: string; type: string },
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    enableCompression?: boolean;
  } = {}
): Promise<{ jobId: string; photoUrl: string }> {
  const result = await uploadScanPhotos([file], options);

  return {
    jobId: result.jobId,
    photoUrl: result.photoUrls[0]
  };
}

/** Web only — resizes via canvas and re-encodes at the given quality. */
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

/** Heuristic quality check based on file size (no image decode). */
export async function estimateImageQuality(file: { uri: string; name: string; type: string; size?: number }): Promise<{
  quality: 'low' | 'medium' | 'high';
  confidence: number;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  let quality: 'low' | 'medium' | 'high' = 'high';
  let confidence = 1.0;

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

  if (fileSizeKB > 5 * 1024) {
    recommendations.push('Large image file detected, ensure good lighting and focus');
  }

  return {
    quality,
    confidence,
    recommendations
  };
}

export async function deleteScanPhoto(jobId: string): Promise<void> {
  const { data: job, error: fetchError } = await supabase
    .from('scan_jobs')
    .select('photo_url, photo_urls')
    .eq('id', jobId)
    .single();

  if (fetchError) throw fetchError;
  if (!job) throw new Error('Scan job not found');

  const photoUrls = job.photo_urls || [job.photo_url];

  // Skip inline:// placeholders — those were sent as base64 to the edge function
  const storagePaths = photoUrls
    .filter((photoUrl: string) => !photoUrl.startsWith('inline://'))
    .map((photoUrl: string) => {
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return `scans/${fileName}`;
    });

  // Storage deletion is best-effort — photos expire via lifecycle policy
  if (storagePaths.length > 0) {
    await supabase.storage.from("scan-photos").remove(storagePaths);
  }

  // Cascade deletes associated drafts
  const { error: deleteError } = await supabase
    .from('scan_jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) throw deleteError;
}