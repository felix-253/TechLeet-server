import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { CompanyServiceClient } from '../../analytics/company-service.client';

@Injectable()
export class JobPostingTool extends BaseTool {
  name = 'job_posting_tool';
  description = 'Manage job postings: create, update, delete, and query job postings';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'delete', 'get', 'list', 'get_stats'],
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
      departmentId: {
        type: 'number',
        description: 'Department ID (optional if departmentName is provided)'
      },
      departmentName: {
        type: 'string',
        description: 'Department name (required for create if departmentId is not provided)'
      },
      positionId: {
        type: 'number',
        description: 'Position ID (optional if positionName is provided)'
      },
      positionName: {
        type: 'string',
        description: 'Position name (required for create if positionId is not provided)'
      },
      applicationDeadline: {
        type: 'string',
        description: 'Application deadline in YYYY-MM-DD format (required for create)'
      },
      vacancies: {
        type: 'number',
        description: 'Number of open positions (default: 1)'
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
      benefits: {
        type: 'string',
        description: 'Benefits and perks offered'
      },
      employmentType: {
        type: 'string',
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        description: 'Employment type'
      },
      experienceLevel: {
        type: 'string',
        enum: ['entry', 'junior', 'senior', 'lead', 'manager'],
        description: 'Experience level required'
      },
      isTest: {
        type: 'boolean',
        description: 'Whether this job posting requires a test'
      },
      questionSetId: {
        type: 'number',
        description: 'ID of the question set used for this job'
      },
      quantityQuestion: {
        type: 'number',
        description: 'Number of questions for this job'
      },
      minScore: {
        type: 'number',
        description: 'Minimum score required for this job'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying job postings',
        properties: {
          status: { type: 'string' },
          department: { type: 'string' },
          location: { type: 'string' }
        }
      },
      limit: {
        type: 'number',
        description: 'Limit number of results (for list action, default: 10)'
      },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'updatedAt', 'title'],
        description: 'Field to sort by (for list action, default: createdAt)'
      },
      sortOrder: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        description: 'Sort order (for list action, default: DESC)'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    private readonly companyServiceClient: CompanyServiceClient
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
          return await this.createJobPosting(params, context);
        case 'update':
          return await this.updateJobPosting(params, context);
        case 'delete':
          return await this.deleteJobPosting(params, context);
        case 'get':
          return await this.getJobPosting(params, context);
        case 'list':
          return await this.listJobPostings(params, context);
        case 'get_stats':
          return await this.getJobStats(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match (one contains the other)
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Word-based similarity
    const words1 = s1.split(/\s+/).filter(w => w.length > 0);
    const words2 = s2.split(/\s+/).filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Count common words
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);
    
    // If all words match, return high score
    if (commonWords.length === words1.length && commonWords.length === words2.length) {
      return 0.9;
    }
    
    // Calculate similarity based on common words
    const wordSimilarity = commonWords.length / totalWords;
    
    // Check if any word contains another (for partial matches like "Software" vs "Software Engineering")
    const hasPartialMatch = words1.some(w1 => 
      words2.some(w2 => w1.includes(w2) || w2.includes(w1))
    );
    
    // Boost score if there's a partial match
    return hasPartialMatch ? Math.max(wordSimilarity, 0.5) : wordSimilarity;
  }

  private findBestMatch<T extends { name: string }>(
    searchTerm: string,
    items: T[],
    threshold: number = 0.3
  ): { match: T | null; suggestions: T[] } {
    if (!searchTerm || items.length === 0) {
      return { match: null, suggestions: items.slice(0, 5) };
    }

    // Calculate similarity scores
    const scored = items.map(item => ({
      item,
      score: this.calculateSimilarity(searchTerm, item.name)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Find match with lower threshold (0.4 instead of 0.6) for better matching
    const bestMatch = scored.find(s => s.score >= 0.4);
    
    // Get suggestions (top 5 matches, even if score is low)
    const suggestions = scored
      .slice(0, 5)
      .map(s => s.item);

    return {
      match: bestMatch ? bestMatch.item : null,
      suggestions: suggestions.length > 0 ? suggestions : items.slice(0, 5)
    };
  }

  private async createJobPosting(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.title || !params.description || !params.requirements) {
      return this.createErrorResult(
        'Missing required fields',
        'Title, description, and requirements are required for creating a job posting'
      );
    }

    if (!params.applicationDeadline) {
      return this.createErrorResult(
        'Missing required fields',
        'applicationDeadline is required for creating a job posting'
      );
    }

    // Resolve department ID from name if needed
    let departmentId = params.departmentId;
    if (!departmentId && params.departmentName) {
      const departments = await this.companyServiceClient.getDepartments();
      
      if (departments.length === 0) {
        return this.createErrorResult(
          'No departments available',
          'No departments found in the system. Please contact administrator.'
        );
      }

      // If only one department, use it automatically
      if (departments.length === 1) {
        departmentId = departments[0].departmentId;
      } else {
        const { match, suggestions } = this.findBestMatch(params.departmentName, departments);
        
        if (match) {
          departmentId = match.departmentId;
        } else {
          // No good match found, suggest options
          const deptList = suggestions.map(d => `- ${d.name} (ID: ${d.departmentId})`).join('\n');
          return this.createErrorResult(
            'Department not found',
            `Could not find exact match for department "${params.departmentName}". Did you mean one of these?\n\n${deptList}\n\nPlease provide either departmentId or a valid departmentName from the list above.`
          );
        }
      }
    }

    if (!departmentId) {
      const departments = await this.companyServiceClient.getDepartments();
      if (departments.length === 0) {
        return this.createErrorResult(
          'No departments available',
          'No departments found in the system. Please contact administrator.'
        );
      }
      
      // If only one department, use it automatically
      if (departments.length === 1) {
        departmentId = departments[0].departmentId;
      } else {
        const deptList = departments.slice(0, 10).map(d => `- ${d.name} (ID: ${d.departmentId})`).join('\n');
        return this.createErrorResult(
          'Missing department',
          `Please provide either departmentId or departmentName. Available departments:\n${deptList}`
        );
      }
    }

    // Resolve position ID from name if needed
    let positionId = params.positionId;
    if (!positionId && params.positionName) {
      let positions = await this.companyServiceClient.getPositions(departmentId);
      
      // If no positions in department, try all positions
      if (positions.length === 0) {
        positions = await this.companyServiceClient.getPositions();
      }

      if (positions.length === 0) {
        return this.createErrorResult(
          'No positions available',
          'No positions found in the system. Please contact administrator.'
        );
      }

      // If only one position, use it automatically
      if (positions.length === 1) {
        positionId = positions[0].positionId;
      } else {
        const { match, suggestions } = this.findBestMatch(params.positionName, positions);
        
        if (match) {
          positionId = match.positionId;
        } else {
          // No good match found, suggest options
          const posList = suggestions.map(p => `- ${p.name} (ID: ${p.positionId})`).join('\n');
          return this.createErrorResult(
            'Position not found',
            `Could not find exact match for position "${params.positionName}". Did you mean one of these?\n\n${posList}\n\nPlease provide either positionId or a valid positionName from the list above.`
          );
        }
      }
    }

    if (!positionId) {
      let positions = await this.companyServiceClient.getPositionsByDepartment(departmentId);
      
      // If no positions in department, try all positions
      if (positions.length === 0) {
        positions = await this.companyServiceClient.getPositions();
      }

      if (positions.length === 0) {
        // If no positions available, use default positionId (1) as fallback
        // This allows job posting creation even without positions in the system
        positionId = 1;
      } else if (positions.length === 1) {
        // If only one position, use it automatically
        positionId = positions[0].positionId;
      } else {
        // If multiple positions, use the first one as default
        // This allows job posting creation without requiring user to specify position
        positionId = positions[0].positionId;
      }
    }

    // Validate application deadline is in the future
    const deadline = new Date(params.applicationDeadline);
    if (isNaN(deadline.getTime())) {
      return this.createErrorResult(
        'Invalid date',
        'applicationDeadline must be a valid date in YYYY-MM-DD format'
      );
    }

    if (deadline <= new Date()) {
      return this.createErrorResult(
        'Invalid deadline',
        'Application deadline must be in the future'
      );
    }

    // Validate salary range
    if (params.salaryMin && params.salaryMax && params.salaryMin > params.salaryMax) {
      return this.createErrorResult(
        'Invalid salary range',
        'Minimum salary cannot be greater than maximum salary'
      );
    }

    const jobPosting = this.jobPostingRepository.create({
      title: params.title,
      description: params.description,
      requirements: params.requirements,
      departmentId: departmentId,
      positionId: positionId,
      applicationDeadline: deadline,
      vacancies: params.vacancies || 1,
      location: params.location || 'Remote',
      salaryMin: params.salaryMin,
      salaryMax: params.salaryMax,
      status: params.status || 'draft',
      benefits: params.benefits,
      employmentType: params.employmentType,
      experienceLevel: params.experienceLevel,
      isTest: params.isTest || false,
      questionSetId: params.questionSetId,
      quantityQuestion: params.quantityQuestion,
      minScore: params.minScore
    });

    const savedJob = await this.jobPostingRepository.save(jobPosting);

    return this.createSuccessResult(
      {
        jobPostingId: savedJob.jobPostingId,
        title: savedJob.title,
        status: savedJob.status,
        departmentId: savedJob.departmentId,
        positionId: savedJob.positionId,
        applicationDeadline: savedJob.applicationDeadline,
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

  private async listJobPostings(params: any, context: ToolContext): Promise<ToolResult> {
    const limit = params.limit || 10;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'DESC';

    const queryBuilder = this.jobPostingRepository.createQueryBuilder('job');

    // Apply filters
    if (params.filters) {
      if (params.filters.status) {
        queryBuilder.andWhere('job.status = :status', { status: params.filters.status });
      }
      if (params.filters.department) {
        queryBuilder.andWhere('job.departmentId = :department', { department: params.filters.department });
      }
      if (params.filters.location) {
        queryBuilder.andWhere('job.location ILIKE :location', { location: `%${params.filters.location}%` });
      }
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`job.${sortField}`, order);

    // Apply limit
    queryBuilder.limit(limit);

    const jobs = await queryBuilder.getMany();

    return this.createSuccessResult(
      {
        jobs: jobs.map(job => ({
          jobPostingId: job.jobPostingId,
          title: job.title,
          description: job.description,
          status: job.status,
          departmentId: job.departmentId,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })),
        total: jobs.length,
        limit,
        sortBy: sortField,
        sortOrder: order
      },
      `Found ${jobs.length} job posting(s)`
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
