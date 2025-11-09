import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In, Brackets } from 'typeorm';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { ExaminationEntity } from '../../../entities/question/examination.entity';
import {
   CreateApplicationDto,
   UpdateApplicationDto,
   ApplicationResponseDto,
   GetApplicationsQueryDto,
   ApproveAfterInterviewDto,
   RejectAfterInterviewDto,
} from './dto/application.dto';
import { CvScreeningService } from '../cv-screening/cv-screening.service';
import { InformationService } from '../cv-screening/services/information.service';
import { RecruitmentEmailService } from '../email/email.service';
import { QuestionService } from '../question/question.service';

@Injectable()
export class ApplicationService {
   private readonly logger = new Logger(ApplicationService.name);

   constructor(
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      private readonly cvScreeningService: CvScreeningService,
      private readonly informationService: InformationService,
      private readonly recruitmentEmailService: RecruitmentEmailService,
      private readonly questionService: QuestionService,
   ) {}

   /**
    * Trích xuất thông tin từ PDF và tạo application
    * @param pdfFilePath - Đường dẫn đến file PDF
    * @param jobPostingId - ID của job posting (bắt buộc)
    * @returns Application đã được tạo
    */
   async extractApplicationFromPdfs(
      pdfFilePath: string,
      jobPostingId: number,
   ): Promise<ApplicationResponseDto> {
      try {
         this.logger.log(`Bắt đầu trích xuất application từ PDF: ${pdfFilePath}`);

         // Bước 1: Trích xuất thông tin candidate từ PDF
         const candidateInfo = await this.informationService.extractCandidateInformationFromPdf(
            pdfFilePath,
            jobPostingId,
         );

         if (!candidateInfo.success) {
            throw new BadRequestException(
               `Failed to extract candidate information: ${candidateInfo.errorMessage}`,
            );
         }

         if (!candidateInfo.candidateId) {
            throw new BadRequestException('Failed to create candidate from PDF');
         }

         // Bước 2: Kiểm tra xem application đã tồn tại chưa
         const existingApplication = await this.applicationRepository.findOne({
            where: {
               jobPostingId,
               candidateId: candidateInfo.candidateId,
            },
         });

         if (existingApplication) {
            this.logger.log(
               `Application đã tồn tại cho candidate ${candidateInfo.candidateId} và job ${jobPostingId}`,
            );
            return this.mapToResponseDto(existingApplication);
         }

         // Bước 3: Tạo application mới sử dụng hàm create
         const createApplicationDto: CreateApplicationDto = {
            jobPostingId,
            candidateId: candidateInfo.candidateId,
            resumeUrl: pdfFilePath,
            coverLetter: candidateInfo.extractedData.aiAnalysis?.summary || '',
            applicationNotes: `Application created from PDF extraction. AI Analysis: ${JSON.stringify(
               candidateInfo.extractedData.aiAnalysis,
            )}`,
            priority: 'medium',
         };

         // Gọi hàm create để tạo application
         const application = await this.create(createApplicationDto);

         this.logger.log(
            `Đã tạo application thành công từ PDF với ID: ${application.applicationId}`,
         );

         return application;
      } catch (error) {
         this.logger.error(`Lỗi khi trích xuất application từ PDF: ${error.message}`, error.stack);

         if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Failed to extract application from PDF', error.message);
      }
   }

   async create(createApplicationDto: CreateApplicationDto): Promise<ApplicationResponseDto> {
      try {
         // Verify job posting exists and is active
         const jobPosting = await this.jobPostingRepository.findOne({
            where: { jobPostingId: createApplicationDto.jobPostingId },
            relations: ['questionSet'],
         });

         if (!jobPosting) {
            throw new NotFoundException('Job posting not found');
         }

         if (jobPosting.status !== 'published') {
            throw new BadRequestException('Job posting is not published');
         }

         if (new Date(jobPosting.applicationDeadline) <= new Date()) {
            throw new BadRequestException('Application deadline has passed');
         }

         // Verify candidate exists
         const candidate = await this.candidateRepository.findOne({
            where: { candidateId: createApplicationDto.candidateId },
         });

         if (!candidate) {
            throw new NotFoundException('Candidate not found');
         }

         // Check if application already exists for this job posting and candidate
         const existingApplication = await this.applicationRepository.findOne({
            where: {
               jobPostingId: createApplicationDto.jobPostingId,
               candidateId: createApplicationDto.candidateId,
            },
         });

         if (existingApplication) {
            throw new BadRequestException('Candidate has already applied for this job posting');
         }

         // Create application - explicitly exclude status to prevent client manipulation
         // Extract only allowed fields, explicitly ignore status if present
         const applicationData: Partial<CreateApplicationDto> = {
            jobPostingId: createApplicationDto.jobPostingId,
            candidateId: createApplicationDto.candidateId,
            coverLetter: createApplicationDto.coverLetter,
            resumeUrl: createApplicationDto.resumeUrl,
            expectedStartDate: createApplicationDto.expectedStartDate,
            priority: createApplicationDto.priority,
            applicationNotes: createApplicationDto.applicationNotes,
            tags: createApplicationDto.tags,
         };
         const application = this.applicationRepository.create({
            ...applicationData,
            expectedStartDate: applicationData.expectedStartDate
               ? new Date(applicationData.expectedStartDate)
               : undefined,
            status: 'submitted', // Always set to submitted - client cannot override
            appliedDate: new Date(),
         });

         const savedApplication = await this.applicationRepository.save(application);

         // Trigger CV screening if resume is provided
         if (savedApplication.resumeUrl) {
            try {
               this.logger.log(
                  `Triggering CV screening for application ${savedApplication.applicationId}`,
               );
               await this.cvScreeningService.triggerScreening(savedApplication.applicationId);
               this.logger.log(
                  `CV screening triggered successfully for application ${savedApplication.applicationId}`,
               );
            } catch (error) {
               this.logger.error(
                  `Failed to trigger CV screening for application ${savedApplication.applicationId}: ${error.message}`,
                  error.stack,
               );
               // Don't fail the application creation if screening fails
            }
         } else {
            this.logger.warn(
               `No resume URL provided for application ${savedApplication.applicationId}, skipping CV screening`,
            );
         }

         // Send thank you email to candidate
         try {
            this.logger.log(
               `Sending thank you email for application ${savedApplication.applicationId}`,
            );
            await this.recruitmentEmailService.sendApplicationThankYouEmail(
               candidate,
               jobPosting,
               savedApplication,
            );
            this.logger.log(
               `✅ Thank you email sent successfully for application ${savedApplication.applicationId}`,
            );
         } catch (emailError) {
            this.logger.error(
               `❌ Failed to send thank you email for application ${savedApplication.applicationId}: ${emailError.message}`,
               emailError.stack,
            );
            // Don't fail the application creation if email fails
         }

         return this.mapToResponseDto(savedApplication);
      } catch (error) {
         if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Failed to create application', error.message);
      }
   }

   async findAll(
      query: GetApplicationsQueryDto,
   ): Promise<{ data: ApplicationResponseDto[]; total: number }> {
      const {
         page = 0,
         limit = 10,
         jobPostingId,
         candidateId,
         status,
         priority,
         offerStatus,
         reviewedBy,
         hiringManagerId,
         sortBy = 'appliedDate',
         sortOrder = 'DESC',
      } = query;

      const findOptions: FindManyOptions<ApplicationEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
      };

      // Build where conditions
      const whereConditions: any = {};

      if (jobPostingId) {
         whereConditions.jobPostingId = jobPostingId;
      }

      if (candidateId) {
         whereConditions.candidateId = candidateId;
      }

      if (status) {
         whereConditions.status = status;
      }

      if (priority) {
         whereConditions.priority = priority;
      }

      if (offerStatus) {
         whereConditions.offerStatus = offerStatus;
      }

      if (reviewedBy) {
         whereConditions.reviewedBy = reviewedBy;
      }

      if (hiringManagerId) {
         whereConditions.hiringManagerId = hiringManagerId;
      }

      if (Object.keys(whereConditions).length > 0) {
         findOptions.where = whereConditions;
      }

      const [applications, total] = await this.applicationRepository.findAndCount(findOptions);

      return {
         data: applications.map((app) => this.mapToResponseDto(app)),
         total,
      };
   }

   async findOne(applicationId: number): Promise<any> {
      const row = await this.applicationRepository
         .createQueryBuilder('application')
         .leftJoin('candidate', 'candidate', 'application.candidateId = candidate.candidateId')
         .select(['row_to_json(application) as application', 'row_to_json(candidate) as candidate'])
         .where('application.applicationId = :applicationId', { applicationId })
         .getRawOne();

      return row;
   }

   async update(
      id: number,
      updateApplicationDto: UpdateApplicationDto,
   ): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      // Validate offer salary and dates
      if (updateApplicationDto.offeredSalary && updateApplicationDto.offeredSalary <= 0) {
         throw new BadRequestException('Offered salary must be greater than 0');
      }

      if (updateApplicationDto.offerDate && updateApplicationDto.offerExpiryDate) {
         const offerDate = new Date(updateApplicationDto.offerDate);
         const expiryDate = new Date(updateApplicationDto.offerExpiryDate);

         if (expiryDate <= offerDate) {
            throw new BadRequestException('Offer expiry date must be after offer date');
         }
      }

      // Convert date strings to Date objects
      const updateData = {
         ...updateApplicationDto,
         reviewedDate: updateApplicationDto.reviewedDate
            ? new Date(updateApplicationDto.reviewedDate)
            : undefined,
         offerDate: updateApplicationDto.offerDate
            ? new Date(updateApplicationDto.offerDate)
            : undefined,
         offerExpiryDate: updateApplicationDto.offerExpiryDate
            ? new Date(updateApplicationDto.offerExpiryDate)
            : undefined,
         offerResponseDate: updateApplicationDto.offerResponseDate
            ? new Date(updateApplicationDto.offerResponseDate)
            : undefined,
         expectedStartDate: updateApplicationDto.expectedStartDate
            ? new Date(updateApplicationDto.expectedStartDate)
            : undefined,
      };

      // Check if resume URL is being updated and trigger screening if needed
      const resumeUrlChanged =
         updateApplicationDto.resumeUrl && updateApplicationDto.resumeUrl !== application.resumeUrl;

      Object.assign(application, updateData);
      const updatedApplication = await this.applicationRepository.save(application);

      // Trigger CV screening if resume URL was added or changed
      if (resumeUrlChanged) {
         try {
            this.logger.log(`Resume URL updated for application ${id}, triggering CV screening`);
            await this.cvScreeningService.triggerScreening(id);
            this.logger.log(`CV screening triggered successfully for updated application ${id}`);
         } catch (error) {
            this.logger.error(
               `Failed to trigger CV screening for updated application ${id}: ${error.message}`,
               error.stack,
            );
            // Don't fail the update if screening fails
         }
      }

      return this.mapToResponseDto(updatedApplication);
   }

   async remove(id: number): Promise<void> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      await this.applicationRepository.softRemove(application);
   }

   async updateStatus(id: number, status: string): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      const validStatuses = [
         'submitted',
         'screening',
         'interviewing',
         'offer',
         'hired',
         'rejected',
         'withdrawn',
      ];
      if (!validStatuses.includes(status)) {
         throw new BadRequestException(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
         );
      }

      application.status = status;
      const updatedApplication = await this.applicationRepository.save(application);

      return this.mapToResponseDto(updatedApplication);
   }

   async makeOffer(
      id: number,
      offerData: { 
         offeredSalary: number; 
         offerExpiryDate?: string;
         expectedStartDate?: string;
      },
   ): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (application.status !== 'interviewing') {
         throw new BadRequestException(
            'Can only make offers to applications in interviewing status',
         );
      }

      if (offerData.offerExpiryDate) {
      const expiryDate = new Date(offerData.offerExpiryDate);
      if (expiryDate <= new Date()) {
         throw new BadRequestException('Offer expiry date must be in the future');
         }
         application.offerExpiryDate = expiryDate;
      }

      application.status = 'offer';
      application.offerDate = new Date();
      application.offeredSalary = offerData.offeredSalary;
      application.offerStatus = 'pending';

      if (offerData.expectedStartDate) {
         const startDate = new Date(offerData.expectedStartDate);
         if (startDate <= new Date()) {
            throw new BadRequestException('Expected start date must be in the future');
         }
         application.expectedStartDate = startDate;
      }

      const updatedApplication = await this.applicationRepository.save(application);
      return this.mapToResponseDto(updatedApplication);
   }

   async respondToOffer(
      id: number,
      response: 'accepted' | 'rejected',
   ): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (application.status !== 'offer' || application.offerStatus !== 'pending') {
         throw new BadRequestException('No pending offer found for this application');
      }

      if (application.offerExpiryDate && new Date() > application.offerExpiryDate) {
         throw new BadRequestException('Offer has expired');
      }

      application.offerStatus = response;
      application.offerResponseDate = new Date();

      if (response === 'accepted') {
         application.status = 'hired';
      } else {
         application.status = 'rejected';
      }

      const updatedApplication = await this.applicationRepository.save(application);
      return this.mapToResponseDto(updatedApplication);
   }

   async approveAfterInterview(
      id: number,
      approveData: ApproveAfterInterviewDto,
   ): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (application.status !== 'interviewing') {
         throw new BadRequestException(
            'Can only approve applications in interviewing status',
         );
      }

      const interview = await this.interviewRepository.findOne({
         where: {
            candidate_id: application.candidateId,
            job_id: application.jobPostingId,
         },
         order: { createdAt: 'DESC' },
      });

      if (!interview) {
         throw new BadRequestException('Interview not found for this application');
      }

      if (interview.status !== 'completed') {
         throw new BadRequestException(
            'Can only approve applications with completed interviews',
         );
      }

      const startDate = new Date(approveData.expectedStartDate);
      if (startDate <= new Date()) {
         throw new BadRequestException('Expected start date must be in the future');
      }

      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: application.jobPostingId },
      });

      if (!jobPosting) {
         throw new NotFoundException('Job posting not found');
      }

      const offerData: {
         offeredSalary: number;
         offerExpiryDate?: string;
         expectedStartDate: string;
      } = {
         offeredSalary: approveData.offeredSalary,
         expectedStartDate: approveData.expectedStartDate,
      };

      if (approveData.offerExpiryDate) {
         offerData.offerExpiryDate = approveData.offerExpiryDate;
      }

      const updatedApplication = await this.makeOffer(id, offerData);

      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: application.candidateId },
      });

      if (!candidate) {
         throw new NotFoundException('Candidate not found');
      }

      // Fetch the updated application entity for email service
      const updatedApplicationEntity = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!updatedApplicationEntity) {
         throw new NotFoundException('Updated application not found');
      }

      await this.recruitmentEmailService.sendOfferEmail(
         candidate,
         jobPosting,
         updatedApplicationEntity,
         approveData.expectedStartDate,
      );

      this.logger.log(
         `Approved application ${id} after interview and sent offer email`,
      );

      return updatedApplication;
   }

   async rejectAfterInterview(
      id: number,
      rejectData: RejectAfterInterviewDto,
   ): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (application.status !== 'interviewing') {
         throw new BadRequestException(
            'Can only reject applications in interviewing status',
         );
      }

      const interview = await this.interviewRepository.findOne({
         where: {
            candidate_id: application.candidateId,
            job_id: application.jobPostingId,
         },
         order: { createdAt: 'DESC' },
      });

      if (!interview) {
         throw new BadRequestException('Interview not found for this application');
      }

      if (interview.status !== 'completed') {
         throw new BadRequestException(
            'Can only reject applications with completed interviews',
         );
      }

      application.status = 'rejected';
      if (rejectData.rejectionReason) {
         application.rejectionReason = rejectData.rejectionReason;
      }

      const updatedApplication = await this.applicationRepository.save(application);

      const candidate = await this.candidateRepository.findOne({
         where: { candidateId: application.candidateId },
      });

      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: application.jobPostingId },
      });

      if (!candidate || !jobPosting) {
         this.logger.warn(
            `Candidate or job posting not found for application ${id}. Cannot send rejection email.`,
         );
      } else {
         await this.recruitmentEmailService.sendInterviewRejectionEmail(
            candidate,
            jobPosting,
            updatedApplication,
         );
      }

      this.logger.log(`Rejected application ${id} after interview`);

      return this.mapToResponseDto(updatedApplication);
   }

   async findByJobPosting(jobPostingId: number, page: number = 0, limit: number = 10) {
      const qb = this.applicationRepository
         .createQueryBuilder('application')
         .leftJoin('candidate', 'candidate', 'application.candidateId = candidate.candidateId')
         .select(['candidate.* as candidate', 'application.* as application'])
         .where('application.jobPostingId = :jobPostingId', { jobPostingId })
         .orderBy('application.appliedDate', 'DESC');

      const [rows, total] = await Promise.all([
         qb
            .clone()
            .skip(page * limit)
            .take(limit)
            .getRawMany(),
         qb.clone().getCount(),
      ]);

      return { data: rows, total, page, limit };
   }

   async findByCandidate(candidateId: number): Promise<ApplicationResponseDto[]> {
      const applications = await this.applicationRepository.find({
         where: { candidateId },
         order: { appliedDate: 'DESC' },
      });

      return applications.map((app) => this.mapToResponseDto(app));
   }

   async findByCandidateEmail(email: string): Promise<ApplicationResponseDto[]> {
      const candidate = await this.candidateRepository.findOne({
         where: { email },
      });

      if (!candidate) {
         return [];
      }

      return this.findByCandidate(candidate.candidateId);
   }

   /**
    * Find applications that need interview scheduling
    * Returns applications with status='screening_passed' that don't have a scheduled interview yet
    */
   async findInterviewRequests(query?: {
      page?: number;
      limit?: number;
      jobPostingId?: number;
      minScreeningScore?: number;
   }): Promise<{ data: ApplicationResponseDto[]; total: number; page: number; limit: number }> {
      const page = query?.page || 0;
      const limit = query?.limit || 20;

      // Use query builder to find applications with status='screening_passed'
      // that don't have a scheduled interview (no interview OR interview.status='pending')
      // AND if job has test, examination must be completed and passed
      const qb = this.applicationRepository
         .createQueryBuilder('application')
         .leftJoin(
            InterviewEntity,
            'interview',
            'interview.candidate_id = application.candidateId AND interview.job_id = application.jobPostingId',
         )
         .leftJoin(
            JobPostingEntity,
            'jobPosting',
            'jobPosting.jobPostingId = application.jobPostingId',
         )
         .leftJoin(
            ExaminationEntity,
            'examination',
            'examination.applicationId = application.applicationId',
         )
         .where('application.status = :status', { status: 'screening_passed' })
         .andWhere('(interview.interview_id IS NULL OR interview.status = :pendingStatus)', {
            pendingStatus: 'pending',
         })
         .andWhere(
            // If job has test: examination must exist and be completed with passing score
            // If job has no test: no examination required
            new Brackets((qb) => {
               qb.where('jobPosting.isTest = false')
                  .orWhere('jobPosting.isTest IS NULL')
                  .orWhere(
                     new Brackets((subQb) => {
                        subQb.where('jobPosting.isTest = true')
                           .andWhere('examination.examinationId IS NOT NULL')
                           .andWhere('examination.status = :completedStatus')
                           .andWhere(
                              new Brackets((scoreQb) => {
                                 scoreQb.where('jobPosting.minScore IS NULL')
                                    .orWhere('examination.totalScore >= jobPosting.minScore');
                              }),
                           );
                     }),
                  );
            }),
            { completedStatus: 'completed' },
         );

      if (query?.jobPostingId) {
         qb.andWhere('application.jobPostingId = :jobPostingId', {
            jobPostingId: query.jobPostingId,
         });
      }

      if (query?.minScreeningScore !== undefined) {
         qb.andWhere('application.screeningScore >= :minScreeningScore', {
            minScreeningScore: query.minScreeningScore,
         });
      }

      // Order by screening score (highest first), then by applied date (oldest first)
      qb.orderBy('application.screeningScore', 'DESC', 'NULLS LAST')
         .addOrderBy('application.appliedDate', 'ASC')
         .skip(page * limit)
         .take(limit);

      const [applications, total] = await qb.getManyAndCount();

      // Load candidate and jobPosting data separately
      const candidateIds = [...new Set(applications.map((app) => app.candidateId))];
      const jobPostingIds = [...new Set(applications.map((app) => app.jobPostingId))];

      const [candidates, jobPostings] = await Promise.all([
         candidateIds.length > 0
            ? this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
            : Promise.resolve([]),
         jobPostingIds.length > 0
            ? this.jobPostingRepository.find({ where: { jobPostingId: In(jobPostingIds) } })
            : Promise.resolve([]),
      ]);

      // Create maps for quick lookup
      const candidateMap = new Map(candidates.map((c) => [c.candidateId, c]));
      const jobPostingMap = new Map(jobPostings.map((j) => [j.jobPostingId, j]));

      // Map to response DTO with candidate and jobPosting info
      const responseData = applications.map((app) => {
         const dto = this.mapToResponseDto(app);
         const candidate = candidateMap.get(app.candidateId);
         const jobPosting = jobPostingMap.get(app.jobPostingId);

         if (candidate) {
            (dto as any).candidate = {
               candidateId: candidate.candidateId,
               firstName: candidate.firstName,
               lastName: candidate.lastName,
               email: candidate.email,
            };
         }
         if (jobPosting) {
            (dto as any).jobPosting = {
               jobPostingId: jobPosting.jobPostingId,
               title: jobPosting.title,
            };
         }
         return dto;
      });

      return {
         data: responseData,
         total,
         page,
         limit,
      };
   }

   private mapToResponseDto(application: ApplicationEntity): ApplicationResponseDto {
      // Helper function to safely format dates
      const formatDate = (date: Date | string | null | undefined): string | undefined => {
         if (!date) return undefined;
         try {
            if (typeof date === 'string') {
               // If it's already a string, check if it's a valid date string
               const parsedDate = new Date(date);
               if (isNaN(parsedDate.getTime())) return undefined;
               return parsedDate.toISOString().split('T')[0];
            }
            if (date instanceof Date) {
               if (isNaN(date.getTime())) return undefined;
               return date.toISOString().split('T')[0];
            }
            return undefined;
         } catch (error) {
            console.error('Error formatting date:', error, 'Date value:', date);
            return undefined;
         }
      };

      const getDaysSinceApplied = (): number => {
         const today = new Date();
         const applied = new Date(application.appliedDate);
         const diffTime = today.getTime() - applied.getTime();
         return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      };

      const getFormattedOfferedSalary = (): string | undefined => {
         if (!application.offeredSalary) return undefined;
         return new Intl.NumberFormat('vi-VN').format(application.offeredSalary) + ' VND';
      };

      const getIsOfferActive = (): boolean => {
         if (!application.offerDate || !application.offerExpiryDate) return false;
         return application.offerStatus === 'pending' && new Date() <= application.offerExpiryDate;
      };

      const getDaysUntilOfferExpiry = (): number | undefined => {
         if (!application.offerExpiryDate) return undefined;
         const today = new Date();
         const expiry = new Date(application.offerExpiryDate);
         const diffTime = expiry.getTime() - today.getTime();
         return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const getStatusColor = (): string => {
         const statusColors = {
            submitted: 'blue',
            screening: 'yellow',
            interviewing: 'orange',
            offer: 'purple',
            hired: 'green',
            rejected: 'red',
            withdrawn: 'gray',
         };
         return statusColors[application.status] || 'gray';
      };

      return {
         applicationId: application.applicationId,
         jobPostingId: application.jobPostingId,
         candidateId: application.candidateId,
         coverLetter: application.coverLetter,
         resumeUrl: application.resumeUrl,
         status: application.status,
         appliedDate: formatDate(application.appliedDate) || new Date().toISOString().split('T')[0],
         reviewedDate: formatDate(application.reviewedDate),
         reviewNotes: application.reviewNotes,
         score: application.score,
         feedback: application.feedback,
         offerDate: formatDate(application.offerDate),
         offeredSalary: application.offeredSalary,
         offerExpiryDate: formatDate(application.offerExpiryDate),
         offerStatus: application.offerStatus,
         offerResponseDate: formatDate(application.offerResponseDate),
         rejectionReason: application.rejectionReason,
         expectedStartDate: formatDate(application.expectedStartDate),
         applicationNotes: application.applicationNotes,
         priority: application.priority,
         tags: application.tags,
         reviewedBy: application.reviewedBy,
         hiringManagerId: application.hiringManagerId,
         isScreeningCompleted: application.isScreeningCompleted ?? false,
         screeningScore: application.screeningScore,
         screeningStatus: application.screeningStatus,
         screeningCompletedAt: application.screeningCompletedAt
            ? application.screeningCompletedAt instanceof Date
               ? application.screeningCompletedAt.toISOString()
               : new Date(application.screeningCompletedAt).toISOString()
            : undefined,
         daysSinceApplied: getDaysSinceApplied(),
         formattedOfferedSalary: getFormattedOfferedSalary(),
         isOfferActive: getIsOfferActive(),
         daysUntilOfferExpiry: getDaysUntilOfferExpiry(),
         statusColor: getStatusColor(),
         createdAt:
            application.createdAt instanceof Date
               ? application.createdAt.toISOString()
               : new Date(application.createdAt).toISOString(),
         updatedAt:
            application.updatedAt instanceof Date
               ? application.updatedAt.toISOString()
               : new Date(application.updatedAt).toISOString(),
      };
   }
}
