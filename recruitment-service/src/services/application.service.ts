import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ApplicationEntity } from '../entities/recruitment/application.entity';
import { JobPostingEntity } from '../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../entities/recruitment/candidate.entity';
import { 
   CreateApplicationDto, 
   UpdateApplicationDto, 
   ApplicationResponseDto, 
   GetApplicationsQueryDto 
} from '../dto/application.dto';

@Injectable()
export class ApplicationService {
   constructor(
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
   ) {}

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
               candidateId: createApplicationDto.candidateId 
            },
         });

         if (existingApplication) {
            throw new BadRequestException('Candidate has already applied for this job posting');
         }

         const application = this.applicationRepository.create({
            ...createApplicationDto,
            expectedStartDate: createApplicationDto.expectedStartDate ? new Date(createApplicationDto.expectedStartDate) : undefined,
            status: 'submitted', // Default status
            appliedDate: new Date(),
         });

         const savedApplication = await this.applicationRepository.save(application);
         return this.mapToResponseDto(savedApplication);
      } catch (error) {
         if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException('Failed to create application');
      }
   }

   async findAll(query: GetApplicationsQueryDto): Promise<{ data: ApplicationResponseDto[]; total: number }> {
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
         sortOrder = 'DESC' 
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
         data: applications.map(app => this.mapToResponseDto(app)),
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

   async update(id: number, updateApplicationDto: UpdateApplicationDto): Promise<ApplicationResponseDto> {
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
         reviewedDate: updateApplicationDto.reviewedDate ? new Date(updateApplicationDto.reviewedDate) : undefined,
         offerDate: updateApplicationDto.offerDate ? new Date(updateApplicationDto.offerDate) : undefined,
         offerExpiryDate: updateApplicationDto.offerExpiryDate ? new Date(updateApplicationDto.offerExpiryDate) : undefined,
         offerResponseDate: updateApplicationDto.offerResponseDate ? new Date(updateApplicationDto.offerResponseDate) : undefined,
         expectedStartDate: updateApplicationDto.expectedStartDate ? new Date(updateApplicationDto.expectedStartDate) : undefined,
      };

      Object.assign(application, updateData);
      const updatedApplication = await this.applicationRepository.save(application);

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

      const validStatuses = ['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'];
      if (!validStatuses.includes(status)) {
         throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      application.status = status;
      const updatedApplication = await this.applicationRepository.save(application);

      return this.mapToResponseDto(updatedApplication);
   }

   async makeOffer(id: number, offerData: { offeredSalary: number; offerExpiryDate: string }): Promise<ApplicationResponseDto> {
      const application = await this.applicationRepository.findOne({
         where: { applicationId: id },
      });

      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }

      if (application.status !== 'interviewing') {
         throw new BadRequestException('Can only make offers to applications in interviewing status');
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

   async respondToOffer(id: number, response: 'accepted' | 'rejected'): Promise<ApplicationResponseDto> {
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

   async findByJobPosting(jobPostingId: number): Promise<ApplicationResponseDto[]> {
      const applications = await this.applicationRepository.find({
         where: { jobPostingId },
         order: { appliedDate: 'DESC' },
      });

      return applications.map(app => this.mapToResponseDto(app));
   }

   async findByCandidate(candidateId: number): Promise<ApplicationResponseDto[]> {
      const applications = await this.applicationRepository.find({
         where: { candidateId },
         order: { appliedDate: 'DESC' },
      });

      return applications.map(app => this.mapToResponseDto(app));
   }

   private mapToResponseDto(application: ApplicationEntity): ApplicationResponseDto {
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
            'submitted': 'blue',
            'screening': 'yellow',
            'interviewing': 'orange',
            'offer': 'purple',
            'hired': 'green',
            'rejected': 'red',
            'withdrawn': 'gray'
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
         appliedDate: application.appliedDate.toISOString().split('T')[0],
         reviewedDate: application.reviewedDate?.toISOString().split('T')[0],
         reviewNotes: application.reviewNotes,
         score: application.score,
         feedback: application.feedback,
         offerDate: application.offerDate?.toISOString().split('T')[0],
         offeredSalary: application.offeredSalary,
         offerExpiryDate: application.offerExpiryDate?.toISOString().split('T')[0],
         offerStatus: application.offerStatus,
         offerResponseDate: application.offerResponseDate?.toISOString().split('T')[0],
         rejectionReason: application.rejectionReason,
         expectedStartDate: application.expectedStartDate?.toISOString().split('T')[0],
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
         createdAt: application.createdAt.toISOString(),
         updatedAt: application.updatedAt.toISOString(),
      };
   }
}
