import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateInterviewDto } from './dtos/createInterviewDto';
import { UpdateInterviewDto } from './dtos/updateInterviewDto';
import { FilterInterviewDto, SortBy } from './dtos/filterInterviewDto';

@Injectable()
export class InterviewService {
   constructor(
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      private readonly entityManager: EntityManager,
   ) {}

   async createInterview(createInterviewDto: CreateInterviewDto): Promise<InterviewEntity> {
      const interview = this.interviewRepository.create({
         ...createInterviewDto,
         scheduled_at: new Date(createInterviewDto.scheduled_at),
      });
      return this.interviewRepository.save(interview);
   }

   async updateInterview(
      id: number,
      updateInterviewDto: UpdateInterviewDto,
   ): Promise<InterviewEntity> {
      const interview = await this.interviewRepository.findOne({ where: { interview_id: id } });
      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }

      Object.assign(interview, updateInterviewDto);
      if (updateInterviewDto.scheduled_at) {
         interview.scheduled_at = new Date(updateInterviewDto.scheduled_at);
      }

      return this.interviewRepository.save(interview);
   }

   async softDeleteInterview(id: number): Promise<void> {
      const result = await this.interviewRepository.softDelete(id);
      if (result.affected === 0) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }
   }

   async getInterviewById(id: number): Promise<InterviewEntity> {
      const interview = await this.interviewRepository.findOne({ where: { interview_id: id } });
      if (!interview) {
         throw new NotFoundException(`Interview with ID ${id} not found`);
      }
      return interview;
   }

   async getInterviewsByCandidateId(
      candidateId: number,
      sortBy: SortBy = SortBy.SCHEDULED_AT,
   ): Promise<InterviewEntity[]> {
      const queryBuilder = this.interviewRepository
         .createQueryBuilder('interview')
         .where('interview.candidate_id = :candidateId', { candidateId });

      if (sortBy === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', 'DESC');
      } else {
         queryBuilder.orderBy('interview.scheduled_at', 'ASC');
      }

      return queryBuilder.getMany();
   }

   async getInterviewsByJobId(
      jobId: number,
      sortBy: SortBy = SortBy.SCHEDULED_AT,
   ): Promise<InterviewEntity[]> {
      const queryBuilder = this.interviewRepository
         .createQueryBuilder('interview')
         .where('interview.job_id = :jobId', { jobId });

      if (sortBy === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', 'DESC');
      } else {
         queryBuilder.orderBy('interview.scheduled_at', 'ASC');
      }

      return queryBuilder.getMany();
   }

   async getAllInterviewsSortedByScheduledAt(): Promise<InterviewEntity[]> {
      return this.interviewRepository.find({
         order: { scheduled_at: 'ASC' },
      });
   }

   async getInterviewsByStatus(status: string): Promise<InterviewEntity[]> {
      return this.interviewRepository.find({
         where: { status },
         order: { scheduled_at: 'ASC' },
      });
   }

   async filterInterviews(
      filterDto: FilterInterviewDto,
   ): Promise<{ data: InterviewEntity[]; total: number }> {
      const queryBuilder = this.interviewRepository.createQueryBuilder('interview');

      // Apply filters
      if (filterDto.id) {
         queryBuilder.andWhere('interview.interview_id = :id', { id: filterDto.id });
      }
      if (filterDto.candidate_id) {
         queryBuilder.andWhere('interview.candidate_id = :candidateId', {
            candidateId: filterDto.candidate_id,
         });
      }
      if (filterDto.job_id) {
         queryBuilder.andWhere('interview.job_id = :jobId', { jobId: filterDto.job_id });
      }
      if (filterDto.status) {
         queryBuilder.andWhere('interview.status = :status', { status: filterDto.status });
      }

      // Apply sorting
      if (filterDto.sort_by === SortBy.SCORE) {
         queryBuilder.orderBy('interview.scores', filterDto.sort_order);
      } else {
         queryBuilder.orderBy(`interview.${filterDto.sort_by}`, filterDto.sort_order);
      }

      // Apply pagination
      const skip = ((filterDto.page as number) - 1) * (filterDto.limit as number);
      queryBuilder.skip(skip).take(filterDto.limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      return { data, total };
   }
}
