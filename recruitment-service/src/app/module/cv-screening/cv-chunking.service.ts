import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pgvector from 'pgvector';
import { CvEmbeddingChunkEntity } from '../../../entities/recruitment/cv-embedding-chunk.entity';
import { CvEmbeddingService } from './cv-embedding.service';

export interface ChunkConfig {
   maxChunkSize: number;
   overlapSize: number;
   minChunkSize: number;
}

export interface ChunkData {
   text: string;
   startPosition: number;
   endPosition: number;
   chunkIndex: number;
   metadata?: any;
}

export interface ChunkSimilarityResult {
   chunkId: number;
   applicationId: number;
   chunkIndex: number;
   similarity: number;
   chunkText: string;
   startPosition: number;
   endPosition: number;
}

@Injectable()
export class CvChunkingService {
   private readonly logger = new Logger(CvChunkingService.name);
   
   private readonly defaultConfig: ChunkConfig = {
      maxChunkSize: 1200,
      overlapSize: 100,
      minChunkSize: 200,
   };

   constructor(
      @InjectRepository(CvEmbeddingChunkEntity)
      private readonly chunkRepository: Repository<CvEmbeddingChunkEntity>,
      @Inject(forwardRef(() => CvEmbeddingService))
      private readonly embeddingService: CvEmbeddingService,
   ) {}

   /**
    * Split CV text into overlapping chunks
    */
   chunkText(text: string, config: Partial<ChunkConfig> = {}): ChunkData[] {
      const finalConfig = { ...this.defaultConfig, ...config };
      const chunks: ChunkData[] = [];
      
      if (!text || text.trim().length === 0) {
         return chunks;
      }

      const cleanedText = text.trim();
      let currentPosition = 0;
      let chunkIndex = 0;

      while (currentPosition < cleanedText.length) {
         const remainingText = cleanedText.length - currentPosition;
         
         // Determine chunk size
         let chunkSize = Math.min(finalConfig.maxChunkSize, remainingText);
         
         // If this would be a very small final chunk, merge it with the current chunk
         if (remainingText <= finalConfig.maxChunkSize + finalConfig.minChunkSize) {
            chunkSize = remainingText;
         }

         let endPosition = currentPosition + chunkSize;
         let chunkText = cleanedText.substring(currentPosition, endPosition);

         // Try to end at a sentence boundary
         if (endPosition < cleanedText.length) {
            const sentenceEnd = this.findSentenceBoundary(chunkText);
            if (sentenceEnd > chunkSize * 0.7) { // Don't cut too short
               endPosition = currentPosition + sentenceEnd;
               chunkText = cleanedText.substring(currentPosition, endPosition);
            }
         }

         // Try to end at a word boundary if no sentence boundary found
         if (endPosition < cleanedText.length && !chunkText.endsWith('.') && !chunkText.endsWith('!') && !chunkText.endsWith('?')) {
            const lastSpaceIndex = chunkText.lastIndexOf(' ');
            if (lastSpaceIndex > chunkSize * 0.8) { // Don't cut too short
               endPosition = currentPosition + lastSpaceIndex;
               chunkText = cleanedText.substring(currentPosition, endPosition);
            }
         }

         chunks.push({
            text: chunkText.trim(),
            startPosition: currentPosition,
            endPosition: endPosition,
            chunkIndex: chunkIndex++,
            metadata: {
               originalLength: text.length,
               chunkLength: chunkText.length,
               overlapWithPrevious: currentPosition > 0 ? finalConfig.overlapSize : 0,
               overlapWithNext: endPosition < cleanedText.length ? finalConfig.overlapSize : 0,
            },
         });

         // Move to next chunk with overlap
         if (endPosition >= cleanedText.length) {
            break;
         }
         
         currentPosition = Math.max(
            endPosition - finalConfig.overlapSize,
            currentPosition + finalConfig.minChunkSize
         );
      }

      this.logger.log(`Split text into ${chunks.length} chunks. Original length: ${text.length}, Total chunk length: ${chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)}`);
      
      return chunks;
   }

   /**
    * Generate embeddings for all chunks of a CV
    */
   async generateAndStoreChunkEmbeddings(
      applicationId: number,
      cvText: string,
      config: Partial<ChunkConfig> = {}
   ): Promise<CvEmbeddingChunkEntity[]> {
      try {
         // Delete existing chunks for this application
         await this.deleteApplicationChunks(applicationId);

         // Split text into chunks
         const chunks = this.chunkText(cvText, config);
         
         if (chunks.length === 0) {
            this.logger.warn(`No chunks generated for application ${applicationId}`);
            return [];
         }

         const results: CvEmbeddingChunkEntity[] = [];

         // Generate embeddings for each chunk
         for (const chunk of chunks) {
            try {
               const embeddingResult = await this.embeddingService.generateEmbedding(chunk.text);
               
               // Store chunk with embedding using raw SQL for vector support
               const query = `
                  INSERT INTO cv_embedding_chunk (
                     application_id, chunk_index, chunk_text, start_position, end_position,
                     embedding, model, dimensions, metadata, created_at, updated_at
                  ) VALUES (
                     $1, $2, $3, $4, $5, $6::vector, $7, $8, $9, NOW(), NOW()
                  )
                  RETURNING *
               `;

               const result = await this.chunkRepository.query(query, [
                  applicationId,
                  chunk.chunkIndex,
                  chunk.text,
                  chunk.startPosition,
                  chunk.endPosition,
                  pgvector.toSql(embeddingResult.embedding),
                  embeddingResult.model,
                  embeddingResult.dimensions,
                  JSON.stringify({
                     ...chunk.metadata,
                     tokenCount: embeddingResult.tokenCount,
                     processingTime: embeddingResult.processingTimeMs,
                  }),
               ]);

               const savedChunk = this.chunkRepository.create({
                  chunkId: result[0].chunk_id,
                  applicationId: result[0].application_id,
                  chunkIndex: result[0].chunk_index,
                  chunkText: result[0].chunk_text,
                  startPosition: result[0].start_position,
                  endPosition: result[0].end_position,
                  embedding: result[0].embedding,
                  model: result[0].model,
                  dimensions: result[0].dimensions,
                  metadata: result[0].metadata,
                  createdAt: result[0].created_at,
                  updatedAt: result[0].updated_at,
               });

               results.push(savedChunk);
               
               this.logger.log(`Generated embedding for chunk ${chunk.chunkIndex} (${chunk.text.length} chars) for application ${applicationId}`);
               
            } catch (error) {
               this.logger.error(`Failed to generate embedding for chunk ${chunk.chunkIndex}: ${error.message}`, error.stack);
               // Continue with other chunks
            }
         }

         this.logger.log(`Generated ${results.length}/${chunks.length} chunk embeddings for application ${applicationId}`);
         return results;

      } catch (error) {
         this.logger.error(`Failed to generate chunk embeddings for application ${applicationId}: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Calculate maximum similarity between job and CV chunks
    */
   async calculateMaxChunkSimilarity(
      applicationId: number,
      jobPostingId: number,
      topK: number = 3
   ): Promise<number> {
      try {
         // Get job embedding
         const jobEmbedding = await this.embeddingService.getEmbedding(jobPostingId);
         if (!jobEmbedding) {
            throw new Error(`Job embedding not found for job posting ${jobPostingId}`);
         }

         // Find top-k most similar chunks
         const results = await this.chunkRepository.query(`
            SELECT 
               chunk_id,
               chunk_index,
               (1 - (embedding <=> $1::vector)) as similarity
            FROM cv_embedding_chunk
            WHERE application_id = $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
         `, [jobEmbedding.embedding, applicationId, topK]);

         if (results.length === 0) {
            this.logger.warn(`No chunks found for application ${applicationId}`);
            return 0;
         }

         // Calculate maximum similarity (best matching chunk)
         const maxSimilarity = Math.max(...results.map(r => parseFloat(r.similarity)));
         
         // Optionally, calculate average of top-k
         const avgTopK = results.reduce((sum, r) => sum + parseFloat(r.similarity), 0) / results.length;
         
         this.logger.log(`Max chunk similarity: ${maxSimilarity}, Avg top-${topK}: ${avgTopK} for application ${applicationId} vs job ${jobPostingId}`);
         
         return maxSimilarity;

      } catch (error) {
         this.logger.error(`Failed to calculate chunk similarity: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Find most similar chunks to a job posting
    */
   async findSimilarChunks(
      jobPostingId: number,
      limit: number = 10,
      threshold: number = 0.7
   ): Promise<ChunkSimilarityResult[]> {
      try {
         // Get job embedding
         const jobEmbedding = await this.embeddingService.getEmbedding(jobPostingId);
         if (!jobEmbedding) {
            throw new Error(`Job embedding not found for job posting ${jobPostingId}`);
         }

         // Find similar chunks
         const results = await this.chunkRepository.query(`
            SELECT
               chunk_id,
               application_id,
               chunk_index,
               chunk_text,
               start_position,
               end_position,
               (1 - (embedding <=> $1::vector)) as similarity
            FROM cv_embedding_chunk
            WHERE (1 - (embedding <=> $1::vector)) >= $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
         `, [jobEmbedding.embedding, threshold, limit]);

         return results.map((row: any) => ({
            chunkId: row.chunk_id,
            applicationId: row.application_id,
            chunkIndex: row.chunk_index,
            similarity: parseFloat(row.similarity),
            chunkText: row.chunk_text,
            startPosition: row.start_position,
            endPosition: row.end_position,
         }));

      } catch (error) {
         this.logger.error(`Finding similar chunks failed: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Delete all chunks for an application
    */
   async deleteApplicationChunks(applicationId: number): Promise<void> {
      await this.chunkRepository.delete({ applicationId });
      this.logger.log(`Deleted chunks for application ${applicationId}`);
   }

   /**
    * Get chunks for an application
    */
   async getApplicationChunks(applicationId: number): Promise<CvEmbeddingChunkEntity[]> {
      return this.chunkRepository.find({
         where: { applicationId },
         order: { chunkIndex: 'ASC' },
      });
   }

   /**
    * Find sentence boundary for better chunking
    */
   private findSentenceBoundary(text: string): number {
      const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
      let lastSentenceEnd = -1;

      for (const ender of sentenceEnders) {
         const index = text.lastIndexOf(ender);
         if (index > lastSentenceEnd) {
            lastSentenceEnd = index + ender.length;
         }
      }

      return lastSentenceEnd > 0 ? lastSentenceEnd : text.length;
   }
}
