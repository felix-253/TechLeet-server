import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CvTextExtractionService } from './cv-text-extraction.service';
import { CvNlpProcessingService, ProcessedCvData } from './cv-nlp-processing.service';
import { CvEmbeddingService } from './cv-embedding.service';
import { CvLlmSummaryService } from './cv-llm-summary.service';
import { EmbeddingType } from '../../../entities/recruitment/cv-embedding.entity';

export interface ScreeningPipelineResult {
   screeningId: number;
   status: ScreeningStatus;
   overallScore: number;
   skillsScore: number;
   experienceScore: number;
   educationScore: number;
   aiSummary: string;
   keyHighlights: string[];
   concerns: string[];
   processingTimeMs: number;
   error?: string;
}

@Injectable()
export class CvScreeningWorkerService {
   private readonly logger = new Logger(CvScreeningWorkerService.name);

   constructor(
      @InjectRepository(CvScreeningResultEntity)
      private readonly screeningRepository: Repository<CvScreeningResultEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      private readonly textExtractionService: CvTextExtractionService,
      private readonly nlpProcessingService: CvNlpProcessingService,
      private readonly embeddingService: CvEmbeddingService,
      private readonly llmSummaryService: CvLlmSummaryService,
   ) {}

   /**
    * Execute the complete CV screening pipeline
    */
   async executeScreeningPipeline(
      applicationId: number,
      resumePath?: string
   ): Promise<ScreeningPipelineResult> {
      const startTime = Date.now();
      let screeningResult: CvScreeningResultEntity | undefined;

      try {
         this.logger.log(`Starting CV screening pipeline for application ${applicationId}`);

         // Get application and job posting details
         const application = await this.getApplicationWithJobPosting(applicationId);
         if (!application || !application.jobPosting) {
            throw new Error(`Application ${applicationId} or job posting not found`);
         }

         // Create initial screening record
         screeningResult = await this.createScreeningRecord(applicationId, application.jobPostingId);

         // Step 1: Extract text from CV
         const extractedText = await this.extractTextFromCv(application, resumePath);
         await this.updateScreeningProgress(screeningResult.screeningId, {
            extractedText,
            status: ScreeningStatus.PROCESSING,
         });

         // Step 2: Process text with NLP
         const processedData = await this.processWithNlp(extractedText);
         await this.updateScreeningProgress(screeningResult.screeningId, {
            extractedSkills: processedData.skills.technical,
            extractedExperience: processedData.workExperience,
            extractedEducation: processedData.education,
         });

         // Step 3: Generate embeddings
         const cvEmbedding = await this.generateCvEmbedding(applicationId, extractedText);
         const jobEmbedding = await this.ensureJobEmbedding(application.jobPostingId, application.jobPosting);

         // Step 4: Calculate similarity scores
         const scores = await this.calculateSimilarityScores(
            applicationId,
            application.jobPostingId,
            processedData,
            application.jobPosting
         );

         // Step 5: Generate AI summary
         const summary = await this.generateAiSummary(
            extractedText,
            processedData,
            application.jobPosting
         );

         // Step 6: Complete screening
         const finalResult = await this.completeScreening(
            screeningResult.screeningId,
            scores,
            summary,
            startTime
         );

         // Update application with screening results
         await this.updateApplicationScreeningStatus(applicationId, finalResult);

         this.logger.log(`CV screening completed for application ${applicationId} in ${Date.now() - startTime}ms`);

         return {
            screeningId: finalResult.screeningId,
            status: finalResult.status,
            overallScore: finalResult.overallScore || 0,
            skillsScore: finalResult.skillsScore || 0,
            experienceScore: finalResult.experienceScore || 0,
            educationScore: finalResult.educationScore || 0,
            aiSummary: finalResult.aiSummary || '',
            keyHighlights: finalResult.keyHighlights || [],
            concerns: finalResult.concerns || [],
            processingTimeMs: finalResult.processingTimeMs || 0,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`CV screening failed for application ${applicationId}: ${error.message}`, error.stack);

         // Update screening record with error
         if (screeningResult) {
            await this.updateScreeningProgress(screeningResult.screeningId, {
               status: ScreeningStatus.FAILED,
               errorMessage: error.message,
               processingTimeMs: processingTime,
            });
         }

         return {
            screeningId: screeningResult?.screeningId || 0,
            status: ScreeningStatus.FAILED,
            overallScore: 0,
            skillsScore: 0,
            experienceScore: 0,
            educationScore: 0,
            aiSummary: '',
            keyHighlights: [],
            concerns: [],
            processingTimeMs: processingTime,
            error: error.message,
         };
      }
   }

   /**
    * Get application with job posting details
    */
   private async getApplicationWithJobPosting(applicationId: number) {
      const application = await this.applicationRepository.findOne({
         where: { applicationId },
      });

      if (!application) {
         return null;
      }

      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: application.jobPostingId },
      });

      return {
         ...application,
         jobPosting,
      };
   }

   /**
    * Create initial screening record
    */
   private async createScreeningRecord(
      applicationId: number,
      jobPostingId: number
   ): Promise<CvScreeningResultEntity> {
      const screeningResult = this.screeningRepository.create({
         applicationId,
         jobPostingId,
         status: ScreeningStatus.PENDING,
      });

      return this.screeningRepository.save(screeningResult);
   }

   /**
    * Extract text from CV
    */
   private async extractTextFromCv(
      application: any,
      resumePath?: string
   ): Promise<string> {
      const filePath = resumePath || application.resumeUrl;

      if (!filePath) {
         throw new Error('No resume file path provided');
      }

      // Convert URL to local file path if needed
      const localFilePath = this.convertUrlToLocalPath(filePath);

      const result = await this.textExtractionService.extractTextFromPdf(localFilePath);
      return result.text;
   }

   /**
    * Convert URL to local file path
    */
   private convertUrlToLocalPath(urlOrPath: string): string {
      // If it's already a local path, return as is
      if (!urlOrPath.startsWith('http')) {
         return urlOrPath;
      }

      try {
         // Extract the path from URL
         // Example: https://techleet.me/api/v1/recruitment-service/uploads/candidate_resume/file.pdf
         // Should become: ./uploads/candidate_resume/file.pdf
         const url = new URL(urlOrPath);
         const pathParts = url.pathname.split('/');

         // Find the 'uploads' part in the path
         const uploadsIndex = pathParts.findIndex(part => part === 'uploads');
         if (uploadsIndex === -1) {
            throw new Error('Invalid file URL format - uploads directory not found');
         }

         // Reconstruct the local path starting from 'uploads'
         const localPath = './' + pathParts.slice(uploadsIndex).join('/');

         this.logger.log(`Converted URL ${urlOrPath} to local path ${localPath}`);
         return localPath;
      } catch (error) {
         this.logger.error(`Failed to convert URL to local path: ${urlOrPath}`, error);
         throw new Error(`Invalid file URL format: ${urlOrPath}`);
      }
   }

   /**
    * Process text with NLP
    */
   private async processWithNlp(text: string): Promise<ProcessedCvData> {
      return this.nlpProcessingService.processCvText(text);
   }

   /**
    * Generate CV embedding
    */
   private async generateCvEmbedding(applicationId: number, text: string) {
      return this.embeddingService.generateAndStoreCvEmbedding(
         applicationId,
         text,
         EmbeddingType.CV_FULL_TEXT
      );
   }

   /**
    * Ensure job posting has embedding
    */
   private async ensureJobEmbedding(jobPostingId: number, jobPosting: JobPostingEntity) {
      // Check if job embedding already exists
      const existingEmbedding = await this.embeddingService.getEmbedding(jobPostingId);

      if (existingEmbedding) {
         return existingEmbedding;
      }

      // Create job description text for embedding
      const jobText = this.createJobDescriptionText(jobPosting);

      return this.embeddingService.generateAndStoreJobEmbedding(
         jobPostingId,
         jobText,
         EmbeddingType.JOB_DESCRIPTION
      );
   }

   /**
    * Calculate similarity scores
    */
   private async calculateSimilarityScores(
      applicationId: number,
      jobPostingId: number,
      processedData: ProcessedCvData,
      jobPosting: JobPostingEntity
   ) {
      // Calculate vector similarity
      const vectorSimilarity = await this.embeddingService.calculateSimilarity(
         applicationId,
         jobPostingId,
         EmbeddingType.CV_FULL_TEXT
      );

      // Calculate skills match score
      const skillsScore = this.calculateSkillsMatchScore(
         processedData.skills.technical,
         jobPosting.skills || ''
      );

      // Calculate experience match score
      const experienceScore = this.calculateExperienceMatchScore(
         processedData.totalExperienceYears,
         jobPosting.minExperience || 0,
         jobPosting.maxExperience || 10
      );

      // Calculate education match score
      const educationScore = this.calculateEducationMatchScore(
         processedData.education,
         jobPosting.educationLevel || ''
      );

      // Calculate overall score (weighted average)
      const overallScore = (
         vectorSimilarity * 0.4 +
         skillsScore * 0.3 +
         experienceScore * 0.2 +
         educationScore * 0.1
      ) * 100;

      return {
         overallScore: Math.round(overallScore * 100) / 100,
         skillsScore: Math.round(skillsScore * 100 * 100) / 100,
         experienceScore: Math.round(experienceScore * 100 * 100) / 100,
         educationScore: Math.round(educationScore * 100 * 100) / 100,
      };
   }

   /**
    * Generate AI summary
    */
   private async generateAiSummary(
      extractedText: string,
      processedData: ProcessedCvData,
      jobPosting: JobPostingEntity
   ) {
      const jobDescription = this.createJobDescriptionText(jobPosting);

      return this.llmSummaryService.generateCvSummary(
         extractedText,
         processedData,
         jobDescription
      );
   }

   /**
    * Complete screening process
    */
   private async completeScreening(
      screeningId: number,
      scores: any,
      summary: any,
      startTime: number
   ): Promise<CvScreeningResultEntity> {
      const processingTime = Date.now() - startTime;

      const updateData = {
         status: ScreeningStatus.COMPLETED,
         overallScore: scores.overallScore,
         skillsScore: scores.skillsScore,
         experienceScore: scores.experienceScore,
         educationScore: scores.educationScore,
         aiSummary: summary.summary,
         keyHighlights: summary.keyHighlights,
         concerns: summary.concerns,
         processingTimeMs: processingTime,
         completedAt: new Date(),
      };

      await this.updateScreeningProgress(screeningId, updateData);

      const result = await this.screeningRepository.findOne({
         where: { screeningId },
      });

      if (!result) {
         throw new Error(`Screening result ${screeningId} not found after completion`);
      }

      return result;
   }

   /**
    * Update application screening status
    */
   private async updateApplicationScreeningStatus(
      applicationId: number,
      screeningResult: CvScreeningResultEntity
   ): Promise<void> {
      await this.applicationRepository.update(applicationId, {
         isScreeningCompleted: true,
         screeningScore: screeningResult.overallScore,
         screeningStatus: screeningResult.status,
         screeningCompletedAt: screeningResult.completedAt,
      });
   }

   /**
    * Update screening progress
    */
   private async updateScreeningProgress(
      screeningId: number,
      updateData: Partial<CvScreeningResultEntity>
   ): Promise<void> {
      await this.screeningRepository.update(screeningId, updateData);
   }

   /**
    * Create job description text for embedding
    */
   private createJobDescriptionText(jobPosting: JobPostingEntity): string {
      const parts = [
         `Job Title: ${jobPosting.title}`,
         `Description: ${jobPosting.description}`,
         `Requirements: ${jobPosting.requirements}`,
         `Skills: ${jobPosting.skills}`,
         `Experience Level: ${jobPosting.experienceLevel}`,
         `Education: ${jobPosting.educationLevel}`,
      ];

      return parts.filter(part => part.split(': ')[1]).join('\n');
   }

   /**
    * Calculate skills match score
    */
   private calculateSkillsMatchScore(cvSkills: string[], jobSkills: string): number {
      if (!jobSkills || cvSkills.length === 0) {
         return 0;
      }

      const jobSkillsArray = jobSkills.toLowerCase().split(/[,\s]+/).filter(s => s.length > 0);
      const cvSkillsLower = cvSkills.map(s => s.toLowerCase());

      const matchingSkills = jobSkillsArray.filter(skill =>
         cvSkillsLower.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
      );

      return jobSkillsArray.length > 0 ? matchingSkills.length / jobSkillsArray.length : 0;
   }

   /**
    * Calculate experience match score
    */
   private calculateExperienceMatchScore(
      cvExperience: number,
      minRequired: number,
      maxRequired: number
   ): number {
      if (cvExperience >= minRequired && cvExperience <= maxRequired) {
         return 1.0; // Perfect match
      } else if (cvExperience >= minRequired) {
         // Over-qualified but still good
         const overQualification = cvExperience - maxRequired;
         return Math.max(0.7, 1.0 - (overQualification * 0.1));
      } else {
         // Under-qualified
         const experienceGap = minRequired - cvExperience;
         return Math.max(0, 1.0 - (experienceGap * 0.2));
      }
   }

   /**
    * Calculate education match score
    */
   private calculateEducationMatchScore(
      cvEducation: any[],
      requiredEducation: string
   ): number {
      if (!requiredEducation || cvEducation.length === 0) {
         return 0.5; // Neutral score when no education info
      }

      const requiredLower = requiredEducation.toLowerCase();

      // Simple matching logic - can be enhanced
      for (const education of cvEducation) {
         const degree = education.degree?.toLowerCase() || '';
         if (degree.includes('bachelor') && requiredLower.includes('bachelor')) {
            return 1.0;
         }
         if (degree.includes('master') && requiredLower.includes('master')) {
            return 1.0;
         }
         if (degree.includes('phd') && requiredLower.includes('phd')) {
            return 1.0;
         }
      }

      return 0.3; // Some education but not exact match
   }
}
