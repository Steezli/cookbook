import React, { useState, useRef } from 'react';
import { ScanJobProgress } from './ScanJobProgress';
import { uploadScanPhoto, cancelScanJob, retryScanJob } from '@/features/scans/scan-upload';

interface ActiveJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export function ScanPhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(10); // Starting compression
      
      // Upload and create scan job
      const result = await uploadScanPhoto(file);
      
      setUploadProgress(90); // Job created
      
      // Add to active jobs
      setActiveJobs(prev => [...prev, {
        id: result.jobId,
        status: 'queued'
      }]);
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setUploadProgress(100);
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(null);
        setIsUploading(false);
      }, 1000);
      
      console.log('Upload results:', {
        jobId: result.jobId,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: (1 - result.compressionRatio) * 100,
        dimensions: result.dimensions,
        quality: result.quality
      });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Handle specific errors
      if (error.message?.includes('Rate limit exceeded')) {
        setError('You have reached the maximum of 3 concurrent scans. Please wait for one to complete.');
      } else if (error.message?.includes('authorization')) {
        setError('Please log in to upload photos');
      } else {
        setError(error.message || 'Failed to upload photo');
      }
      
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleJobComplete = (jobId: string) => {
    setActiveJobs(prev => 
      prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'completed' }
          : job
      )
    );
  };

  const handleJobError = (jobId: string, errorMessage: string) => {
    setActiveJobs(prev => 
      prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'failed' }
          : job
      )
    );
    setError(`Scan failed: ${errorMessage}`);
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryScanJob(jobId);
      setActiveJobs(prev => 
        prev.map(job => 
          job.id === jobId 
            ? { ...job, status: 'queued' }
            : job
        )
      );
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to retry scan');
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelScanJob(jobId);
      setActiveJobs(prev => prev.filter(job => job.id !== jobId));
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to cancel scan');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Scan Recipe Photo
        </h2>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label htmlFor="photo-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select a photo of your recipe
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="photo-upload"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: JPG, PNG, HEIC. Max size: 10MB
            </p>
          </div>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {uploadProgress < 20 ? 'Compressing image...' :
                   uploadProgress < 90 ? 'Uploading...' : 'Creating scan job...'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Tips for best results:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Ensure good lighting and avoid shadows</li>
              <li>• Place the recipe flat and capture the entire text</li>
              <li>• Handwriting works best when clear and legible</li>
              <li>• Printed text generally produces more accurate results</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Active Scans</h3>
          {activeJobs.map((job) => (
            <div key={job.id} className="space-y-4">
              <ScanJobProgress
                jobId={job.id}
                onComplete={handleJobComplete}
                onError={handleJobError}
              />
              
              {/* Action Buttons for queued/failed jobs */}
              {(job.status === 'queued' || job.status === 'failed') && (
                <div className="flex justify-end space-x-2">
                  {job.status === 'queued' && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      className="px-3 py-1 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}