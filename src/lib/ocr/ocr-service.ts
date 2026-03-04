import { ImageAnnotatorClient } from '@google-cloud/vision'
import { createClient } from '@supabase/supabase-js'

// Initialize Google Cloud Vision client
const visionClient = new ImageAnnotatorClient()

// Initialize Supabase client for database operations
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export interface OCRResult {
  rawText: string
  confidence: number
  pages: Page[]
}

export interface Page {
  pageNumber: number
  width: number
  height: number
  blocks: Block[]
  confidence: number
}

export interface Block {
  type: 'text' | 'table' | 'image'
  text?: string
  boundingBox: BoundingBox
  confidence: number
  paragraphs?: Paragraph[]
}

export interface Paragraph {
  text: string
  boundingBox: BoundingBox
  confidence: number
  words: Word[]
}

export interface Word {
  text: string
  boundingBox: BoundingBox
  confidence: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export class OCRService {
  /**
   * Extract text from an image using Google Cloud Vision API
   */
  async extractText(imageUrl: string): Promise<OCRResult> {
    try {
      console.log(`Starting OCR extraction for image: ${imageUrl}`)
      
      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl)
      
      // Perform OCR with Google Cloud Vision
      const [result] = await visionClient.textDetection({
        image: { content: imageBuffer }
      })
      
      if (!result.fullTextAnnotation) {
        throw new Error('No text detected in image')
      }
      
      const fullTextAnnotation = result.fullTextAnnotation
      const pages = this.parsePages(result.fullTextAnnotation.pages || [])
      
      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(pages)
      
      const ocrResult: OCRResult = {
        rawText: fullTextAnnotation.text || '',
        confidence: overallConfidence,
        pages
      }
      
      console.log(`OCR extraction completed. Confidence: ${overallConfidence}, Pages: ${pages.length}`)
      
      return ocrResult
      
    } catch (error) {
      console.error('OCR extraction failed:', error)
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Google Cloud Vision API quota exceeded. Please try again later.')
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied accessing Google Cloud Vision API. Check service account credentials.')
        }
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw new Error('Invalid image format or corrupted image file.')
        }
      }
      
      throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Download image from URL and return as buffer
   */
  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Downloading image (attempt ${attempt}/${maxRetries}): ${imageUrl}`)
        
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Cookbook-Scan-Service/1.0'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Validate image size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error('Image too large (max 10MB)')
        }
        
        // Validate image format
        const imageType = await this.detectImageType(buffer)
        if (!['jpeg', 'png', 'webp', 'bmp', 'tiff'].includes(imageType)) {
          throw new Error(`Unsupported image format: ${imageType}`)
        }
        
        console.log(`Image downloaded successfully. Size: ${buffer.length} bytes, Type: ${imageType}`)
        
        return buffer
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error downloading image')
        console.error(`Download attempt ${attempt} failed:`, lastError.message)
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    throw lastError || new Error('Failed to download image')
  }
  
  /**
   * Detect image type from buffer
   */
  private async detectImageType(buffer: Buffer): Promise<string> {
    // Simple magic number detection
    const signatures = [
      { type: 'jpeg', signature: [0xFF, 0xD8, 0xFF] },
      { type: 'png', signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
      { type: 'webp', signature: [0x52, 0x49, 0x46, 0x46] }, // RIFF
      { type: 'bmp', signature: [0x42, 0x4D] },
      { type: 'tiff', signature: [0x49, 0x49, 0x2A, 0x00] } // Little-endian TIFF
    ]
    
    for (const { type, signature } of signatures) {
      if (this.matchesSignature(buffer, signature)) {
        return type
      }
    }
    
    return 'unknown'
  }
  
  /**
   * Check if buffer starts with signature
   */
  private matchesSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false
    return signature.every((byte, index) => buffer[index] === byte)
  }
  
  /**
   * Parse Vision API pages into structured format
   */
  private parsePages(pages: any[]): Page[] {
    return pages.map((page, index) => ({
      pageNumber: index + 1,
      width: page.width || 0,
      height: page.height || 0,
      blocks: this.parseBlocks(page.blocks || []),
      confidence: page.confidence || 0
    }))
  }
  
  /**
   * Parse blocks from Vision API response
   */
  private parseBlocks(blocks: any[]): Block[] {
    return blocks.map(block => ({
      type: this.getBlockType(block),
      text: block.paragraphs?.map((p: any) => p.words?.map((w: any) => w.text).join(' ')).join('\n'),
      boundingBox: this.parseBoundingBox(block.boundingBox?.vertices || []),
      confidence: block.confidence || 0,
      paragraphs: this.parseParagraphs(block.paragraphs || [])
    }))
  }
  
  /**
   * Determine block type
   */
  private getBlockType(block: any): 'text' | 'table' | 'image' {
    if (block.blockType === 'TEXT') return 'text'
    if (block.blockType === 'TABLE') return 'table'
    return 'text' // Default to text for unknown types
  }
  
  /**
   * Parse paragraphs from block
   */
  private parseParagraphs(paragraphs: any[]): Paragraph[] {
    return paragraphs.map(paragraph => ({
      text: paragraph.words?.map((w: any) => w.text).join(' ') || '',
      boundingBox: this.parseBoundingBox(paragraph.boundingBox?.vertices || []),
      confidence: paragraph.confidence || 0,
      words: this.parseWords(paragraph.words || [])
    }))
  }
  
  /**
   * Parse words from paragraph
   */
  private parseWords(words: any[]): Word[] {
    return words.map(word => ({
      text: word.text || '',
      boundingBox: this.parseBoundingBox(word.boundingBox?.vertices || []),
      confidence: word.confidence || 0
    }))
  }
  
  /**
   * Parse bounding box from vertices
   */
  private parseBoundingBox(vertices: any[]): BoundingBox {
    const x = vertices[0]?.x || 0
    const y = vertices[0]?.y || 0
    const width = (vertices[1]?.x || 0) - x
    const height = (vertices[2]?.y || 0) - y
    
    return { x, y, width, height }
  }
  
  /**
   * Calculate overall confidence across all pages
   */
  private calculateOverallConfidence(pages: Page[]): number {
    if (pages.length === 0) return 0
    
    const totalConfidence = pages.reduce((sum, page) => sum + page.confidence, 0)
    return Math.round((totalConfidence / pages.length) * 100) / 100 // Round to 2 decimal places
  }
  
  /**
   * Handle rate limiting and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on certain errors
        if (lastError.message.includes('PERMISSION_DENIED') || 
            lastError.message.includes('INVALID_ARGUMENT') ||
            lastError.message.includes('INVALID_IMAGE')) {
          throw lastError
        }
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff with jitter
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms due to: ${lastError.message}`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    throw lastError || new Error('Operation failed after retries')
  }
}

// Export singleton instance
export const ocrService = new OCRService()