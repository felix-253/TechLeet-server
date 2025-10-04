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

   async getInterviewById(id: number): Promise<any> {
      const row = await this.interviewRepository
         .createQueryBuilder('i')
         .leftJoin('candidate', 'c', 'i.candidate_id = c.candidateId')
         .leftJoin('job_posting', 'j', 'i.job_id = j.jobPostingId')
         .select([
            'i.interview_id as i_id',
            'i.scheduled_at as i_scheduled_at',
            'i.duration_minutes as i_duration',
            'i.meeting_link as i_meeting_link',
            'i.location as i_location',
            'i.status as i_status',
            'i.interviewer_ids as i_interviewer_ids',

            'c.candidateId as c_id',
            'c.firstName as c_first_name',
            'c.lastName as c_last_name',

            'j.jobPostingId as j_id',
            'j.title as j_title',
         ])
         .where('i.interview_id = :id', { id })
         .getRawOne();

      if (!row) return null;

      let interviewers = [];
      if (row.i_interviewer_ids && row.i_interviewer_ids.length > 0) {
         interviewers = await this.entityManager.query(
            `SELECT "employeeId", "firstName", "lastName"
     FROM employee e
     WHERE e."employeeId" = ANY($1)`,
            [row.i_interviewer_ids],
         );
      }

      // build object nested
      const interview = {
         interview_id: row.i_id,
         scheduled_at: row.i_scheduled_at,
         duration_minutes: row.i_duration,
         meeting_link: row.i_meeting_link,
         location: row.i_location,
         status: row.i_status,

         candidate: {
            candidate_id: row.c_id,
            first_name: row.c_first_name,
            last_name: row.c_last_name,
         },

         job: {
            job_id: row.j_id,
            title: row.j_title,
         },

         interviewers, // array object từ EmployeeEntity
      };

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
