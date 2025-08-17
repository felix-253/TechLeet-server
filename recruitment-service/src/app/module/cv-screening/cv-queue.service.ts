import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { createQueueOptions } from '../../../config/queue.config';

export enum QueueNames {
   CV_PROCESSING = 'cv-processing',
   SIMILARITY_CALCULATION = 'similarity-calculation',
   SUMMARY_GENERATION = 'summary-generation',
}

export enum JobTypes {
   EXTRACT_TEXT = 'extract-text',
   PROCESS_NLP = 'process-nlp',
   GENERATE_EMBEDDING = 'generate-embedding',
   CALCULATE_SIMILARITY = 'calculate-similarity',
   GENERATE_SUMMARY = 'generate-summary',
   COMPLETE_SCREENING = 'complete-screening',
}

export interface CvProcessingJobData {
   applicationId: number;
   jobPostingId: number;
   resumeUrl: string;
   resumePath?: string;
   priority?: number;
}

export interface SimilarityJobData {
   applicationId: number;
   jobPostingId: number;
   cvEmbeddingId: number;
   jobEmbeddingId: number;
}

export interface SummaryJobData {
   applicationId: number;
   jobPostingId: number;
   extractedText: string;
   processedData: any;
   jobDescription?: string;
}

@Injectable()
export class CvQueueService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(CvQueueService.name);
   
   // Queues
   private cvProcessingQueue: Queue;
   private similarityQueue: Queue;
   private summaryQueue: Queue;
   
   // Workers
   private cvProcessingWorker: Worker;
   private similarityWorker: Worker;
   private summaryWorker: Worker;

   constructor(private readonly configService: ConfigService) {}

   async onModuleInit() {
      await this.initializeQueues();
      await this.initializeWorkers();
      this.logger.log('CV Queue Service initialized successfully');
   }

   async onModuleDestroy() {
      await this.closeQueues();
      await this.closeWorkers();
      this.logger.log('CV Queue Service destroyed');
   }

   /**
    * Initialize all queues
    */
   private async initializeQueues() {
      const queueOptions = createQueueOptions(this.configService);

      this.cvProcessingQueue = new Queue(QueueNames.CV_PROCESSING, queueOptions);
      this.similarityQueue = new Queue(QueueNames.SIMILARITY_CALCULATION, queueOptions);
      this.summaryQueue = new Queue(QueueNames.SUMMARY_GENERATION, queueOptions);

      this.logger.log('Queues initialized');
   }

   /**
    * Initialize all workers
    */
   private async initializeWorkers() {
      const queueOptions = createQueueOptions(this.configService);

      // CV Processing Worker
      this.cvProcessingWorker = new Worker(
         QueueNames.CV_PROCESSING,
         async (job: Job) => {
            this.logger.log(`Processing CV job: ${job.id} - ${job.name}`);
            // Worker logic will be handled by the CV screening worker service
            return { processed: true, jobId: job.id };
         },
         {
            connection: queueOptions.connection,
            concurrency: 2, // Process 2 jobs concurrently
         }
      );

      // Similarity Calculation Worker
      this.similarityWorker = new Worker(
         QueueNames.SIMILARITY_CALCULATION,
         async (job: Job) => {
            this.logger.log(`Processing similarity job: ${job.id} - ${job.name}`);
            return { processed: true, jobId: job.id };
         },
         {
            connection: queueOptions.connection,
            concurrency: 3, // Higher concurrency for similarity calculations
         }
      );

      // Summary Generation Worker
      this.summaryWorker = new Worker(
         QueueNames.SUMMARY_GENERATION,
         async (job: Job) => {
            this.logger.log(`Processing summary job: ${job.id} - ${job.name}`);
            return { processed: true, jobId: job.id };
         },
         {
            connection: queueOptions.connection,
            concurrency: 1, // Lower concurrency for LLM calls to avoid rate limits
         }
      );

      // Add event listeners
      this.addEventListeners();

      this.logger.log('Workers initialized');
   }

   /**
    * Add event listeners for monitoring
    */
   private addEventListeners() {
      // CV Processing Queue Events
      this.cvProcessingWorker.on('completed', (job) => {
         this.logger.log(`CV processing job ${job.id} completed`);
      });

      this.cvProcessingWorker.on('failed', (job, err) => {
         this.logger.error(`CV processing job ${job?.id} failed: ${err.message}`);
      });

      // Similarity Queue Events
      this.similarityWorker.on('completed', (job) => {
         this.logger.log(`Similarity job ${job.id} completed`);
      });

      this.similarityWorker.on('failed', (job, err) => {
         this.logger.error(`Similarity job ${job?.id} failed: ${err.message}`);
      });

      // Summary Queue Events
      this.summaryWorker.on('completed', (job) => {
         this.logger.log(`Summary job ${job.id} completed`);
      });

      this.summaryWorker.on('failed', (job, err) => {
         this.logger.error(`Summary job ${job?.id} failed: ${err.message}`);
      });
   }

   /**
    * Add CV processing job to queue
    */
   async addCvProcessingJob(
      data: CvProcessingJobData,
      options?: {
         priority?: number;
         delay?: number;
         attempts?: number;
      }
   ): Promise<Job> {
      const job = await this.cvProcessingQueue.add(
         JobTypes.EXTRACT_TEXT,
         data,
         {
            priority: options?.priority || 0,
            delay: options?.delay || 0,
            attempts: options?.attempts || 3,
         }
      );

      this.logger.log(`Added CV processing job ${job.id} for application ${data.applicationId}`);
      return job;
   }

   /**
    * Add similarity calculation job to queue
    */
   async addSimilarityJob(
      data: SimilarityJobData,
      options?: {
         priority?: number;
         delay?: number;
      }
   ): Promise<Job> {
      const job = await this.similarityQueue.add(
         JobTypes.CALCULATE_SIMILARITY,
         data,
         {
            priority: options?.priority || 0,
            delay: options?.delay || 0,
         }
      );

      this.logger.log(`Added similarity job ${job.id} for application ${data.applicationId}`);
      return job;
   }

   /**
    * Add summary generation job to queue
    */
   async addSummaryJob(
      data: SummaryJobData,
      options?: {
         priority?: number;
         delay?: number;
      }
   ): Promise<Job> {
      const job = await this.summaryQueue.add(
         JobTypes.GENERATE_SUMMARY,
         data,
         {
            priority: options?.priority || 0,
            delay: options?.delay || 0,
         }
      );

      this.logger.log(`Added summary job ${job.id} for application ${data.applicationId}`);
      return job;
   }

   /**
    * Get queue statistics
    */
   async getQueueStats() {
      const [cvStats, similarityStats, summaryStats] = await Promise.all([
         this.getQueueCounts(this.cvProcessingQueue),
         this.getQueueCounts(this.similarityQueue),
         this.getQueueCounts(this.summaryQueue),
      ]);

      return {
         cvProcessing: cvStats,
         similarity: similarityStats,
         summary: summaryStats,
      };
   }

   /**
    * Get job by ID from any queue
    */
   async getJob(queueName: QueueNames, jobId: string): Promise<Job | null> {
      const queue = this.getQueueByName(queueName);
      return queue ? queue.getJob(jobId) : null;
   }

   /**
    * Cancel job by ID
    */
   async cancelJob(queueName: QueueNames, jobId: string): Promise<boolean> {
      const job = await this.getJob(queueName, jobId);
      if (job) {
         await job.remove();
         this.logger.log(`Cancelled job ${jobId} from queue ${queueName}`);
         return true;
      }
      return false;
   }

   /**
    * Pause/Resume queues
    */
   async pauseQueue(queueName: QueueNames): Promise<void> {
      const queue = this.getQueueByName(queueName);
      if (queue) {
         await queue.pause();
         this.logger.log(`Paused queue ${queueName}`);
      }
   }

   async resumeQueue(queueName: QueueNames): Promise<void> {
      const queue = this.getQueueByName(queueName);
      if (queue) {
         await queue.resume();
         this.logger.log(`Resumed queue ${queueName}`);
      }
   }

   /**
    * Helper methods
    */
   private async getQueueCounts(queue: Queue) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
         queue.getWaiting(),
         queue.getActive(),
         queue.getCompleted(),
         queue.getFailed(),
         queue.getDelayed(),
      ]);

      return {
         waiting: waiting.length,
         active: active.length,
         completed: completed.length,
         failed: failed.length,
         delayed: delayed.length,
      };
   }

   private getQueueByName(queueName: QueueNames): Queue | null {
      switch (queueName) {
         case QueueNames.CV_PROCESSING:
            return this.cvProcessingQueue;
         case QueueNames.SIMILARITY_CALCULATION:
            return this.similarityQueue;
         case QueueNames.SUMMARY_GENERATION:
            return this.summaryQueue;
         default:
            return null;
      }
   }

   private async closeQueues() {
      await Promise.all([
         this.cvProcessingQueue?.close(),
         this.similarityQueue?.close(),
         this.summaryQueue?.close(),
      ]);
   }

   private async closeWorkers() {
      await Promise.all([
         this.cvProcessingWorker?.close(),
         this.similarityWorker?.close(),
         this.summaryWorker?.close(),
      ]);
   }
}
