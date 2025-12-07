import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { ApplicationService } from '../../application/application.service';

@Injectable()
export class ApplicationTool extends BaseTool {
  name = 'application_tool';
  description = 'Manage job applications: query applications by job ID (with sorting by screening score, limit results), update status, add notes, get statistics, manage offers (make, update, extend), approve/reject after interview, and perform bulk operations. Use get_by_job action with limit and sortBy=screeningScore to get top candidates by score.';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'get', 'update_status', 'add_note', 'get_stats', 'get_by_job', 'get_by_candidate', 'make_offer', 'get_offers', 'update_offer', 'extend_offer', 'approve_after_interview', 'reject_after_interview', 'get_pending_approvals', 'bulk_update_status', 'bulk_reject', 'get_needs_followup'],
        description: 'Action to perform on applications. Use get_by_job to get applications for a job, optionally with limit and sortBy=screeningScore to get top candidates by score. Use make_offer to create an offer, approve_after_interview to approve and create offer, reject_after_interview to reject after interview, bulk_update_status/bulk_reject for bulk operations.'
      },
      id: {
        type: 'number',
        description: 'Application ID (required for update_status, add_note, get)'
      },
      jobPostingId: {
        type: 'number',
        description: 'Job posting ID (for get_by_job)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (for get_by_job, default: all)'
      },
      sortBy: {
        type: 'string',
        enum: ['screeningScore', 'appliedDate', 'status'],
        description: 'Field to sort by (for get_by_job: screeningScore = highest score first, appliedDate = newest first, status = by status, default: screeningScore)'
      },
      sortOrder: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        description: 'Sort order (for get_by_job, default: DESC for screeningScore, DESC for appliedDate)'
      },
      candidateId: {
        type: 'number',
        description: 'Candidate ID (required for create, for get_by_candidate)'
      },
      coverLetter: {
        type: 'string',
        description: 'Cover letter submitted by candidate (optional for create)'
      },
      resumeUrl: {
        type: 'string',
        description: 'URL to resume file (optional for create)'
      },
      expectedStartDate: {
        type: 'string',
        description: 'Expected start date if hired (YYYY-MM-DD, optional for create)'
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
          dateTo: { type: 'string' },
          offerStatus: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'expired'] },
          screeningScore: { type: 'number' },
          minScreeningScore: { type: 'number' },
          maxScreeningScore: { type: 'number' }
        }
      },
      offeredSalary: {
        type: 'number',
        description: 'Salary offered (VND, required for make_offer, approve_after_interview)'
      },
      offerExpiryDate: {
        type: 'string',
        description: 'Offer expiration date (YYYY-MM-DD, optional for make_offer, approve_after_interview, update_offer)'
      },
      rejectionReason: {
        type: 'string',
        description: 'Reason for rejection (optional for reject_after_interview, bulk_reject)'
      },
      newStatus: {
        type: 'string',
        description: 'New status for bulk update (required for bulk_update_status)'
      },
      daysSinceApplied: {
        type: 'number',
        description: 'Number of days since application was submitted (for get_needs_followup, default: 7)'
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
    private readonly candidateRepository: Repository<CandidateEntity>,
    private readonly applicationService: ApplicationService
  ) {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      if (params.action === 'update_status' && params.status === 'rejected' && !params.confirmed) {
        return this.createConfirmationRequest('reject', params, `Are you sure you want to reject application ${params.id}?`);
      }

      switch (params.action) {
        case 'create':
          return await this.createApplication(params, context);
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
        case 'make_offer':
          return await this.makeOffer(params, context);
        case 'get_offers':
          return await this.getOffers(params, context);
        case 'update_offer':
          return await this.updateOffer(params, context);
        case 'extend_offer':
          return await this.extendOffer(params, context);
        case 'approve_after_interview':
          return await this.approveAfterInterview(params, context);
        case 'reject_after_interview':
          return await this.rejectAfterInterview(params, context);
        case 'get_pending_approvals':
          return await this.getPendingApprovals(params, context);
        case 'bulk_update_status':
          return await this.bulkUpdateStatus(params, context);
        case 'bulk_reject':
          return await this.bulkReject(params, context);
        case 'get_needs_followup':
          return await this.getNeedsFollowup(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async createApplication(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.jobPostingId || !params.candidateId) {
      return this.createErrorResult('Missing required fields', 'jobPostingId and candidateId are required for create action');
    }

    try {
      // Verify job posting exists and is active
      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: params.jobPostingId }
      });

      if (!jobPosting) {
        return this.createErrorResult('Job posting not found', `Job posting with ID ${params.jobPostingId} not found`);
      }

      if (jobPosting.status !== 'published') {
        return this.createErrorResult('Job posting not published', 'Job posting is not published');
      }

      if (new Date(jobPosting.applicationDeadline) <= new Date()) {
        return this.createErrorResult('Application deadline passed', 'Application deadline has passed');
      }

      // Verify candidate exists
      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: params.candidateId }
      });

      if (!candidate) {
        return this.createErrorResult('Candidate not found', `Candidate with ID ${params.candidateId} not found`);
      }

      // Check if application already exists
      const existingApplication = await this.applicationRepository.findOne({
        where: {
          jobPostingId: params.jobPostingId,
          candidateId: params.candidateId
        }
      });

      if (existingApplication) {
        return this.createErrorResult('Application already exists', 'Candidate has already applied for this job posting');
      }

      // Create application
      const application = this.applicationRepository.create({
        jobPostingId: params.jobPostingId,
        candidateId: params.candidateId,
        coverLetter: params.coverLetter,
        resumeUrl: params.resumeUrl,
        expectedStartDate: params.expectedStartDate ? new Date(params.expectedStartDate) : undefined,
        status: 'submitted',
        appliedDate: new Date(),
        createdAt: new Date()
      });

      const savedApplication = await this.applicationRepository.save(application);

      return this.createSuccessResult(
        {
          applicationId: savedApplication.applicationId,
          jobPostingId: savedApplication.jobPostingId,
          candidateId: savedApplication.candidateId,
          status: savedApplication.status,
          appliedDate: savedApplication.appliedDate,
          jobTitle: jobPosting.title,
          candidateName: `${candidate.firstName} ${candidate.lastName}`
        },
        `Application created successfully for candidate "${candidate.firstName} ${candidate.lastName}" to job "${jobPosting.title}"`
      );
    } catch (error) {
      if (error.code === '23505') {
        return this.createErrorResult('Duplicate application', 'Candidate has already applied for this job posting');
      }
      return this.createErrorResult('Create failed', error.message);
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
      updatedAt: new Date()
    });

    return this.createSuccessResult(
      {
        applicationId: params.id,
        oldStatus,
        newStatus: params.status
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
    
    const jobPostings = jobPostingIds.length > 0
      ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobPostingIds) } })
      : [];
    const candidates = candidateIds.length > 0
      ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
      : [];
    
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

    const sortBy = params.sortBy || 'screeningScore';
    const sortOrder = params.sortOrder || (sortBy === 'screeningScore' ? 'DESC' : 'DESC');
    const limit = params.limit;

    // Build query with sorting
    const queryBuilder = this.applicationRepository.createQueryBuilder('application')
      .where('application.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId });

    // Handle sorting
    if (sortBy === 'screeningScore') {
      // Sort by screeningScore DESC (nulls last), then by appliedDate DESC
      queryBuilder.orderBy('application.screeningScore', sortOrder === 'ASC' ? 'ASC' : 'DESC')
        .addOrderBy('application.appliedDate', 'DESC');
    } else if (sortBy === 'appliedDate') {
      queryBuilder.orderBy('application.appliedDate', sortOrder === 'ASC' ? 'ASC' : 'DESC');
    } else if (sortBy === 'status') {
      queryBuilder.orderBy('application.status', sortOrder === 'ASC' ? 'ASC' : 'DESC')
        .addOrderBy('application.appliedDate', 'DESC');
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      queryBuilder.limit(limit);
    }

    const applications = await queryBuilder.getMany();

    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.jobPostingId }
    });

    // Get candidates for applications
    const candidateIds = applications.map(app => app.candidateId);
    if (candidateIds.length > 0) {
      const candidates = await this.candidateRepository.find({
        where: { candidateId: In(candidateIds) }
      });
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
              screeningScore: app.screeningScore,
              isScreeningCompleted: app.isScreeningCompleted,
              candidate: {
                id: candidate?.candidateId,
                name: `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim(),
                email: candidate?.email
              }
            };
          }),
          totalApplications: applications.length,
          sortBy: sortBy,
          sortOrder: sortOrder,
          limit: limit || 'all'
        },
        `Found ${applications.length} application${applications.length !== 1 ? 's' : ''} for job posting ${params.jobPostingId}${limit ? ` (top ${limit} by ${sortBy})` : ''}`
      );
    }

    return this.createSuccessResult(
      {
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title,
          departmentId: jobPosting?.departmentId
        },
        applications: [],
        totalApplications: 0,
        sortBy: sortBy,
        sortOrder: sortOrder,
        limit: limit || 'all'
      },
      `No applications found for job posting ${params.jobPostingId}`
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

  private async makeOffer(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.offeredSalary) {
      return this.createErrorResult('Missing required fields', 'Application ID and offeredSalary are required for make_offer');
    }

    if (!params.expectedStartDate) {
      return this.createErrorResult('Missing required fields', 'expectedStartDate is required for make_offer');
    }

    try {
      const offerData: any = {
        offeredSalary: params.offeredSalary,
        expectedStartDate: params.expectedStartDate
      };

      if (params.offerExpiryDate) {
        offerData.offerExpiryDate = params.offerExpiryDate;
      }

      const result = await this.applicationService.makeOffer(params.id, offerData);
      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: result.candidateId }
      });

      return this.createSuccessResult(
        {
          applicationId: result.applicationId,
          status: result.status,
          offerStatus: result.offerStatus,
          offeredSalary: result.offeredSalary,
          offerDate: result.offerDate,
          offerExpiryDate: result.offerExpiryDate,
          expectedStartDate: result.expectedStartDate,
          candidate: {
            id: candidate?.candidateId,
            name: `${candidate?.firstName} ${candidate?.lastName}`,
            email: candidate?.email
          }
        },
        `Offer created successfully for application ${params.id} with salary ${params.offeredSalary} VND`
      );
    } catch (error) {
      return this.createErrorResult('Make offer failed', error.message);
    }
  }

  private async getOffers(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.applicationRepository.createQueryBuilder('app')
      .where('app.status = :status', { status: 'offer' });

    if (params.filters) {
      if (params.filters.offerStatus) {
        queryBuilder.andWhere('app.offerStatus = :offerStatus', { offerStatus: params.filters.offerStatus });
      }
      if (params.filters.jobPostingId) {
        queryBuilder.andWhere('app.jobPostingId = :jobPostingId', { jobPostingId: params.filters.jobPostingId });
      }
      if (params.filters.candidateId) {
        queryBuilder.andWhere('app.candidateId = :candidateId', { candidateId: params.filters.candidateId });
      }
    }

    queryBuilder.orderBy('app.offerDate', 'DESC');

    if (params.limit && params.limit > 0) {
      queryBuilder.limit(params.limit);
    }

    const applications = await queryBuilder.getMany();

    const candidateIds = applications.map(app => app.candidateId);
    const jobPostingIds = applications.map(app => app.jobPostingId);
    
    const candidates = candidateIds.length > 0
      ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
      : [];
    const jobPostings = jobPostingIds.length > 0
      ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobPostingIds) } })
      : [];

    const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
    const jobPostingMap = new Map(jobPostings.map(j => [j.jobPostingId, j]));

    const offers = applications.map(app => {
      const candidate = candidateMap.get(app.candidateId);
      const jobPosting = jobPostingMap.get(app.jobPostingId);
      return {
        applicationId: app.applicationId,
        offerStatus: app.offerStatus,
        offeredSalary: app.offeredSalary,
        offerDate: app.offerDate,
        offerExpiryDate: app.offerExpiryDate,
        expectedStartDate: app.expectedStartDate,
        candidate: {
          id: candidate?.candidateId,
          name: `${candidate?.firstName} ${candidate?.lastName}`,
          email: candidate?.email
        },
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title
        }
      };
    });

    return this.createSuccessResult(
      {
        offers,
        total: offers.length,
        pending: offers.filter(o => o.offerStatus === 'pending').length,
        accepted: offers.filter(o => o.offerStatus === 'accepted').length,
        rejected: offers.filter(o => o.offerStatus === 'rejected').length,
        expired: offers.filter(o => o.offerStatus === 'expired').length
      },
      `Found ${offers.length} offer${offers.length !== 1 ? 's' : ''}`
    );
  }

  private async updateOffer(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Application ID is required');
    }

    if (!params.offeredSalary && !params.offerExpiryDate) {
      return this.createErrorResult('Missing parameters', 'At least one of offeredSalary or offerExpiryDate is required');
    }

    try {
      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.id }
      });

      if (!application) {
        return this.createErrorResult('Application not found', `Application with ID ${params.id} not found`);
      }

      if (application.status !== 'offer') {
        return this.createErrorResult('Invalid status', 'Application is not in offer status');
      }

      const updateData: any = {};
      if (params.offeredSalary) {
        updateData.offeredSalary = params.offeredSalary;
      }
      if (params.offerExpiryDate) {
        updateData.offerExpiryDate = new Date(params.offerExpiryDate);
      }

      await this.applicationRepository.update(params.id, updateData);
      const updated = await this.applicationRepository.findOne({
        where: { applicationId: params.id }
      });

      if (!updated) {
        return this.createErrorResult('Application not found', `Application with ID ${params.id} not found after update`);
      }

      return this.createSuccessResult(
        {
          applicationId: updated.applicationId,
          offeredSalary: updated.offeredSalary,
          offerExpiryDate: updated.offerExpiryDate
        },
        `Offer updated successfully for application ${params.id}`
      );
    } catch (error) {
      return this.createErrorResult('Update offer failed', error.message);
    }
  }

  private async extendOffer(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.offerExpiryDate) {
      return this.createErrorResult('Missing required fields', 'Application ID and offerExpiryDate are required for extend_offer');
    }

    try {
      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.id }
      });

      if (!application) {
        return this.createErrorResult('Application not found', `Application with ID ${params.id} not found`);
      }

      if (application.status !== 'offer' || application.offerStatus !== 'pending') {
        return this.createErrorResult('Invalid status', 'Application does not have a pending offer');
      }

      const newExpiryDate = new Date(params.offerExpiryDate);
      if (newExpiryDate <= new Date()) {
        return this.createErrorResult('Invalid date', 'New expiry date must be in the future');
      }

      await this.applicationRepository.update(params.id, {
        offerExpiryDate: newExpiryDate
      });

      return this.createSuccessResult(
        {
          applicationId: params.id,
          oldExpiryDate: application.offerExpiryDate,
          newExpiryDate: params.offerExpiryDate
        },
        `Offer extended successfully for application ${params.id} until ${params.offerExpiryDate}`
      );
    } catch (error) {
      return this.createErrorResult('Extend offer failed', error.message);
    }
  }

  private async approveAfterInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.offeredSalary || !params.expectedStartDate) {
      return this.createErrorResult('Missing required fields', 'Application ID, offeredSalary, and expectedStartDate are required for approve_after_interview');
    }

    try {
      const approveData: any = {
        offeredSalary: params.offeredSalary,
        expectedStartDate: params.expectedStartDate
      };

      if (params.offerExpiryDate) {
        approveData.offerExpiryDate = params.offerExpiryDate;
      }

      const result = await this.applicationService.approveAfterInterview(params.id, approveData);
      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: result.candidateId }
      });
      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: result.jobPostingId }
      });

      return this.createSuccessResult(
        {
          applicationId: result.applicationId,
          status: result.status,
          offerStatus: result.offerStatus,
          offeredSalary: result.offeredSalary,
          offerDate: result.offerDate,
          offerExpiryDate: result.offerExpiryDate,
          expectedStartDate: result.expectedStartDate,
          candidate: {
            id: candidate?.candidateId,
            name: `${candidate?.firstName} ${candidate?.lastName}`,
            email: candidate?.email
          },
          jobPosting: {
            id: jobPosting?.jobPostingId,
            title: jobPosting?.title
          }
        },
        `Application ${params.id} approved after interview and offer created with salary ${params.offeredSalary} VND. Offer email sent to candidate.`
      );
    } catch (error) {
      return this.createErrorResult('Approve failed', error.message);
    }
  }

  private async rejectAfterInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Application ID is required');
    }

    try {
      const rejectData: any = {};
      if (params.rejectionReason) {
        rejectData.rejectionReason = params.rejectionReason;
      }

      const result = await this.applicationService.rejectAfterInterview(params.id, rejectData);
      const candidate = await this.candidateRepository.findOne({
        where: { candidateId: result.candidateId }
      });
      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: result.jobPostingId }
      });

      return this.createSuccessResult(
        {
          applicationId: result.applicationId,
          status: result.status,
          rejectionReason: result.rejectionReason,
          candidate: {
            id: candidate?.candidateId,
            name: `${candidate?.firstName} ${candidate?.lastName}`,
            email: candidate?.email
          },
          jobPosting: {
            id: jobPosting?.jobPostingId,
            title: jobPosting?.title
          }
        },
        `Application ${params.id} rejected after interview. Rejection email sent to candidate.`
      );
    } catch (error) {
      return this.createErrorResult('Reject failed', error.message);
    }
  }

  private async getPendingApprovals(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.applicationRepository.createQueryBuilder('app')
      .where('app.status = :status', { status: 'interviewing' });

    if (params.jobPostingId) {
      queryBuilder.andWhere('app.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId });
    }

    queryBuilder.orderBy('app.appliedDate', 'DESC');

    if (params.limit && params.limit > 0) {
      queryBuilder.limit(params.limit);
    }

    const applications = await queryBuilder.getMany();

    const candidateIds = applications.map(app => app.candidateId);
    const jobPostingIds = applications.map(app => app.jobPostingId);
    
    const candidates = candidateIds.length > 0
      ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
      : [];
    const jobPostings = jobPostingIds.length > 0
      ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobPostingIds) } })
      : [];

    const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
    const jobPostingMap = new Map(jobPostings.map(j => [j.jobPostingId, j]));

    const pendingApprovals = applications.map(app => {
      const candidate = candidateMap.get(app.candidateId);
      const jobPosting = jobPostingMap.get(app.jobPostingId);
      return {
        applicationId: app.applicationId,
        status: app.status,
        appliedDate: app.appliedDate,
        screeningScore: app.screeningScore,
        candidate: {
          id: candidate?.candidateId,
          name: `${candidate?.firstName} ${candidate?.lastName}`,
          email: candidate?.email
        },
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title
        }
      };
    });

    return this.createSuccessResult(
      {
        pendingApprovals,
        total: pendingApprovals.length
      },
      `Found ${pendingApprovals.length} application${pendingApprovals.length !== 1 ? 's' : ''} pending approval after interview`
    );
  }

  private async bulkUpdateStatus(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.jobPostingId || !params.newStatus) {
      return this.createErrorResult('Missing required fields', 'jobPostingId and newStatus are required for bulk_update_status');
    }

    try {
      const queryBuilder = this.applicationRepository.createQueryBuilder('app')
        .where('app.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId });

      if (params.filters) {
        if (params.filters.status) {
          queryBuilder.andWhere('app.status = :status', { status: params.filters.status });
        }
        if (params.filters.minScreeningScore !== undefined) {
          queryBuilder.andWhere('app.screeningScore >= :minScore', { minScore: params.filters.minScreeningScore });
        }
        if (params.filters.maxScreeningScore !== undefined) {
          queryBuilder.andWhere('app.screeningScore <= :maxScore', { maxScore: params.filters.maxScreeningScore });
        }
        if (params.filters.screeningScore !== undefined) {
          queryBuilder.andWhere('app.screeningScore = :score', { score: params.filters.screeningScore });
        }
      }

      const applications = await queryBuilder.getMany();
      const ids = applications.map(app => app.applicationId);

      if (ids.length === 0) {
        return this.createSuccessResult(
          { updated: 0, applications: [] },
          'No applications found matching the criteria'
        );
      }

      await this.applicationRepository.update(ids, {
        status: params.newStatus,
        updatedAt: new Date()
      });

      return this.createSuccessResult(
        {
          updated: ids.length,
          applicationIds: ids,
          newStatus: params.newStatus
        },
        `Updated ${ids.length} application${ids.length !== 1 ? 's' : ''} to status "${params.newStatus}"`
      );
    } catch (error) {
      return this.createErrorResult('Bulk update failed', error.message);
    }
  }

  private async bulkReject(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.jobPostingId) {
      return this.createErrorResult('Missing required fields', 'jobPostingId is required for bulk_reject');
    }

    try {
      const queryBuilder = this.applicationRepository.createQueryBuilder('app')
        .where('app.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId })
        .andWhere('app.status != :rejected', { rejected: 'rejected' });

      if (params.filters) {
        if (params.filters.minScreeningScore !== undefined) {
          queryBuilder.andWhere('app.screeningScore < :minScore', { minScore: params.filters.minScreeningScore });
        }
        if (params.filters.maxScreeningScore !== undefined) {
          queryBuilder.andWhere('app.screeningScore <= :maxScore', { maxScore: params.filters.maxScreeningScore });
        }
        if (params.filters.status) {
          queryBuilder.andWhere('app.status = :status', { status: params.filters.status });
        }
      }

      const applications = await queryBuilder.getMany();
      const ids = applications.map(app => app.applicationId);

      if (ids.length === 0) {
        return this.createSuccessResult(
          { rejected: 0, applications: [] },
          'No applications found matching the criteria'
        );
      }

      const updateData: any = {
        status: 'rejected',
        updatedAt: new Date()
      };

      if (params.rejectionReason) {
        updateData.rejectionReason = params.rejectionReason;
      }

      await this.applicationRepository.update(ids, updateData);

      return this.createSuccessResult(
        {
          rejected: ids.length,
          applicationIds: ids,
          rejectionReason: params.rejectionReason || 'Bulk rejection'
        },
        `Rejected ${ids.length} application${ids.length !== 1 ? 's' : ''}`
      );
    } catch (error) {
      return this.createErrorResult('Bulk reject failed', error.message);
    }
  }

  private async getNeedsFollowup(params: any, context: ToolContext): Promise<ToolResult> {
    const daysSinceApplied = params.daysSinceApplied || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceApplied);

    const queryBuilder = this.applicationRepository.createQueryBuilder('app')
      .where('app.appliedDate <= :cutoffDate', { cutoffDate })
      .andWhere('app.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: ['hired', 'rejected', 'withdrawn']
      });

    if (params.jobPostingId) {
      queryBuilder.andWhere('app.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId });
    }

    if (params.filters && params.filters.status) {
      queryBuilder.andWhere('app.status = :status', { status: params.filters.status });
    }

    queryBuilder.orderBy('app.appliedDate', 'ASC');

    if (params.limit && params.limit > 0) {
      queryBuilder.limit(params.limit);
    }

    const applications = await queryBuilder.getMany();

    const candidateIds = applications.map(app => app.candidateId);
    const jobPostingIds = applications.map(app => app.jobPostingId);
    
    const candidates = candidateIds.length > 0
      ? await this.candidateRepository.find({ where: { candidateId: In(candidateIds) } })
      : [];
    const jobPostings = jobPostingIds.length > 0
      ? await this.jobPostingRepository.find({ where: { jobPostingId: In(jobPostingIds) } })
      : [];

    const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));
    const jobPostingMap = new Map(jobPostings.map(j => [j.jobPostingId, j]));

    const needsFollowup = applications.map(app => {
      const candidate = candidateMap.get(app.candidateId);
      const jobPosting = jobPostingMap.get(app.jobPostingId);
      const daysAgo = Math.floor((new Date().getTime() - app.appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        applicationId: app.applicationId,
        status: app.status,
        appliedDate: app.appliedDate,
        daysSinceApplied: daysAgo,
        screeningScore: app.screeningScore,
        candidate: {
          id: candidate?.candidateId,
          name: `${candidate?.firstName} ${candidate?.lastName}`,
          email: candidate?.email
        },
        jobPosting: {
          id: jobPosting?.jobPostingId,
          title: jobPosting?.title
        }
      };
    });

    return this.createSuccessResult(
      {
        needsFollowup,
        total: needsFollowup.length,
        daysSinceApplied
      },
      `Found ${needsFollowup.length} application${needsFollowup.length !== 1 ? 's' : ''} that need follow-up (applied ${daysSinceApplied}+ days ago)`
    );
  }
}
