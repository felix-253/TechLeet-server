import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';

@Injectable()
export class AnalyticsTool extends BaseTool {
  name = 'analytics_tool';
  description = 'Generate recruitment analytics, reports, and insights: summaries, statistics, trends, and hiring funnel analysis';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get_summary', 'get_job_stats', 'get_skill_demand', 'get_hiring_funnel', 'get_trends'],
        description: 'Type of analytics to generate'
      },
      period: {
        type: 'string',
        enum: ['7d', '30d', '90d', '1y', 'all'],
        description: 'Time period for analysis'
      },
      jobId: {
        type: 'number',
        description: 'Specific job ID for job-specific analytics'
      },
      department: {
        type: 'string',
        description: 'Department filter for analytics'
      },
      metrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific metrics to include in the analysis'
      }
    },
    required: ['action']
  };

  constructor(
    @InjectRepository(JobPostingEntity)
    private readonly jobPostingRepository: Repository<JobPostingEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
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
      switch (params.action) {
        case 'get_summary':
          return await this.getRecruitmentSummary(params, context);
        case 'get_job_stats':
          return await this.getJobApplicationStats(params, context);
        case 'get_skill_demand':
          return await this.getSkillDemand(params, context);
        case 'get_hiring_funnel':
          return await this.getHiringFunnel(params, context);
        case 'get_trends':
          return await this.getTrends(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async getRecruitmentSummary(params: any, context: ToolContext): Promise<ToolResult> {
    const period = params.period || '30d';
    const dateFilter = this.getDateFilter(period);

    // Get basic counts
    const [totalJobs, totalApplications, totalCandidates, totalInterviews] = await Promise.all([
      this.jobPostingRepository.count(),
      this.applicationRepository.count(),
      this.candidateRepository.count(),
      this.interviewRepository.count()
    ]);

    // Get recent activity
    const recentJobs = await this.jobPostingRepository.count({
      where: dateFilter ? { createdAt: dateFilter } : {}
    });

    const recentApplications = await this.applicationRepository.count({
      where: dateFilter ? { appliedDate: dateFilter } : {}
    });

    const recentCandidates = await this.candidateRepository.count({
      where: dateFilter ? { createdAt: dateFilter } : {}
    });

    // Get status breakdowns
    const jobStatusBreakdown = await this.jobPostingRepository
      .createQueryBuilder('job')
      .select('job.status, COUNT(*) as count')
      .groupBy('job.status')
      .getRawMany();

    const applicationStatusBreakdown = await this.applicationRepository
      .createQueryBuilder('app')
      .select('app.status, COUNT(*) as count')
      .groupBy('app.status')
      .getRawMany();

    // Get top departments
    const topDepartments = await this.jobPostingRepository
      .createQueryBuilder('job')
      .select('job.department, COUNT(*) as count')
      .groupBy('job.department')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    const summary = {
      period,
      overview: {
        totalJobs,
        totalApplications,
        totalCandidates,
        totalInterviews
      },
      recentActivity: {
        jobs: recentJobs,
        applications: recentApplications,
        candidates: recentCandidates
      },
      breakdowns: {
        jobStatus: jobStatusBreakdown.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        applicationStatus: applicationStatusBreakdown.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        topDepartments: topDepartments.reduce((acc, item) => {
          acc[item.department] = parseInt(item.count);
          return acc;
        }, {})
      },
      generatedAt: new Date()
    };

    return this.createSuccessResult(summary, `Recruitment summary for ${period} generated successfully`);
  }

  private async getJobApplicationStats(params: any, context: ToolContext): Promise<ToolResult> {
    const jobId = params.jobId;
    
    if (!jobId) {
      return this.createErrorResult('Missing jobId', 'Job ID is required for job-specific analytics');
    }

    const job = await this.jobPostingRepository.findOne({
      where: { jobPostingId: jobId }
    });

    if (!job) {
      return this.createErrorResult('Job not found', `Job with ID ${jobId} not found`);
    }

    // Get applications for this job
    const applications = await this.applicationRepository.find({
      where: { jobPostingId: jobId }
    });

    // Get candidates for applications
    const candidateIds = applications.map(app => app.candidateId);
    const candidates = await this.candidateRepository.findByIds(candidateIds);
    const candidateMap = new Map(candidates.map(candidate => [candidate.candidateId, candidate]));

    // Calculate statistics
    const stats = {
      job: {
        id: job.jobPostingId,
        title: job.title,
        departmentId: job.departmentId,
        status: job.status,
        createdAt: job.createdAt
      },
      applications: {
        total: applications.length,
        byStatus: applications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
        withResume: applications.filter(app => app.resumeUrl).length,
        withCoverLetter: applications.filter(app => app.coverLetter).length
      },
      candidates: {
        total: applications.length,
        averageExperience: applications.reduce((sum, app) => {
          const candidate = candidateMap.get(app.candidateId);
          return sum + (candidate?.yearsOfExperience || 0);
        }, 0) / applications.length || 0,
        topSkills: applications.reduce((acc, app) => {
          const candidate = candidateMap.get(app.candidateId);
          if (candidate?.skills) {
            const skillsArray = typeof candidate.skills === 'string' 
              ? candidate.skills.split(',').map(s => s.trim())
              : candidate.skills;
            skillsArray.forEach(skill => {
              acc[skill] = (acc[skill] || 0) + 1;
            });
          }
          return acc;
        }, {}),
        byLocation: applications.reduce((acc, app) => {
          const candidate = candidateMap.get(app.candidateId);
          const location = candidate?.address || 'Unknown';
          acc[location] = (acc[location] || 0) + 1;
          return acc;
        }, {})
      },
      timeline: applications
        .sort((a, b) => a.appliedDate.getTime() - b.appliedDate.getTime())
        .map(app => {
          const candidate = candidateMap.get(app.candidateId);
          return {
            date: app.appliedDate,
            status: app.status,
            candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown'
          };
        })
    };

    return this.createSuccessResult(stats, `Job application statistics for "${job.title}" generated successfully`);
  }

  private async getSkillDemand(params: any, context: ToolContext): Promise<ToolResult> {
    const period = params.period || '30d';
    const dateFilter = this.getDateFilter(period);

    // Get skills from job postings
    const jobs = await this.jobPostingRepository.find({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: ['requirements', 'title', 'departmentId']
    });

    // Extract skills from job requirements
    const skillDemand = {};
    jobs.forEach(job => {
      if (job.requirements) {
        // Simple skill extraction - in real implementation, use NLP
        const skills = this.extractSkillsFromText(job.requirements);
        skills.forEach(skill => {
          skillDemand[skill] = (skillDemand[skill] || 0) + 1;
        });
      }
    });

    // Get skills from candidates
    const candidates = await this.candidateRepository.find({
      where: dateFilter ? { createdAt: dateFilter } : {},
      select: ['skills']
    });

    const candidateSkills = {};
    candidates.forEach(candidate => {
      if (candidate.skills) {
        const skillsArray = typeof candidate.skills === 'string' 
          ? candidate.skills.split(',').map(s => s.trim())
          : candidate.skills;
        skillsArray.forEach(skill => {
          candidateSkills[skill] = (candidateSkills[skill] || 0) + 1;
        });
      }
    });

    // Calculate skill gap (demand vs supply)
    const allSkills = new Set([...Object.keys(skillDemand), ...Object.keys(candidateSkills)]);
    const skillGap = {};
    
    allSkills.forEach(skill => {
      const demand = skillDemand[skill] || 0;
      const supply = candidateSkills[skill] || 0;
      skillGap[skill] = {
        demand,
        supply,
        gap: demand - supply,
        ratio: supply > 0 ? demand / supply : demand
      };
    });

    const result = {
      period,
      skillDemand: Object.entries(skillDemand)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 20)
        .reduce((acc, [skill, count]) => {
          acc[skill] = count;
          return acc;
        }, {}),
      candidateSkills: Object.entries(candidateSkills)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 20)
        .reduce((acc, [skill, count]) => {
          acc[skill] = count;
          return acc;
        }, {}),
      skillGap: Object.entries(skillGap)
        .sort(([,a], [,b]) => (b as any).gap - (a as any).gap)
        .slice(0, 20)
        .reduce((acc, [skill, data]) => {
          acc[skill] = data;
          return acc;
        }, {}),
      generatedAt: new Date()
    };

    return this.createSuccessResult(result, `Skill demand analysis for ${period} generated successfully`);
  }

  private async getHiringFunnel(params: any, context: ToolContext): Promise<ToolResult> {
    const period = params.period || '30d';
    const dateFilter = this.getDateFilter(period);

    // Get funnel data
    const applications = await this.applicationRepository.find({
      where: dateFilter ? { appliedDate: dateFilter } : {}
    });

    const interviews = await this.interviewRepository.find({
      where: dateFilter ? { createdAt: dateFilter } : {}
    });

    // Calculate funnel stages
    const funnel = {
      applications: applications.length,
      screening: applications.filter(app => app.status === 'screening').length,
      interviewing: applications.filter(app => app.status === 'interviewing').length,
      offer: applications.filter(app => app.status === 'offer').length,
      hired: applications.filter(app => app.status === 'hired').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };

    // Calculate conversion rates
    const conversionRates = {
      applicationToScreening: funnel.applications > 0 ? (funnel.screening / funnel.applications) * 100 : 0,
      screeningToInterview: funnel.screening > 0 ? (funnel.interviewing / funnel.screening) * 100 : 0,
      interviewToOffer: funnel.interviewing > 0 ? (funnel.offer / funnel.interviewing) * 100 : 0,
      offerToHire: funnel.offer > 0 ? (funnel.hired / funnel.offer) * 100 : 0,
      overallConversion: funnel.applications > 0 ? (funnel.hired / funnel.applications) * 100 : 0
    };

    // Time to hire analysis
    const hiredApplications = applications.filter(app => app.status === 'hired');
    const timeToHire = hiredApplications.length > 0 
      ? hiredApplications.reduce((sum, app) => {
          const timeDiff = app.updatedAt ? app.updatedAt.getTime() - app.appliedDate.getTime() : 0;
          return sum + timeDiff;
        }, 0) / hiredApplications.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    const result = {
      period,
      funnel,
      conversionRates,
      metrics: {
        averageTimeToHire: Math.round(timeToHire),
        totalHires: funnel.hired,
        totalApplications: funnel.applications,
        rejectionRate: funnel.applications > 0 ? (funnel.rejected / funnel.applications) * 100 : 0
      },
      generatedAt: new Date()
    };

    return this.createSuccessResult(result, `Hiring funnel analysis for ${period} generated successfully`);
  }

  private async getTrends(params: any, context: ToolContext): Promise<ToolResult> {
    const period = params.period || '30d';
    
    // Get daily trends for the period
    const trends = await this.applicationRepository
      .createQueryBuilder('app')
      .select('DATE(app.appliedDate) as date, COUNT(*) as count, app.status')
      .where('app.appliedDate >= :startDate', { 
        startDate: this.getStartDate(period) 
      })
      .groupBy('DATE(app.appliedDate), app.status')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Format trends data
    const dailyTrends: { [key: string]: { total: number; byStatus: { [key: string]: number } } } = {};
    trends.forEach(trend => {
      const date = trend.date;
      if (!dailyTrends[date]) {
        dailyTrends[date] = { total: 0, byStatus: {} };
      }
      dailyTrends[date].total += parseInt(trend.count);
      dailyTrends[date].byStatus[trend.status] = parseInt(trend.count);
    });

    const result = {
      period,
      dailyTrends,
      summary: {
        totalDays: Object.keys(dailyTrends).length,
        averageDailyApplications: Object.values(dailyTrends).reduce((sum, day) => sum + day.total, 0) / Object.keys(dailyTrends).length || 0,
        peakDay: Object.entries(dailyTrends).reduce((max, [date, data]) => 
          (data as any).total > (max[1] as any).total ? [date, data] : max
        )[0] as string
      },
      generatedAt: new Date()
    };

    return this.createSuccessResult(result, `Application trends for ${period} generated successfully`);
  }

  private getDateFilter(period: string): any {
    const startDate = this.getStartDate(period);
    return startDate ? { $gte: startDate } : null;
  }

  private getStartDate(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all':
        return null;
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private extractSkillsFromText(text: string): string[] {
    // Simple skill extraction - in real implementation, use NLP
    const commonSkills = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
      'SQL', 'MongoDB', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Git', 'CI/CD', 'Agile', 'Scrum', 'Machine Learning', 'AI', 'Data Science'
    ];
    
    const foundSkills: string[] = [];
    commonSkills.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    return foundSkills;
  }
}
