import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { ExaminationEntity } from '../../../../entities/question/examination.entity';
import { CvTextExtractionService } from '../processors/cv-text-extraction.service';
import { CvNlpProcessingService, ProcessedCvData } from '../processors/cv-nlp-processing.service';
import { CvEmbeddingService } from '../processors/cv-embedding.service';
import { CvLlmSummaryService } from '../processors/cv-llm-summary.service';
import { ScoringService } from './scoring.service';
import { AdaptiveThresholdService, IScreeningResult } from './adaptive-threshold.service';
import { EmbeddingType } from '../../../../entities/recruitment/cv-embedding.entity';
import { RetryUtil, CircuitBreakerUtil, FileValidationUtil, JobDescriptionUtil } from '../utils';
import { CV_SCREENING_CONFIG } from '../config';
import { RecruitmentEmailService } from '../../email/email.service';
import { QuestionService } from '../../question/question.service';
import {
   CvFileNotFoundException,
   CvFileTooLargeException,
   CvTextExtractionException,
   CvApplicationNotFoundException,
} from '../exceptions/cv-screening.exceptions';

export interface ScreeningPipelineResult {
   screeningId: number;
   status: ScreeningStatus;
   overallScore: number;
   skillsScore: number;
   experienceScore: number;
   educationScore: number;
   vectorSimilarity: number;
   chunkSimilarity: number;
   aiSummary: string;
   keyHighlights: string[];
   concerns: string[];
   processingTimeMs: number;
   error?: string;
}

@Injectable()
export class CvScreeningWorkerService {
   private readonly logger = new Logger(CvScreeningWorkerService.name);
   private readonly summaryCircuitBreaker: CircuitBreakerUtil;

   constructor(
      @InjectRepository(CvScreeningResultEntity)
      private readonly screeningRepository: Repository<CvScreeningResultEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      @InjectRepository(ExaminationEntity)
      private readonly examinationRepository: Repository<ExaminationEntity>,
      private readonly textExtractionService: CvTextExtractionService,
      private readonly nlpProcessingService: CvNlpProcessingService,
      private readonly embeddingService: CvEmbeddingService,
      private readonly llmSummaryService: CvLlmSummaryService,
      private readonly scoringService: ScoringService,
      private readonly adaptiveThresholdService: AdaptiveThresholdService,
      private readonly emailService: RecruitmentEmailService,
      private readonly questionService: QuestionService,
      private readonly dataSource: DataSource,
   ) {
      // Initialize circuit breaker for AI summary (expensive operation)
      this.summaryCircuitBreaker = new CircuitBreakerUtil({
         failureThreshold: CV_SCREENING_CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
         successThreshold: CV_SCREENING_CONFIG.CIRCUIT_BREAKER.SUCCESS_THRESHOLD,
         timeout: CV_SCREENING_CONFIG.TIMEOUTS.SUMMARY_GENERATION_MS,
         resetTimeout: CV_SCREENING_CONFIG.CIRCUIT_BREAKER.RESET_TIMEOUT_MS,
      });
   }

   /**
    * Execute the complete CV screening pipeline with error recovery
    */
   async executeScreeningPipeline(
      applicationId: number,
      resumePath?: string
   ): Promise<ScreeningPipelineResult> {
      const startTime = Date.now();
      const metrics = {
         textExtractionMs: 0,
         nlpProcessingMs: 0,
         embeddingMs: 0,
         similarityMs: 0,
         summaryMs: 0,
         totalMs: 0,
      };
      
      let screeningResult: CvScreeningResultEntity | undefined;

      try {
         this.logger.log(`Starting CV screening pipeline for application ${applicationId}`);

         // Get application and job posting details
         const application = await this.getApplicationWithJobPosting(applicationId);
         if (!application) {
            throw new CvApplicationNotFoundException(applicationId);
         }
         if (!application.jobPosting) {
            throw new CvTextExtractionException('Job posting not found for application');
         }

         // Create or update existing screening record
         screeningResult = await this.createOrUpdateScreeningRecord(applicationId, application.jobPostingId);

         // Step 1: Extract text from CV with retry
         const textExtractionStart = Date.now();
         const extractedText = await RetryUtil.executeWithRetry(
            () => this.extractTextFromCv(application, resumePath),
            {
               maxAttempts: CV_SCREENING_CONFIG.RETRY.MAX_ATTEMPTS,
               baseDelayMs: CV_SCREENING_CONFIG.RETRY.BASE_DELAY_MS,
               maxDelayMs: CV_SCREENING_CONFIG.RETRY.MAX_DELAY_MS,
            }
         );
         metrics.textExtractionMs = Date.now() - textExtractionStart;
         this.logger.log(`Text extraction completed in ${metrics.textExtractionMs}ms`);
         
         await this.updateScreeningProgress(screeningResult.screeningId, {
            extractedText,
            status: ScreeningStatus.PROCESSING,
         });

         // Step 2: Process text with NLP with retry
         const nlpStart = Date.now();
         const processedData = await RetryUtil.executeWithRetry(
            () => this.nlpProcessingService.processCvText(extractedText),
            {
               maxAttempts: 2,
               baseDelayMs: CV_SCREENING_CONFIG.RETRY.BASE_DELAY_MS,
               maxDelayMs: CV_SCREENING_CONFIG.RETRY.MAX_DELAY_MS,
            }
         );
         metrics.nlpProcessingMs = Date.now() - nlpStart;
         this.logger.log(`NLP processing completed in ${metrics.nlpProcessingMs}ms`);
         
         await this.updateScreeningProgress(screeningResult.screeningId, {
            extractedSkills: processedData.skills.technical,
            extractedExperience: processedData.workExperience,
            extractedEducation: processedData.education,
         });

         // Step 3: Generate embeddings in parallel (Performance improvement!)
         const embeddingStart = Date.now();
         const [cvEmbedding, jobEmbedding] = await Promise.all([
            RetryUtil.executeWithRetry(
               () => this.generateCvEmbedding(applicationId, extractedText),
               {
                  maxAttempts: 2,
                  baseDelayMs: CV_SCREENING_CONFIG.RETRY.BASE_DELAY_MS,
                  maxDelayMs: CV_SCREENING_CONFIG.RETRY.MAX_DELAY_MS,
               }
            ),
            RetryUtil.executeWithRetry(
               () => this.ensureJobEmbedding(application.jobPostingId, application.jobPosting!),
               {
                  maxAttempts: 2,
                  baseDelayMs: CV_SCREENING_CONFIG.RETRY.BASE_DELAY_MS,
                  maxDelayMs: CV_SCREENING_CONFIG.RETRY.MAX_DELAY_MS,
               }
            ),
         ]);
         metrics.embeddingMs = Date.now() - embeddingStart;
         this.logger.log(`Embedding generation completed in ${metrics.embeddingMs}ms`);

         // Step 4: Calculate similarity scores
         const similarityStart = Date.now();
         const scores = await this.calculateSimilarityScores(
            applicationId,
            application.jobPostingId,
            processedData,
            application.jobPosting!
         );
         metrics.similarityMs = Date.now() - similarityStart;
         this.logger.log(`Similarity calculation completed in ${metrics.similarityMs}ms`);

         // Step 5: Generate AI summary with circuit breaker (graceful degradation)
         const summaryStart = Date.now();
         let summary;
         try {
            summary = await this.summaryCircuitBreaker.execute(
               () => this.generateAiSummary(extractedText, processedData, application.jobPosting!),
               'AI Summary Generation'
            );
         } catch (error) {
            // Graceful degradation: continue without AI summary
            this.logger.warn(`AI summary generation failed, continuing with partial results: ${error.message}`);
            summary = {
               summary: 'AI summary temporarily unavailable',
               keyHighlights: [],
               concerns: [],
               fitScore: null,
               recommendation: 'Manual review recommended',
            };
         }
         metrics.summaryMs = Date.now() - summaryStart;
         this.logger.log(`AI summary generation completed in ${metrics.summaryMs}ms (including graceful degradation check)`);

         // Step 6: Complete screening with adaptive threshold
         const finalResult = await this.completeScreening(
            screeningResult.screeningId,
            application.jobPostingId,
            scores,
            summary,
            startTime
         );

         // Update application with screening results
         this.logger.log(`Updating application ${applicationId} with screening results: status=${finalResult.status}, score=${finalResult.overallScore}`);
         await this.updateApplicationScreeningStatus(applicationId, finalResult);
         this.logger.log(`Application ${applicationId} updated successfully`);

         metrics.totalMs = Date.now() - startTime;
         
         // Log detailed performance metrics
         this.logger.log(`CV screening completed for application ${applicationId}:`);
         this.logger.log(`  Total time: ${metrics.totalMs}ms`);
         this.logger.log(`  - Text extraction: ${metrics.textExtractionMs}ms`);
         this.logger.log(`  - NLP processing: ${metrics.nlpProcessingMs}ms`);
         this.logger.log(`  - Embedding generation: ${metrics.embeddingMs}ms`);
         this.logger.log(`  - Similarity calculation: ${metrics.similarityMs}ms`);
         this.logger.log(`  - AI summary: ${metrics.summaryMs}ms`);
         this.logger.log(`  - Overhead: ${metrics.totalMs - metrics.textExtractionMs - metrics.nlpProcessingMs - metrics.embeddingMs - metrics.similarityMs - metrics.summaryMs}ms`);

         return {
            screeningId: finalResult.screeningId,
            status: finalResult.status,
            overallScore: finalResult.overallScore || 0,
            skillsScore: finalResult.skillsScore || 0,
            experienceScore: finalResult.experienceScore || 0,
            educationScore: finalResult.educationScore || 0,
            vectorSimilarity: finalResult.vectorSimilarity || 0,
            chunkSimilarity: finalResult.chunkSimilarity || 0,
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
            vectorSimilarity: 0,
            chunkSimilarity: 0,
            aiSummary: '',
            keyHighlights: [],
            concerns: [],
            processingTimeMs: processingTime,
            error: error.message,
         };
      }
   }

   /**
    * Get application with job posting details (optimized single query)
    */
   private async getApplicationWithJobPosting(applicationId: number) {
      // Fetch application first
      const application = await this.applicationRepository.findOne({
         where: { applicationId },
      });

      if (!application) {
         return null;
      }

      // Fetch job posting separately since relation is not defined in ApplicationEntity
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: application.jobPostingId },
      });

      return {
         ...application,
         jobPosting,
      } as ApplicationEntity & { jobPosting: JobPostingEntity | null };
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
    * Extract text from CV with improved error handling
    */
   private async extractTextFromCv(
      application: ApplicationEntity & { jobPosting?: JobPostingEntity | null },
      resumePath?: string
   ): Promise<string> {
      const filePath = resumePath || application.resumeUrl;

      this.logger.log(`Extracting text from CV for application ${application.applicationId}`);
      this.logger.log(`Resume path provided: ${resumePath || 'none'}`);
      this.logger.log(`Application resumeUrl: ${application.resumeUrl || 'none'}`);
      this.logger.log(`Final file path: ${filePath || 'none'}`);

      if (!filePath) {
         throw new CvTextExtractionException('No resume file path provided');
      }

      // Convert URL to local file path if needed
      const localFilePath = this.convertUrlToLocalPath(filePath);
      this.logger.log(`Converted local file path: ${localFilePath}`);

      // Validate file using utility
      const validation = FileValidationUtil.validateFile(localFilePath);
      if (!validation.isValid) {
         const errorMsg = validation.error || 'Unknown validation error';
         this.logger.error(`File validation failed: ${errorMsg}`);
         if (errorMsg.includes('not found')) {
            throw new CvFileNotFoundException(localFilePath, filePath);
         } else if (errorMsg.includes('too large')) {
            throw new CvFileTooLargeException(validation.fileSizeMB || 0, CV_SCREENING_CONFIG.FILE.MAX_SIZE_MB);
         } else {
            throw new CvTextExtractionException(errorMsg);
         }
      }

      this.logger.log(`Extracting text from file: ${localFilePath} (${(validation.fileSizeMB || 0).toFixed(2)}MB)`);

      const result = await this.textExtractionService.extractTextFromPdf(localFilePath);
      
      // Validate extracted text
      const textValidation = FileValidationUtil.validateExtractedText(result.text);
      if (!textValidation.isValid) {
         throw new CvTextExtractionException(textValidation.error || 'Text validation failed');
      }

      return result.text;
   }

   /**
    * Convert URL to local file path with improved robustness
    */
   private convertUrlToLocalPath(urlOrPath: string): string {
      // If it's already a local path, return as is
      if (!urlOrPath.startsWith('http')) {
         return urlOrPath;
      }

      try {
         const url = new URL(urlOrPath);
         const pathParts = url.pathname.split('/').filter(part => part.length > 0);

         // Find the 'uploads' part in the path
         const uploadsIndex = pathParts.findIndex(part => part === 'uploads');
         if (uploadsIndex === -1) {
            // Fallback: try to extract filename and assume uploads directory
            const filename = pathParts[pathParts.length - 1];
            if (filename && filename.includes('.')) {
               const fallbackPath = `./uploads/candidate_resume/${filename}`;
               this.logger.warn(`Could not find uploads directory in URL, using fallback: ${fallbackPath}`);
               return fallbackPath;
            }
            throw new Error('Invalid file URL format - uploads directory not found and no filename detected');
         }

         // Reconstruct the local path starting from 'uploads'
         const localPath = './' + pathParts.slice(uploadsIndex).join('/');

         this.logger.log(`Converted URL ${urlOrPath} to local path ${localPath}`);
         return localPath;
      } catch (error) {
         this.logger.error(`Failed to convert URL to local path: ${urlOrPath}`, error);
         
         // Last resort: try to extract just the filename
         try {
            const filename = urlOrPath.split('/').pop();
            if (filename && filename.includes('.')) {
               const emergencyPath = `./uploads/candidate_resume/${filename}`;
               this.logger.warn(`Using emergency fallback path: ${emergencyPath}`);
               return emergencyPath;
            }
         } catch {
            // Ignore and throw original error
         }
         
         throw new Error(`Invalid file URL format: ${urlOrPath}. Error: ${error.message}`);
      }
   }


   /**
    * Generate CV embedding
    * 
    * TODO: Add content-hash caching to detect duplicate CVs
    * - Calculate SHA-256 hash of CV text content
    * - Check if embedding exists for this hash
    * - Reuse embedding if found
    */
   private async generateCvEmbedding(applicationId: number, text: string) {
      return this.embeddingService.generateAndStoreCvEmbedding(
         applicationId,
         text,
         EmbeddingType.CV_FULL_TEXT
      );
   }

   /**
    * Ensure job posting has embedding (with caching)
    * 
    * Caching Strategy:
    * - Check if embedding exists in database by jobPostingId
    * - If exists, return cached embedding (no API call)
    * - If not, generate and store (one-time cost per job posting)
    * 
    * Benefits:
    * - 100+ applications to same job = 1 embedding generation (not 100!)
    * - Saves 99% of embedding API calls for repeat jobs
    * - Significant cost reduction
    */
   private async ensureJobEmbedding(jobPostingId: number, jobPosting: JobPostingEntity) {
      // Check cache first (database lookup)
      const existingEmbedding = await this.embeddingService.getEmbedding(jobPostingId);

      if (existingEmbedding) {
         this.logger.log(`Using cached job embedding for job posting ${jobPostingId}`);
         return existingEmbedding;
      }

      // Create job description text for embedding
      const jobText = JobDescriptionUtil.createJobDescriptionText(jobPosting);

      this.logger.log(`Generating new job embedding for job posting ${jobPostingId}`);
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

      // Calculate individual match scores using scoring service
      // Combine technical, frameworks, languages, and tools for better matching
      const allCvSkills = [
         ...(processedData.skills.technical || []),
         ...(processedData.skills.frameworks || []),
         ...(processedData.skills.languages || []),
         ...(processedData.skills.tools || []),
      ];
      
      const skillsScore = this.scoringService.calculateSkillsMatchScore(
         allCvSkills,
         jobPosting.skills || ''
      );

      const experienceScore = this.scoringService.calculateExperienceMatchScore(
         processedData.totalExperienceYears,
         jobPosting.minExperience || 0,
         jobPosting.maxExperience || 10
      );

      const educationScore = this.scoringService.calculateEducationMatchScore(
         processedData.education,
         jobPosting.educationLevel || ''
      );

      // Log details for debugging
      this.logger.log(
         `[SCORING] Job ${jobPostingId}: CV has ${allCvSkills.length} total skills (technical: ${processedData.skills.technical.length}, frameworks: ${processedData.skills.frameworks.length}, languages: ${processedData.skills.languages.length}, tools: ${processedData.skills.tools.length})`
      );
      this.logger.log(
         `[SCORING] CV Skills: [${allCvSkills.slice(0, 10).join(', ')}${allCvSkills.length > 10 ? '...' : ''}]`
      );
      this.logger.log(
         `[SCORING] Job requires: [${(jobPosting.skills || '').split(/[,;]/).map(s => s.trim()).join(', ')}] → Skills Score: ${(skillsScore * 100).toFixed(1)}%`
      );
      this.logger.log(
         `[SCORING] Education: CV has ${processedData.education.length} entries, Job requires: "${jobPosting.educationLevel || 'none'}" → Education Score: ${(educationScore * 100).toFixed(1)}%`
      );

      // Log experience score for debugging
      const experienceGap = (jobPosting.minExperience || 0) - processedData.totalExperienceYears;
      if (experienceGap > 0) {
         this.logger.log(
            `Experience gap for Job ${jobPostingId}: CV has ${processedData.totalExperienceYears} years, required ${jobPosting.minExperience || 0}+ years (gap: ${experienceGap} years) → Experience Score: ${(experienceScore * 100).toFixed(1)}%`
         );
      }

      // Calculate overall score using scoring service
      const scores = this.scoringService.calculateOverallScore(
         vectorSimilarity,
         skillsScore,
         experienceScore,
         educationScore,
         0 // chunk similarity (calculated elsewhere if needed)
      );

      // Log if overall score was capped due to experience
      if (experienceScore < 0.3 && scores.overallScore <= 50) {
         this.logger.warn(
            `Overall score capped at ${scores.overallScore.toFixed(1)}% due to severe experience under-qualification (experience score: ${(experienceScore * 100).toFixed(1)}%)`
         );
      }

      return scores;
   }

   /**
    * Generate AI summary
    */
   private async generateAiSummary(
      extractedText: string,
      processedData: ProcessedCvData,
      jobPosting: JobPostingEntity
   ) {
      const jobDescription = JobDescriptionUtil.createJobDescriptionText(jobPosting);

      return this.llmSummaryService.generateCvSummary(
         extractedText,
         processedData,
         jobDescription
      );
   }

   /**
    * Complete screening process with adaptive threshold
    */
   private async completeScreening(
      screeningId: number,
      jobPostingId: number,
      scores: any,
      summary: any,
      startTime: number
   ): Promise<CvScreeningResultEntity & { adaptiveThresholdResult?: IScreeningResult }> {
      // Use transaction for completing screening with all related updates
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
         const processingTime = Date.now() - startTime;

         // Normalize overallScore from 0-100 to 0-1 for adaptive threshold
         const normalizedScore = scores.overallScore / 100;

         // Apply adaptive threshold to determine pass/fail
         let finalStatus: ScreeningStatus;
         let adaptiveThresholdResult: IScreeningResult | undefined = undefined;

         // Auto-fail if experience gap is too severe (gap > 3 years)
         if (scores.autoFail) {
            finalStatus = ScreeningStatus.SCREENING_FAILED;
            this.logger.warn(
               `AUTO-FAIL: Candidate automatically rejected due to severe experience under-qualification (gap > 3 years). Experience Score: ${(scores.experienceScore).toFixed(1)}%`
            );
         } else {
            try {
               adaptiveThresholdResult = await this.adaptiveThresholdService.processNewCV(
                  jobPostingId,
                  normalizedScore
               );

               // Set final status based on adaptive threshold decision
               if (adaptiveThresholdResult.decision === 'pass') {
                  finalStatus = ScreeningStatus.PASSED;
               } else {
                  finalStatus = ScreeningStatus.SCREENING_FAILED;
               }

               this.logger.log(
                  `Adaptive Threshold Result for Job ${jobPostingId}: Score ${scores.overallScore.toFixed(2)} (normalized: ${normalizedScore.toFixed(3)}) → ${adaptiveThresholdResult.decision.toUpperCase()} | Threshold: ${adaptiveThresholdResult.newThreshold.toFixed(3)}`
               );
            } catch (adaptiveError) {
               // If adaptive threshold fails, fallback to COMPLETED status
               this.logger.warn(
                  `Adaptive threshold failed for job ${jobPostingId}, using COMPLETED status: ${adaptiveError.message}`
               );
               finalStatus = ScreeningStatus.COMPLETED;
            }
         }

         const updateData = {
            status: finalStatus,
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

         await queryRunner.manager.update(CvScreeningResultEntity, screeningId, updateData);

         const result = await queryRunner.manager.findOne(CvScreeningResultEntity, {
            where: { screeningId },
         });

         if (!result) {
            throw new Error(`Screening result ${screeningId} not found after completion`);
         }

         await queryRunner.commitTransaction();

         // Attach adaptive threshold result to return value
         return { ...result, adaptiveThresholdResult };
      } catch (error) {
         await queryRunner.rollbackTransaction();
         this.logger.error(`Failed to complete screening ${screeningId}: ${error.message}`, error.stack);
         throw error;
      } finally {
         await queryRunner.release();
      }
   }

   /**
    * Update application screening status with pass/fail decision
    */
   private async updateApplicationScreeningStatus(
      applicationId: number,
      screeningResult: CvScreeningResultEntity & { adaptiveThresholdResult?: IScreeningResult }
   ): Promise<void> {
      // Determine application status based on screening result
      let applicationStatus = 'submitted';
      let screeningStatus = 'pending';

      if (screeningResult.status === ScreeningStatus.PASSED) {
         // Check if examination already failed before setting screening_passed
         // If exam failed, keep failed_exam status instead of overriding
         const application = await this.applicationRepository.findOne({
            where: { applicationId },
         });

         if (application && application.status === 'failed_exam') {
            // Examination already failed, keep failed_exam status
            applicationStatus = 'failed_exam';
            screeningStatus = 'passed';
            this.logger.log(
               `Application ${applicationId} CV screening passed but exam failed. Keeping failed_exam status.`,
            );
         } else {
            applicationStatus = 'screening_passed';
            screeningStatus = 'passed';
         }
      } else if (screeningResult.status === ScreeningStatus.SCREENING_FAILED) {
         applicationStatus = 'screening_failed';
         screeningStatus = 'failed';
      } else if (screeningResult.status === ScreeningStatus.COMPLETED) {
         screeningStatus = 'completed';
      }

      await this.applicationRepository.update(applicationId, {
         isScreeningCompleted: true,
         screeningScore: screeningResult.overallScore,
         screeningStatus: screeningStatus,
         status: applicationStatus,
         screeningCompletedAt: screeningResult.completedAt,
      });

      this.logger.log(
         `Updated application ${applicationId}: status=${applicationStatus}, screeningStatus=${screeningStatus}, score=${screeningResult.overallScore}`
      );

      // Send rejection email if screening failed
      if (screeningResult.status === ScreeningStatus.SCREENING_FAILED) {
         try {
            const application = await this.applicationRepository.findOne({
               where: { applicationId },
            });

            if (!application) {
               this.logger.warn(`Application ${applicationId} not found for sending rejection email`);
               return;
            }

            const candidate = await this.candidateRepository.findOne({
               where: { candidateId: application.candidateId },
            });

            const jobPosting = await this.jobPostingRepository.findOne({
               where: { jobPostingId: application.jobPostingId },
            });

            if (!candidate || !jobPosting) {
               this.logger.warn(
                  `Candidate or job posting not found for application ${applicationId}. Candidate: ${candidate ? 'found' : 'not found'}, JobPosting: ${jobPosting ? 'found' : 'not found'}`
               );
               return;
            }

            await this.emailService.sendScreeningRejectionEmail(candidate, jobPosting, application);
            this.logger.log(`Sent rejection email for application ${applicationId}`);
         } catch (error) {
            this.logger.error(
               `Failed to send rejection email for application ${applicationId}: ${error.message}`,
               error.stack
            );
            // Don't throw error - email failure shouldn't break the screening process
         }
      }

      // Handle screening passed
      if (screeningResult.status === ScreeningStatus.PASSED) {
         try {
            const application = await this.applicationRepository.findOne({
               where: { applicationId },
            });

            if (!application) {
               this.logger.warn(`Application ${applicationId} not found for post-screening processing`);
               return;
            }

            const jobPosting = await this.jobPostingRepository.findOne({
               where: { jobPostingId: application.jobPostingId },
            });

            if (!jobPosting) {
               this.logger.warn(`Job posting ${application.jobPostingId} not found for application ${applicationId}`);
               return;
            }

            // If job has test, check if examination already exists and passed
            if (jobPosting.isTest && jobPosting.questionSetId) {
               // Check if examination already exists and is completed
               const existingExamination = await this.examinationRepository.findOne({
                  where: { applicationId: application.applicationId },
               });

               if (existingExamination && existingExamination.status === 'completed') {
                  // Check if examination passed
                  const examinationPassed = jobPosting.minScore === null || jobPosting.minScore === undefined
                     ? (existingExamination.totalScore !== null && existingExamination.totalScore !== undefined && existingExamination.totalScore > 0)
                     : (existingExamination.totalScore !== null && existingExamination.totalScore !== undefined && existingExamination.totalScore >= jobPosting.minScore);

                  if (examinationPassed) {
                     // Both CV screening and examination passed, create interview request
                     const existingInterview = await this.interviewRepository.findOne({
                        where: {
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                        },
                     });

                     if (!existingInterview) {
                        const placeholderDate = new Date();
                        placeholderDate.setFullYear(placeholderDate.getFullYear() + 1);

                        const interviewRequest = this.interviewRepository.create({
                           candidate_id: application.candidateId,
                           job_id: application.jobPostingId,
                           interviewer_ids: [],
                           scheduled_at: placeholderDate,
                           duration_minutes: 60,
                           meeting_link: '',
                           location: '',
                           status: 'pending',
                        });

                        const savedInterview = await this.interviewRepository.save(interviewRequest);
                        this.logger.log(
                           `Created interview request (interview_id: ${savedInterview.interview_id}) for application ${applicationId} after CV screening passed and examination already completed`,
                        );
                     }
                     return;
                  } else {
                     // Examination failed, ensure application status is failed_exam
                     if (application.status !== 'failed_exam') {
                        await this.applicationRepository.update(applicationId, {
                           status: 'failed_exam',
                        });
                        this.logger.log(
                           `Updated application ${applicationId} status to failed_exam after CV screening passed but examination failed`,
                        );
                     }
                     return;
                  }
               }

               // Examination doesn't exist or not completed yet, create it
               try {
                  this.logger.log(
                     `Creating examination for application ${applicationId} after CV screening passed`,
                  );

                  const examination = await this.questionService.createExamination({
                     applicationId: application.applicationId,
                     sourceSetId: jobPosting.questionSetId,
                     quantityQuestion: jobPosting.quantityQuestion,
                  });

                  if (!examination) {
                     throw new Error('Failed to create examination - returned null');
                  }

                  this.logger.log(
                     `Examination created successfully for application ${applicationId} (examinationId: ${examination.examinationId})`,
                  );

                  // Send examination email
                  const candidate = await this.candidateRepository.findOne({
                     where: { candidateId: application.candidateId },
                  });

                  if (candidate) {
                     await this.emailService.sendExaminationEmail(
                        candidate,
                        jobPosting,
                        examination.examinationId,
                     );
                     this.logger.log(`Examination email sent to ${candidate.email} for application ${applicationId}`);
                  } else {
                     this.logger.warn(`Candidate ${application.candidateId} not found for sending examination email`);
                  }

                  // Don't create interview request yet - wait for examination completion
                  return;
               } catch (error) {
                  this.logger.error(
                     `Failed to create examination for application ${applicationId}: ${error.message}`,
                     error.stack,
                  );
                  // Continue to create interview request if examination creation fails
               }
            }

            // If job has no test, create interview request immediately
            // Check if interview request already exists
            const existingInterview = await this.interviewRepository.findOne({
               where: {
                  candidate_id: application.candidateId,
                  job_id: application.jobPostingId,
               },
            });

            if (existingInterview) {
               this.logger.log(
                  `Interview request already exists for application ${applicationId} (interview_id: ${existingInterview.interview_id})`
               );
               return;
            }

            // Create interview request with status='pending'
            // Note: scheduled_at is required, so we set a placeholder date (1 year from now)
            // HR will update this when scheduling the actual interview
            const placeholderDate = new Date();
            placeholderDate.setFullYear(placeholderDate.getFullYear() + 1);

            const interviewRequest = this.interviewRepository.create({
               candidate_id: application.candidateId,
               job_id: application.jobPostingId,
               interviewer_ids: [],
               scheduled_at: placeholderDate,
               duration_minutes: 60,
               meeting_link: '',
               location: '',
               status: 'pending',
            });

            const savedInterview = await this.interviewRepository.save(interviewRequest);
            this.logger.log(
               `Created interview request (interview_id: ${savedInterview.interview_id}) for application ${applicationId}, candidate ${application.candidateId}, job ${application.jobPostingId}`
            );
         } catch (error) {
            this.logger.error(
               `Failed to process post-screening for application ${applicationId}: ${error.message}`,
               error.stack
            );
            // Don't throw error - post-screening processing failure shouldn't break the screening process
         }
      }
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
    * Create or update existing screening record
    */
   private async createOrUpdateScreeningRecord(
      applicationId: number,
      jobPostingId: number
   ): Promise<CvScreeningResultEntity> {
      let screeningResult = await this.screeningRepository.findOne({
         where: { applicationId },
      });

      if (screeningResult) {
         // Update existing record
         screeningResult.status = ScreeningStatus.PROCESSING;
         screeningResult.errorMessage = undefined;
         return this.screeningRepository.save(screeningResult);
      } else {
         // Create new record
         return this.createScreeningRecord(applicationId, jobPostingId);
      }
   }

}
