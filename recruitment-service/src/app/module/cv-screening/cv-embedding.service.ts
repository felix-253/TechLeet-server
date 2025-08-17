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

@Injectable()
export class CvEmbeddingService {
   private readonly logger = new Logger(CvEmbeddingService.name);
   private readonly genAI: GoogleGenerativeAI;
   private readonly defaultModel = 'text-embedding-004';
   private readonly defaultDimensions = 768;

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
    * Generate embedding for text using Google Gemini
    */
   async generateEmbedding(
      text: string,
      model: string = this.defaultModel,
      dimensions: number = this.defaultDimensions
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
    * Store embedding in database
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
         const embeddingEntity = this.embeddingRepository.create({
            applicationId,
            jobPostingId,
            embeddingType,
            originalText: text,
            embedding: pgvector.toSql(embedding),
            model,
            dimensions: embedding.length,
            metadata,
         });

         const savedEmbedding = await this.embeddingRepository.save(embeddingEntity);

         this.logger.log(`Embedding stored with ID: ${savedEmbedding.embeddingId}`);

         return savedEmbedding;
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
    * Calculate similarity between CV and job posting using pgvector
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

         // Calculate cosine similarity using pgvector
         const result = await this.embeddingRepository.query(`
            SELECT (cv.embedding <-> job.embedding) as distance
            FROM cv_embedding cv, cv_embedding job
            WHERE cv.embedding_id = $1 AND job.embedding_id = $2
         `, [cvEmbedding.embeddingId, jobEmbedding.embeddingId]);

         // Convert distance to similarity (cosine distance = 1 - cosine similarity)
         const distance = parseFloat(result[0]?.distance || '1');
         const similarity = 1 - distance;

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

         // Find similar CV embeddings using pgvector
         const results = await this.embeddingRepository.query(`
            SELECT
               cv.embedding_id,
               cv.application_id,
               cv.embedding_type,
               cv.original_text,
               (1 - (cv.embedding <-> $1)) as similarity
            FROM cv_embedding cv
            WHERE cv.application_id IS NOT NULL
               AND cv.embedding_type = $2
               AND (1 - (cv.embedding <-> $1)) >= $3
            ORDER BY cv.embedding <-> $1
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

         // Find similar job embeddings using pgvector
         const results = await this.embeddingRepository.query(`
            SELECT
               job.embedding_id,
               job.job_posting_id,
               job.embedding_type,
               job.original_text,
               (1 - (job.embedding <-> $1)) as similarity
            FROM cv_embedding job
            WHERE job.job_posting_id IS NOT NULL
               AND job.embedding_type = $2
               AND (1 - (job.embedding <-> $1)) >= $3
            ORDER BY job.embedding <-> $1
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
