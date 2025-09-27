import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import {
   CreateApplicationDto,
   UpdateApplicationDto,
   ApplicationResponseDto,
   GetApplicationsQueryDto,
} from './dto/application.dto';
import { CvScreeningService } from '../cv-screening/cv-screening.service';
import { InformationService } from '../cv-screening/information.service';

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
      private readonly cvScreeningService: CvScreeningService,
      private readonly informationService: InformationService,
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

         const application = this.applicationRepository.create({
            ...createApplicationDto,
            expectedStartDate: createApplicationDto.expectedStartDate
               ? new Date(createApplicationDto.expectedStartDate)
               : undefined,
            status: 'submitted', // Default status
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

   async findOne(id: number): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      return this.mapToResponseDto(application);
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
      offerData: { offeredSalary: number; offerExpiryDate: string },
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

      const expiryDate = new Date(offerData.offerExpiryDate);
      if (expiryDate <= new Date()) {
         throw new BadRequestException('Offer expiry date must be in the future');
      }

      application.status = 'offer';
      application.offerDate = new Date();
      application.offeredSalary = offerData.offeredSalary;
      application.offerExpiryDate = expiryDate;
      application.offerStatus = 'pending';

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

   async findByJobPosting(jobPostingId: number, page: number = 0, limit: number = 10) {
      const qb = this.applicationRepository
         .createQueryBuilder('application')
         .leftJoin('candidate', 'candidate', 'application.candidateId = candidate.candidateId')
         .select(['application.* as application', 'candidate.* as candidate'])
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
