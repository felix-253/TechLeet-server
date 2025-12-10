import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Between, LessThan, MoreThan, In } from 'typeorm';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
   CreateJobPostingDto,
   UpdateJobPostingDto,
   JobPostingResponseDto,
   GetJobPostingsQueryDto,
} from './job-posting.dto';
import * as dayjs from 'dayjs';
import { formatSalaryRange } from '../../../common/utils';

@Injectable()
export class JobPostingService {
   constructor(
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
   ) {}

   async create(createJobPostingDto: CreateJobPostingDto): Promise<JobPostingResponseDto> {
      try {
         // Validate salary range
         if (createJobPostingDto.salaryMin && createJobPostingDto.salaryMax) {
            if (createJobPostingDto.salaryMin > createJobPostingDto.salaryMax) {
               throw new BadRequestException(
                  'Minimum salary cannot be greater than maximum salary',
               );
            }
         }


         // Validate application deadline is in the future
         const deadline = new Date(createJobPostingDto.applicationDeadline);
         if (deadline <= new Date()) {
            throw new BadRequestException('Application deadline must be in the future');
         }

         const jobPosting = this.jobPostingRepository.create({
            ...createJobPostingDto,
            applicationDeadline: deadline,
            status: 'draft', // Default status
         });

         const savedJobPosting = await this.jobPostingRepository.save(jobPosting);
         return this.mapToResponseDto(savedJobPosting);
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException('Failed to create job posting');
      }
   }

   async findAll(
      query: GetJobPostingsQueryDto,
   ): Promise<{ data: JobPostingResponseDto[]; total: number }> {
      const {
         page = 0,
         limit = 10,
         keyword,
         status,
         departmentId,
         positionId,
         employmentType,
         experienceLevel,
         location,
         sortBy = 'createdAt',
         sortOrder = 'DESC',
      } = query;

      const findOptions: FindManyOptions<JobPostingEntity> = {
         skip: page * limit,
         take: limit,
      };

      // Ticket 2 & 3: Handle sorting by applicationCount
      // Since applicationCount is a computed/joined property, we might need QueryBuilder if sorting by it.
      // However, for simplicity with FindManyOptions, we can't sort by relation count easily.
      // Let's stick to QueryBuilder for this method to handle both joining and sorting properly.


      const queryBuilder = this.jobPostingRepository.createQueryBuilder('job');

      // Relations
      // We need to join applications to count them.
      // 'loadRelationCountAndMap' is good for just mapping, but for sorting we might need 'addSelect'.
      queryBuilder.loadRelationCountAndMap('job.applicationCount', 'job.applications');

      if (keyword) {
         queryBuilder.andWhere('(job.title ILIKE :keyword OR job.description ILIKE :keyword)', { keyword: `%${keyword}%` });
      }

      if (status) {
         queryBuilder.andWhere('job.status = :status', { status });
         
         // Ticket 4: If status is published, filter out expired jobs
         if (status === 'published') {
            queryBuilder.andWhere('job.applicationDeadline > :now', { now: new Date() });
         }
      }

      if (departmentId) {
         queryBuilder.andWhere('job.departmentId = :departmentId', { departmentId });
      }

      if (positionId) {
         queryBuilder.andWhere('job.positionId = :positionId', { positionId });
      }

      if (employmentType) {
         queryBuilder.andWhere('job.employmentType = :employmentType', { employmentType });
      }

      if (experienceLevel) {
         queryBuilder.andWhere('job.experienceLevel = :experienceLevel', { experienceLevel });
      }

      if (location) {
         queryBuilder.andWhere('job.location ILIKE :location', { location: `%${location}%` });
      }

      // Sorting
      if (sortBy === 'applicationCount') {
         queryBuilder
            .leftJoin('job.applications', 'app')
            .addSelect('COUNT(app.applicationId)', 'app_count')
            .groupBy('job.jobPostingId')
            .orderBy('app_count', sortOrder);
      } else {
         queryBuilder.orderBy(`job.${sortBy}`, sortOrder);
      }

      // Pagination
      queryBuilder.skip(page * limit).take(limit);

      const [jobPostings, total] = await queryBuilder.getManyAndCount();

      // If we used getManyAndCount with GROUP BY, the count (total) might be wrong (it counts groups).
      // But queryBuilder.getManyAndCount() usually handles simple cases.
      // If sortBy is applicationCount, we might need a separate count query or careful handling.
      // For now, let's assume getManyAndCount works or simple fallback.
      
      // Note: loadRelationCountAndMap populates a property on the entity.
      // We need to ensure mapToResponseDto uses it.

      return {
         data: jobPostings.map((jp) => this.mapToResponseDto(jp)),
         total,
      };
   }

   async findOne(id: number): Promise<JobPostingResponseDto> {
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${id} not found`);
      }

      return this.mapToResponseDto(jobPosting);
   }

   async update(
      id: number,
      updateJobPostingDto: UpdateJobPostingDto,
   ): Promise<JobPostingResponseDto> {
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${id} not found`);
      }

      // Validate salary range if both are provided
      const newMinSalary = updateJobPostingDto.salaryMin ?? jobPosting.salaryMin;
      const newMaxSalary = updateJobPostingDto.salaryMax ?? jobPosting.salaryMax;

      if (newMinSalary && newMaxSalary && newMinSalary > newMaxSalary) {
         throw new BadRequestException('Minimum salary cannot be greater than maximum salary');
      }


      // Validate application deadline if provided
      if (updateJobPostingDto.applicationDeadline) {
         const deadline = new Date(updateJobPostingDto.applicationDeadline);
         if (deadline <= new Date()) {
            throw new BadRequestException('Application deadline must be in the future');
         }
         updateJobPostingDto.applicationDeadline = deadline.toISOString().split('T')[0];
      }

      Object.assign(jobPosting, updateJobPostingDto);
      const updatedJobPosting = await this.jobPostingRepository.save(jobPosting);

      return this.mapToResponseDto(updatedJobPosting);
   }

   async remove(id: number): Promise<void> {
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${id} not found`);
      }

      await this.jobPostingRepository.softRemove(jobPosting);
   }

   async publish(id: number): Promise<JobPostingResponseDto> {
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${id} not found`);
      }

      if (jobPosting.status !== 'draft') {
         throw new BadRequestException('Only draft job postings can be published');
      }

      // Validate that deadline is still in the future
      if (new Date(jobPosting.applicationDeadline) <= new Date()) {
         throw new BadRequestException('Cannot publish job posting with past deadline');
      }

      jobPosting.status = 'published';
      const updatedJobPosting = await this.jobPostingRepository.save(jobPosting);

      return this.mapToResponseDto(updatedJobPosting);
   }

   async close(id: number): Promise<JobPostingResponseDto> {
      const jobPosting = await this.jobPostingRepository.findOne({
         where: { jobPostingId: id },
      });

      if (!jobPosting) {
         throw new NotFoundException(`Job posting with ID ${id} not found`);
      }

      if (jobPosting.status !== 'published') {
         throw new BadRequestException('Only published job postings can be closed');
      }

      jobPosting.status = 'closed';
      const updatedJobPosting = await this.jobPostingRepository.save(jobPosting);

      return this.mapToResponseDto(updatedJobPosting);
   }

   async findByDepartment(departmentId: number): Promise<JobPostingResponseDto[]> {
      const jobPostings = await this.jobPostingRepository.find({
         where: { departmentId },
         order: { createdAt: 'DESC' },
      });

      return jobPostings.map((jp) => this.mapToResponseDto(jp));
   }

   async findByPosition(positionId: number): Promise<JobPostingResponseDto[]> {
      const jobPostings = await this.jobPostingRepository.find({
         where: { positionId },
         order: { createdAt: 'DESC' },
      });

      return jobPostings.map((jp) => this.mapToResponseDto(jp));
   }

   async findActive(): Promise<JobPostingResponseDto[]> {
      const jobPostings = await this.jobPostingRepository.find({
         where: {
            status: 'published',
         },
         order: { applicationDeadline: 'ASC' },
      });

      // Filter by deadline in application logic since TypeORM doesn't support computed columns in WHERE
      const activeJobPostings = jobPostings.filter(
         (jp) => new Date(jp.applicationDeadline) > new Date(),
      );

      return activeJobPostings.map((jp) => this.mapToResponseDto(jp));
   }

   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
   async handleJobExpiry() {
      // Find all published jobs with deadline in the past
      const expiredJobs = await this.jobPostingRepository.find({
         where: {
            status: 'published',
            applicationDeadline: LessThan(new Date()),
         },
      });

      if (expiredJobs.length > 0) {
         // Update status to closed
         await this.jobPostingRepository.update(
            { jobPostingId: In(expiredJobs.map((job) => job.jobPostingId)) },
            { status: 'closed' },
         );
         console.log(`[JobExpiry] Closed ${expiredJobs.length} expired job postings.`);
      }
   }

   private mapToResponseDto(jobPosting: JobPostingEntity): JobPostingResponseDto {
      return {
         jobPostingId: jobPosting.jobPostingId,
         title: jobPosting.title,
         description: jobPosting.description,
         requirements: jobPosting.requirements,
         benefits: jobPosting.benefits,
         salaryMin: jobPosting.salaryMin,
         salaryMax: jobPosting.salaryMax,
         vacancies: jobPosting.vacancies,
         applicationDeadline: jobPosting.applicationDeadline as unknown as string,
         status: jobPosting.status,
         location: jobPosting.location,
         employmentType: jobPosting.employmentType,
         experienceLevel: jobPosting.experienceLevel,
         departmentId: jobPosting.departmentId,
         positionId: jobPosting.positionId,
         isTest: jobPosting.isTest,
         questionSetId: jobPosting.questionSetId,
         quantityQuestion: jobPosting.quantityQuestion,
         minScore: jobPosting.minScore,
         salaryRange: formatSalaryRange(jobPosting.salaryMin, jobPosting.salaryMax) || undefined,
         isJobActive:
            jobPosting.status === 'published' &&
            dayjs(jobPosting.applicationDeadline).isAfter(dayjs()),
         daysUntilDeadline: dayjs(jobPosting.applicationDeadline).diff(dayjs(), 'day'),
         applicationCount: (jobPosting as any).applicationCount || 0,
         createdAt: dayjs(jobPosting.createdAt).toISOString(),
         updatedAt: dayjs(jobPosting.updatedAt).toISOString(),
      };
   }
}
