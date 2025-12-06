import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';

@Injectable()
export class CandidateTool extends BaseTool {
  name = 'candidate_tool';
  description = 'Manage candidates: query candidates, update information, schedule interviews, and get statistics';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'update', 'schedule_interview', 'get_stats', 'search'],
        description: 'Action to perform on candidates'
      },
      id: {
        type: 'number',
        description: 'Candidate ID (required for get, update, schedule_interview)'
      },
      firstName: {
        type: 'string',
        description: 'Candidate first name'
      },
      lastName: {
        type: 'string',
        description: 'Candidate last name'
      },
      email: {
        type: 'string',
        description: 'Candidate email'
      },
      phone: {
        type: 'string',
        description: 'Candidate phone number'
      },
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Candidate skills'
      },
      experience: {
        type: 'number',
        description: 'Years of experience'
      },
      interviewDetails: {
        type: 'object',
        description: 'Interview scheduling details',
        properties: {
          jobId: { type: 'number' },
          scheduledAt: { type: 'string' },
          meetingLink: { type: 'string' },
          location: { type: 'string' },
          interviewerIds: { type: 'array', items: { type: 'number' } }
        }
      },
      filters: {
        type: 'object',
        description: 'Filters for querying candidates',
        properties: {
          keyword: { type: 'string', description: 'Search by name or email' },
          skills: { type: 'array', items: { type: 'string' } },
          experience: { type: 'number' },
          location: { type: 'string' },
          status: { type: 'string' }
        }
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(InterviewEntity)
    private readonly interviewRepository: Repository<InterviewEntity>
  ) {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      // Auto-resolve ID if missing but name/email provided for get/update/schedule/get_stats
      if (!params.id && (params.action === 'get' || params.action === 'update' || params.action === 'schedule_interview' || params.action === 'get_stats')) {
         const resolvedId = await this.resolveCandidateId(params);
         if (resolvedId) {
            params.id = resolvedId;
         }
      }

      switch (params.action) {
        case 'get':
          return await this.getCandidate(params, context);
        case 'update':
          return await this.updateCandidate(params, context);
        case 'schedule_interview':
          return await this.scheduleInterview(params, context);
        case 'get_stats':
          return await this.getCandidateStats(params, context);
        case 'search':
          return await this.searchCandidates(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async resolveCandidateId(params: any): Promise<number | null> {
      // Try to resolve by email first (most precise)
      if (params.email) {
          const candidate = await this.candidateRepository.findOne({ where: { email: params.email } });
          if (candidate) return candidate.candidateId;
      }
      
      // Try by full name or partial name
      const name = params.name || (params.firstName && params.lastName ? `${params.firstName} ${params.lastName}` : params.firstName || params.lastName);
      if (name) {
          const candidates = await this.candidateRepository.createQueryBuilder('c')
             .where("LOWER(CONCAT(c.firstName, ' ', c.lastName)) LIKE LOWER(:name)", { name: `%${name}%` })
             .orWhere("LOWER(c.email) LIKE LOWER(:name)", { name: `%${name}%` })
             .getMany();
          
          if (candidates.length === 1) {
              return candidates[0].candidateId;
          }
          // If multiple found, we can't auto-resolve safely without more info, 
          // but for a chatbot, maybe returning the most recent one is acceptable or just letting the tool fail explicitly later?
          // Let's return null so the specific method can handle the "missing ID" error or "ambiguous" error.
      }
      return null;
  }

  private async getCandidate(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
       // Check if we failed to resolve
       const name = params.name || params.firstName || params.lastName || params.email;
       if (name) {
          return this.createErrorResult('Ambiguous or Not Found', `Could not find a unique candidate matching "${name}". Please be more specific (e.g. provide full email).`);
       }
       return this.createErrorResult('Missing ID', 'Candidate ID (or unique Name/Email) is required');
    }

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: params.id }
    });

    if (!candidate) {
      return this.createErrorResult('Candidate not found', `Candidate with ID ${params.id} not found`);
    }

    return this.createSuccessResult(
      {
        candidateId: candidate.candidateId,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phoneNumber,
        skills: candidate.skills,
        experience: candidate.yearsOfExperience,
        location: candidate.address,
        status: candidate.status,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
      },
      `Candidate "${candidate.firstName} ${candidate.lastName}" retrieved successfully`
    );
  }

  private async updateCandidate(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id) {
       return this.createErrorResult('Missing ID', 'Candidate ID (or unique Name/Email) is required for update');
    }

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: params.id }
    });

    if (!candidate) {
      return this.createErrorResult('Candidate not found', `Candidate with ID ${params.id} not found`);
    }

      const updateData: any = {};
      if (params.firstName) updateData.firstName = params.firstName;
      if (params.lastName) updateData.lastName = params.lastName;
      if (params.email) updateData.email = params.email;
      if (params.phoneNumber) updateData.phoneNumber = params.phoneNumber;
      if (params.skills) updateData.skills = params.skills;
      if (params.experience !== undefined) updateData.yearsOfExperience = params.experience;
      if (params.location) updateData.address = params.location;

    updateData.updatedAt = new Date();

    await this.candidateRepository.update(params.id, updateData);

    return this.createSuccessResult(
      { 
        candidateId: params.id, 
        updatedFields: Object.keys(updateData),
        name: `${candidate.firstName} ${candidate.lastName}`
      },
      `Candidate "${candidate.firstName} ${candidate.lastName}" updated successfully`
    );
  }

  private async scheduleInterview(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.id || !params.interviewDetails) {
       if (!params.id) return this.createErrorResult('Missing ID', 'Could not identify candidate. Please provide ID or unique Name.');
       return this.createErrorResult('Missing parameters', 'Candidate ID and interview details are required');
    }

    const candidate = await this.candidateRepository.findOne({
      where: { candidateId: params.id }
    });

    if (!candidate) {
      return this.createErrorResult('Candidate not found', `Candidate with ID ${params.id} not found`);
    }

    const interviewDetails = params.interviewDetails;
    if (!interviewDetails.jobId || !interviewDetails.scheduledAt) {
      return this.createErrorResult('Missing interview details', 'Job ID and scheduled time are required');
    }

    const interview = this.interviewRepository.create({
      candidate_id: params.id,
      job_id: interviewDetails.jobId,
      scheduled_at: new Date(interviewDetails.scheduledAt),
      meeting_link: interviewDetails.meetingLink,
      location: interviewDetails.location,
      interviewer_ids: interviewDetails.interviewerIds || [],
      status: 'scheduled',
      createdAt: new Date()
    });

    const savedInterview = await this.interviewRepository.save(interview);

    return this.createSuccessResult(
      {
        interviewId: savedInterview.interview_id,
        candidateId: params.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobId: interviewDetails.jobId,
        scheduledAt: savedInterview.scheduled_at,
        meetingLink: savedInterview.meeting_link,
        location: savedInterview.location
      },
      `Interview scheduled for candidate "${candidate.firstName} ${candidate.lastName}"`
    );
  }

  private async getCandidateStats(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.candidateRepository.createQueryBuilder('candidate');

    // Apply filters
    if (params.filters) {
      if (params.filters.keyword) {
         queryBuilder.andWhere("(LOWER(candidate.firstName) LIKE LOWER(:k) OR LOWER(candidate.lastName) LIKE LOWER(:k) OR LOWER(candidate.email) LIKE LOWER(:k))", { k: `%${params.filters.keyword}%` });
      }
      if (params.filters.skills && params.filters.skills.length > 0) {
        queryBuilder.andWhere('candidate.skills && :skills', { skills: params.filters.skills });
      }
      if (params.filters.experience !== undefined) {
        queryBuilder.andWhere('candidate.experience >= :experience', { experience: params.filters.experience });
      }
      if (params.filters.location) {
        queryBuilder.andWhere('candidate.location ILIKE :location', { location: `%${params.filters.location}%` });
      }
      if (params.filters.status) {
        queryBuilder.andWhere('candidate.status = :status', { status: params.filters.status });
      }
    }

    const [candidates, total] = await queryBuilder.getManyAndCount();

    // Calculate statistics
    const stats = {
      total,
      byLocation: candidates.reduce((acc, candidate) => {
        const location = candidate.address || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {}),
      byExperience: candidates.reduce((acc, candidate) => {
        const exp = candidate.yearsOfExperience || 0;
        const range = exp < 2 ? '0-2 years' : exp < 5 ? '2-5 years' : exp < 10 ? '5-10 years' : '10+ years';
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      }, {}),
      topSkills: candidates.reduce((acc, candidate) => {
        if (candidate.skills) {
          // Handle skills as string (comma-separated) or array
          const skillsArray = typeof candidate.skills === 'string' 
            ? candidate.skills.split(',').map(s => s.trim())
            : candidate.skills;
          skillsArray.forEach(skill => {
            acc[skill] = (acc[skill] || 0) + 1;
          });
        }
        return acc;
      }, {}),
      recentCandidates: candidates
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(candidate => ({
          id: candidate.candidateId,
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          phoneNumber: candidate.phoneNumber,
          experience: candidate.yearsOfExperience,
          location: candidate.address,
          skills: candidate.skills,
          status: candidate.status,
          createdAt: candidate.createdAt
        }))
    };

    // Sort top skills
    stats.topSkills = Object.entries(stats.topSkills)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .reduce((acc, [skill, count]) => {
        acc[skill] = count;
        return acc;
      }, {});

    return this.createSuccessResult(stats, `Candidate statistics retrieved successfully`);
  }

  private async searchCandidates(params: any, context: ToolContext): Promise<ToolResult> {
    const queryBuilder = this.candidateRepository.createQueryBuilder('candidate');

    // Apply search filters
    if (params.filters) {
       if (params.filters.keyword) {
           queryBuilder.andWhere("(LOWER(candidate.firstName) LIKE LOWER(:k) OR LOWER(candidate.lastName) LIKE LOWER(:k) OR LOWER(candidate.email) LIKE LOWER(:k))", { k: `%${params.filters.keyword}%` });
       }
      if (params.filters.skills && params.filters.skills.length > 0) {
        queryBuilder.andWhere('candidate.skills && :skills', { skills: params.filters.skills });
      }
      if (params.filters.experience !== undefined) {
        queryBuilder.andWhere('candidate.experience >= :experience', { experience: params.filters.experience });
      }
      if (params.filters.location) {
        queryBuilder.andWhere('candidate.location ILIKE :location', { location: `%${params.filters.location}%` });
      }
    }

    const candidates = await queryBuilder
      .orderBy('candidate.createdAt', 'DESC')
      .limit(20)
      .getMany();

    return this.createSuccessResult(
      {
        candidates: candidates.map(candidate => ({
          id: candidate.candidateId,
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          phoneNumber: candidate.phoneNumber,
          skills: candidate.skills,
          experience: candidate.yearsOfExperience,
          location: candidate.address,
          status: candidate.status,
          createdAt: candidate.createdAt
        })),
        totalFound: candidates.length
      },
      `Found ${candidates.length} candidates matching search criteria`
    );
  }
}
