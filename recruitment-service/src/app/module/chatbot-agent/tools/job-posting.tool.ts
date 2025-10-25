import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';

@Injectable()
export class JobPostingTool extends BaseTool {
  name = 'job_posting_tool';
  description = 'Manage job postings: create, update, delete, and query job postings';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'delete', 'get', 'get_stats'],
        description: 'Action to perform on job postings'
      },
      id: {
        type: 'number',
        description: 'Job posting ID (required for update, delete, get)'
      },
      title: {
        type: 'string',
        description: 'Job title (required for create)'
      },
      description: {
        type: 'string',
        description: 'Job description (required for create)'
      },
      requirements: {
        type: 'string',
        description: 'Job requirements (required for create)'
      },
      department: {
        type: 'string',
        description: 'Department name'
      },
      location: {
        type: 'string',
        description: 'Job location'
      },
      salaryMin: {
        type: 'number',
        description: 'Minimum salary'
      },
      salaryMax: {
        type: 'number',
        description: 'Maximum salary'
      },
      status: {
        type: 'string',
        enum: ['draft', 'published', 'closed'],
        description: 'Job posting status'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying job postings',
        properties: {
          status: { type: 'string' },
          department: { type: 'string' },
          location: { type: 'string' }
        }
      }
    },
    required: ['action']
  };

  constructor(
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
        case 'create':
          return await this.createJobPosting(params, context);
        case 'update':
          return await this.updateJobPosting(params, context);
        case 'delete':
          return await this.deleteJobPosting(params, context);
        case 'get':
          return await this.getJobPosting(params, context);
        case 'get_stats':
          return await this.getJobStats(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async createJobPosting(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.title || !params.description || !params.requirements) {
      return this.createErrorResult(
        'Missing required fields',
        'Title, description, and requirements are required for creating a job posting'
      );
    }

      const jobPosting = this.jobPostingRepository.create({
         title: params.title,
         description: params.description,
         requirements: params.requirements,
         departmentId: params.departmentId || 1, // Default department ID
         location: params.location || 'Remote',
         salaryMin: params.salaryMin,
         salaryMax: params.salaryMax,
         status: params.status || 'draft',
         createdAt: new Date()
      });

    const savedJob = await this.jobPostingRepository.save(jobPosting);

    return this.createSuccessResult(
      {
        jobPostingId: savedJob.jobPostingId,
        title: savedJob.title,
        status: savedJob.status,
        createdAt: savedJob.createdAt
      },
      `Job posting "${savedJob.title}" created successfully`
    );
  }

  private async updateJobPosting(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Job posting ID is required for update');
    }

    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.id }
    });

    if (!jobPosting) {
      return this.createErrorResult('Job posting not found', `Job posting with ID ${params.id} not found`);
    }

      const updateData: any = {};
      if (params.title) updateData.title = params.title;
      if (params.description) updateData.description = params.description;
      if (params.requirements) updateData.requirements = params.requirements;
      if (params.departmentId) updateData.departmentId = params.departmentId;
      if (params.location) updateData.location = params.location;
      if (params.salaryMin !== undefined) updateData.salaryMin = params.salaryMin;
      if (params.salaryMax !== undefined) updateData.salaryMax = params.salaryMax;
      if (params.status) updateData.status = params.status;

    updateData.updatedAt = new Date();

    await this.jobPostingRepository.update(params.id, updateData);

    return this.createSuccessResult(
      { jobPostingId: params.id, updatedFields: Object.keys(updateData) },
      `Job posting "${jobPosting.title}" updated successfully`
    );
  }

  private async deleteJobPosting(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Job posting ID is required for delete');
    }

    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.id }
    });

    if (!jobPosting) {
      return this.createErrorResult('Job posting not found', `Job posting with ID ${params.id} not found`);
    }

    await this.jobPostingRepository.delete(params.id);

    return this.createSuccessResult(
      { jobPostingId: params.id, title: jobPosting.title },
      `Job posting "${jobPosting.title}" deleted successfully`
    );
  }

  private async getJobPosting(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
      return this.createErrorResult('Missing ID', 'Job posting ID is required');
    }

    const jobPosting = await this.jobPostingRepository.findOne({
      where: { jobPostingId: params.id }
    });

    if (!jobPosting) {
      return this.createErrorResult('Job posting not found', `Job posting with ID ${params.id} not found`);
    }

    return this.createSuccessResult(
      {
        jobPostingId: jobPosting.jobPostingId,
        title: jobPosting.title,
        description: jobPosting.description,
        requirements: jobPosting.requirements,
        department: jobPosting.departmentId,
        location: jobPosting.location,
        salaryMin: jobPosting.salaryMin,
        salaryMax: jobPosting.salaryMax,
        status: jobPosting.status,
        createdAt: jobPosting.createdAt,
        updatedAt: jobPosting.updatedAt
      },
      `Job posting "${jobPosting.title}" retrieved successfully`
    );
  }

  private async getJobStats(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.jobPostingRepository.createQueryBuilder('job');

    // Apply filters
    if (params.filters) {
      if (params.filters.status) {
        queryBuilder.andWhere('job.status = :status', { status: params.filters.status });
      }
      if (params.filters.department) {
        queryBuilder.andWhere('job.department = :department', { department: params.filters.department });
      }
      if (params.filters.location) {
        queryBuilder.andWhere('job.location = :location', { location: params.filters.location });
      }
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();

    // Calculate statistics
    const stats = {
      total,
      byStatus: jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: jobs.reduce((acc, job) => {
        const department = job.departmentId || 'Unknown';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
      }, {}),
      byLocation: jobs.reduce((acc, job) => {
        const location = job.location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {}),
      recentJobs: jobs
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(job => ({
          id: job.jobPostingId,
          title: job.title,
          status: job.status,
          createdAt: job.createdAt
        }))
    };

    return this.createSuccessResult(stats, `Job posting statistics retrieved successfully`);
  }
}
