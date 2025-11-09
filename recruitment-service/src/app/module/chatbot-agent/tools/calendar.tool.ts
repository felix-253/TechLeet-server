import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';

@Injectable()
export class CalendarTool extends BaseTool {
  name = 'calendar_tool';
  description = 'Manage calendar events and schedules. Can view interviews by date range, check availability, get upcoming interviews, and get interviews by date.';
  
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get_upcoming', 'get_by_date', 'get_by_range', 'check_availability', 'get_conflicts'],
        description: 'Action to perform: get_upcoming (get upcoming interviews), get_by_date (get interviews on a specific date), get_by_range (get interviews in a date range), check_availability (check if a time slot is available), get_conflicts (get conflicting interviews)'
      },
      date: {
        type: 'string',
        description: 'Date in ISO format (YYYY-MM-DD) (required for get_by_date and check_availability)'
      },
      startDate: {
        type: 'string',
        description: 'Start date in ISO format (YYYY-MM-DD) (required for get_by_range)'
      },
      endDate: {
        type: 'string',
        description: 'End date in ISO format (YYYY-MM-DD) (required for get_by_range)'
      },
      time: {
        type: 'string',
        description: 'Time in ISO format (HH:mm) (required for check_availability)'
      },
      durationMinutes: {
        type: 'number',
        description: 'Duration in minutes (required for check_availability, default: 30)'
      },
      interviewerId: {
        type: 'number',
        description: 'Interviewer ID to check availability for (optional for check_availability)'
      },
      candidateId: {
        type: 'number',
        description: 'Candidate ID to filter interviews (optional)'
      },
      jobId: {
        type: 'number',
        description: 'Job posting ID to filter interviews (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 50)'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(InterviewEntity)
    private readonly interviewRepository: Repository<InterviewEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>
  ) {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      switch (params.action) {
        case 'get_upcoming':
          return await this.getUpcomingInterviews(params, context);
        case 'get_by_date':
          return await this.getInterviewsByDate(params, context);
        case 'get_by_range':
          return await this.getInterviewsByRange(params, context);
        case 'check_availability':
          return await this.checkAvailability(params, context);
        case 'get_conflicts':
          return await this.getConflicts(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async getUpcomingInterviews(params: any, context: ToolContext): Promise<ToolResult> {
    const limit = Math.min(params.limit || 10, 50);
    const now = new Date();

    try {
      const queryBuilder = this.interviewRepository
        .createQueryBuilder('interview')
        .where('interview.scheduled_at >= :now', { now })
        .andWhere('interview.status != :cancelled', { cancelled: 'cancelled' })
        .orderBy('interview.scheduled_at', 'ASC')
        .take(limit);

      if (params.candidateId) {
        queryBuilder.andWhere('interview.candidate_id = :candidateId', { candidateId: params.candidateId });
      }

      if (params.jobId) {
        queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.jobId });
      }

      const interviews = await queryBuilder.getMany();

      const candidateIds = [...new Set(interviews.map(i => i.candidate_id))];
      const jobIds = [...new Set(interviews.map(i => i.job_id))];

      const candidates = candidateIds.length > 0 
        ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
        : [];
      const jobs = jobIds.length > 0
        ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobIds) } })
        : [];

      const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
      const jobMap = new Map(jobs.map(j => [j.jobPostingId, j]));

      return this.createSuccessResult(
        {
          interviews: interviews.map(i => {
            const candidate = candidateMap.get(i.candidate_id);
            const job = jobMap.get(i.job_id);
            return {
              interviewId: i.interview_id,
              scheduledAt: i.scheduled_at,
              candidate: candidate ? {
                candidateId: candidate.candidateId,
                name: `${candidate.firstName} ${candidate.lastName}`,
                email: candidate.email
              } : null,
              jobPosting: job ? {
                jobPostingId: job.jobPostingId,
                title: job.title
              } : null,
              location: i.location,
              meetingLink: i.meeting_link,
              status: i.status
            };
          }),
          total: interviews.length
        },
        `Found ${interviews.length} upcoming interview(s)`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async getInterviewsByDate(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.date) {
      return this.createErrorResult('Missing required field', 'date is required for get_by_date action');
    }

    try {
      const date = new Date(params.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const queryBuilder = this.interviewRepository
        .createQueryBuilder('interview')
        .where('interview.scheduled_at >= :startOfDay', { startOfDay })
        .andWhere('interview.scheduled_at <= :endOfDay', { endOfDay })
        .orderBy('interview.scheduled_at', 'ASC');

      if (params.candidateId) {
        queryBuilder.andWhere('interview.candidate_id = :candidateId', { candidateId: params.candidateId });
      }

      if (params.jobId) {
        queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.jobId });
      }

      const interviews = await queryBuilder.getMany();

      const candidateIds = [...new Set(interviews.map(i => i.candidate_id))];
      const jobIds = [...new Set(interviews.map(i => i.job_id))];

      const candidates = candidateIds.length > 0 
        ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
        : [];
      const jobs = jobIds.length > 0
        ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobIds) } })
        : [];

      const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
      const jobMap = new Map(jobs.map(j => [j.jobPostingId, j]));

      return this.createSuccessResult(
        {
          date: params.date,
          interviews: interviews.map(i => {
            const candidate = candidateMap.get(i.candidate_id);
            const job = jobMap.get(i.job_id);
            return {
              interviewId: i.interview_id,
              scheduledAt: i.scheduled_at,
              candidate: candidate ? {
                candidateId: candidate.candidateId,
                name: `${candidate.firstName} ${candidate.lastName}`,
                email: candidate.email
              } : null,
              jobPosting: job ? {
                jobPostingId: job.jobPostingId,
                title: job.title
              } : null,
              location: i.location,
              meetingLink: i.meeting_link,
              status: i.status
            };
          }),
          total: interviews.length
        },
        `Found ${interviews.length} interview(s) on ${params.date}`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async getInterviewsByRange(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.startDate || !params.endDate) {
      return this.createErrorResult('Missing required fields', 'startDate and endDate are required for get_by_range action');
    }

    try {
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);

      const queryBuilder = this.interviewRepository
        .createQueryBuilder('interview')
        .where('interview.scheduled_at >= :startDate', { startDate })
        .andWhere('interview.scheduled_at <= :endDate', { endDate })
        .orderBy('interview.scheduled_at', 'ASC');

      if (params.candidateId) {
        queryBuilder.andWhere('interview.candidate_id = :candidateId', { candidateId: params.candidateId });
      }

      if (params.jobId) {
        queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.jobId });
      }

      const limit = Math.min(params.limit || 50, 100);
      queryBuilder.take(limit);

      const interviews = await queryBuilder.getMany();

      const candidateIds = [...new Set(interviews.map(i => i.candidate_id))];
      const jobIds = [...new Set(interviews.map(i => i.job_id))];

      const candidates = candidateIds.length > 0 
        ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
        : [];
      const jobs = jobIds.length > 0
        ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobIds) } })
        : [];

      const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
      const jobMap = new Map(jobs.map(j => [j.jobPostingId, j]));

      return this.createSuccessResult(
        {
          startDate: params.startDate,
          endDate: params.endDate,
          interviews: interviews.map(i => {
            const candidate = candidateMap.get(i.candidate_id);
            const job = jobMap.get(i.job_id);
            return {
              interviewId: i.interview_id,
              scheduledAt: i.scheduled_at,
              candidate: candidate ? {
                candidateId: candidate.candidateId,
                name: `${candidate.firstName} ${candidate.lastName}`,
                email: candidate.email
              } : null,
              jobPosting: job ? {
                jobPostingId: job.jobPostingId,
                title: job.title
              } : null,
              location: i.location,
              meetingLink: i.meeting_link,
              status: i.status
            };
          }),
          total: interviews.length
        },
        `Found ${interviews.length} interview(s) between ${params.startDate} and ${params.endDate}`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async checkAvailability(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.date || !params.time) {
      return this.createErrorResult('Missing required fields', 'date and time are required for check_availability action');
    }

    try {
      const durationMinutes = params.durationMinutes || 30;
      const dateTime = new Date(`${params.date}T${params.time}`);
      const endDateTime = new Date(dateTime.getTime() + durationMinutes * 60 * 1000);

      const queryBuilder = this.interviewRepository
        .createQueryBuilder('interview')
        .where('interview.status != :cancelled', { cancelled: 'cancelled' })
        .andWhere(
          '(interview.scheduled_at < :endDateTime AND interview.scheduled_at + (interview.duration_minutes * INTERVAL \'1 minute\') > :dateTime)',
          { dateTime, endDateTime }
        );

      if (params.interviewerId) {
        queryBuilder.andWhere('(:interviewerId = ANY(interview.interviewer_ids))', { interviewerId: params.interviewerId });
      }

      const conflictingInterviews = await queryBuilder.getMany();

      const isAvailable = conflictingInterviews.length === 0;

      return this.createSuccessResult(
        {
          dateTime: dateTime.toISOString(),
          durationMinutes,
          isAvailable,
          conflictingInterviews: conflictingInterviews.map(i => ({
            interviewId: i.interview_id,
            scheduledAt: i.scheduled_at,
            duration: i.duration_minutes
          })),
          interviewerId: params.interviewerId
        },
        isAvailable 
          ? `Time slot is available on ${params.date} at ${params.time}`
          : `Time slot is not available. Found ${conflictingInterviews.length} conflicting interview(s)`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private async getConflicts(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      const now = new Date();
      const queryBuilder = this.interviewRepository
        .createQueryBuilder('interview')
        .where('interview.status != :cancelled', { cancelled: 'cancelled' })
        .andWhere('interview.scheduled_at >= :now', { now })
        .orderBy('interview.scheduled_at', 'ASC');

      const allInterviews = await queryBuilder.getMany();

      const candidateIds = [...new Set(allInterviews.map(i => i.candidate_id))];
      const jobIds = [...new Set(allInterviews.map(i => i.job_id))];

      const candidates = candidateIds.length > 0 
        ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
        : [];
      const jobs = jobIds.length > 0
        ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobIds) } })
        : [];

      const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
      const jobMap = new Map(jobs.map(j => [j.jobPostingId, j]));

      const conflicts: any[] = [];
      for (let i = 0; i < allInterviews.length; i++) {
        const interview1 = allInterviews[i];
        const endTime1 = new Date(interview1.scheduled_at.getTime() + (interview1.duration_minutes || 30) * 60 * 1000);

        for (let j = i + 1; j < allInterviews.length; j++) {
          const interview2 = allInterviews[j];
          const endTime2 = new Date(interview2.scheduled_at.getTime() + (interview2.duration_minutes || 30) * 60 * 1000);

          if (interview1.scheduled_at < endTime2 && interview2.scheduled_at < endTime1) {
            const sharedInterviewers = this.findSharedInterviewers(interview1, interview2);
            if (sharedInterviewers.length > 0) {
              const candidate1 = candidateMap.get(interview1.candidate_id);
              const candidate2 = candidateMap.get(interview2.candidate_id);
              const job1 = jobMap.get(interview1.job_id);
              const job2 = jobMap.get(interview2.job_id);
              
              conflicts.push({
                interview1: {
                  interviewId: interview1.interview_id,
                  scheduledAt: interview1.scheduled_at,
                  candidate: candidate1 ? `${candidate1.firstName} ${candidate1.lastName}` : null,
                  jobPosting: job1?.title || null
                },
                interview2: {
                  interviewId: interview2.interview_id,
                  scheduledAt: interview2.scheduled_at,
                  candidate: candidate2 ? `${candidate2.firstName} ${candidate2.lastName}` : null,
                  jobPosting: job2?.title || null
                },
                sharedInterviewers
              });
            }
          }
        }
      }

      return this.createSuccessResult(
        {
          conflicts,
          total: conflicts.length
        },
        `Found ${conflicts.length} conflicting interview pair(s)`
      );
    } catch (error) {
      return this.createErrorResult('Query failed', error.message);
    }
  }

  private findSharedInterviewers(interview1: InterviewEntity, interview2: InterviewEntity): number[] {
    const interviewers1 = interview1.interviewer_ids || [];
    const interviewers2 = interview2.interviewer_ids || [];
    return interviewers1.filter(id => interviewers2.includes(id));
  }
}
