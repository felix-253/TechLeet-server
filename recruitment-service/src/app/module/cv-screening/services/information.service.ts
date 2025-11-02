import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CvTextExtractionService } from '../processors/cv-text-extraction.service';
import { CvNlpProcessingService, ProcessedCvData } from '../processors/cv-nlp-processing.service';
import { CvLlmSummaryService } from '../processors/cv-llm-summary.service';
import { AdaptiveThresholdService } from './adaptive-threshold.service';
import { CvQueueService } from './cv-queue.service';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import * as fs from 'fs';
import * as path from 'path';
import { ApplicationService } from '../../application/application.service';

export interface CandidateInformationResult {
   success: boolean;
   candidateId?: number;
   applicationId?: number;
   extractedData: {
      personalInfo: {
         firstName?: string;
         lastName?: string;
         email?: string;
         phoneNumber?: string;
         address?: string;
      };
      professionalInfo: {
         yearsOfExperience?: number;
         currentJobTitle?: string;
         currentCompany?: string;
         educationLevel?: string;
         university?: string;
         graduationYear?: number;
         skills?: string[];
         programmingLanguages?: string[];
         summary?: string;
      };
      aiAnalysis?: {
         summary: string;
         keyHighlights: string[];
         concerns: string[];
         fitScore: number;
         recommendation: string;
      };
   };
   processingTimeMs: number;
   errorMessage?: string;
}

export interface FilteredCandidateData {
   candidateId: number;
   applicationId: number;
   fullName: string;
   email: string;
   phoneNumber: string;
   yearsOfExperience: number;
   currentJobTitle?: string;
   currentCompany?: string;
   educationLevel?: string;
   skills: string[];
   aiSummary?: string;
   fitScore?: number;
   screeningStatus: string;
   appliedDate: Date;
}

@Injectable()
export class InformationService {
   private readonly logger = new Logger(InformationService.name);

   constructor(
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      private readonly textExtractionService: CvTextExtractionService,
      private readonly nlpProcessingService: CvNlpProcessingService,
      private readonly llmSummaryService: CvLlmSummaryService,
      private readonly adaptiveThresholdService: AdaptiveThresholdService,
      private readonly cvQueueService: CvQueueService,
      private readonly dataSource: DataSource,
      @Inject(forwardRef(() => ApplicationService)) private readonly applicationService: ApplicationService,
   ) {}

   /**
    * Đọc file PDF và trích xuất thông tin ứng viên để filter vào table
    * @param pdfFilePath - Đường dẫn đến file PDF
    * @param jobPostingId - ID của job posting (optional)
    * @param candidateId - ID của candidate nếu đã tồn tại (optional)
    * @param senderEmail - Email của người gửi (từ Brevo hoặc nguồn khác) - ưu tiên dùng email này (optional)
    * @returns Thông tin ứng viên đã được trích xuất và lưu vào database
    */
   async extractCandidateInformationFromPdf(
      pdfFilePath: string,
      jobPostingId?: number,
      candidateId?: number,
      senderEmail?: string,
   ): Promise<CandidateInformationResult> {
      const startTime = Date.now();

      try {
         this.logger.log(`Bắt đầu trích xuất thông tin từ PDF: ${pdfFilePath}`);

         // Bước 1: Kiểm tra file PDF tồn tại
         if (!fs.existsSync(pdfFilePath)) {
            throw new BadRequestException(`File PDF không tồn tại: ${pdfFilePath}`);
         }

         // Bước 2: Trích xuất text từ PDF
         const extractedTextResult =
            await this.textExtractionService.extractTextFromPdf(pdfFilePath);
         this.logger.log(`Đã trích xuất ${extractedTextResult.text.length} ký tự từ PDF`);

         // Bước 3: Xử lý text bằng NLP để trích xuất thông tin có cấu trúc
         const processedData = await this.nlpProcessingService.processCvText(
            extractedTextResult.text,
         );
         this.logger.log(
            `Đã xử lý NLP: ${processedData.totalExperienceYears} năm kinh nghiệm, ${processedData.skills.technical.length} kỹ năng kỹ thuật`,
         );

         // Bước 4: Phân tích bằng AI model để tạo summary và đánh giá
         let aiAnalysis;
         try {
            const aiSummaryResult = await this.llmSummaryService.generateCvSummary(
               extractedTextResult.text,
               processedData,
            );
            aiAnalysis = {
               summary: aiSummaryResult.summary,
               keyHighlights: aiSummaryResult.keyHighlights,
               concerns: aiSummaryResult.concerns,
               fitScore: aiSummaryResult.fitScore,
               recommendation: aiSummaryResult.recommendation,
            };
            this.logger.log(`Đã tạo AI summary với fit score: ${aiAnalysis.fitScore}`);
         } catch (aiError) {
            this.logger.warn(`AI analysis failed: ${aiError.message}`);
            // Tiếp tục xử lý mà không có AI analysis
            aiAnalysis = null;
         }

         // Bước 5: Tạo hoặc cập nhật candidate trong database
         const candidate = await this.createOrUpdateCandidate(
            processedData,
            candidateId,
            senderEmail,
         );
         this.logger.log(`Đã tạo/cập nhật candidate với ID: ${candidate.candidateId}`);

         // Bước 6: Tạo application nếu có jobPostingId
         let application;
         if (jobPostingId) {
            application = await this.createApplication(
               candidate.candidateId,
               jobPostingId,
               processedData,
               aiAnalysis,
            );
            this.logger.log(`Đã tạo application với ID: ${application.applicationId}`);
         }

         const processingTime = Date.now() - startTime;

         return {
            success: true,
            candidateId: candidate.candidateId,
            applicationId: application?.applicationId,
            extractedData: {
               personalInfo: {
                  firstName: candidate.firstName,
                  lastName: candidate.lastName,
                  email: candidate.email,
                  phoneNumber: candidate.phoneNumber,
                  address: candidate.address,
               },
               professionalInfo: {
                  yearsOfExperience: candidate.yearsOfExperience,
                  currentJobTitle: candidate.currentJobTitle,
                  currentCompany: candidate.currentCompany,
                  educationLevel: candidate.educationLevel,
                  university: candidate.university,
                  graduationYear: candidate.graduationYear,
                  skills: candidate.skills ? JSON.parse(candidate.skills) : [],
                  programmingLanguages: candidate.programmingLanguages
                     ? JSON.parse(candidate.programmingLanguages)
                     : [],
                  summary: candidate.summary,
               },
               aiAnalysis,
            },
            processingTimeMs: processingTime,
         };
      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(
            `Lỗi khi trích xuất thông tin từ PDF sau ${processingTime}ms: ${error.message}`,
            error.stack,
         );

         return {
            success: false,
            extractedData: {
               personalInfo: {},
               professionalInfo: {},
            },
            processingTimeMs: processingTime,
            errorMessage: error.message,
         };
      }
   }

   /**
    * Lấy danh sách ứng viên đã được filter với thông tin đầy đủ
    * @param filters - Các bộ lọc tùy chọn
    * @returns Danh sách ứng viên đã được filter
    */
   async getFilteredCandidates(
      filters: {
         jobPostingId?: number;
         minExperience?: number;
         maxExperience?: number;
         educationLevel?: string;
         skills?: string[];
         minFitScore?: number;
         status?: string;
         limit?: number;
         offset?: number;
      } = {},
   ): Promise<{
      candidates: FilteredCandidateData[];
      total: number;
      filters: typeof filters;
   }> {
      try {
         this.logger.log('Lấy danh sách ứng viên đã được filter');

         const queryBuilder = this.applicationRepository
            .createQueryBuilder('app')
            .leftJoin(CandidateEntity, 'candidate', 'app.candidateId = candidate.candidateId')
            .addSelect([
               'candidate.candidateId',
               'candidate.firstName',
               'candidate.lastName',
               'candidate.email',
               'candidate.phoneNumber',
               'candidate.yearsOfExperience',
               'candidate.currentJobTitle',
               'candidate.currentCompany',
               'candidate.educationLevel',
               'candidate.skills',
               'candidate.summary',
            ])
            .where('app.isScreeningCompleted = :isScreeningCompleted', {
               isScreeningCompleted: true,
            });

         // Áp dụng filters
         if (filters.jobPostingId) {
            queryBuilder.andWhere('app.jobPostingId = :jobPostingId', {
               jobPostingId: filters.jobPostingId,
            });
         }

         if (filters.minExperience !== undefined) {
            queryBuilder.andWhere('candidate.yearsOfExperience >= :minExperience', {
               minExperience: filters.minExperience,
            });
         }

         if (filters.maxExperience !== undefined) {
            queryBuilder.andWhere('candidate.yearsOfExperience <= :maxExperience', {
               maxExperience: filters.maxExperience,
            });
         }

         if (filters.educationLevel) {
            queryBuilder.andWhere('candidate.educationLevel ILIKE :educationLevel', {
               educationLevel: `%${filters.educationLevel}%`,
            });
         }

         if (filters.skills && filters.skills.length > 0) {
            const skillsCondition = filters.skills
               .map((_, index) => `candidate.skills ILIKE :skill${index}`)
               .join(' OR ');
            queryBuilder.andWhere(`(${skillsCondition})`);
            filters.skills.forEach((skill, index) => {
               queryBuilder.setParameter(`skill${index}`, `%${skill}%`);
            });
         }

         if (filters.minFitScore !== undefined) {
            queryBuilder.andWhere('app.screeningScore >= :minFitScore', {
               minFitScore: filters.minFitScore,
            });
         }

         if (filters.status) {
            queryBuilder.andWhere('app.status = :status', { status: filters.status });
         }

         // Đếm tổng số records
         const total = await queryBuilder.getCount();

         // Áp dụng pagination
         if (filters.limit) {
            queryBuilder.limit(filters.limit);
         }
         if (filters.offset) {
            queryBuilder.offset(filters.offset);
         }

         // Sắp xếp theo screening score giảm dần
         queryBuilder.orderBy('app.screeningScore', 'DESC');

         const applications = await queryBuilder.getMany();

         // Lấy thông tin candidate cho từng application
         const candidates: FilteredCandidateData[] = [];
         for (const app of applications) {
            const candidate = await this.candidateRepository.findOne({
               where: { candidateId: app.candidateId },
            });

            if (candidate) {
               candidates.push({
                  candidateId: app.candidateId,
                  applicationId: app.applicationId,
                  fullName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
                  email: candidate.email || '',
                  phoneNumber: candidate.phoneNumber || '',
                  yearsOfExperience: candidate.yearsOfExperience || 0,
                  currentJobTitle: candidate.currentJobTitle,
                  currentCompany: candidate.currentCompany,
                  educationLevel: candidate.educationLevel,
                  skills: candidate.skills ? JSON.parse(candidate.skills) : [],
                  aiSummary: candidate.summary,
                  fitScore: app.screeningScore,
                  screeningStatus: app.screeningStatus || 'completed',
                  appliedDate: app.appliedDate,
               });
            }
         }

         return {
            candidates,
            total,
            filters,
         };
      } catch (error) {
         this.logger.error(`Lỗi khi lấy danh sách ứng viên: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Tạo hoặc cập nhật candidate trong database
    * @param processedData - Dữ liệu đã được xử lý từ CV
    * @param candidateId - ID của candidate nếu đã tồn tại (optional)
    * @param senderEmail - Email của người gửi từ Brevo (ưu tiên sử dụng) (optional)
    */
   private async createOrUpdateCandidate(
      processedData: ProcessedCvData,
      candidateId?: number,
      senderEmail?: string,
   ): Promise<CandidateEntity> {
      try {
         let candidate: CandidateEntity;

         // Ưu tiên dùng email từ Brevo sender, fallback về email từ CV
         const emailToUse = senderEmail || processedData.personalInfo.email;

         if (candidateId) {
            // Cập nhật candidate hiện có theo ID
            const existingCandidate = await this.candidateRepository.findOne({
               where: { candidateId },
            });
            if (!existingCandidate) {
               throw new NotFoundException(`Candidate với ID ${candidateId} không tồn tại`);
            }
            candidate = existingCandidate;
            this.logger.log(`Updating existing candidate by ID: ${candidateId}`);
         } else {
            // Kiểm tra xem candidate có tồn tại với email này chưa
            if (emailToUse) {
               const existingCandidateByEmail = await this.candidateRepository.findOne({
                  where: { email: emailToUse },
               });

               if (existingCandidateByEmail) {
                  this.logger.log(`Found existing candidate with email ${emailToUse}, updating...`);
                  if (senderEmail) {
                     this.logger.log(`✅ Using Brevo sender email: ${senderEmail}`);
                  }
                  candidate = existingCandidateByEmail;
               } else {
                  // Tạo candidate mới
                  this.logger.log(`Creating new candidate with email ${emailToUse}`);
                  if (senderEmail) {
                     this.logger.log(`✅ Using Brevo sender email: ${senderEmail}`);
                  }
                  candidate = this.candidateRepository.create();
               }
            } else {
               // Không có email, tạo candidate mới với fallback email
               this.logger.log('No email extracted, creating new candidate with fallback email');
               candidate = this.candidateRepository.create();
            }
         }

         // Cập nhật thông tin từ processed data
         if (processedData.personalInfo.name) {
            const nameParts = processedData.personalInfo.name
               .split(' ')
               .filter((part) => part.trim());
            candidate.firstName = nameParts[0] || 'Nguyễn Tấn';
            candidate.lastName = nameParts.slice(1).join(' ') || 'Vũ';
         } else {
            // Fallback nếu không trích xuất được tên
            candidate.firstName = 'Nguyễn Tấn';
            candidate.lastName = 'Vũ';
         }

         if (processedData.personalInfo.email) {
            candidate.email = processedData.personalInfo.email;
         } else if (senderEmail) {
            // Ưu tiên dùng senderEmail nếu không extract được từ CV
            candidate.email = senderEmail;
         } else {
            // Fallback email nếu không trích xuất được và không có senderEmail (only for new candidates)
            if (!candidate.candidateId) {
               candidate.email = `candidate-${Date.now()}@unknown.com`;
            }
         }

         if (processedData.personalInfo.phone) {
            candidate.phoneNumber = processedData.personalInfo.phone;
         } else {
            // Fallback phone nếu không trích xuất được (only for new candidates)
            if (!candidate.candidateId) {
               candidate.phoneNumber = '000-000-0000';
            }
         }

         if (processedData.personalInfo.location) {
            candidate.address = processedData.personalInfo.location;
         }

         // Thông tin chuyên môn
         candidate.yearsOfExperience = processedData.totalExperienceYears;
         candidate.summary = processedData.summary;

         // Kỹ năng
         if (processedData.skills.technical.length > 0) {
            candidate.skills = JSON.stringify(processedData.skills.technical);
         }

         if (processedData.skills.languages.length > 0) {
            candidate.programmingLanguages = JSON.stringify(processedData.skills.languages);
         }

         // Học vấn
         if (processedData.education.length > 0) {
            const latestEducation = processedData.education[0];
            candidate.educationLevel = latestEducation.degree;
            candidate.university = latestEducation.institution;
            candidate.graduationYear = latestEducation.graduationYear;
         }

         // Kinh nghiệm làm việc
         if (processedData.workExperience.length > 0) {
            const latestExperience = processedData.workExperience[0];
            candidate.currentJobTitle = latestExperience.position;
            candidate.currentCompany = latestExperience.company;
         }

         // Trạng thái mặc định
         if (!candidate.status) {
            candidate.status = 'new';
         }

         if (!candidate.appliedDate) {
            candidate.appliedDate = new Date();
         }

         return await this.candidateRepository.save(candidate);
      } catch (error) {
         this.logger.error(`Lỗi khi tạo/cập nhật candidate: ${error.message}`, error.stack);
         throw error;
      }
   }

   /**
    * Tạo application cho candidate
    */
  private async createApplication(
      candidateId: number,
      jobPostingId: number,
      processedData: ProcessedCvData,
      aiAnalysis?: any,
   ): Promise<ApplicationEntity> {
     try {
        // Delegate to ApplicationService to handle business rules and side effects
        const dto = {
           jobPostingId,
           candidateId,
           resumeUrl: '',
           coverLetter: aiAnalysis?.summary || undefined,
           applicationNotes: aiAnalysis ? `AI Analysis: ${JSON.stringify(aiAnalysis)}` : undefined,
           priority: 'medium' as const,
        };

        let created = await this.applicationService.create(dto as any);

        // If already exists, fallback to fetch existing entity by unique pair
        if (!created?.applicationId) {
           const existing = await this.applicationRepository.findOne({ where: { candidateId, jobPostingId } });
           if (existing) return existing;
        }

        // Load full entity to keep return type consistent
        const savedEntity = await this.applicationRepository.findOne({ where: { applicationId: created.applicationId } });
        if (savedEntity) return savedEntity as ApplicationEntity;

        // As a last resort, return a minimal entity-like object
        return {
           applicationId: created.applicationId,
           jobPostingId,
           candidateId,
           status: 'submitted',
           appliedDate: new Date(),
        } as unknown as ApplicationEntity;
     } catch (error) {
        this.logger.error(`Lỗi khi tạo application: ${error.message}`, error.stack);
        // Attempt to return existing application if duplication error
        const existing = await this.applicationRepository.findOne({ where: { candidateId, jobPostingId } });
        if (existing) return existing;
        throw error;
     }
   }

   /**
    * Lấy thống kê về ứng viên đã được xử lý
    */
   async getCandidateStatistics(): Promise<{
      totalCandidates: number;
      totalApplications: number;
      averageExperience: number;
      topSkills: { skill: string; count: number }[];
      educationDistribution: { level: string; count: number }[];
      screeningStats: {
         completed: number;
         pending: number;
         averageScore: number;
      };
   }> {
      try {
         const [totalCandidates, totalApplications, avgExperienceResult, screeningStatsResult] =
            await Promise.all([
               this.candidateRepository.count(),
               this.applicationRepository.count(),
               this.candidateRepository
                  .createQueryBuilder('candidate')
                  .select('AVG(candidate.yearsOfExperience)', 'avg')
                  .where('candidate.yearsOfExperience IS NOT NULL')
                  .getRawOne(),
               this.applicationRepository
                  .createQueryBuilder('app')
                  .select([
                     'COUNT(CASE WHEN app.isScreeningCompleted = true THEN 1 END) as completed',
                     'COUNT(CASE WHEN app.isScreeningCompleted = false THEN 1 END) as pending',
                     'AVG(app.screeningScore) as averageScore',
                  ])
                  .getRawOne(),
            ]);

         // TODO: Implement real aggregation queries for top skills and education distribution
         const topSkills = [];
         const educationDistribution = [];

         return {
            totalCandidates,
            totalApplications,
            averageExperience: parseFloat(avgExperienceResult?.avg || '0'),
            topSkills,
            educationDistribution,
            screeningStats: {
               completed: parseInt(screeningStatsResult?.completed || '0'),
               pending: parseInt(screeningStatsResult?.pending || '0'),
               averageScore: parseFloat(screeningStatsResult?.averageScore || '0'),
            },
         };
      } catch (error) {
         this.logger.error(`Lỗi khi lấy thống kê: ${error.message}`, error.stack);
         throw error;
      }
   }
}
