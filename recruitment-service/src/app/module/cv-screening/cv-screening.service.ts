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
import { ScoringService } from './services/scoring.service';
import { CvTextExtractionService } from './processors/cv-text-extraction.service';
import { CvNlpProcessingService, ProcessedCvData } from './processors/cv-nlp-processing.service';
import { CvLlmSummaryService } from './processors/cv-llm-summary.service';
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
      private readonly screeningWorker: CvScreeningWorkerService,
      private readonly queueService: CvQueueService,
      private readonly textExtractionService: CvTextExtractionService,
      private readonly nlpProcessingService: CvNlpProcessingService,
      private readonly llmSummaryService: CvLlmSummaryService,
      private readonly scoringService: ScoringService,
      private readonly dataSource: DataSource,
   ) {}

   /**
    * Trigger CV screening for an application with validation
    */
   async triggerScreening(
      applicationId: number,
      resumePath?: string,
      priority: number = 0
   ): Promise<ScreeningResultDto> {
      try {
         // Input validation
         if (!applicationId || applicationId <= 0) {
            throw new BadRequestException('Invalid application ID provided');
         }

         if (priority < 0 || priority > 10) {
            throw new BadRequestException('Priority must be between 0 and 10');
         }

         this.logger.log(`Triggering CV screening for application ${applicationId} with priority ${priority}`);

         // Check if application exists
         const application = await this.applicationRepository.findOne({
            where: { applicationId },
         });

         if (!application) {
            throw new CvApplicationNotFoundException(applicationId);
         }

         if (!application.resumeUrl && !resumePath) {
            throw new BadRequestException(`No resume URL or path provided for application ${applicationId}`);
         }

         // Check if screening already exists and is not failed
         const existingScreening = await this.screeningRepository.findOne({
            where: { applicationId },
         });

         if (existingScreening && existingScreening.status !== ScreeningStatus.FAILED) {
            this.logger.warn(`Screening already exists for application ${applicationId} with status ${existingScreening.status}`);
            return this.mapToDto(existingScreening);
         }

         // Add to queue for processing
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

         // Create initial screening record with PENDING status
         let screeningResult = await this.screeningRepository.findOne({
            where: { applicationId },
         });

         if (!screeningResult) {
            screeningResult = this.screeningRepository.create({
               applicationId,
               jobPostingId: application.jobPostingId,
               status: ScreeningStatus.PENDING,
            });
            screeningResult = await this.screeningRepository.save(screeningResult);
         }

         return this.mapToDto(screeningResult);

      } catch (error) {
         this.logger.error(`Failed to trigger screening for application ${applicationId}: ${error.message}`, error.stack);
         throw error;
      }
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

         // Use mock job posting for testing
         const mockJobPosting = this.getDefaultMockJobPosting();
         
         // Step 1: Extract text
         const extractedText = await this.extractTextFromFile(filePath);
         
         // Step 2: Process with NLP
         const processedData = await this.processTextWithNlp(extractedText);
         
         // Step 3: Calculate scores (simplified for testing) with model-specific adjustments
         const scores = this.calculateTestScores(processedData, mockJobPosting, modelConfig);
         
         // Step 4: Generate AI summary (if configured) with specified model config
         const summary = await this.generateTestSummary(extractedText, processedData, mockJobPosting, modelConfig);
         
         const processingTime = Date.now() - startTime;
         
         this.logger.log(`Test CV screening completed in ${processingTime}ms using ${modelConfig}`);
         
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
            summary,
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
      // Simplified scoring for testing using ScoringService
      const skillsScore = this.scoringService.calculateSkillsMatchScore(processedData.skills?.technical || [], jobPosting.skills || '');
      const experienceScore = this.scoringService.calculateExperienceMatchScore(processedData.totalExperienceYears, jobPosting.minExperience || 0, jobPosting.maxExperience || 10);
      const educationScore = this.scoringService.calculateEducationMatchScore(processedData.education || [], jobPosting.educationLevel || '');
      
      const baseOverallScore = (skillsScore * 0.4 + experienceScore * 0.3 + educationScore * 0.3) * 100;
      
      // Apply model-specific score adjustments to simulate different models
      let scoreModifier = 1.0;
      if (modelConfig === 'chatgpt') {
         // ChatGPT: slightly lower scores (90-95% of original)
         scoreModifier = 0.90 + (Math.random() * 0.05);
      } else if (modelConfig === 'deepseek') {
         // DeepSeek: more variation (85-95% of original)
         scoreModifier = 0.85 + (Math.random() * 0.10);
      }
      // Gemini keeps original scores (modifier = 1.0)
      
      const overallScore = baseOverallScore * scoreModifier;
      
      return {
         overallScore: Math.ceil(overallScore),
         skillsScore: Math.ceil(skillsScore * 100 * scoreModifier),
         experienceScore: Math.ceil(experienceScore * 100 * scoreModifier),
         educationScore: Math.ceil(educationScore * 100 * scoreModifier)
      };
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
         
         const jobDescription = this.createJobDescriptionText(jobPosting);
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
            recommendation: experienceYears >= 3 ? 'good_fit' : experienceYears >= 1 ? 'moderate_fit' : 'poor_fit'
         };
      }
   }

   /**
    * Create job description text for AI processing
    */
   private createJobDescriptionText(jobPosting: JobPostingEntity): string {
      const parts = [
         `Job Title: ${jobPosting.title || 'Software Engineer'}`,
         `Description: ${jobPosting.description || 'Software development position'}`,
         `Requirements: ${jobPosting.requirements || 'Software development skills required'}`,
         `Skills: ${jobPosting.skills || 'Programming skills'}`,
         `Experience Level: ${jobPosting.experienceLevel || `${jobPosting.minExperience || 2}-${jobPosting.maxExperience || 5} years`}`,
         `Education: ${jobPosting.educationLevel || 'Bachelor degree preferred'}`,
      ];

      return parts.filter(part => part.split(': ')[1] && part.split(': ')[1] !== 'undefined').join('\n');
   }

   /**
    * Calculate basic fit score when AI is not available
    */
   private calculateBasicFitScore(processedData: ProcessedCvData, jobPosting: JobPostingEntity): number {
      const skillsScore = this.scoringService.calculateSkillsMatchScore(processedData.skills?.technical || [], jobPosting.skills || '');
      const experienceScore = this.scoringService.calculateExperienceMatchScore(
         processedData.totalExperienceYears || 0, 
         jobPosting.minExperience || 0, 
         jobPosting.maxExperience || 10
      );
      const educationScore = this.scoringService.calculateEducationMatchScore(processedData.education || [], jobPosting.educationLevel || '');
      
      return Math.round((skillsScore * 0.4 + experienceScore * 0.4 + educationScore * 0.2) * 100);
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
