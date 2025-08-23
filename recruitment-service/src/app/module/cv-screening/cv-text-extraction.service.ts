import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedTextResult {
   text: string;
   metadata: {
      pages: number;
      info?: any;
      version?: string;
      totalPages?: number;
   };
   processingTimeMs: number;
}

@Injectable()
export class CvTextExtractionService {
   private readonly logger = new Logger(CvTextExtractionService.name);

   /**
    * Extract text from a PDF file
    * @param filePath - Path to the PDF file
    * @returns Extracted text and metadata
    */
   async extractTextFromPdf(filePath: string): Promise<ExtractedTextResult> {
      const startTime = Date.now();
      
      try {
         this.logger.log(`Starting text extraction from: ${filePath}`);

         // Check if file exists
         if (!fs.existsSync(filePath)) {
            throw new BadRequestException(`File not found: ${filePath}`);
         }

         // Check file extension
         const fileExtension = path.extname(filePath).toLowerCase();
         if (fileExtension !== '.pdf') {
            throw new BadRequestException(`Unsupported file type: ${fileExtension}. Only PDF files are supported.`);
         }

         // Read the PDF file
         const dataBuffer = fs.readFileSync(filePath);
         
         // Parse the PDF
         const pdfData = await pdfParse(dataBuffer, {
            // Options for pdf-parse
            max: 0, // Maximum number of pages to parse (0 = all pages)
            version: 'v1.10.100', // PDF.js version
         });

         const processingTime = Date.now() - startTime;

         this.logger.log(`Text extraction completed in ${processingTime}ms. Extracted ${pdfData.text.length} characters from ${pdfData.numpages} pages.`);

         return {
            text: this.cleanExtractedText(pdfData.text),
            metadata: {
               pages: pdfData.numpages,
               info: pdfData.info,
               version: pdfData.version,
               totalPages: pdfData.numpages,
            },
            processingTimeMs: processingTime,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`Text extraction failed after ${processingTime}ms: ${error.message}`, error.stack);
         
         if (error instanceof BadRequestException) {
            throw error;
         }
         
         throw new BadRequestException(`Failed to extract text from PDF: ${error.message}`);
      }
   }

   /**
    * Extract text from a PDF buffer
    * @param buffer - PDF file buffer
    * @param originalName - Original filename for logging
    * @returns Extracted text and metadata
    */
   async extractTextFromBuffer(buffer: Buffer, originalName?: string): Promise<ExtractedTextResult> {
      const startTime = Date.now();
      
      try {
         this.logger.log(`Starting text extraction from buffer${originalName ? ` (${originalName})` : ''}`);

         // Parse the PDF
         const pdfData = await pdfParse(buffer, {
            max: 0, // Maximum number of pages to parse (0 = all pages)
            version: 'v1.10.100', // PDF.js version
         });

         const processingTime = Date.now() - startTime;

         this.logger.log(`Text extraction completed in ${processingTime}ms. Extracted ${pdfData.text.length} characters from ${pdfData.numpages} pages.`);

         return {
            text: this.cleanExtractedText(pdfData.text),
            metadata: {
               pages: pdfData.numpages,
               info: pdfData.info,
               version: pdfData.version,
               totalPages: pdfData.numpages,
            },
            processingTimeMs: processingTime,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`Text extraction from buffer failed after ${processingTime}ms: ${error.message}`, error.stack);
         
         throw new BadRequestException(`Failed to extract text from PDF: ${error.message}`);
      }
   }

   /**
    * Clean and normalize extracted text
    * @param rawText - Raw text from PDF extraction
    * @returns Cleaned text
    */
   private cleanExtractedText(rawText: string): string {
      if (!rawText) {
         return '';
      }

      return rawText
         // Remove excessive whitespace
         .replace(/\s+/g, ' ')
         // Remove special characters that might interfere with processing
         .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
         // Normalize line breaks
         .replace(/\r\n/g, '\n')
         .replace(/\r/g, '\n')
         // Remove multiple consecutive newlines
         .replace(/\n{3,}/g, '\n\n')
         // Trim whitespace
         .trim();
   }

   /**
    * Validate if a file is a valid PDF
    * @param filePath - Path to the file
    * @returns True if valid PDF
    */
   async validatePdfFile(filePath: string): Promise<boolean> {
      try {
         if (!fs.existsSync(filePath)) {
            return false;
         }

         const fileExtension = path.extname(filePath).toLowerCase();
         if (fileExtension !== '.pdf') {
            return false;
         }

         // Try to read the first few bytes to check PDF signature
         const buffer = fs.readFileSync(filePath);
         const signature = buffer.subarray(0, 4).toString('ascii');
         
         return signature === '%PDF';
      } catch (error) {
         this.logger.warn(`PDF validation failed for ${filePath}: ${error.message}`);
         return false;
      }
   }

   /**
    * Validate if a buffer contains a valid PDF
    * @param buffer - File buffer
    * @returns True if valid PDF
    */
   validatePdfBuffer(buffer: Buffer): boolean {
      try {
         if (!buffer || buffer.length < 4) {
            return false;
         }

         // Check PDF signature
         const signature = buffer.subarray(0, 4).toString('ascii');
         return signature === '%PDF';
      } catch (error) {
         this.logger.warn(`PDF buffer validation failed: ${error.message}`);
         return false;
      }
   }

   /**
    * Get text extraction statistics
    * @param text - Extracted text
    * @returns Statistics about the extracted text
    */
   getTextStatistics(text: string): {
      characterCount: number;
      wordCount: number;
      lineCount: number;
      paragraphCount: number;
      estimatedReadingTime: number; // in minutes
   } {
      if (!text) {
         return {
            characterCount: 0,
            wordCount: 0,
            lineCount: 0,
            paragraphCount: 0,
            estimatedReadingTime: 0,
         };
      }

      const characterCount = text.length;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const lineCount = text.split('\n').length;
      const paragraphCount = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
      
      // Estimate reading time (average 200 words per minute)
      const estimatedReadingTime = Math.ceil(wordCount / 200);

      return {
         characterCount,
         wordCount,
         lineCount,
         paragraphCount,
         estimatedReadingTime,
      };
   }
}
