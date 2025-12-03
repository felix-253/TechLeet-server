import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { CvScreeningResultEntity, ScreeningStatus } from '../../../../entities/recruitment/cv-screening-result.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { CvScreeningService } from '../../cv-screening/cv-screening.service';

@Injectable()
export class CvScreeningTool extends BaseTool {
  name = 'cv_screening_tool';
  description = 'Manage CV screening: trigger screening for applications, get screening results, find top candidates by score, compare candidates, and get screening statistics. Use get_top_candidates to find candidates with highest screening scores for a job.';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['trigger_screening', 'get_screening_result', 'get_top_candidates', 'compare_candidates', 'get_screening_stats'],
        description: 'Action to perform on CV screening. Use trigger_screening to start screening for an application, get_screening_result to get result by applicationId or screeningId, get_top_candidates to get top candidates by score, compare_candidates to compare 2 candidates, get_screening_stats to get statistics.'
      },
      applicationId: {
        type: 'number',
        description: 'Application ID (required for trigger_screening, get_screening_result by application)'
      },
      screeningId: {
        type: 'number',
        description: 'Screening result ID (optional for get_screening_result)'
      },
      jobPostingId: {
        type: 'number',
        description: 'Job posting ID (required for get_top_candidates, optional for get_screening_stats)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (for get_top_candidates, default: 10)'
      },
      minScore: {
        type: 'number',
        description: 'Minimum screening score threshold (for get_top_candidates, default: 0)'
      },
      applicationId1: {
        type: 'number',
        description: 'First application ID for comparison (required for compare_candidates)'
      },
      applicationId2: {
        type: 'number',
        description: 'Second application ID for comparison (required for compare_candidates)'
      },
      priority: {
        type: 'number',
        description: 'Priority for screening job (0-10, optional for trigger_screening, default: 0)'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(CvScreeningResultEntity)
    private readonly screeningRepository: Repository<CvScreeningResultEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    private readonly cvScreeningService: CvScreeningService
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
        case 'trigger_screening':
          return await this.triggerScreening(params, context);
        case 'get_screening_result':
          return await this.getScreeningResult(params, context);
        case 'get_top_candidates':
          return await this.getTopCandidates(params, context);
        case 'compare_candidates':
          return await this.compareCandidates(params, context);
        case 'get_screening_stats':
          return await this.getScreeningStats(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async triggerScreening(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId) {
      return this.createErrorResult('Missing required fields', 'applicationId is required for trigger_screening');
    }

    try {
      const priority = params.priority !== undefined ? params.priority : 0;
      const result = await this.cvScreeningService.triggerScreening(
        params.applicationId,
        undefined,
        priority
      );

      const application = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId }
      });
      const candidate = application ? await this.candidateRepository.findOne({
        where: { candidateId: application.candidateId }
      }) : null;

      return this.createSuccessResult(
        {
          screeningId: result.screeningId,
          applicationId: result.applicationId,
          jobPostingId: result.jobPostingId,
          status: result.status,
          overallScore: result.overallScore,
          skillsScore: result.skillsScore,
          experienceScore: result.experienceScore,
          educationScore: result.educationScore,
          candidate: candidate ? {
            id: candidate.candidateId,
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email
          } : null,
          message: result.status === ScreeningStatus.PENDING || result.status === ScreeningStatus.PROCESSING
            ? 'Screening job triggered successfully. Processing in background.'
            : 'Screening result retrieved.'
        },
        `CV screening ${result.status === ScreeningStatus.PENDING || result.status === ScreeningStatus.PROCESSING ? 'triggered' : 'retrieved'} for application ${params.applicationId}`
      );
    } catch (error) {
      return this.createErrorResult('Trigger screening failed', error.message);
    }
  }

  private async getScreeningResult(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId && !params.screeningId) {
      return this.createErrorResult('Missing required fields', 'Either applicationId or screeningId is required for get_screening_result');
    }

    try {
      let result;
      if (params.screeningId) {
        result = await this.cvScreeningService.getScreeningResult(params.screeningId);
      } else {
        result = await this.cvScreeningService.getScreeningByApplication(params.applicationId);
      }

      if (!result) {
        return this.createErrorResult('Screening result not found', `No screening result found for ${params.screeningId ? `screeningId ${params.screeningId}` : `applicationId ${params.applicationId}`}`);
      }

      const application = await this.applicationRepository.findOne({
        where: { applicationId: result.applicationId }
      });
      const candidate = application ? await this.candidateRepository.findOne({
        where: { candidateId: application.candidateId }
      }) : null;
      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: result.jobPostingId }
      });

      return this.createSuccessResult(
        {
          screeningId: result.screeningId,
          applicationId: result.applicationId,
          jobPostingId: result.jobPostingId,
          status: result.status,
          overallScore: result.overallScore,
          skillsScore: result.skillsScore,
          experienceScore: result.experienceScore,
          educationScore: result.educationScore,
          aiSummary: result.aiSummary,
          keyHighlights: result.keyHighlights,
          concerns: result.concerns,
          extractedSkills: result.extractedSkills,
          processingTimeMs: result.processingTimeMs,
          errorMessage: result.errorMessage,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          completedAt: result.completedAt,
          candidate: candidate ? {
            id: candidate.candidateId,
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email
          } : null,
          jobPosting: jobPosting ? {
            id: jobPosting.jobPostingId,
            title: jobPosting.title
          } : null
        },
        `Screening result retrieved for application ${result.applicationId}`
      );
    } catch (error) {
      return this.createErrorResult('Get screening result failed', error.message);
    }
  }

  private async getTopCandidates(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.jobPostingId) {
      return this.createErrorResult('Missing required fields', 'jobPostingId is required for get_top_candidates');
    }

    try {
      const limit = params.limit && params.limit > 0 ? params.limit : 10;
      const minScore = params.minScore !== undefined ? params.minScore : 0;

      const queryBuilder = this.screeningRepository.createQueryBuilder('screening')
        .where('screening.jobPostingId = :jobPostingId', { jobPostingId: params.jobPostingId })
        .andWhere('screening.status = :status', { status: ScreeningStatus.COMPLETED })
        .andWhere('screening.overallScore IS NOT NULL');

      if (minScore > 0) {
        queryBuilder.andWhere('screening.overallScore >= :minScore', { minScore });
      }

      queryBuilder
        .orderBy('screening.overallScore', 'DESC')
        .limit(limit);

      const screenings = await queryBuilder.getMany();

      if (screenings.length === 0) {
        return this.createSuccessResult(
          {
            jobPostingId: params.jobPostingId,
            candidates: [],
            total: 0,
            minScore
          },
          `No candidates found with screening score >= ${minScore} for job posting ${params.jobPostingId}`
        );
      }

      const applicationIds = screenings.map(s => s.applicationId);
      const applications = await this.applicationRepository.find({
        where: { applicationId: In(applicationIds) }
      });
      const candidateIds = applications.map(app => app.candidateId);
      const candidates = await this.candidateRepository.find({
        where: { candidateId: In(candidateIds) }
      });

      const applicationMap = new Map(applications.map(app => [app.applicationId, app]));
      const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));

      const topCandidates = screenings.map(screening => {
        const application = applicationMap.get(screening.applicationId);
        const candidate = application ? candidateMap.get(application.candidateId) : null;
        return {
          screeningId: screening.screeningId,
          applicationId: screening.applicationId,
          overallScore: screening.overallScore,
          skillsScore: screening.skillsScore,
          experienceScore: screening.experienceScore,
          educationScore: screening.educationScore,
          candidate: candidate ? {
            id: candidate.candidateId,
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email
          } : null,
          aiSummary: screening.aiSummary,
          keyHighlights: screening.keyHighlights
        };
      });

      const jobPosting = await this.jobPostingRepository.findOne({
        where: { jobPostingId: params.jobPostingId }
      });

      return this.createSuccessResult(
        {
          jobPosting: jobPosting ? {
            id: jobPosting.jobPostingId,
            title: jobPosting.title
          } : null,
          candidates: topCandidates,
          total: topCandidates.length,
          minScore,
          limit
        },
        `Found ${topCandidates.length} top candidate${topCandidates.length !== 1 ? 's' : ''} for job posting ${params.jobPostingId}${minScore > 0 ? ` with score >= ${minScore}` : ''}`
      );
    } catch (error) {
      return this.createErrorResult('Get top candidates failed', error.message);
    }
  }

  private async compareCandidates(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.applicationId1 || !params.applicationId2) {
      return this.createErrorResult('Missing required fields', 'applicationId1 and applicationId2 are required for compare_candidates');
    }

    try {
      const screening1 = await this.cvScreeningService.getScreeningByApplication(params.applicationId1);
      const screening2 = await this.cvScreeningService.getScreeningByApplication(params.applicationId2);

      if (!screening1) {
        return this.createErrorResult('Screening not found', `No screening result found for application ${params.applicationId1}`);
      }

      if (!screening2) {
        return this.createErrorResult('Screening not found', `No screening result found for application ${params.applicationId2}`);
      }

      const application1 = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId1 }
      });
      const application2 = await this.applicationRepository.findOne({
        where: { applicationId: params.applicationId2 }
      });

      const candidate1 = application1 ? await this.candidateRepository.findOne({
        where: { candidateId: application1.candidateId }
      }) : null;
      const candidate2 = application2 ? await this.candidateRepository.findOne({
        where: { candidateId: application2.candidateId }
      }) : null;

      const comparison = {
        candidate1: {
          applicationId: params.applicationId1,
          candidate: candidate1 ? {
            id: candidate1.candidateId,
            name: `${candidate1.firstName} ${candidate1.lastName}`,
            email: candidate1.email
          } : null,
          overallScore: screening1.overallScore,
          skillsScore: screening1.skillsScore,
          experienceScore: screening1.experienceScore,
          educationScore: screening1.educationScore,
          aiSummary: screening1.aiSummary,
          keyHighlights: screening1.keyHighlights,
          concerns: screening1.concerns
        },
        candidate2: {
          applicationId: params.applicationId2,
          candidate: candidate2 ? {
            id: candidate2.candidateId,
            name: `${candidate2.firstName} ${candidate2.lastName}`,
            email: candidate2.email
          } : null,
          overallScore: screening2.overallScore,
          skillsScore: screening2.skillsScore,
          experienceScore: screening2.experienceScore,
          educationScore: screening2.educationScore,
          aiSummary: screening2.aiSummary,
          keyHighlights: screening2.keyHighlights,
          concerns: screening2.concerns
        },
        comparison: {
          overallScoreDiff: (screening1.overallScore || 0) - (screening2.overallScore || 0),
          skillsScoreDiff: (screening1.skillsScore || 0) - (screening2.skillsScore || 0),
          experienceScoreDiff: (screening1.experienceScore || 0) - (screening2.experienceScore || 0),
          educationScoreDiff: (screening1.educationScore || 0) - (screening2.educationScore || 0),
          betterOverall: (screening1.overallScore || 0) > (screening2.overallScore || 0) ? 1 : 
                        (screening1.overallScore || 0) < (screening2.overallScore || 0) ? 2 : 0
        }
      };

      return this.createSuccessResult(
        comparison,
        `Compared candidates: ${candidate1 ? `${candidate1.firstName} ${candidate1.lastName}` : `Application ${params.applicationId1}`} vs ${candidate2 ? `${candidate2.firstName} ${candidate2.lastName}` : `Application ${params.applicationId2}`}`
      );
    } catch (error) {
      return this.createErrorResult('Compare candidates failed', error.message);
    }
  }

  private async getScreeningStats(params: any, context: ToolContext): Promise<ToolResult> {
    try {
      const stats = await this.cvScreeningService.getScreeningStats(params.jobPostingId);

      const jobPosting = params.jobPostingId ? await this.jobPostingRepository.findOne({
        where: { jobPostingId: params.jobPostingId }
      }) : null;

      return this.createSuccessResult(
        {
          jobPosting: jobPosting ? {
            id: jobPosting.jobPostingId,
            title: jobPosting.title
          } : null,
          total: stats.total,
          completed: stats.completed,
          pending: stats.pending,
          processing: stats.processing,
          failed: stats.failed,
          averageScore: stats.averageScore,
          averageProcessingTime: stats.averageProcessingTime,
          completionRate: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(2) + '%' : '0%'
        },
        `Screening statistics${params.jobPostingId ? ` for job posting ${params.jobPostingId}` : ' (all jobs)'}`
      );
    } catch (error) {
      return this.createErrorResult('Get screening stats failed', error.message);
    }
  }
}

