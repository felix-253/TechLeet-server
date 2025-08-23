import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CvScreeningWorkerService } from './cv-screening-worker.service';
import { CvQueueService } from './cv-queue.service';
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
   ) {}

   /**
    * Trigger CV screening for an application
    */
   async triggerScreening(
      applicationId: number,
      resumePath?: string,
      priority: number = 0
   ): Promise<ScreeningResultDto> {
      try {
         this.logger.log(`Triggering CV screening for application ${applicationId}`);

         // Check if application exists
         const application = await this.applicationRepository.findOne({
            where: { applicationId },
         });

         if (!application) {
            throw new BadRequestException(`Application ${applicationId} not found`);
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
         await this.queueService.addCvProcessingJob(
            {
               applicationId,
               jobPostingId: application.jobPostingId,
               resumeUrl: application.resumeUrl || '',
               resumePath,
               priority,
            },
            { priority }
         );

         // Execute screening pipeline directly (or let queue handle it)
         const result = await this.screeningWorker.executeScreeningPipeline(
            applicationId,
            resumePath
         );

         // Get the updated screening result
         const screeningResult = await this.screeningRepository.findOne({
            where: { screeningId: result.screeningId },
         });

         if (!screeningResult) {
            throw new Error('Screening result not found after processing');
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
