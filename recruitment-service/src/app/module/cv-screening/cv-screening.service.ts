import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CvScreeningWorkerService } from './cv-screening-worker.service';
import { CvQueueService } from './cv-queue.service';
import { CvTextExtractionService } from './cv-text-extraction.service';
import { CvNlpProcessingService } from './cv-nlp-processing.service';
import { CvLlmSummaryService } from './cv-llm-summary.service';
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
            throw new BadRequestException(`Application ${applicationId} not found`);
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

      const findOptions: FindManyOptions<CvScreeningResultEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
      };

      // Build where conditions
      const whereConditions: any = {};

      if (status) {
         whereConditions.status = status;
      }

      if (jobPostingId) {
         whereConditions.jobPostingId = jobPostingId;
      }

      if (minScore !== undefined) {
         whereConditions.overallScore = { $gte: minScore };
      }

      if (maxScore !== undefined) {
         if (whereConditions.overallScore) {
            whereConditions.overallScore.$lte = maxScore;
         } else {
            whereConditions.overallScore = { $lte: maxScore };
         }
      }

      if (Object.keys(whereConditions).length > 0) {
         findOptions.where = whereConditions;
      }

      const [results, total] = await this.screeningRepository.findAndCount(findOptions);

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
         throw new NotFoundException(`Screening ${screeningId} not found`);
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
         throw new NotFoundException(`Screening ${screeningId} not found`);
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
      mockApplicationId?: number
   ) {
      const startTime = Date.now();
      
      try {
         this.logger.log(`Testing CV screening with local file: ${filePath}`);

         // Use the screening worker directly for testing
         const mockJobPosting = jobPostingId ? await this.getMockJobPosting(jobPostingId) : this.getDefaultMockJobPosting();
         
         // Step 1: Extract text
         const extractedText = await this.extractTextFromFile(filePath);
         
         // Step 2: Process with NLP
         const processedData = await this.processTextWithNlp(extractedText);
         
         // Step 3: Calculate scores (simplified for testing)
         const scores = this.calculateTestScores(processedData, mockJobPosting);
         
         // Step 4: Generate AI summary (if configured)
         const summary = await this.generateTestSummary(extractedText, processedData, mockJobPosting);
         
         const processingTime = Date.now() - startTime;
         
         this.logger.log(`Test CV screening completed in ${processingTime}ms`);
         
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
               mockApplicationId: mockApplicationId || 9999
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
               mockApplicationId: mockApplicationId || 9999
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

   private calculateTestScores(processedData: any, jobPosting: any) {
      // Simplified scoring for testing
      const skillsScore = this.calculateSkillsMatch(processedData.skills?.technical || [], jobPosting.skills);
      const experienceScore = this.calculateExperienceMatch(processedData.totalExperienceYears, jobPosting.minExperience, jobPosting.maxExperience);
      const educationScore = this.calculateEducationMatch(processedData.education || [], jobPosting.educationLevel);
      
      const overallScore = (skillsScore * 0.4 + experienceScore * 0.3 + educationScore * 0.3) * 100;
      
      return {
         overallScore: Math.round(overallScore * 100) / 100,
         skillsScore: Math.round(skillsScore * 100 * 100) / 100,
         experienceScore: Math.round(experienceScore * 100 * 100) / 100,
         educationScore: Math.round(educationScore * 100 * 100) / 100
      };
   }

   private async generateTestSummary(text: string, processedData: any, jobPosting: any) {
      try {
         // Use the actual AI service for better summary generation
         this.logger.log('Generating AI summary for test CV');
         
         const jobDescription = this.createJobDescriptionText(jobPosting);
         const aiSummary = await this.llmSummaryService.generateCvSummary(
            text,
            processedData,
            jobDescription
         );
         
         return {
            summary: aiSummary.summary,
            highlights: aiSummary.keyHighlights,
            concerns: aiSummary.concerns,
            fitScore: aiSummary.fitScore,
            recommendation: aiSummary.recommendation,
            skillsAssessment: aiSummary.skillsAssessment
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
   private createJobDescriptionText(jobPosting: any): string {
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
   private calculateBasicFitScore(processedData: any, jobPosting: any): number {
      const skillsScore = this.calculateSkillsMatch(processedData.skills?.technical || [], jobPosting.skills || '');
      const experienceScore = this.calculateExperienceMatch(
         processedData.totalExperienceYears || 0, 
         jobPosting.minExperience || 0, 
         jobPosting.maxExperience || 10
      );
      const educationScore = this.calculateEducationMatch(processedData.education || [], jobPosting.educationLevel || '');
      
      return Math.round((skillsScore * 0.4 + experienceScore * 0.4 + educationScore * 0.2) * 100);
   }

   private async getMockJobPosting(jobPostingId: number) {
      // Try to get real job posting, fallback to mock
      try {
         const jobPosting = await this.getJobPostingById(jobPostingId);
         return jobPosting || this.getDefaultMockJobPosting();
      } catch {
         return this.getDefaultMockJobPosting();
      }
   }

   private getDefaultMockJobPosting() {
      return {
         jobPostingId: 999,
         title: 'Software Engineer',
         skills: 'JavaScript, React, Node.js, TypeScript',
         minExperience: 2,
         maxExperience: 5,
         educationLevel: 'Bachelor degree',
         description: 'Test job posting for CV screening'
      };
   }

   private async getJobPostingById(jobPostingId: number) {
      // This would normally fetch from job posting repository
      // For now, return null to use mock
      return null;
   }

   private calculateSkillsMatch(cvSkills: string[], jobSkills: string): number {
      if (!jobSkills || cvSkills.length === 0) return 0;
      
      const jobSkillsArray = jobSkills.toLowerCase().split(/[,\s]+/).filter(s => s.length > 0);
      const cvSkillsLower = cvSkills.map(s => s.toLowerCase());
      
      const matchingSkills = jobSkillsArray.filter(skill =>
         cvSkillsLower.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
      );
      
      return jobSkillsArray.length > 0 ? matchingSkills.length / jobSkillsArray.length : 0;
   }

   private calculateExperienceMatch(cvExperience: number, minRequired: number, maxRequired: number): number {
      if (cvExperience >= minRequired && cvExperience <= maxRequired) {
         return 1.0;
      } else if (cvExperience >= minRequired) {
         const overQualification = cvExperience - maxRequired;
         return Math.max(0.7, 1.0 - (overQualification * 0.1));
      } else {
         const experienceGap = minRequired - cvExperience;
         return Math.max(0, 1.0 - (experienceGap * 0.2));
      }
   }

   private calculateEducationMatch(cvEducation: any[], requiredEducation: string): number {
      if (!requiredEducation || cvEducation.length === 0) return 0.5;
      
      const requiredLower = requiredEducation.toLowerCase();
      
      for (const education of cvEducation) {
         const degree = education.degree?.toLowerCase() || '';
         if (degree.includes('bachelor') && requiredLower.includes('bachelor')) return 1.0;
         if (degree.includes('master') && requiredLower.includes('master')) return 1.0;
         if (degree.includes('phd') && requiredLower.includes('phd')) return 1.0;
      }
      
      return 0.3;
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
