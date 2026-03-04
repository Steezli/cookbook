import { ImageAnnotatorClient } from '@google-cloud/vision';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    vertices: Array<{ x: number; y: number }>;
    confidence: number;
  }>;
}

export interface OCRProcessingOptions {
  languageHints?: string[];
  maxResults?: number;
  enableAutoOrientation?: boolean;
}

export class OCRService {
  private client: ImageAnnotatorClient;

  constructor(credentials?: any) {
    // Initialize Vision client with credentials or use default ADC
    this.client = new ImageAnnotatorClient({
      credentials: credentials || undefined,
    });
  }

  /**
   * Extract text from an image buffer
   */
  async extractText(
    imageBuffer: Buffer,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer },
        imageContext: {
          languageHints: options.languageHints || ['en'],
          // Add other context options as needed
        },
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      
      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        return {
          text: '',
          confidence: 0,
          boundingBoxes: [],
        };
      }

      // Extract bounding box information
      const boundingBoxes = fullTextAnnotation.pages?.flatMap(page =>
        page.blocks?.flatMap(block =>
          block.paragraphs?.flatMap(paragraph =>
            paragraph.words?.flatMap(word => {
              const text = word.symbols?.map(s => s.text).join('') || '';
              const vertices = word.boundingBox?.vertices || [];
              const confidence = word.confidence || 0;

              return {
                text,
                vertices: vertices.map(v => ({ x: v.x || 0, y: v.y || 0 })),
                confidence,
              };
            }) || []
          ) || []
        ) || []
      ) || [];

      const processingTime = Date.now() - startTime;
      
      // Log successful extraction
      console.log(`OCR extraction completed in ${processingTime}ms`, {
        textLength: fullTextAnnotation.text.length,
        boundingBoxCount: boundingBoxes.length,
      });

      return {
        text: fullTextAnnotation.text,
        confidence: this.calculateOverallConfidence(boundingBoxes),
        boundingBoxes,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`OCR extraction failed after ${processingTime}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle specific error types
      if (this.isRateLimitError(error)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (this.isAuthError(error)) {
        throw new Error('Authentication failed. Check Google Cloud credentials.');
      }

      if (this.isInvalidImageError(error)) {
        throw new Error('Invalid image format or corrupted image.');
      }

      // Generic error
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple images with batch processing
   */
  async extractTextBatch(
    imageBuffers: Buffer[],
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    const batchSize = 5; // Process 5 images at a time to manage rate limits
    const results: OCRResult[] = [];

    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(buffer => 
        this.extractText(buffer, options).catch(error => ({
          text: '',
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < imageBuffers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    return results;
  }

  /**
   * Calculate overall confidence from bounding box data
   */
  private calculateOverallConfidence(boundingBoxes: OCRResult['boundingBoxes']): number {
    if (!boundingBoxes || boundingBoxes.length === 0) {
      return 0;
    }

    const totalConfidence = boundingBoxes.reduce((sum, box) => sum + box.confidence, 0);
    return totalConfidence / boundingBoxes.length;
  }

  /**
   * Error type checking methods
   */
  private isRateLimitError(error: any): boolean {
    return error?.message?.includes('Resource has been exhausted') ||
           error?.message?.includes('RATE_LIMIT_EXCEEDED') ||
           error?.code === 429;
  }

  private isAuthError(error: any): boolean {
    return error?.message?.includes('authentication') ||
           error?.message?.includes('unauthorized') ||
           error?.code === 401 ||
           error?.code === 403;
  }

  private isInvalidImageError(error: any): boolean {
    return error?.message?.includes('Invalid image') ||
           error?.message?.includes('corrupted') ||
           error?.message?.includes('unsupported format') ||
           error?.code === 400;
  }

  /**
   * Validate image before processing
   */
  async validateImage(imageBuffer: Buffer): Promise<{ valid: boolean; reason?: string }> {
    // Check file size (max 10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return { valid: false, reason: 'Image too large (max 10MB)' };
    }

    // Check minimum size
    if (imageBuffer.length < 1024) { // 1KB minimum
      return { valid: false, reason: 'Image too small' };
    }

    // Basic image format validation (should start with common image signatures)
    const signatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x47, 0x49, 0x46, 0x38], // GIF
      [0x42, 0x4D], // BMP
    ];

    const isValidFormat = signatures.some(sig => 
      sig.every((byte, index) => imageBuffer[index] === byte)
    );

    if (!isValidFormat) {
      return { valid: false, reason: 'Unsupported image format' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const ocrService = new OCRService();