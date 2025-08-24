import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import * as pgvector from 'pgvector';
import { CvEmbeddingEntity, EmbeddingType } from '../../../entities/recruitment/cv-embedding.entity';

export interface EmbeddingResult {
   embedding: number[];
   model: string;
   dimensions: number;
   tokenCount?: number;
   processingTimeMs: number;
}

export interface SimilarityResult {
   similarity: number;
   embeddingId: number;
   applicationId?: number;
   jobPostingId?: number;
   embeddingType: EmbeddingType;
   originalText: string;
}

interface CircuitBreakerState {
   isOpen: boolean;
   failureCount: number;
   lastFailureTime: number;
   successCount: number;
}

@Injectable()
export class CvEmbeddingService {
   private readonly logger = new Logger(CvEmbeddingService.name);
   private readonly genAI: GoogleGenerativeAI;
   private readonly defaultModel = 'text-embedding-004';
   private readonly defaultDimensions = 768;

   // Circuit breaker configuration
   private readonly circuitBreaker: CircuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
   };
   
   private readonly maxFailures = 5;
   private readonly resetTimeoutMs = 60000; // 1 minute
   private readonly halfOpenMaxAttempts = 3;

   constructor(
      @InjectRepository(CvEmbeddingEntity)
      private readonly embeddingRepository: Repository<CvEmbeddingEntity>,
      private readonly configService: ConfigService,
   ) {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      if (!apiKey) {
         this.logger.warn('Gemini API key not configured. Embedding service will not work.');
      }

      this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
   }

   /**
    * Generate embedding for text using Google Gemini with retry and circuit breaker
    */
   async generateEmbedding(
      text: string,
      model: string = this.defaultModel,
      dimensions: number = this.defaultDimensions
   ): Promise<EmbeddingResult> {
      return this.executeWithCircuitBreaker(async () => {
         return this.executeWithRetry(async () => {
            return this.generateEmbeddingInternal(text, model, dimensions);
         }, 3, 'embedding generation');
      });
   }

   /**
    * Internal embedding generation method
    */
   private async generateEmbeddingInternal(
      text: string,
      model: string,
      dimensions: number
   ): Promise<EmbeddingResult> {
      const startTime = Date.now();
      
      try {
         this.logger.log(`Generating embedding for text (${text.length} characters) using model: ${model}`);

         if (!text || text.trim().length === 0) {
            throw new Error('Text cannot be empty');
         }

         // Truncate text if too long (Gemini has token limits)
         const truncatedText = this.truncateText(text, 8000); // Conservative limit

         const embeddingModel = this.genAI.getGenerativeModel({ model });
         const result = await embeddingModel.embedContent(truncatedText);

         const processingTime = Date.now() - startTime;
         const embedding = result.embedding.values;

         this.logger.log(`Embedding generated successfully in ${processingTime}ms. Vector dimensions: ${embedding.length}`);

         return {
            embedding,
            model,
            dimensions: embedding.length,
            tokenCount: undefined, // Gemini doesn't provide token count in embedding response
            processingTimeMs: processingTime,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`Embedding generation failed after ${processingTime}ms: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Execute operation with retry logic
    */
   private async executeWithRetry<T>(
      operation: () => Promise<T>,
      maxAttempts: number,
      operationName: string
   ): Promise<T> {
      let lastError: Error = new Error(`${operationName} failed: no attempts made`);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
            const result = await operation();
            if (attempt > 1) {
               this.logger.log(`${operationName} succeeded on attempt ${attempt}`);
            }
            return result;
         } catch (error) {
            lastError = error as Error;
            
            // Check if we should retry
            if (attempt === maxAttempts || !this.shouldRetry(error)) {
               break;
            }
            
            const delay = this.calculateBackoffDelay(attempt);
            this.logger.warn(`${operationName} failed on attempt ${attempt}/${maxAttempts}: ${error.message}. Retrying in ${delay}ms...`);
            
            await this.sleep(delay);
         }
      }
      
      this.logger.error(`${operationName} failed after ${maxAttempts} attempts: ${lastError.message}`);
      throw lastError;
   }

   /**
    * Execute operation with circuit breaker
    */
   private async executeWithCircuitBreaker<T>(
      operation: () => Promise<T>
   ): Promise<T> {
      // Check if circuit breaker is open
      if (this.circuitBreaker.isOpen) {
         const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
         
         if (timeSinceLastFailure < this.resetTimeoutMs) {
            throw new Error('Circuit breaker is open - Gemini API temporarily unavailable');
         }
         
         // Try to half-open the circuit
         this.logger.log('Circuit breaker half-open - attempting to reset');
      }

      try {
         const result = await operation();
         
         // Success - reset circuit breaker
         if (this.circuitBreaker.isOpen || this.circuitBreaker.failureCount > 0) {
            this.circuitBreaker.successCount++;
            
            if (this.circuitBreaker.successCount >= this.halfOpenMaxAttempts || !this.circuitBreaker.isOpen) {
               this.resetCircuitBreaker();
            }
         }
         
         return result;
         
      } catch (error) {
         this.recordCircuitBreakerFailure();
         throw error;
      }
   }

   /**
    * Check if error should trigger a retry
    */
   private shouldRetry(error: any): boolean {
      // Retry on network errors, rate limits, and temporary server errors
      if (error.code === 'ECONNRESET' || 
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNREFUSED') {
         return true;
      }
      
      // Retry on HTTP 429 (rate limit) and 5xx errors
      if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
         return true;
      }
      
      // Check error message for specific patterns
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('rate limit') ||
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('service unavailable') ||
          errorMessage.includes('timeout')) {
         return true;
      }
      
      return false;
   }

   /**
    * Calculate exponential backoff delay
    */
   private calculateBackoffDelay(attempt: number): number {
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      
      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * 0.1 * delay; // Add up to 10% jitter
      
      return Math.floor(delay + jitter);
   }

   /**
    * Record circuit breaker failure
    */
   private recordCircuitBreakerFailure(): void {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = Date.now();
      this.circuitBreaker.successCount = 0;
      
      if (this.circuitBreaker.failureCount >= this.maxFailures) {
         this.circuitBreaker.isOpen = true;
         this.logger.error(`Circuit breaker opened after ${this.circuitBreaker.failureCount} failures. Gemini API calls will be blocked for ${this.resetTimeoutMs}ms`);
      }
   }

   /**
    * Reset circuit breaker to closed state
    */
   private resetCircuitBreaker(): void {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.successCount = 0;
      this.logger.log('Circuit breaker reset - Gemini API calls restored');
   }

   /**
    * Sleep utility for delays
    */
   private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   /**
    * Store embedding in database with idempotent support
    */
   async storeEmbedding(
      text: string,
      embedding: number[],
      embeddingType: EmbeddingType,
      applicationId?: number,
      jobPostingId?: number,
      model: string = this.defaultModel,
      metadata?: any
   ): Promise<CvEmbeddingEntity> {
      try {
         // Use ON CONFLICT DO UPDATE for idempotent operations
         const query = `
            INSERT INTO cv_embedding (
               application_id, job_posting_id, embedding_type, original_text, 
               embedding, model, dimensions, metadata, created_at, updated_at
            ) VALUES (
               $1, $2, $3, $4, $5::vector, $6, $7, $8, NOW(), NOW()
            )
            ON CONFLICT (embedding_type, COALESCE(application_id, 0), COALESCE(job_posting_id, 0))
            DO UPDATE SET
               original_text = EXCLUDED.original_text,
               embedding = EXCLUDED.embedding,
               model = EXCLUDED.model,
               dimensions = EXCLUDED.dimensions,
               metadata = EXCLUDED.metadata,
               updated_at = NOW()
            RETURNING *
         `;

         const result = await this.embeddingRepository.query(query, [
            applicationId || null,
            jobPostingId || null,
            embeddingType,
            text,
            pgvector.toSql(embedding),
            model,
            embedding.length,
            metadata ? JSON.stringify(metadata) : null,
         ]);

         const savedEmbedding = result[0];
         this.logger.log(`Embedding stored/updated with ID: ${savedEmbedding.embedding_id}`);

         return this.embeddingRepository.create({
            embeddingId: savedEmbedding.embedding_id,
            applicationId: savedEmbedding.application_id,
            jobPostingId: savedEmbedding.job_posting_id,
            embeddingType: savedEmbedding.embedding_type,
            originalText: savedEmbedding.original_text,
            embedding: savedEmbedding.embedding,
            model: savedEmbedding.model,
            dimensions: savedEmbedding.dimensions,
            metadata: savedEmbedding.metadata,
            createdAt: savedEmbedding.created_at,
            updatedAt: savedEmbedding.updated_at,
         });
      } catch (error) {
         this.logger.error(`Failed to store embedding: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Generate and store CV embedding
    */
   async generateAndStoreCvEmbedding(
      applicationId: number,
      text: string,
      embeddingType: EmbeddingType = EmbeddingType.CV_FULL_TEXT
   ): Promise<CvEmbeddingEntity> {
      const embeddingResult = await this.generateEmbedding(text);
      
      return this.storeEmbedding(
         text,
         embeddingResult.embedding,
         embeddingType,
         applicationId,
         undefined,
         embeddingResult.model,
         {
            tokenCount: embeddingResult.tokenCount,
            processingTime: embeddingResult.processingTimeMs,
         }
      );
   }

   /**
    * Generate and store job posting embedding
    */
   async generateAndStoreJobEmbedding(
      jobPostingId: number,
      text: string,
      embeddingType: EmbeddingType = EmbeddingType.JOB_DESCRIPTION
   ): Promise<CvEmbeddingEntity> {
      const embeddingResult = await this.generateEmbedding(text);
      
      return this.storeEmbedding(
         text,
         embeddingResult.embedding,
         embeddingType,
         undefined,
         jobPostingId,
         embeddingResult.model,
         {
            tokenCount: embeddingResult.tokenCount,
            processingTime: embeddingResult.processingTimeMs,
         }
      );
   }

   /**
    * Calculate similarity between CV and job posting using cosine similarity
    */
   async calculateSimilarity(
      applicationId: number,
      jobPostingId: number,
      embeddingType: EmbeddingType = EmbeddingType.CV_FULL_TEXT
   ): Promise<number> {
      try {
         // Get CV embedding
         const cvEmbedding = await this.embeddingRepository.findOne({
            where: {
               applicationId,
               embeddingType,
            },
         });

         if (!cvEmbedding) {
            throw new Error(`CV embedding not found for application ${applicationId}`);
         }

         // Get job posting embedding - Fixed to use correct parameter
         const jobEmbedding = await this.embeddingRepository.findOne({
            where: {
               jobPostingId,
               embeddingType: EmbeddingType.JOB_DESCRIPTION,
            },
         });

         if (!jobEmbedding) {
            throw new Error(`Job embedding not found for job posting ${jobPostingId}`);
         }

         // Calculate cosine similarity using pgvector <=> operator
         const result = await this.embeddingRepository.query(`
            SELECT 1 - (cv.embedding <=> job.embedding) as similarity
            FROM cv_embedding cv, cv_embedding job
            WHERE cv.embedding_id = $1 AND job.embedding_id = $2
         `, [cvEmbedding.embeddingId, jobEmbedding.embeddingId]);

         const similarity = parseFloat(result[0]?.similarity || '0');

         this.logger.log(`Calculated similarity: ${similarity} between application ${applicationId} and job ${jobPostingId}`);

         return Math.max(0, Math.min(1, similarity)); // Ensure similarity is between 0 and 1
      } catch (error) {
         this.logger.error(`Similarity calculation failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Find similar CVs to a job posting
    */
   async findSimilarCvs(
      jobPostingId: number,
      limit: number = 10,
      threshold: number = 0.7
   ): Promise<SimilarityResult[]> {
      try {
         // Get job posting embedding
         const jobEmbedding = await this.embeddingRepository.findOne({
            where: {
               jobPostingId,
               embeddingType: EmbeddingType.JOB_DESCRIPTION,
            },
         });

         if (!jobEmbedding) {
            throw new Error(`Job embedding not found for job posting ${jobPostingId}`);
         }

         // Find similar CV embeddings using cosine similarity
         const results = await this.embeddingRepository.query(`
            SELECT
               cv.embedding_id,
               cv.application_id,
               cv.embedding_type,
               cv.original_text,
               (1 - (cv.embedding <=> $1::vector)) as similarity
            FROM cv_embedding cv
            WHERE cv.application_id IS NOT NULL
               AND cv.embedding_type = $2
               AND (1 - (cv.embedding <=> $1::vector)) >= $3
            ORDER BY cv.embedding <=> $1::vector
            LIMIT $4
         `, [
            jobEmbedding.embedding,
            EmbeddingType.CV_FULL_TEXT,
            threshold,
            limit
         ]);

         return results.map((row: any) => ({
            similarity: parseFloat(row.similarity),
            embeddingId: row.embedding_id,
            applicationId: row.application_id,
            embeddingType: row.embedding_type,
            originalText: row.original_text,
         }));

      } catch (error) {
         this.logger.error(`Finding similar CVs failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Find similar job postings to a CV
    */
   async findSimilarJobs(
      applicationId: number,
      limit: number = 10,
      threshold: number = 0.7
   ): Promise<SimilarityResult[]> {
      try {
         // Get CV embedding
         const cvEmbedding = await this.embeddingRepository.findOne({
            where: {
               applicationId,
               embeddingType: EmbeddingType.CV_FULL_TEXT,
            },
         });

         if (!cvEmbedding) {
            throw new Error(`CV embedding not found for application ${applicationId}`);
         }

         // Find similar job embeddings using cosine similarity
         const results = await this.embeddingRepository.query(`
            SELECT
               job.embedding_id,
               job.job_posting_id,
               job.embedding_type,
               job.original_text,
               (1 - (job.embedding <=> $1::vector)) as similarity
            FROM cv_embedding job
            WHERE job.job_posting_id IS NOT NULL
               AND job.embedding_type = $2
               AND (1 - (job.embedding <=> $1::vector)) >= $3
            ORDER BY job.embedding <=> $1::vector
            LIMIT $4
         `, [
            cvEmbedding.embedding,
            EmbeddingType.JOB_DESCRIPTION,
            threshold,
            limit
         ]);

         return results.map((row: any) => ({
            similarity: parseFloat(row.similarity),
            embeddingId: row.embedding_id,
            jobPostingId: row.job_posting_id,
            embeddingType: row.embedding_type,
            originalText: row.original_text,
         }));

      } catch (error) {
         this.logger.error(`Finding similar jobs failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Ensure job embedding exists - create if missing
    * Fixed: Use jobPostingId instead of embeddingId parameter
    */
   async ensureJobEmbedding(
      jobPostingId: number,
      jobText: string,
      embeddingType: EmbeddingType = EmbeddingType.JOB_DESCRIPTION
   ): Promise<CvEmbeddingEntity> {
      try {
         // Check if embedding already exists
         const existingEmbedding = await this.embeddingRepository.findOne({
            where: {
               jobPostingId,
               embeddingType,
            },
         });

         if (existingEmbedding) {
            this.logger.log(`Job embedding already exists for job posting ${jobPostingId}`);
            return existingEmbedding;
         }

         // Generate and store new embedding
         this.logger.log(`Generating new job embedding for job posting ${jobPostingId}`);
         return this.generateAndStoreJobEmbedding(jobPostingId, jobText, embeddingType);
      } catch (error) {
         this.logger.error(`Failed to ensure job embedding: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Get embedding by ID
    */
   async getEmbedding(embeddingId: number): Promise<CvEmbeddingEntity | null> {
      return this.embeddingRepository.findOne({
         where: { embeddingId },
      });
   }

   /**
    * Delete embeddings for an application
    */
   async deleteApplicationEmbeddings(applicationId: number): Promise<void> {
      await this.embeddingRepository.delete({ applicationId });
      this.logger.log(`Deleted embeddings for application ${applicationId}`);
   }

   /**
    * Delete embeddings for a job posting
    */
   async deleteJobEmbeddings(jobPostingId: number): Promise<void> {
      await this.embeddingRepository.delete({ jobPostingId });
      this.logger.log(`Deleted embeddings for job posting ${jobPostingId}`);
   }



   /**
    * Truncate text to fit within token limits
    */
   private truncateText(text: string, maxTokens: number): string {
      // Rough estimation: 1 token ≈ 4 characters
      const maxChars = maxTokens * 4;

      if (text.length <= maxChars) {
         return text;
      }

      // Truncate and try to end at a word boundary
      const truncated = text.substring(0, maxChars);
      const lastSpaceIndex = truncated.lastIndexOf(' ');

      return lastSpaceIndex > maxChars * 0.8
         ? truncated.substring(0, lastSpaceIndex)
         : truncated;
   }
}
