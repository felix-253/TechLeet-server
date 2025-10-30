import * as fs from 'fs';
import { CV_SCREENING_CONFIG } from '../config';

export interface FileValidationResult {
   isValid: boolean;
   error?: string;
   fileSizeMB?: number;
}

export class FileValidationUtil {
   /**
    * Validate if file exists at the given path
    */
   static validateFileExists(filePath: string): FileValidationResult {
      if (!fs.existsSync(filePath)) {
         return {
            isValid: false,
            error: `File not found at path: ${filePath}`,
         };
      }

      return { isValid: true };
   }

   /**
    * Validate file size is within acceptable limits
    */
   static validateFileSize(filePath: string): FileValidationResult {
      try {
         const stats = fs.statSync(filePath);
         const fileSizeMB = stats.size / (1024 * 1024);

         if (fileSizeMB > CV_SCREENING_CONFIG.FILE.MAX_SIZE_MB) {
            return {
               isValid: false,
               error: `File too large: ${fileSizeMB.toFixed(2)}MB. Maximum allowed: ${CV_SCREENING_CONFIG.FILE.MAX_SIZE_MB}MB`,
               fileSizeMB,
            };
         }

         return { isValid: true, fileSizeMB };
      } catch (error) {
         return {
            isValid: false,
            error: `Failed to read file stats: ${error.message}`,
         };
      }
   }

   /**
    * Validate extracted text is not empty or too short
    */
   static validateExtractedText(text: string): FileValidationResult {
      if (!text || text.trim().length < CV_SCREENING_CONFIG.FILE.MIN_TEXT_LENGTH) {
         return {
            isValid: false,
            error: 'Extracted text is too short or empty. File may be corrupted or not contain readable text.',
         };
      }

      return { isValid: true };
   }

   /**
    * Validate file path format (basic validation)
    */
   static validateFilePath(filePath: string): FileValidationResult {
      if (!filePath || filePath.trim().length === 0) {
         return {
            isValid: false,
            error: 'File path is empty or invalid',
         };
      }

      // Check for suspicious patterns
      if (filePath.includes('..') || filePath.includes('~')) {
         return {
            isValid: false,
            error: 'File path contains invalid characters',
         };
      }

      return { isValid: true };
   }

   /**
    * Run all file validations in sequence
    */
   static validateFile(filePath: string): FileValidationResult {
      // Validate path format
      const pathValidation = this.validateFilePath(filePath);
      if (!pathValidation.isValid) {
         return pathValidation;
      }

      // Validate file exists
      const existsValidation = this.validateFileExists(filePath);
      if (!existsValidation.isValid) {
         return existsValidation;
      }

      // Validate file size
      const sizeValidation = this.validateFileSize(filePath);
      if (!sizeValidation.isValid) {
         return sizeValidation;
      }

      return { isValid: true, fileSizeMB: sizeValidation.fileSizeMB };
   }
}

