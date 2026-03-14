import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { uploadScanPhoto, uploadScanPhotos, estimateImageQuality } from "./scan-photos";
import { checkJobLimit } from "./scan-service";

export interface ScanUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  enableCompression?: boolean;
}

export interface ScanUploadResult {
  success: boolean;
  jobId?: string;
  photoUrl?: string;
  photoUrls?: string[];
  error?: string;
  message?: string;
  qualityEstimate?: {
    quality: 'low' | 'medium' | 'high';
    confidence: number;
    recommendations: string[];
  };
  uploadProgress?: {
    current: number;
    total: number;
  };
}

export interface MultiScanUploadResult extends ScanUploadResult {
  photoUrls: string[];
  failedPhotos?: Array<{ index: number; name: string; error: string }>;
}

/**
 * Upload and process multiple scan photos with all validations (React Native compatible)
 */
export async function uploadScanPhotosWithValidation(
  files: (File | { uri: string; name: string; type: string; size?: number })[],
  options: ScanUploadOptions = {}
): Promise<MultiScanUploadResult> {
  try {
    // Convert to consistent format — URL.createObjectURL only exists on web
    const normalizedFiles = files.map(file =>
      'uri' in file ? file : {
        uri: Platform.OS === 'web' ? URL.createObjectURL(file) : '',
        name: file.name,
        type: file.type,
        size: file.size
      }
    );

    // Validate all file types
    // iOS photo library often returns HEIC/HEIF — these are valid image formats
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif',
    ];
    const invalidFiles = normalizedFiles.filter(file => {
      if (!file.type || file.type === 'image') return false; // trust picker when type is generic
      return !allowedTypes.includes(file.type.toLowerCase());
    });
    if (invalidFiles.length > 0) {
      return {
        success: false,
        photoUrls: [],
        error: 'Invalid file types detected',
        message: `${invalidFiles.length} file(s) are not JPEG, PNG, HEIC, or WebP images.`
      };
    }

    // Check individual file sizes (10MB limit per file)
    const oversizedFiles = normalizedFiles.filter(file => file.size && file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return {
        success: false,
        photoUrls: [],
        error: 'Files too large',
        message: `${oversizedFiles.length} file(s) exceed 10MB limit.`
      };
    }

    // Check total size limit (50MB total for batch)
    const totalSize = normalizedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > 50 * 1024 * 1024) {
      return {
        success: false,
        photoUrls: [],
        error: 'Batch too large',
        message: `Total size ${(totalSize / (1024 * 1024)).toFixed(1)}MB exceeds 50MB limit.`
      };
    }

    // Estimate quality for first image as representative sample
    const qualityEstimate = await estimateImageQuality(normalizedFiles[0]);

    if (qualityEstimate.quality === 'low') {
      // Low quality is captured in qualityEstimate.recommendations — returned to caller
    }

    // Check job limit
    const { canCreate, activeCount } = await checkJobLimit();
    if (!canCreate) {
      return {
        success: false,
        photoUrls: [],
        error: 'Job limit reached',
        message: `You have ${activeCount} active scan jobs. Maximum allowed is 3.`
      };
    }

    // Upload all photos and create multi-photo scan job
    const result = await uploadScanPhotos(normalizedFiles, {
      maxWidth: options.maxWidth || 2048,
      maxHeight: options.maxHeight || 2048,
      quality: options.quality || 0.85,
      enableCompression: options.enableCompression !== false
    });

    return {
      success: true,
      jobId: result.jobId,
      photoUrls: result.photoUrls,
      photoUrl: result.photoUrls[0], // For backward compatibility
      message: `Scan job created successfully with ${result.photoUrls.length} photo(s)`,
      qualityEstimate
    };

  } catch (error) {
    return {
      success: false,
      photoUrls: [],
      error: 'Failed to process scan upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload and process a single scan photo with all validations (React Native compatible)
 * Maintained for backward compatibility
 */
export async function uploadScanPhotoWithValidation(
  file: File | { uri: string; name: string; type: string; size?: number },
  options: ScanUploadOptions = {}
): Promise<ScanUploadResult> {
  // Use the multi-photo function with single file
  const result = await uploadScanPhotosWithValidation([file], options);

  // Convert multi-photo result to single-photo format
  return {
    success: result.success,
    jobId: result.jobId,
    photoUrl: result.photoUrls?.[0],
    error: result.error,
    message: result.message,
    qualityEstimate: result.qualityEstimate
  };
}