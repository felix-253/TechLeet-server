import { Injectable } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';

@Injectable()
export class OcrService {
   /**
    * Perform OCR analysis using Tesseract.js with image preprocessing
    * Enhanced with multi-pass strategy for better accuracy
    */
   async performOCRAnalysis(imageUrl: string): Promise<{
      success: boolean;
      text: string;
      confidence: number;
      processingTime: number;
      error?: string;
   }> {
      const startTime = Date.now();
      
      try {
         console.log(`🔍 Starting enhanced OCR processing for: ${imageUrl}`);
         
         // Step 1: Preprocess image with Sharp for better OCR accuracy
         const preprocessedBuffer = await this.preprocessImageForOCR(imageUrl);
         
         // Step 2: Multi-pass OCR strategy for better results
         const ocrResults = await Promise.allSettled([
            // Pass 1: Standard OCR with English + Vietnamese
            this.performSingleOCRPass(preprocessedBuffer, 'eng+vie', 'standard'),
            
            // Pass 2: English-only for better accuracy on English certificates
            this.performSingleOCRPass(preprocessedBuffer, 'eng', 'english-focused'),
         ]);
         
         // Analyze results and pick the best one
         let bestResult: { text: string; confidence: number; passType: string; } | null = null;
         let bestScore = 0;
         
         for (const result of ocrResults) {
            if (result.status === 'fulfilled') {
               const { text, confidence } = result.value;
               const textLength = text.trim().length;
               
               // Score = confidence * text_length_factor
               const lengthFactor = Math.min(textLength / 100, 2.0); // Cap at 2x bonus
               const score = confidence * lengthFactor;
               
               console.log(`OCR Pass "${result.value.passType}": ${confidence.toFixed(1)}% confidence, ${textLength} chars, score: ${score.toFixed(1)}`);
               
               if (score > bestScore && textLength > 10) { // Minimum 10 chars to be valid
                  bestResult = result.value;
                  bestScore = score;
               }
            }
         }
         
         if (!bestResult) {
            throw new Error('All OCR passes failed to produce usable results');
         }
         
         // Log additional OCR quality metrics
         console.log(`✅ Best OCR Result Selected:
            - Pass Type: ${bestResult.passType}
            - Text Length: ${bestResult.text.length} characters
            - Confidence: ${bestResult.confidence.toFixed(1)}%
            - Lines: ${bestResult.text.split('\n').length}
            - Words: ${bestResult.text.split(/\s+/).filter(w => w.length > 0).length}
         `);
         
         const processingTime = Date.now() - startTime;
         
         console.log(`🎉 Enhanced OCR completed in ${processingTime}ms with confidence: ${bestResult.confidence}%`);
         
         return {
            success: true,
            text: bestResult.text.trim(),
            confidence: bestResult.confidence,
            processingTime
         };
      } catch (error) {
         const processingTime = Date.now() - startTime;
         console.error(`❌ Enhanced OCR analysis failed after ${processingTime}ms:`, error);
         
         // Fallback to basic OCR without multi-pass
         try {
            console.log('🔄 Attempting fallback basic OCR...');
            const preprocessedBuffer = await this.preprocessImageForOCR(imageUrl);
            const { data: { text, confidence } } = await Tesseract.recognize(
               preprocessedBuffer,
               'eng+vie'
            );
            
            const fallbackTime = Date.now() - startTime;
            console.log(`🆘 Fallback OCR succeeded in ${fallbackTime}ms`);
            
            return {
               success: true,
               text: text.trim(),
               confidence: confidence * 0.8, // Reduce confidence for fallback
               processingTime: fallbackTime
            };
         } catch (fallbackError) {
            const finalTime = Date.now() - startTime;
            console.error(`💥 Fallback OCR also failed:`, fallbackError);
            
            return {
               success: false,
               text: '',
               confidence: 0,
               processingTime: finalTime,
               error: error.message
            };
         }
      }
   }

   /**
    * Perform a single OCR pass with specific language and configuration
    */
   private async performSingleOCRPass(
      imageBuffer: Buffer, 
      language: string, 
      passType: string
   ): Promise<{
      text: string;
      confidence: number;
      passType: string;
   }> {
      const { data: { text, confidence } } = await Tesseract.recognize(
         imageBuffer,
         language,
         {
            logger: m => {
               if (m.status === 'recognizing text') {
                  console.log(`🔍 OCR ${passType}: ${Math.round(m.progress * 100)}%`);
               }
            }
         }
      );
      
      return {
         text: text.trim(),
         confidence,
         passType
      };
   }

   /**
    * Preprocess image using Sharp to improve OCR accuracy
    * Enhanced with multiple preprocessing strategies based on image characteristics
    */
   private async preprocessImageForOCR(imageUrl: string): Promise<Buffer> {
      try {
         console.log('🔧 Preprocessing image for better OCR accuracy...');
         
         // Read the image file
         const inputBuffer = require('fs').readFileSync(imageUrl);
         
         // Get image metadata to inform preprocessing decisions
         const metadata = await sharp(inputBuffer).metadata();
         console.log(`📊 Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}, density: ${metadata.density}`);
         
         // Determine optimal processing based on image characteristics
         let sharpInstance = sharp(inputBuffer);
         
         // 1. Intelligent resizing based on original size
         const targetWidth = metadata.width < 1200 ? 2400 : Math.min(metadata.width * 2, 4000);
         sharpInstance = sharpInstance.resize(targetWidth, null, {
            withoutEnlargement: false,
            fit: 'inside',
            kernel: sharp.kernel.lanczos3 // High-quality resampling
         });
         
         // 2. Rotation correction for mobile photos
         sharpInstance = sharpInstance.rotate(); // Auto-rotate based on EXIF
         
         // 3. Enhanced contrast and brightness adjustment
         sharpInstance = sharpInstance
            .modulate({
               brightness: 1.1, // Slightly brighten
               saturation: 0.8  // Reduce saturation before grayscale
            })
            .grayscale()
            .normalize({ lower: 5, upper: 95 }) // Improved contrast normalization
            .gamma(1.2); // Gamma correction for better text visibility
         
         // 4. Noise reduction before sharpening
         sharpInstance = sharpInstance
            .blur(0.3) // Very slight blur to reduce noise
            .sharpen(1.0, 0.8, 1.2); // (sigma, flat, jagged) - Enhanced sharpening
         
         // 5. Adaptive thresholding based on image characteristics
         const stats = await sharp(inputBuffer).grayscale().stats();
         const avgBrightness = (stats.channels[0].mean / 255) * 100;
         
         let threshold = 128; // Default
         if (avgBrightness < 30) {
            threshold = 100; // Darker images - lower threshold
         } else if (avgBrightness > 70) {
            threshold = 160; // Brighter images - higher threshold
         }
         
         console.log(`⚡ Applying adaptive threshold: ${threshold} (avg brightness: ${avgBrightness.toFixed(1)}%)`);
         
         // 6. Final processing
         const processedBuffer = await sharpInstance
            .threshold(threshold)
            .png({ 
               compressionLevel: 1, // Minimal compression for OCR
               adaptiveFiltering: false 
            })
            .toBuffer();
         
         console.log(`✅ Image preprocessing completed: ${inputBuffer.length} -> ${processedBuffer.length} bytes`);
         return processedBuffer;
      } catch (error) {
         console.warn('⚠️  Enhanced image preprocessing failed, trying basic preprocessing:', error.message);
         
         // Fallback to basic preprocessing
         try {
            const inputBuffer = require('fs').readFileSync(imageUrl);
            const basicProcessed = await sharp(inputBuffer)
               .resize(2000, null, { withoutEnlargement: false })
               .grayscale()
               .normalize()
               .sharpen()
               .threshold(128)
               .png()
               .toBuffer();
            
            console.log('✅ Basic preprocessing successful');
            return basicProcessed;
         } catch (fallbackError) {
            console.warn('⚠️  Basic preprocessing also failed, using original image:', fallbackError.message);
            return require('fs').readFileSync(imageUrl);
         }
      }
   }
}
