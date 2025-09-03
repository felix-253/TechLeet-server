import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Between } from 'typeorm';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import {
   CreateJobPostingDto,
   UpdateJobPostingDto,
   JobPostingResponseDto,
   GetJobPostingsQueryDto,
} from './job-posting.dto';
import * as dayjs from 'dayjs';

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

         // Validate experience range
         if (createJobPostingDto.minExperience && createJobPostingDto.maxExperience) {
            if (createJobPostingDto.minExperience > createJobPostingDto.maxExperience) {
               throw new BadRequestException(
                  'Minimum experience cannot be greater than maximum experience',
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
         order: { [sortBy]: sortOrder },
      };

      // Build where conditions
      const whereConditions: any = {};

      if (keyword) {
         whereConditions.title = Like(`%${keyword}%`);
      }

      if (status) {
         whereConditions.status = status;
      }

      if (departmentId) {
         whereConditions.departmentId = departmentId;
      }

      if (positionId) {
         whereConditions.positionId = positionId;
      }

      if (employmentType) {
         whereConditions.employmentType = employmentType;
      }

      if (experienceLevel) {
         whereConditions.experienceLevel = experienceLevel;
      }

      if (location) {
         whereConditions.location = Like(`%${location}%`);
      }

      if (Object.keys(whereConditions).length > 0) {
         findOptions.where = whereConditions;
      }
      console.log(findOptions);
      const [jobPostings, total] = await this.jobPostingRepository.findAndCount();
      console.log('job', jobPostings);
      console.log('total', total);

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

      // Validate experience range if both are provided
      const newMinExp = updateJobPostingDto.minExperience ?? jobPosting.minExperience;
      const newMaxExp = updateJobPostingDto.maxExperience ?? jobPosting.maxExperience;

      if (newMinExp && newMaxExp && newMinExp > newMaxExp) {
         throw new BadRequestException(
            'Minimum experience cannot be greater than maximum experience',
         );
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

   private mapToResponseDto(jobPosting: JobPostingEntity): JobPostingResponseDto {
      const formatSalary = (amount: number): string => {
         return new Intl.NumberFormat('vi-VN').format(amount);
      };

      const getSalaryRange = (): string | undefined => {
         if (jobPosting.salaryMin && jobPosting.salaryMax) {
            return `${formatSalary(jobPosting.salaryMin)} - ${formatSalary(jobPosting.salaryMax)} VND`;
         } else if (jobPosting.salaryMin) {
            return `From ${formatSalary(jobPosting.salaryMin)} VND`;
         } else if (jobPosting.salaryMax) {
            return `Up to ${formatSalary(jobPosting.salaryMax)} VND`;
         }
         return undefined;
      };

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
         skills: jobPosting.skills,
         minExperience: jobPosting.minExperience,
         maxExperience: jobPosting.maxExperience,
         educationLevel: jobPosting.educationLevel,
         departmentId: jobPosting.departmentId,
         positionId: jobPosting.positionId,
         hiringManagerId: jobPosting.hiringManagerId,
         salaryRange: getSalaryRange(),
         isJobActive:
            jobPosting.status === 'published' &&
            dayjs(jobPosting.applicationDeadline).isAfter(dayjs()),
         daysUntilDeadline: dayjs(jobPosting.applicationDeadline).diff(dayjs(), 'day'),
         applicationCount: 0, // TODO
         createdAt: dayjs(jobPosting.createdAt).toISOString(),
         updatedAt: dayjs(jobPosting.updatedAt).toISOString(),
      };
   }
}
