import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';

@Injectable()
export class ApplicationTool extends BaseTool {
  name = 'application_tool';
  description = 'Manage job applications: query applications, update status, add notes, and get statistics';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'update_status', 'add_note', 'get_stats', 'get_by_job', 'get_by_candidate'],
        description: 'Action to perform on applications'
      },
      id: {
        type: 'number',
        description: 'Application ID (required for update_status, add_note, get)'
      },
      jobPostingId: {
        type: 'number',
        description: 'Job posting ID (for get_by_job)'
      },
      candidateId: {
        type: 'number',
        description: 'Candidate ID (for get_by_candidate)'
      },
      status: {
        type: 'string',
        enum: ['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'],
        description: 'New application status'
      },
      note: {
        type: 'string',
        description: 'Note to add to application'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying applications',
        properties: {
          status: { type: 'string' },
          jobPostingId: { type: 'number' },
          candidateId: { type: 'number' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' }
        }
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>
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
        case 'get':
          return await this.getApplication(params, context);
        case 'update_status':
          return await this.updateApplicationStatus(params, context);
        case 'add_note':
          return await this.addApplicationNote(params, context);
        case 'get_stats':
          return await this.getApplicationStats(params, context);
        case 'get_by_job':
          return await this.getApplicationsByJob(params, context);
        case 'get_by_candidate':
          return await this.getApplicationsByCandidate(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async getApplication(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Application ID is required');
    }

    const application = await this.applicationRepository.findOne({
      where: { applicationId: params.id }
    });

    if (!application) {
      return this.createErrorResult('Application not found', `Application with ID ${params.id} not found`);
    }

    // Get related job posting and candidate
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: application.jobPostingId }
    });
    
    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: application.candidateId }
    });

    return this.createSuccessResult(
      {
        applicationId: application.applicationId,
        status: application.status,
        appliedDate: application.appliedDate,
        coverLetter: application.coverLetter,
        resumeUrl: application.resumeUrl,
        reviewNotes: application.reviewNotes,
        score: application.score,
        feedback: application.feedback,
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title,
          departmentId: jobPosting?.departmentId
        },
        candidate: {
          id: candidate?.candidateId,
          firstName: candidate?.firstName,
          lastName: candidate?.lastName,
          email: candidate?.email
        }
      },
      `Application ${application.applicationId} retrieved successfully`
    );
  }

  private async updateApplicationStatus(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.status) {
      return this.createErrorResult('Missing parameters', 'Application ID and status are required');
    }

    const application = await this.applicationRepository.findOne({
      where: { applicationId: params.id }
    });

    if (!application) {
      return this.createErrorResult('Application not found', `Application with ID ${params.id} not found`);
    }

    const oldStatus = application.status;
    await this.applicationRepository.update(params.id, {
      status: params.status,
      reviewedDate: new Date(),
      updatedAt: new Date()
    });

    return this.createSuccessResult(
      {
        applicationId: params.id,
        oldStatus,
        newStatus: params.status,
        reviewedDate: new Date()
      },
      `Application ${params.id} status updated from "${oldStatus}" to "${params.status}"`
    );
  }

  private async addApplicationNote(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.note) {
      return this.createErrorResult('Missing parameters', 'Application ID and note are required');
    }

    const application = await this.applicationRepository.findOne({
      where: { applicationId: params.id }
    });

    if (!application) {
      return this.createErrorResult('Application not found', `Application with ID ${params.id} not found`);
    }

    const existingNotes = application.reviewNotes || '';
    const newNotes = existingNotes ? `${existingNotes}\n\n${params.note}` : params.note;

    await this.applicationRepository.update(params.id, {
      reviewNotes: newNotes,
      updatedAt: new Date()
    });

    return this.createSuccessResult(
      {
        applicationId: params.id,
        noteAdded: params.note,
        totalNotesLength: newNotes.length
      },
      `Note added to application ${params.id}`
    );
  }

  private async getApplicationStats(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.applicationRepository.createQueryBuilder('app');

    // Apply filters
    if (params.filters) {
      if (params.filters.status) {
        queryBuilder.andWhere('app.status = :status', { status: params.filters.status });
      }
      if (params.filters.jobPostingId) {
        queryBuilder.andWhere('app.jobPostingId = :jobPostingId', { jobPostingId: params.filters.jobPostingId });
      }
      if (params.filters.candidateId) {
        queryBuilder.andWhere('app.candidateId = :candidateId', { candidateId: params.filters.candidateId });
      }
      if (params.filters.dateFrom) {
        queryBuilder.andWhere('app.appliedDate >= :dateFrom', { dateFrom: params.filters.dateFrom });
      }
      if (params.filters.dateTo) {
        queryBuilder.andWhere('app.appliedDate <= :dateTo', { dateTo: params.filters.dateTo });
      }
    }

    const [applications, total] = await queryBuilder.getManyAndCount();

    // Get related data for statistics
    const jobPostingIds = [...new Set(applications.map(app => app.jobPostingId))];
    const candidateIds = [...new Set(applications.map(app => app.candidateId))];
    
    const jobPostings = await this.jobPostingRepository.findByIds(jobPostingIds);
    const candidates = await this.candidateRepository.findByIds(candidateIds);
    
    const jobPostingMap = new Map(jobPostings.map(job => [job.jobPostingId, job]));
    const candidateMap = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));

    // Calculate statistics
    const stats = {
      total,
      byStatus: applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}),
      byJob: applications.reduce((acc, app) => {
        const jobPosting = jobPostingMap.get(app.jobPostingId);
        const jobTitle = jobPosting?.title || 'Unknown';
        acc[jobTitle] = (acc[jobTitle] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: applications.reduce((acc, app) => {
        const jobPosting = jobPostingMap.get(app.jobPostingId);
        const department = jobPosting?.departmentId || 'Unknown';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
      }, {}),
      recentApplications: applications
        .sort((a, b) => b.appliedDate.getTime() - a.appliedDate.getTime())
        .slice(0, 5)
        .map(app => {
          const jobPosting = jobPostingMap.get(app.jobPostingId);
          const candidate = candidateMap.get(app.candidateId);
          return {
            id: app.applicationId,
            status: app.status,
            appliedDate: app.appliedDate,
            jobTitle: jobPosting?.title,
            candidateName: `${candidate?.firstName} ${candidate?.lastName}`
          };
        })
    };

    return this.createSuccessResult(stats, `Application statistics retrieved successfully`);
  }

  private async getApplicationsByJob(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.jobPostingId) {
      return this.createErrorResult('Missing jobPostingId', 'Job posting ID is required');
    }

    const applications = await this.applicationRepository.find({
      where: { jobPostingId: params.jobPostingId },
      order: { appliedDate: 'DESC' }
    });

    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.jobPostingId }
    });

    // Get candidates for applications
    const candidateIds = applications.map(app => app.candidateId);
    const candidates = await this.candidateRepository.findByIds(candidateIds);
    const candidateMap = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));

    return this.createSuccessResult(
      {
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title,
          departmentId: jobPosting?.departmentId
        },
        applications: applications.map(app => {
          const candidate = candidateMap.get(app.candidateId);
          return {
            id: app.applicationId,
            status: app.status,
            appliedDate: app.appliedDate,
            candidate: {
              id: candidate?.candidateId,
              name: `${candidate?.firstName} ${candidate?.lastName}`,
              email: candidate?.email
            }
          };
        }),
        totalApplications: applications.length
      },
      `Found ${applications.length} applications for job posting ${params.jobPostingId}`
    );
  }

  private async getApplicationsByCandidate(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.candidateId) {
      return this.createErrorResult('Missing candidateId', 'Candidate ID is required');
    }

    const applications = await this.applicationRepository.find({
      where: { candidateId: params.candidateId },
      order: { appliedDate: 'DESC' }
    });

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: params.candidateId }
    });

    // Get job postings for applications
    const jobPostingIds = applications.map(app => app.jobPostingId);
    const jobPostings = await this.jobPostingRepository.findByIds(jobPostingIds);
    const jobPostingMap = new Map(jobPostings.map(job => [job.jobPostingId, job]));

    return this.createSuccessResult(
      {
        candidate: {
          id: candidate?.candidateId,
          name: `${candidate?.firstName} ${candidate?.lastName}`,
          email: candidate?.email
        },
        applications: applications.map(app => {
          const jobPosting = jobPostingMap.get(app.jobPostingId);
          return {
            id: app.applicationId,
            status: app.status,
            appliedDate: app.appliedDate,
            jobPosting: {
              id: jobPosting?.jobPostingId,
              title: jobPosting?.title,
              departmentId: jobPosting?.departmentId
            }
          };
        }),
        totalApplications: applications.length
      },
      `Found ${applications.length} applications for candidate ${params.candidateId}`
    );
  }
}
