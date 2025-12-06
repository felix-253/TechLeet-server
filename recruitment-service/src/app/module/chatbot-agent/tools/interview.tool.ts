import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';

@Injectable()
export class InterviewTool extends BaseTool {
  name = 'interview_tool';
  description = 'Manage interviews: create, update, cancel, reschedule interviews, get interview details, list interviews, and get statistics';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'cancel', 'reschedule', 'get', 'list', 'get_stats'],
        description: 'Action to perform on interviews'
      },
      id: {
        type: 'number',
        description: 'Interview ID (required for update, cancel, reschedule, get)'
      },
      candidateId: {
        type: 'number',
        description: 'Candidate ID (required for create)'
      },
      jobId: {
        type: 'number',
        description: 'Job posting ID (required for create)'
      },
      scheduledAt: {
        type: 'string',
        description: 'Interview scheduled date and time (ISO format, required for create and reschedule)'
      },
      durationMinutes: {
        type: 'number',
        description: 'Interview duration in minutes (default: 30)'
      },
      meetingLink: {
        type: 'string',
        description: 'Meeting link (Zoom, Google Meet, etc.)'
      },
      location: {
        type: 'string',
        description: 'Interview location (physical or virtual)'
      },
      interviewerIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'List of interviewer employee IDs'
      },
      status: {
        type: 'string',
        enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
        description: 'Interview status'
      },
      notes: {
        type: 'string',
        description: 'Interview notes or feedback'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying interviews',
        properties: {
          candidateName: { type: 'string', description: 'Search by candidate name' },
          candidateId: { type: 'number' },
          jobId: { type: 'number' },
          status: { type: 'string' },
          interviewerId: { type: 'number' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' }
        }
      },
      limit: {
        type: 'number',
        description: 'Limit number of results (for list action, default: 10)'
      },
      sortBy: {
        type: 'string',
        enum: ['scheduledAt', 'createdAt', 'status'],
        description: 'Field to sort by (for list action, default: scheduledAt)'
      },
      sortOrder: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        description: 'Sort order (for list action, default: ASC)'
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
      if (this.requiresConfirmation(params.action, params) && !params.confirmed) {
        return this.createConfirmationRequest(params.action, params);
      }

      switch (params.action) {
        case 'create':
          return await this.createInterview(params, context);
        case 'update':
          return await this.updateInterview(params, context);
        case 'cancel':
          return await this.cancelInterview(params, context);
        case 'reschedule':
          return await this.rescheduleInterview(params, context);
        case 'get':
          return await this.getInterview(params, context);
        case 'list':
          return await this.listInterviews(params, context);
        case 'get_stats':
          return await this.getInterviewStats(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async createInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.candidateId || !params.jobId || !params.scheduledAt) {
      return this.createErrorResult(
        'Missing required fields',
        'Candidate ID, Job ID, and scheduled date/time are required for creating an interview'
      );
    }

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: params.candidateId }
    });

    if (!candidate) {
      return this.createErrorResult('Candidate not found', `Candidate with ID ${params.candidateId} not found`);
    }

    const job = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.jobId }
    });

    if (!job) {
      return this.createErrorResult('Job not found', `Job posting with ID ${params.jobId} not found`);
    }

    const interview = this.interviewRepository.create({
      candidate_id: params.candidateId,
      job_id: params.jobId,
      scheduled_at: new Date(params.scheduledAt),
      duration_minutes: params.durationMinutes || 30,
      meeting_link: params.meetingLink || '',
      location: params.location || '',
      interviewer_ids: params.interviewerIds || [],
      status: 'scheduled',
      notes: params.notes || null,
      createdAt: new Date()
    });

    const savedInterview = await this.interviewRepository.save(interview);

    return this.createSuccessResult(
      {
        interviewId: savedInterview.interview_id,
        candidateId: savedInterview.candidate_id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobId: savedInterview.job_id,
        jobTitle: job.title,
        scheduledAt: savedInterview.scheduled_at,
        durationMinutes: savedInterview.duration_minutes,
        meetingLink: savedInterview.meeting_link,
        location: savedInterview.location,
        interviewerIds: savedInterview.interviewer_ids,
        status: savedInterview.status
      },
      `Interview scheduled for candidate "${candidate.firstName} ${candidate.lastName}" on ${new Date(params.scheduledAt).toLocaleString()}`
    );
  }

  private async updateInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Interview ID is required for update');
    }

    const interview = await this.interviewRepository.findOne({
      where: { interview_id: params.id }
    });

    if (!interview) {
      return this.createErrorResult('Interview not found', `Interview with ID ${params.id} not found`);
    }

    const updateData: any = {};
    if (params.scheduledAt) updateData.scheduled_at = new Date(params.scheduledAt);
    if (params.durationMinutes !== undefined) updateData.duration_minutes = params.durationMinutes;
    if (params.meetingLink !== undefined) updateData.meeting_link = params.meetingLink;
    if (params.location !== undefined) updateData.location = params.location;
    if (params.interviewerIds !== undefined) updateData.interviewer_ids = params.interviewerIds;
    if (params.status) updateData.status = params.status;
    if (params.notes !== undefined) updateData.notes = params.notes;

    updateData.updatedAt = new Date();

    await this.interviewRepository.update(params.id, updateData);

    return this.createSuccessResult(
      {
        interviewId: params.id,
        updatedFields: Object.keys(updateData),
        scheduledAt: updateData.scheduled_at || interview.scheduled_at
      },
      `Interview ${params.id} updated successfully`
    );
  }

  private async cancelInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Interview ID is required for cancel');
    }

    const interview = await this.interviewRepository.findOne({
      where: { interview_id: params.id }
    });

    if (!interview) {
      return this.createErrorResult('Interview not found', `Interview with ID ${params.id} not found`);
    }

    if (interview.status === 'cancelled') {
      return this.createErrorResult('Already cancelled', `Interview ${params.id} is already cancelled`);
    }

    await this.interviewRepository.update(params.id, {
      status: 'cancelled',
      updatedAt: new Date()
    });

    return this.createSuccessResult(
      {
        interviewId: params.id,
        oldStatus: interview.status,
        newStatus: 'cancelled',
        scheduledAt: interview.scheduled_at
      },
      `Interview ${params.id} cancelled successfully`
    );
  }

  private async rescheduleInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.scheduledAt) {
      return this.createErrorResult('Missing parameters', 'Interview ID and new scheduled date/time are required for reschedule');
    }

    const interview = await this.interviewRepository.findOne({
      where: { interview_id: params.id }
    });

    if (!interview) {
      return this.createErrorResult('Interview not found', `Interview with ID ${params.id} not found`);
    }

    const oldScheduledAt = interview.scheduled_at;
    const newScheduledAt = new Date(params.scheduledAt);

    const updateData: any = {
      scheduled_at: newScheduledAt,
      status: 'rescheduled',
      updatedAt: new Date()
    };

    if (params.durationMinutes !== undefined) updateData.duration_minutes = params.durationMinutes;
    if (params.meetingLink !== undefined) updateData.meeting_link = params.meetingLink;
    if (params.location !== undefined) updateData.location = params.location;

    await this.interviewRepository.update(params.id, updateData);

    return this.createSuccessResult(
      {
        interviewId: params.id,
        oldScheduledAt,
        newScheduledAt,
        status: 'rescheduled'
      },
      `Interview ${params.id} rescheduled from ${oldScheduledAt.toLocaleString()} to ${newScheduledAt.toLocaleString()}`
    );
  }

  private async getInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Interview ID is required');
    }

    const interview = await this.interviewRepository.findOne({
      where: { interview_id: params.id }
    });

    if (!interview) {
      return this.createErrorResult('Interview not found', `Interview with ID ${params.id} not found`);
    }

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: interview.candidate_id }
    });

    const job = await this.jobPostingRepository.findOne({
      where: { jobPostingId: interview.job_id }
    });

    return this.createSuccessResult(
      {
        interviewId: interview.interview_id,
        candidate: {
          id: interview.candidate_id,
          name: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
          email: candidate?.email
        },
        job: {
          id: interview.job_id,
          title: job?.title || 'Unknown'
        },
        scheduledAt: interview.scheduled_at,
        durationMinutes: interview.duration_minutes,
        meetingLink: interview.meeting_link,
        location: interview.location,
        interviewerIds: interview.interviewer_ids,
        status: interview.status,
        notes: interview.notes,
        scores: interview.scores,
        comments: interview.comments,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt
      },
      `Interview ${params.id} retrieved successfully`
    );
  }

  private async listInterviews(params: any, context: ToolContext): Promise<ToolResult> {
    const limit = params.limit || 10;
    const sortBy = params.sortBy || 'scheduledAt';
    const sortOrder = params.sortOrder || 'ASC';

    const queryBuilder = this.interviewRepository.createQueryBuilder('interview');

    if (params.filters) {
      if (params.filters.candidateId) {
        queryBuilder.andWhere('interview.candidate_id = :candidateId', { candidateId: params.filters.candidateId });
      }
      if (params.filters.jobId) {
        queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.filters.jobId });
      }
      if (params.filters.status) {
        queryBuilder.andWhere('interview.status = :status', { status: params.filters.status });
      }
      if (params.filters.interviewerId) {
        queryBuilder.andWhere(':interviewerId = ANY(interview.interviewer_ids)', { interviewerId: params.filters.interviewerId });
      }
      if (params.filters.dateFrom) {
        queryBuilder.andWhere('interview.scheduled_at >= :dateFrom', { dateFrom: params.filters.dateFrom });
      }
      if (params.filters.dateTo) {
        queryBuilder.andWhere('interview.scheduled_at <= :dateTo', { dateTo: params.filters.dateTo });
      }
    }

    const validSortFields: { [key: string]: string } = {
      scheduledAt: 'interview.scheduled_at',
      createdAt: 'interview.createdAt',
      status: 'interview.status'
    };

    const sortField = validSortFields[sortBy] || 'interview.scheduled_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(sortField, order);

    queryBuilder.limit(limit);

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
        interviews: interviews.map(interview => {
          const candidate = candidateMap.get(interview.candidate_id);
          const job = jobMap.get(interview.job_id);
          return {
            interviewId: interview.interview_id,
            candidate: {
              id: interview.candidate_id,
              name: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
              email: candidate?.email
            },
            job: {
              id: interview.job_id,
              title: job?.title || 'Unknown'
            },
            scheduledAt: interview.scheduled_at,
            durationMinutes: interview.duration_minutes,
            meetingLink: interview.meeting_link,
            location: interview.location,
            interviewerIds: interview.interviewer_ids,
            status: interview.status
          };
        }),
        total: interviews.length,
        limit,
        sortBy,
        sortOrder
      },
      `Found ${interviews.length} interview(s)`
    );
  }

  private async getInterviewStats(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.interviewRepository.createQueryBuilder('interview');

    if (params.filters) {
      if (params.filters.candidateId) {
        queryBuilder.andWhere('interview.candidate_id = :candidateId', { candidateId: params.filters.candidateId });
      }
      if (params.filters.jobId) {
        queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.filters.jobId });
      }
      if (params.filters.status) {
        queryBuilder.andWhere('interview.status = :status', { status: params.filters.status });
      }
      if (params.filters.dateFrom) {
        queryBuilder.andWhere('interview.scheduled_at >= :dateFrom', { dateFrom: params.filters.dateFrom });
      }
      if (params.filters.dateTo) {
        queryBuilder.andWhere('interview.scheduled_at <= :dateTo', { dateTo: params.filters.dateTo });
      }
    }

    const interviews = await queryBuilder.getMany();

    const stats = {
      total: interviews.length,
      byStatus: interviews.reduce((acc, interview) => {
        acc[interview.status] = (acc[interview.status] || 0) + 1;
        return acc;
      }, {}),
      upcoming: interviews.filter(i => 
        i.status === 'scheduled' && new Date(i.scheduled_at) > new Date()
      ).length,
      completed: interviews.filter(i => i.status === 'completed').length,
      cancelled: interviews.filter(i => i.status === 'cancelled').length,
      averageDuration: interviews.length > 0
        ? interviews.reduce((sum, i) => sum + (i.duration_minutes || 30), 0) / interviews.length
        : 0,
      byMonth: interviews.reduce((acc, interview) => {
        const month = new Date(interview.scheduled_at).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {})
    };

    return this.createSuccessResult(stats, `Interview statistics retrieved successfully`);
  }
}

