import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { createQueueOptions } from '../../../../config/queue.config';
import { CvScreeningWorkerService } from './cv-screening-worker.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
   
   // Worker health check
   private workerReady: boolean = false;
   private workerErrorCount: number = 0;
   private readonly MAX_WORKER_ERROR_COUNT = 5;

   constructor(
      private readonly configService: ConfigService,
      private readonly screeningWorkerService: CvScreeningWorkerService,
   ) {}

   async onModuleInit() {
      try {
         await this.initializeQueues();
         await this.initializeWorkers();
         this.logger.log('CV Queue Service initialized successfully');
         
         // Start monitoring for stuck jobs after a delay
         setTimeout(() => {
            this.checkAndRetryStuckJobs();
         }, 30000); // Check after 30 seconds
      } catch (error) {
         this.logger.error(`Failed to initialize CV Queue Service: ${error.message}`, error.stack);
         throw error;
      }
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

      // Add event listeners to queue to monitor job addition
      this.cvProcessingQueue.on('waiting', (job) => {
         this.logger.log(`📥 Job ${job.id} added to queue and waiting for processing (application ${job.data?.applicationId})`);
      });

      const redisConfig = queueOptions.connection as any;
      const redisHost = redisConfig.host || redisConfig.url || 'localhost';
      const redisPort = redisConfig.port || 6379;
      this.logger.log(`Queues initialized - Queue name: ${QueueNames.CV_PROCESSING}, Redis: ${redisHost}:${redisPort}`);
   }

   /**
    * Initialize all workers
    */
   private async initializeWorkers() {
      const queueOptions = createQueueOptions(this.configService);

      this.logger.log('Initializing CV Processing Worker...');

      // CV Processing Worker
      this.cvProcessingWorker = new Worker(
         QueueNames.CV_PROCESSING,
         async (job: Job) => {
            this.logger.log(`Processing CV job: ${job.id} - ${job.name} for application ${job.data.applicationId}`);
            
            try {
               // Execute the actual screening pipeline
               const result = await this.screeningWorkerService.executeScreeningPipeline(
                  job.data.applicationId,
                  job.data.resumePath
               );
               
               this.logger.log(`CV processing job ${job.id} completed successfully with score ${result.overallScore}`);
               return { 
                  processed: true, 
                  jobId: job.id,
                  screeningId: result.screeningId,
                  overallScore: result.overallScore,
                  status: result.status
               };
            } catch (error) {
               this.logger.error(`CV processing job ${job.id} failed: ${error.message}`, error.stack);
               throw error; // Re-throw to mark job as failed
            }
         },
         {
            connection: queueOptions.connection,
            concurrency: 2, // Process 2 jobs concurrently
            maxStalledCount: 2, // Mark as failed after 2 stalled attempts
            stalledInterval: 30000, // Check for stalled jobs every 30 seconds
            lockDuration: 300000, // 5 minutes lock duration
         }
      );

      // Add error handler for worker connection issues
      this.cvProcessingWorker.on('error', (error) => {
         this.workerErrorCount++;
         this.logger.error(`CV Processing Worker error (${this.workerErrorCount}/${this.MAX_WORKER_ERROR_COUNT}): ${error.message}`, error.stack);
         
         if (this.workerErrorCount >= this.MAX_WORKER_ERROR_COUNT) {
            this.logger.error('CV Processing Worker has exceeded maximum error count. Attempting to reconnect...');
            this.reconnectWorker();
         }
      });

      // Add event listeners for monitoring worker state
      this.cvProcessingWorker.on('ready', () => {
         this.workerReady = true;
         this.workerErrorCount = 0;
         this.logger.log(`✅ CV Processing Worker is ready and listening for jobs (Queue: ${QueueNames.CV_PROCESSING})`);
         
         // Log initial queue state
         this.logInitialQueueState();
         
         // Check for waiting jobs and log worker status
         this.checkWorkerStatus();
      });
      
      this.cvProcessingWorker.on('active', (job) => {
         this.logger.log(`🔄 CV Processing Worker: Job ${job.id} is now active for application ${job.data.applicationId}`);
      });

      this.cvProcessingWorker.on('progress', (job, progress) => {
         this.logger.log(`📈 CV Processing Worker: Job ${job.id} progress: ${JSON.stringify(progress)}`);
      });

      this.cvProcessingWorker.on('completed', (job) => {
         this.logger.log(`✅ CV Processing Worker: Job ${job.id} completed successfully`);
      });

      this.cvProcessingWorker.on('failed', (job, err) => {
         this.logger.error(`❌ CV Processing Worker: Job ${job?.id} failed: ${err.message}`);
      });

      this.cvProcessingWorker.on('stalled', (jobId) => {
         this.logger.warn(`⚠️ CV Processing Worker: Job ${jobId} stalled, will be retried`);
      });

      this.cvProcessingWorker.on('closing', () => {
         this.workerReady = false;
         this.logger.warn('CV Processing Worker is closing');
      });

      // Add event listeners
      this.addEventListeners();

      // Wait for worker to be ready
      await new Promise((resolve) => {
         if (this.workerReady) {
            resolve(undefined);
         } else {
            const checkReady = setInterval(() => {
               if (this.workerReady) {
                  clearInterval(checkReady);
                  resolve(undefined);
               }
            }, 1000);
            
            // Timeout after 10 seconds
            setTimeout(() => {
               clearInterval(checkReady);
               this.logger.warn('Worker ready check timed out, but continuing initialization');
               resolve(undefined);
            }, 10000);
         }
      });

      this.logger.log('Workers initialized');
   }

   /**
    * Add event listeners for monitoring
    */
   private addEventListeners() {
      // These listeners are already added in initializeWorkers
      // Keeping this method for potential future use
   }
   
   /**
    * Log initial queue state when worker is ready
    */
   private async logInitialQueueState() {
      try {
         const [waiting, active, delayed] = await Promise.all([
            this.cvProcessingQueue.getWaiting(),
            this.cvProcessingQueue.getActive(),
            this.cvProcessingQueue.getDelayed(),
         ]);
         
         this.logger.log(`📊 Queue state - Waiting: ${waiting.length}, Active: ${active.length}, Delayed: ${delayed.length}`);
         
         if (waiting.length > 0) {
            this.logger.log(`📋 Waiting jobs: ${waiting.map(j => `${j.id} (app ${j.data?.applicationId})`).join(', ')}`);
         }
         
         if (active.length > 0) {
            this.logger.log(`⚙️ Active jobs: ${active.map(j => `${j.id} (app ${j.data?.applicationId})`).join(', ')}`);
         }
      } catch (error) {
         this.logger.error(`Error logging initial queue state: ${error.message}`, error.stack);
      }
   }
   
   /**
    * Check worker status and verify it can process jobs
    */
   private async checkWorkerStatus() {
      try {
         // Verify queue connection
         const queueWaiting = await this.cvProcessingQueue.getWaitingCount();
         const queueActive = await this.cvProcessingQueue.getActiveCount();
         this.logger.log(`🔍 Worker status check - Ready: ${this.workerReady}, ErrorCount: ${this.workerErrorCount}, Waiting: ${queueWaiting}, Active: ${queueActive}`);
         
         // If there are waiting jobs but worker is ready, log a warning
         if (queueWaiting > 0 && this.workerReady && queueActive === 0) {
            this.logger.warn(`⚠️ Worker is ready but ${queueWaiting} job(s) are waiting and none are active. This may indicate a connection issue or worker is not processing jobs.`);
            
            // Try to get worker info
            if (this.cvProcessingWorker) {
               this.logger.log(`🔍 Worker instance exists: ${!!this.cvProcessingWorker}`);
            }
         }
      } catch (error) {
         this.logger.error(`Error checking worker status: ${error.message}`, error.stack);
      }
   }
   
   /**
    * Reconnect worker if it fails
    */
   private async reconnectWorker() {
      try {
         this.logger.log('Attempting to reconnect CV Processing Worker...');
         await this.cvProcessingWorker?.close();
         this.workerReady = false;
         this.workerErrorCount = 0;
         
         // Wait a bit before reconnecting
         await new Promise(resolve => setTimeout(resolve, 5000));
         
         await this.initializeWorkers();
         this.logger.log('CV Processing Worker reconnected successfully');
      } catch (error) {
         this.logger.error(`Failed to reconnect CV Processing Worker: ${error.message}`, error.stack);
      }
   }
   
   /**
    * Check for stuck jobs every 30 seconds
    */
   @Cron('*/30 * * * * *')
   async checkStuckJobsQuick() {
      try {
         if (!this.workerReady) {
            return;
         }

         const waitingJobs = await this.cvProcessingQueue.getWaiting();
         
         if (waitingJobs.length > 0) {
            const now = Date.now();
            for (const job of waitingJobs) {
               const waitTime = now - job.timestamp;
               const waitTimeSeconds = waitTime / 1000;
               
               if (waitTimeSeconds > 30) {
                  this.logger.warn(`⚠️ Job ${job.id} has been waiting for ${waitTimeSeconds.toFixed(2)} seconds. Checking worker status...`);
                  await this.checkWorkerStatus();
                  break; // Only check once per cycle
               }
            }
         }
      } catch (error) {
         this.logger.error(`Error in quick stuck jobs check: ${error.message}`, error.stack);
      }
   }

   /**
    * Check and retry stuck jobs periodically
    */
   @Cron(CronExpression.EVERY_5_MINUTES)
   async checkAndRetryStuckJobs() {
      try {
         if (!this.workerReady) {
            this.logger.warn('Worker is not ready, skipping stuck jobs check');
            return;
         }

         const waitingJobs = await this.cvProcessingQueue.getWaiting();
         const delayedJobs = await this.cvProcessingQueue.getDelayed();
         const failedJobs = await this.cvProcessingQueue.getFailed(0, 100);
         const activeJobs = await this.cvProcessingQueue.getActive();
         
         this.logger.log(`📊 Queue status - Waiting: ${waitingJobs.length}, Delayed: ${delayedJobs.length}, Failed: ${failedJobs.length}, Active: ${activeJobs.length}`);
         
         // Log details about waiting jobs
         if (waitingJobs.length > 0) {
            for (const job of waitingJobs) {
               const waitTime = Date.now() - job.timestamp;
               const waitTimeMinutes = waitTime / 60000;
               this.logger.log(`⏳ Waiting job ${job.id} for application ${job.data?.applicationId} - waiting for ${waitTimeMinutes.toFixed(2)} minutes`);
            }
         }
         
         // Log details about active jobs
         if (activeJobs.length > 0) {
            for (const job of activeJobs) {
               const activeTime = Date.now() - (job.processedOn || Date.now());
               const activeTimeMinutes = activeTime / 60000;
               this.logger.log(`⚙️ Active job ${job.id} for application ${job.data?.applicationId} - processing for ${activeTimeMinutes.toFixed(2)} minutes`);
            }
         }
         
         // Retry failed jobs that haven't exceeded max attempts
         for (const job of failedJobs) {
            const attemptsMade = job.attemptsMade || 0;
            const maxAttempts = job.opts?.attempts || 3;
            
            if (attemptsMade < maxAttempts) {
               this.logger.log(`🔄 Retrying failed job ${job.id} for application ${job.data?.applicationId} (attempt ${attemptsMade + 1}/${maxAttempts})`);
               await job.retry();
            } else {
               this.logger.warn(`🚫 Job ${job.id} has exceeded max attempts (${maxAttempts}), skipping retry`);
            }
         }
         
         // Check for jobs that have been waiting too long (more than 30 seconds)
         const now = Date.now();
         for (const job of waitingJobs) {
            const waitTime = now - job.timestamp;
            const waitTimeSeconds = waitTime / 1000;
            
            if (waitTimeSeconds > 30) {
               this.logger.warn(`⚠️ Job ${job.id} has been waiting for ${waitTimeSeconds.toFixed(2)} seconds. Worker may be stuck.`);
               
               // Try to manually trigger processing
               try {
                  const jobState = await job.getState();
                  this.logger.log(`Job ${job.id} current state: ${jobState}`);
                  
                  if (jobState === 'waiting') {
                     // Try to remove and re-add the job to force retry
                     this.logger.log(`Attempting to retry stuck job ${job.id} by removing and re-adding`);
                     const jobData = job.data;
                     await job.remove();
                     
                     // Re-add the job
                     await this.cvProcessingQueue.add(
                        JobTypes.EXTRACT_TEXT,
                        jobData,
                        {
                           priority: job.opts?.priority || 0,
                           attempts: job.opts?.attempts || 3,
                           backoff: {
                              type: 'exponential',
                              delay: 2000,
                           },
                        }
                     );
                     this.logger.log(`Re-added job ${job.id} to queue`);
                  }
               } catch (promoteError) {
                  this.logger.error(`Failed to retry stuck job ${job.id}: ${promoteError.message}`);
               }
            }
         }
      } catch (error) {
         this.logger.error(`Error checking stuck jobs: ${error.message}`, error.stack);
      }
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
      // Check if worker is ready before adding job
      if (!this.workerReady) {
         this.logger.warn('Worker is not ready, but adding job to queue anyway. Job will be processed when worker is ready.');
      }

      try {
         // Check current queue state before adding
         const [waitingBefore, activeBefore] = await Promise.all([
            this.cvProcessingQueue.getWaitingCount(),
            this.cvProcessingQueue.getActiveCount(),
         ]);

         const job = await this.cvProcessingQueue.add(
            JobTypes.EXTRACT_TEXT,
            data,
            {
               priority: options?.priority || 0,
               delay: options?.delay || 0,
               attempts: options?.attempts || 3,
               backoff: {
                  type: 'exponential',
                  delay: 2000, // Start with 2 second delay
               },
               removeOnComplete: {
                  age: 3600, // Keep completed jobs for 1 hour
                  count: 100, // Keep last 100 completed jobs
               },
               removeOnFail: {
                  age: 86400, // Keep failed jobs for 24 hours
                  count: 50, // Keep last 50 failed jobs
               },
               jobId: `cv-processing-${data.applicationId}-${Date.now()}`, // Unique job ID
            }
         );

         // Verify job was added
         const jobState = await job.getState();
         this.logger.log(`✅ Added CV processing job ${job.id} for application ${data.applicationId} (worker ready: ${this.workerReady}, job state: ${jobState}, queue: ${QueueNames.CV_PROCESSING})`);
         this.logger.log(`📊 Queue state - Waiting: ${waitingBefore} -> ${await this.cvProcessingQueue.getWaitingCount()}, Active: ${activeBefore} -> ${await this.cvProcessingQueue.getActiveCount()}`);

         // Check if job is actually in the queue and being processed
         setTimeout(async () => {
            try {
               const currentState = await job.getState();
               const [waiting, active] = await Promise.all([
                  this.cvProcessingQueue.getWaiting(),
                  this.cvProcessingQueue.getActive(),
               ]);
               const isInQueue = waiting.some(j => j.id === job.id) || active.some(j => j.id === job.id);
               
               this.logger.log(`🔍 Job ${job.id} status check after 5s - State: ${currentState}, InQueue: ${isInQueue}, Waiting: ${waiting.length}, Active: ${active.length}`);
               
               if (currentState === 'waiting' && !isInQueue) {
                  this.logger.warn(`⚠️ Job ${job.id} state is 'waiting' but not found in queue. This may indicate a Redis sync issue.`);
               } else if (currentState === 'waiting' && isInQueue) {
                  this.logger.warn(`⚠️ Job ${job.id} is still waiting after 5 seconds. Worker may not be processing jobs.`);
                  
                  // Check worker status
                  await this.checkWorkerStatus();
               } else if (currentState === 'active') {
                  this.logger.log(`✅ Job ${job.id} is now active and being processed`);
               }
            } catch (error) {
               this.logger.error(`Error checking job status: ${error.message}`, error.stack);
            }
         }, 5000);

         return job;
      } catch (error) {
         this.logger.error(`❌ Failed to add CV processing job for application ${data.applicationId}: ${error.message}`, error.stack);
         throw error;
      }
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
    * Retry failed job for a specific application
    */
   async retryFailedJobForApplication(applicationId: number): Promise<boolean> {
      try {
         const failedJobs = await this.cvProcessingQueue.getFailed(0, 100);
         const job = failedJobs.find(j => j.data?.applicationId === applicationId);
         
         if (!job) {
            this.logger.warn(`No failed job found for application ${applicationId}`);
            return false;
         }
         
         const attemptsMade = job.attemptsMade || 0;
         const maxAttempts = job.opts?.attempts || 3;
         
         if (attemptsMade >= maxAttempts) {
            this.logger.warn(`Job ${job.id} for application ${applicationId} has exceeded max attempts (${maxAttempts})`);
            return false;
         }
         
         await job.retry();
         this.logger.log(`Retried failed job ${job.id} for application ${applicationId}`);
         return true;
      } catch (error) {
         this.logger.error(`Error retrying failed job for application ${applicationId}: ${error.message}`, error.stack);
         return false;
      }
   }

   /**
    * Get worker health status
    */
   getWorkerHealthStatus() {
      return {
         ready: this.workerReady,
         errorCount: this.workerErrorCount,
         maxErrorCount: this.MAX_WORKER_ERROR_COUNT,
      };
   }

   /**
    * Manually trigger stuck jobs check
    */
   async manualCheckStuckJobs() {
      await this.checkAndRetryStuckJobs();
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
      await this.cvProcessingWorker?.close();
   }
}
