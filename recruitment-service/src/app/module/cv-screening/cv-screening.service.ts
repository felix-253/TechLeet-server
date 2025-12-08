import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, DataSource } from 'typeorm';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import {
   CvApplicationNotFoundException,
   CvScreeningNotFoundException,
} from './exceptions/cv-screening.exceptions';
import { CvScreeningWorkerService } from './services/cv-screening-worker.service';
import { CvQueueService } from './services/cv-queue.service';
import { JobDescriptionUtil } from './utils';
import { ScoringService } from './services/scoring.service';
import { CvTextExtractionService } from './processors/cv-text-extraction.service';
import { CvNlpProcessingService, ProcessedCvData } from './processors/cv-nlp-processing.service';
import { CvLlmSummaryService } from './processors/cv-llm-summary.service';
import { AdaptiveThresholdService, IScreeningResult } from './services/adaptive-threshold.service';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import {
   ScreeningResultDto,
   GetScreeningResultsQueryDto,
   ScreeningStatsDto,
} from './cv-screening.dto';

@Injectable()
export class CvScreeningService {
   private readonly logger = new Logger(CvScreeningService.name);

   constructor(
      @InjectRepository(CvScreeningResultEntity)
      private readonly screeningRepository: Repository<CvScreeningResultEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      private readonly screeningWorker: CvScreeningWorkerService,
      private readonly queueService: CvQueueService,
      private readonly textExtractionService: CvTextExtractionService,
      private readonly nlpProcessingService: CvNlpProcessingService,
      private readonly llmSummaryService: CvLlmSummaryService,
      private readonly scoringService: ScoringService,
      private readonly adaptiveThresholdService: AdaptiveThresholdService,
      private readonly dataSource: DataSource,
   ) {}

   /**
    * Trigger CV screening for an application with validation
    * Uses pessimistic locking to prevent race conditions
    */
   async triggerScreening(
      applicationId: number,
      resumePath?: string,
      priority: number = 0
   ): Promise<ScreeningResultDto> {
      // Input validation (outside transaction)
      if (!applicationId || applicationId <= 0) {
         throw new BadRequestException('Invalid application ID provided');
      }

      if (priority < 0 || priority > 10) {
         throw new BadRequestException('Priority must be between 0 and 10');
      }

      this.logger.log(`Triggering CV screening for application ${applicationId} with priority ${priority}`);

      try {
         // Use transaction with pessimistic locking to prevent race conditions
         const result = await this.dataSource.transaction(async (manager) => {
            // Check if application exists
            const application = await manager.findOne(ApplicationEntity, {
               where: { applicationId },
            });

            if (!application) {
               throw new CvApplicationNotFoundException(applicationId);
            }

            if (!application.resumeUrl && !resumePath) {
               throw new BadRequestException(`No resume URL or path provided for application ${applicationId}`);
            }

            // Check if screening already exists with pessimistic lock to prevent duplicates
            const existingScreening = await manager.findOne(CvScreeningResultEntity, {
               where: { applicationId },
               lock: { mode: 'pessimistic_write' },
            });

            if (existingScreening && existingScreening.status !== ScreeningStatus.FAILED) {
               this.logger.warn(`Screening already exists for application ${applicationId} with status ${existingScreening.status}`);
               return { screening: existingScreening, shouldAddJob: false, application };
            }

            // If screening exists but failed, mark for retry
            if (existingScreening && existingScreening.status === ScreeningStatus.FAILED) {
               this.logger.log(`Retrying failed screening for application ${applicationId}`);
               existingScreening.status = ScreeningStatus.PENDING;
               const updatedScreening = await manager.save(existingScreening);
               return { screening: updatedScreening, shouldAddJob: true, shouldRetry: true, application };
            }

            // Create new screening record with PENDING status
            const screeningResult = manager.create(CvScreeningResultEntity, {
               applicationId,
               jobPostingId: application.jobPostingId,
               status: ScreeningStatus.PENDING,
            });
            const savedScreening = await manager.save(screeningResult);
            return { screening: savedScreening, shouldAddJob: true, shouldRetry: false, application };
         });

         // Add job to queue outside of transaction (queue is external system)
         if (result.shouldAddJob) {
            if (result.shouldRetry) {
               const retrySuccess = await this.queueService.retryFailedJobForApplication(applicationId);
               if (!retrySuccess) {
                  this.logger.warn(`Could not retry failed job for application ${applicationId}, creating new job instead`);
                  await this.addJobToQueue(applicationId, result.application, resumePath, priority);
               } else {
                  this.logger.log(`Successfully retried failed job for application ${applicationId}`);
               }
            } else {
               await this.addJobToQueue(applicationId, result.application, resumePath, priority);
            }
         }

         return this.mapToDto(result.screening);

      } catch (error) {
         this.logger.error(`Failed to trigger screening for application ${applicationId}: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Helper to add job to queue
    */
   private async addJobToQueue(
      applicationId: number,
      application: ApplicationEntity,
      resumePath: string | undefined,
      priority: number
   ): Promise<void> {
      const job = await this.queueService.addCvProcessingJob(
         {
            applicationId,
            jobPostingId: application.jobPostingId,
            resumeUrl: application.resumeUrl || '',
            resumePath,
            priority,
         },
         { priority }
      );
      this.logger.log(`CV screening job ${job.id} added to queue for application ${applicationId}`);
   }

   /**
    * Trigger bulk screening for multiple applications
    */
   async triggerBulkScreening(
      applicationIds: number[],
      priority: number = 0
   ) {
      const results: ScreeningResultDto[] = [];
      let triggered = 0;
      let failed = 0;

      for (const applicationId of applicationIds) {
         try {
            const result = await this.triggerScreening(applicationId, undefined, priority);
            results.push(result);
            triggered++;
         } catch (error) {
            this.logger.error(`Failed to trigger screening for application ${applicationId}: ${error.message}`);
            failed++;
         }
      }

      return {
         triggered,
         failed,
         results,
      };
   }

   /**
    * Get screening results with filtering and pagination
    */
   async getScreeningResults(query: GetScreeningResultsQueryDto) {
      const {
         page = 0,
         limit = 10,
         status,
         jobPostingId,
         minScore,
         maxScore,
         sortBy = 'createdAt',
         sortOrder = 'DESC',
      } = query;

      // Build where conditions using TypeORM query builder for complex conditions
      const queryBuilder = this.screeningRepository.createQueryBuilder('screening');

      if (status) {
         queryBuilder.andWhere('screening.status = :status', { status });
      }

      if (jobPostingId) {
         queryBuilder.andWhere('screening.jobPostingId = :jobPostingId', { jobPostingId });
      }

      if (minScore !== undefined && maxScore !== undefined) {
         queryBuilder.andWhere('screening.overallScore BETWEEN :minScore AND :maxScore', { minScore, maxScore });
      } else if (minScore !== undefined) {
         queryBuilder.andWhere('screening.overallScore >= :minScore', { minScore });
      } else if (maxScore !== undefined) {
         queryBuilder.andWhere('screening.overallScore <= :maxScore', { maxScore });
      }

      queryBuilder
         .skip(page * limit)
         .take(limit)
         .orderBy(`screening.${sortBy}`, sortOrder as 'ASC' | 'DESC');

      const [results, total] = await queryBuilder.getManyAndCount();

      return {
         data: results.map(result => this.mapToDto(result)),
         total,
         page,
         limit,
      };
   }

   /**
    * Get screening result by ID
    */
   async getScreeningResult(screeningId: number): Promise<ScreeningResultDto | null> {
      const result = await this.screeningRepository.findOne({
         where: { screeningId },
      });

      return result ? this.mapToDto(result) : null;
   }

   /**
    * Get screening result by application ID
    */
   async getScreeningByApplication(applicationId: number): Promise<ScreeningResultDto | null> {
      const result = await this.screeningRepository.findOne({
         where: { applicationId },
      });

      return result ? this.mapToDto(result) : null;
   }

   /**
    * Get screening statistics
    */
   async getScreeningStats(jobPostingId?: number): Promise<ScreeningStatsDto> {
      const whereCondition = jobPostingId ? { jobPostingId } : {};

      const [
         total,
         completed,
         pending,
         processing,
         failed,
         avgScoreResult,
         avgTimeResult,
      ] = await Promise.all([
         this.screeningRepository.count({ where: whereCondition }),
         this.screeningRepository.count({ where: { ...whereCondition, status: ScreeningStatus.COMPLETED } }),
         this.screeningRepository.count({ where: { ...whereCondition, status: ScreeningStatus.PENDING } }),
         this.screeningRepository.count({ where: { ...whereCondition, status: ScreeningStatus.PROCESSING } }),
         this.screeningRepository.count({ where: { ...whereCondition, status: ScreeningStatus.FAILED } }),
         this.screeningRepository
            .createQueryBuilder('screening')
            .select('AVG(screening.overallScore)', 'avg')
            .where(jobPostingId ? 'screening.jobPostingId = :jobPostingId' : '1=1', { jobPostingId })
            .andWhere('screening.overallScore IS NOT NULL')
            .getRawOne(),
         this.screeningRepository
            .createQueryBuilder('screening')
            .select('AVG(screening.processingTimeMs)', 'avg')
            .where(jobPostingId ? 'screening.jobPostingId = :jobPostingId' : '1=1', { jobPostingId })
            .andWhere('screening.processingTimeMs IS NOT NULL')
            .getRawOne(),
      ]);

      return {
         total,
         completed,
         pending,
         processing,
         failed,
         averageScore: parseFloat(avgScoreResult?.avg || '0'),
         averageProcessingTime: parseFloat(avgTimeResult?.avg || '0'),
      };
   }

   /**
    * Retry failed screening
    */
   async retryScreening(screeningId: number, force: boolean = false): Promise<ScreeningResultDto> {
      const screening = await this.screeningRepository.findOne({
         where: { screeningId },
      });

      if (!screening) {
         throw new CvScreeningNotFoundException(screeningId);
      }

      if (!force && screening.status !== ScreeningStatus.FAILED) {
         throw new BadRequestException(`Cannot retry screening with status ${screening.status}. Use force=true to override.`);
      }

      // Reset screening status
      await this.screeningRepository.update(screeningId, {
         status: ScreeningStatus.PENDING,
         errorMessage: undefined,
      });

      // Trigger new screening
      return this.triggerScreening(screening.applicationId);
   }

   /**
    * Cancel pending screening
    */
   async cancelScreening(screeningId: number): Promise<boolean> {
      const screening = await this.screeningRepository.findOne({
         where: { screeningId },
      });

      if (!screening) {
         throw new CvScreeningNotFoundException(screeningId);
      }

      if (screening.status === ScreeningStatus.COMPLETED) {
         throw new BadRequestException('Cannot cancel completed screening');
      }

      // Update status to cancelled (we can add this status to enum if needed)
      await this.screeningRepository.update(screeningId, {
         status: ScreeningStatus.FAILED,
         errorMessage: 'Cancelled by user',
      });

      return true;
   }

   /**
    * Get queue status
    */
   async getQueueStatus() {
      return this.queueService.getQueueStats();
   }

   /**
    * Test local CV screening (for development/testing)
    */
   async testLocalCvScreening(
      filePath: string,
      jobPostingId?: number,
      mockApplicationId?: number,
      modelConfig: 'gemini' | 'chatgpt' | 'deepseek' = 'gemini'
   ) {
      const startTime = Date.now();
      
      try {
         this.logger.log(`Testing CV screening with local file: ${filePath} using ${modelConfig} config`);

         // Get actual job posting if provided, otherwise use mock
         let jobPosting: JobPostingEntity;
         if (jobPostingId) {
            const actualJobPosting = await this.jobPostingRepository.findOne({
               where: { jobPostingId },
            });
            if (!actualJobPosting) {
               throw new Error(`Job posting ${jobPostingId} not found`);
            }
            jobPosting = actualJobPosting;
            this.logger.log(`Using actual job posting: ${jobPosting.title} (ID: ${jobPostingId})`);
         } else {
            jobPosting = this.getDefaultMockJobPosting();
            this.logger.log(`Using mock job posting for testing`);
         }
         
         // Step 1: Extract text
         const extractedText = await this.extractTextFromFile(filePath);
         
         // Step 2: Process with NLP
         const processedData = await this.processTextWithNlp(extractedText);
         
         // Step 3: Calculate scores using the same logic as production pipeline
         const scores = this.calculateTestScores(processedData, jobPosting, modelConfig);
         
         // Step 4: Generate AI summary (if configured) with specified model config
         const summary = await this.generateTestSummary(extractedText, processedData, jobPosting, modelConfig);
         
         // Override fitScore and recommendation with actual calculated scores (more accurate)
         const actualFitScore = scores.overallScore;
         const actualRecommendation = this.getRecommendationFromFitScore(
            actualFitScore,
            processedData.totalExperienceYears || 0,
            jobPosting.minExperience || 0
         );
         
         // Apply Adaptive Threshold if jobPostingId is provided (real job posting)
         let adaptiveThresholdResult: IScreeningResult | undefined = undefined;
         if (jobPostingId) {
            try {
               // Use raw score (0-100) for adaptive threshold
               const scoreForThreshold = actualFitScore;
               adaptiveThresholdResult = await this.adaptiveThresholdService.processNewCV(
                  jobPostingId,
                  scoreForThreshold
               );
               this.logger.log(
                  `[TEST] Adaptive Threshold: Score ${actualFitScore.toFixed(2)} → ${adaptiveThresholdResult.decision.toUpperCase()} | Threshold: ${adaptiveThresholdResult.newThreshold.toFixed(3)}`
               );
            } catch (adaptiveError) {
               this.logger.warn(
                  `[TEST] Adaptive Threshold failed: ${adaptiveError.message}`
               );
            }
         }
         
         // Update summary with calculated values
         const correctedSummary = {
            ...summary,
            fitScore: actualFitScore,
            recommendation: actualRecommendation,
         };
         
         const processingTime = Date.now() - startTime;
         
         this.logger.log(`Test CV screening completed in ${processingTime}ms using ${modelConfig}`);
         this.logger.log(
            `[TEST] Score Correction: AI fitScore=${summary.fitScore} → Actual=${actualFitScore.toFixed(1)}, Recommendation=${actualRecommendation}`
         );
         
         return {
            success: true,
            processingTimeMs: processingTime,
            extractedText: extractedText.substring(0, 500) + '...', // Truncate for response
            processedData: {
               skills: processedData.skills,
               experienceYears: processedData.totalExperienceYears,
               education: processedData.education,
               workExperience: processedData.workExperience?.slice(0, 2) // First 2 jobs
            },
            scores,
            summary: correctedSummary,
            adaptiveThreshold: adaptiveThresholdResult ? {
               decision: adaptiveThresholdResult.decision,
               threshold: adaptiveThresholdResult.newThreshold,
               mean: adaptiveThresholdResult.newState.mean,
               stdDev: Math.sqrt(adaptiveThresholdResult.newState.m2 / (adaptiveThresholdResult.newState.n - 1)) || 0,
               n: adaptiveThresholdResult.newState.n,
            } : undefined,
            testInfo: {
               filePath,
               jobPostingId: jobPostingId || 'mock',
               mockApplicationId: mockApplicationId || 9999,
               modelConfig
            }
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`Test CV screening failed after ${processingTime}ms: ${error.message}`, error.stack);
         
         return {
            success: false,
            processingTimeMs: processingTime,
            error: error.message,
            testInfo: {
               filePath,
               jobPostingId: jobPostingId || 'mock',
               mockApplicationId: mockApplicationId || 9999,
               modelConfig
            }
         };
      }
   }

   /**
    * Helper methods for testing
    */
   private async extractTextFromFile(filePath: string): Promise<string> {
      const result = await this.textExtractionService.extractTextFromPdf(filePath);
      return result.text;
   }

   private async processTextWithNlp(text: string) {
      return this.nlpProcessingService.processCvText(text);
   }

   private calculateTestScores(
      processedData: ProcessedCvData, 
      jobPosting: JobPostingEntity,
      modelConfig: 'gemini' | 'chatgpt' | 'deepseek' = 'gemini'
   ) {
      // Use the same scoring logic as production pipeline
      // Combine all skill types for better matching
      const allCvSkills = [
         ...(processedData.skills?.technical || []),
         ...(processedData.skills?.frameworks || []),
         ...(processedData.skills?.languages || []),
         ...(processedData.skills?.tools || []),
      ];
      const jobSkillsText = jobPosting.skills || '';
      
      this.logger.log(
         `[TEST SCORING] CV Total Skills (${allCvSkills.length}): Technical=${processedData.skills?.technical?.length || 0}, Frameworks=${processedData.skills?.frameworks?.length || 0}, Languages=${processedData.skills?.languages?.length || 0}, Tools=${processedData.skills?.tools?.length || 0}`
      );
      this.logger.log(
         `[TEST SCORING] CV Skills: [${allCvSkills.slice(0, 15).join(', ')}${allCvSkills.length > 15 ? '...' : ''}]`
      );
      this.logger.log(
         `[TEST SCORING] Job Required Skills: "${jobSkillsText}"`
      );
      
      const skillsScore = this.scoringService.calculateSkillsMatchScore(
         allCvSkills, 
         jobSkillsText
      );
      
      const experienceScore = this.scoringService.calculateExperienceMatchScore(
         processedData.totalExperienceYears || 0, 
         jobPosting.minExperience || 0, 
         jobPosting.maxExperience || 10
      );
      
      const cvEducation = processedData.education || [];
      const requiredEducation = jobPosting.educationLevel || '';
      
      this.logger.log(
         `[TEST SCORING] CV Education (${cvEducation.length} entries): ${cvEducation.map(e => `${e.degree || 'N/A'} ${e.field || ''} at ${e.institution || 'N/A'}`).join('; ')}`
      );
      this.logger.log(
         `[TEST SCORING] Job Required Education: "${requiredEducation}"`
      );
      
      const educationScore = this.scoringService.calculateEducationMatchScore(
         cvEducation, 
         requiredEducation
      );
      
      this.logger.log(
         `[TEST SCORING] Calculated Scores - Skills: ${(skillsScore * 100).toFixed(1)}%, Experience: ${(experienceScore * 100).toFixed(1)}%, Education: ${(educationScore * 100).toFixed(1)}%`
      );
      
      // Use a mock vector similarity for testing (since we don't have embeddings in test mode)
      // This simulates embedding similarity - you can adjust this based on your needs
      const mockVectorSimilarity = Math.min(0.95, 
         skillsScore * 0.7 + experienceScore * 0.2 + educationScore * 0.1
      );
      
      // Use the same calculateOverallScore method with cap logic
      const scores = this.scoringService.calculateOverallScore(
         mockVectorSimilarity,
         skillsScore,
         experienceScore,
         educationScore
      );
      
      // Apply model-specific score adjustments to simulate different models (only to overall)
      let scoreModifier = 1.0;
      if (modelConfig === 'chatgpt') {
         scoreModifier = 0.90 + (Math.random() * 0.05);
      } else if (modelConfig === 'deepseek') {
         scoreModifier = 0.85 + (Math.random() * 0.10);
      }
      
      // Only apply modifier to overall score, not individual scores
      scores.overallScore = Math.round(scores.overallScore * scoreModifier * 100) / 100;
      
      // Log experience gap for debugging
      const experienceGap = (jobPosting.minExperience || 0) - (processedData.totalExperienceYears || 0);
      if (experienceGap > 0) {
         this.logger.log(
            `[TEST] Experience gap: CV has ${processedData.totalExperienceYears || 0} years, required ${jobPosting.minExperience || 0}+ years (gap: ${experienceGap} years) → Experience Score: ${scores.experienceScore.toFixed(1)}%`
         );
      }
      
      return scores;
   }

   private async generateTestSummary(
      text: string, 
      processedData: any, 
      jobPosting: any,
      modelConfig: 'gemini' | 'chatgpt' | 'deepseek' = 'gemini'
   ) {
      try {
         // Use the actual AI service for better summary generation
         this.logger.log(`Generating AI summary for test CV using ${modelConfig} config`);
         
         const jobDescription = JobDescriptionUtil.createJobDescriptionText(jobPosting);
         const aiSummary = await this.llmSummaryService.generateCvSummary(
            text,
            processedData,
            jobDescription,
            modelConfig
         );
         
         return {
            summary: aiSummary.summary,
            highlights: aiSummary.keyHighlights,
            concerns: aiSummary.concerns,
            fitScore: aiSummary.fitScore,
            recommendation: aiSummary.recommendation,
            skillsAssessment: aiSummary.skillsAssessment,
            modelUsed: aiSummary.modelUsed
         };
      } catch (error) {
         this.logger.warn(`AI summary generation failed in test mode: ${error.message}`);
         
         // Enhanced fallback with actual data
         const experienceYears = processedData.totalExperienceYears || 0;
         const topSkills = processedData.skills?.technical?.slice(0, 5) || [];
         const education = processedData.education || [];
         
         return {
            summary: `${experienceYears > 0 ? `Experienced professional with ${experienceYears} years` : 'Professional candidate'} skilled in ${topSkills.slice(0, 3).join(', ')}${education.length > 0 ? ' with formal education background' : ''}. ${topSkills.length > 3 ? `Also proficient in ${topSkills.slice(3).join(', ')}.` : ''}`,
            highlights: [
               ...topSkills.slice(0, 3),
               ...(experienceYears >= 5 ? ['Senior level experience'] : experienceYears >= 2 ? ['Mid-level experience'] : []),
               ...(education.length > 0 ? ['Formal education'] : [])
            ],
            concerns: [
               ...(experienceYears < 2 ? ['Limited professional experience'] : []),
               ...(topSkills.length < 3 ? ['Limited technical skills mentioned'] : []),
               'AI summary not available - manual review recommended'
            ],
            fitScore: this.calculateBasicFitScore(processedData, jobPosting),
            recommendation: this.getRecommendationFromFitScore(
               this.calculateBasicFitScore(processedData, jobPosting),
               processedData.totalExperienceYears || 0,
               jobPosting.minExperience || 0
            )
         };
      }
   }


   /**
    * Calculate basic fit score when AI is not available
    * Uses the same logic as production pipeline with cap logic
    */
   private calculateBasicFitScore(processedData: ProcessedCvData, jobPosting: JobPostingEntity): number {
      // Combine all skill types for better matching
      const allCvSkills = [
         ...(processedData.skills?.technical || []),
         ...(processedData.skills?.frameworks || []),
         ...(processedData.skills?.languages || []),
         ...(processedData.skills?.tools || []),
      ];
      
      const skillsScore = this.scoringService.calculateSkillsMatchScore(
         allCvSkills, 
         jobPosting.skills || ''
      );
      const experienceScore = this.scoringService.calculateExperienceMatchScore(
         processedData.totalExperienceYears || 0, 
         jobPosting.minExperience || 0, 
         jobPosting.maxExperience || 10
      );
      const educationScore = this.scoringService.calculateEducationMatchScore(
         processedData.education || [], 
         jobPosting.educationLevel || ''
      );
      
      // Use mock vector similarity (simplified calculation)
      const mockVectorSimilarity = Math.min(0.95, 
         skillsScore * 0.7 + experienceScore * 0.2 + educationScore * 0.1
      );
      
      // Use the same calculateOverallScore method which includes cap logic
      const scores = this.scoringService.calculateOverallScore(
         mockVectorSimilarity,
         skillsScore,
         experienceScore,
         educationScore
      );
      
      return Math.round(scores.overallScore);
   }

   /**
    * Get recommendation based on fit score and experience match
    */
   private getRecommendationFromFitScore(
      fitScore: number,
      cvExperience: number,
      minRequired: number
   ): 'strong_fit' | 'good_fit' | 'moderate_fit' | 'poor_fit' {
      // Check for severe under-qualification first
      const experienceGap = minRequired - cvExperience;
      if (experienceGap > 3) {
         return 'poor_fit';
      }
      
      // Base recommendation on fit score
      if (fitScore >= 80) {
         return 'strong_fit';
      } else if (fitScore >= 65) {
         return 'good_fit';
      } else if (fitScore >= 50) {
         return 'moderate_fit';
      } else {
         return 'poor_fit';
      }
   }

   private getDefaultMockJobPosting(): JobPostingEntity {
      return {
         jobPostingId: 999,
         title: 'Software Engineer',
         skills: 'JavaScript, React, Node.js, TypeScript',
         minExperience: 2,
         maxExperience: 5,
         educationLevel: 'Bachelor degree',
         description: 'Test job posting for CV screening',
      } as JobPostingEntity;
   }


   /**
    * Reprocess all applications for a job posting
    */
   async reprocessJobApplications(jobPostingId: number) {
      const applications = await this.applicationRepository.find({
         where: { jobPostingId },
      });

      let screeningsTriggered = 0;

      for (const application of applications) {
         try {
            await this.triggerScreening(application.applicationId);
            screeningsTriggered++;
         } catch (error) {
            this.logger.error(`Failed to trigger screening for application ${application.applicationId}: ${error.message}`);
         }
      }

      return {
         jobPostingId,
         applicationsFound: applications.length,
         screeningsTriggered,
      };
   }

   /**
    * Map entity to DTO
    */
   private mapToDto(entity: CvScreeningResultEntity): ScreeningResultDto {
      return {
         screeningId: entity.screeningId,
         applicationId: entity.applicationId,
         jobPostingId: entity.jobPostingId,
         status: entity.status,
         overallScore: entity.overallScore,
         skillsScore: entity.skillsScore,
         experienceScore: entity.experienceScore,
         educationScore: entity.educationScore,
         aiSummary: entity.aiSummary,
         keyHighlights: entity.keyHighlights,
         concerns: entity.concerns,
         processingTimeMs: entity.processingTimeMs,
         errorMessage: entity.errorMessage,
         createdAt: entity.createdAt,
         updatedAt: entity.updatedAt,
         completedAt: entity.completedAt,
      };
   }
}
