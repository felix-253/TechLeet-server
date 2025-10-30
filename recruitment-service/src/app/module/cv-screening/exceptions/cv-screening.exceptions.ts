import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Custom exceptions for CV screening module
 * Provides better error messages and consistent handling
 */

export class CvFileNotFoundException extends NotFoundException {
   constructor(filePath: string, originalPath?: string) {
      const message = originalPath
         ? `Resume file not found at path: ${filePath}. Original path: ${originalPath}`
         : `Resume file not found at path: ${filePath}`;
      super(message);
   }
}

export class CvFileTooLargeException extends BadRequestException {
   constructor(actualSizeMB: number, maxSizeMB: number) {
      super(
         `Resume file too large: ${actualSizeMB.toFixed(2)}MB. Maximum allowed: ${maxSizeMB}MB`,
      );
   }
}

export class CvTextExtractionException extends BadRequestException {
   constructor(reason: string) {
      super(`Failed to extract text from CV: ${reason}`);
   }
}

export class CvProcessingException extends BadRequestException {
   constructor(stage: string, reason: string) {
      super(`CV processing failed at ${stage}: ${reason}`);
   }
}

export class CvInvalidFilePathException extends BadRequestException {
   constructor(reason: string) {
      super(`Invalid file path: ${reason}`);
   }
}

export class CvApplicationNotFoundException extends NotFoundException {
   constructor(applicationId: number) {
      super(`Application ${applicationId} not found`);
   }
}

export class CvJobPostingNotFoundException extends NotFoundException {
   constructor(jobPostingId: number) {
      super(`Job posting ${jobPostingId} not found`);
   }
}

export class CvScreeningNotFoundException extends NotFoundException {
   constructor(screeningId: number) {
      super(`Screening ${screeningId} not found`);
   }
}

export class CvScreeningAlreadyExistsException extends BadRequestException {
   constructor(applicationId: number, status: string) {
      super(
         `Screening already exists for application ${applicationId} with status ${status}`,
      );
   }
}

export class CvNlpProcessingException extends BadRequestException {
   constructor(reason: string) {
      super(`NLP processing failed: ${reason}`);
   }
}

export class CvEmbeddingGenerationException extends BadRequestException {
   constructor(reason: string) {
      super(`Embedding generation failed: ${reason}`);
   }
}

export class CvSimilarityCalculationException extends BadRequestException {
   constructor(reason: string) {
      super(`Similarity calculation failed: ${reason}`);
   }
}

