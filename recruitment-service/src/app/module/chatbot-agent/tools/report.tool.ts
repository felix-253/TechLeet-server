import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';
import { JobPostingEntity } from '../../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../../entities/recruitment/interview.entity';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
export class ReportTool extends BaseTool {
  name = 'report_tool';
  description = 'Generate and export recruitment reports: create reports from analytics data, export data in various formats (JSON, CSV), and get available report types.';
  
  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['generate', 'export', 'get_report_types'],
        description: 'Action to perform: generate (generate report from analytics data), export (export data in specific format), get_report_types (get available report types)'
      },
      reportType: {
        type: 'string',
        enum: ['summary', 'hiring_funnel', 'trends', 'departments', 'applications', 'interviews', 'candidates', 'jobs'],
        description: 'Type of report to generate (required for generate and export)'
      },
      format: {
        type: 'string',
        enum: ['json', 'csv'],
        description: 'Export format (required for export, default: json)'
      },
      period: {
        type: 'string',
        enum: ['7d', '30d', '90d', '1y', 'all'],
        description: 'Time period for report (optional for generate and export, default: 30d)'
      },
      startDate: {
        type: 'string',
        description: 'Start date in ISO format (YYYY-MM-DD) (optional for generate and export)'
      },
      endDate: {
        type: 'string',
        description: 'End date in ISO format (YYYY-MM-DD) (optional for generate and export)'
      },
      jobId: {
        type: 'number',
        description: 'Job ID to filter report (optional for generate and export)'
      },
      department: {
        type: 'string',
        description: 'Department to filter report (optional for generate and export)'
      },
      includeDetails: {
        type: 'boolean',
        description: 'Include detailed data in report (optional for generate and export, default: false)'
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
    private readonly interviewRepository: Repository<InterviewEntity>,
    private readonly analyticsService: AnalyticsService
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
        case 'generate':
          return await this.generateReport(params, context);
        case 'export':
          return await this.exportReport(params, context);
        case 'get_report_types':
          return await this.getReportTypes(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async generateReport(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.reportType) {
      return this.createErrorResult('Missing required field', 'reportType is required for generate action');
    }

    try {
      const period = params.period || '30d';
      const includeDetails = params.includeDetails || false;

      let reportData: any = {};

      switch (params.reportType) {
        case 'summary':
          reportData = await this.generateSummaryReport(period, params, includeDetails);
          break;
        case 'hiring_funnel':
          reportData = await this.generateHiringFunnelReport(period, params, includeDetails);
          break;
        case 'trends':
          reportData = await this.generateTrendsReport(period, params, includeDetails);
          break;
        case 'departments':
          reportData = await this.generateDepartmentsReport(period, params, includeDetails);
          break;
        case 'applications':
          reportData = await this.generateApplicationsReport(period, params, includeDetails);
          break;
        case 'interviews':
          reportData = await this.generateInterviewsReport(period, params, includeDetails);
          break;
        case 'candidates':
          reportData = await this.generateCandidatesReport(period, params, includeDetails);
          break;
        case 'jobs':
          reportData = await this.generateJobsReport(period, params, includeDetails);
          break;
        default:
          return this.createErrorResult('Invalid report type', `Unknown report type: ${params.reportType}`);
      }

      return this.createSuccessResult(
        {
          reportType: params.reportType,
          period,
          generatedAt: new Date().toISOString(),
          data: reportData
        },
        `Report "${params.reportType}" generated successfully`
      );
    } catch (error) {
      return this.createErrorResult('Report generation failed', error.message);
    }
  }

  private async exportReport(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.reportType) {
      return this.createErrorResult('Missing required field', 'reportType is required for export action');
    }

    try {
      const format = params.format || 'json';
      const period = params.period || '30d';
      const includeDetails = params.includeDetails || false;

      let reportData: any = {};

      switch (params.reportType) {
        case 'summary':
          reportData = await this.generateSummaryReport(period, params, includeDetails);
          break;
        case 'hiring_funnel':
          reportData = await this.generateHiringFunnelReport(period, params, includeDetails);
          break;
        case 'trends':
          reportData = await this.generateTrendsReport(period, params, includeDetails);
          break;
        case 'departments':
          reportData = await this.generateDepartmentsReport(period, params, includeDetails);
          break;
        case 'applications':
          reportData = await this.generateApplicationsReport(period, params, includeDetails);
          break;
        case 'interviews':
          reportData = await this.generateInterviewsReport(period, params, includeDetails);
          break;
        case 'candidates':
          reportData = await this.generateCandidatesReport(period, params, includeDetails);
          break;
        case 'jobs':
          reportData = await this.generateJobsReport(period, params, includeDetails);
          break;
        default:
          return this.createErrorResult('Invalid report type', `Unknown report type: ${params.reportType}`);
      }

      let exportedData: string;
      if (format === 'csv') {
        exportedData = this.convertToCSV(reportData);
      } else {
        exportedData = JSON.stringify(reportData, null, 2);
      }

      return this.createSuccessResult(
        {
          reportType: params.reportType,
          format,
          period,
          exportedAt: new Date().toISOString(),
          data: exportedData,
          size: exportedData.length
        },
        `Report "${params.reportType}" exported successfully in ${format.toUpperCase()} format (${exportedData.length} bytes)`
      );
    } catch (error) {
      return this.createErrorResult('Export failed', error.message);
    }
  }

  private async getReportTypes(params: any, context: ToolContext): Promise<ToolResult> {
    return this.createSuccessResult(
      {
        reportTypes: [
          {
            type: 'summary',
            description: 'Overall recruitment summary with key metrics',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'hiring_funnel',
            description: 'Hiring funnel analysis showing conversion rates at each stage',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'trends',
            description: 'Trend analysis over time (applications, hires, etc.)',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'departments',
            description: 'Department-wise recruitment statistics',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'applications',
            description: 'Detailed applications report',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'interviews',
            description: 'Interviews report with scheduling and outcomes',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'candidates',
            description: 'Candidates report with profiles and status',
            supportedFormats: ['json', 'csv']
          },
          {
            type: 'jobs',
            description: 'Job postings report with applications and status',
            supportedFormats: ['json', 'csv']
          }
        ]
      },
      'Available report types retrieved successfully'
    );
  }

  private async generateSummaryReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const query: any = {
      period: period as any,
      startDate: params.startDate,
      endDate: params.endDate,
      departmentId: params.department,
      jobId: params.jobId
    };

    const summary = await this.analyticsService.getSummary(query);

    if (includeDetails) {
      return {
        period: summary.period,
        totalJobs: summary.totalJobs,
        totalApplications: summary.totalApplications,
        totalCandidates: summary.totalCandidates,
        totalInterviews: summary.totalInterviews,
        recentJobs: summary.recentJobs,
        recentApplications: summary.recentApplications,
        recentCandidates: summary.recentCandidates,
        jobStatusBreakdown: summary.jobStatusBreakdown,
        applicationStatusBreakdown: summary.applicationStatusBreakdown,
        topDepartments: summary.topDepartments
      };
    }

    return {
      period: summary.period,
      totalJobs: summary.totalJobs,
      totalApplications: summary.totalApplications,
      totalCandidates: summary.totalCandidates,
      totalInterviews: summary.totalInterviews,
      recentJobs: summary.recentJobs,
      recentApplications: summary.recentApplications,
      recentCandidates: summary.recentCandidates
    };
  }

  private async generateHiringFunnelReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const query: any = {
      period: period as any,
      startDate: params.startDate,
      endDate: params.endDate
    };

    const funnel = await this.analyticsService.getHiringFunnel(query);

    return {
      funnel: funnel,
      totalApplications: funnel.reduce((sum, stage) => sum + stage.count, 0)
    };
  }

  private async generateTrendsReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const query: any = {
      period: period as any,
      type: params.type || 'applications',
      startDate: params.startDate,
      endDate: params.endDate
    };

    const trends = await this.analyticsService.getTrends(query);

    return {
      trends: trends,
      type: query.type,
      total: trends.reduce((sum, item) => sum + item.value, 0)
    };
  }

  private async generateDepartmentsReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const query: any = {
      period: period as any,
      startDate: params.startDate,
      endDate: params.endDate
    };

    const departments = await this.analyticsService.getDepartmentStats(query);

    return {
      departments: departments.map((dept: any) => ({
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        jobCount: dept.jobCount,
        applicationCount: dept.applicationCount,
        hireCount: dept.hireCount
      }))
    };
  }

  private async generateApplicationsReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const dateRange = this.getDateRange(period, params.startDate, params.endDate);
    
    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application');

    if (dateRange.start) {
      queryBuilder.andWhere('application.appliedDate >= :startDate', { startDate: dateRange.start });
    }
    if (dateRange.end) {
      queryBuilder.andWhere('application.appliedDate <= :endDate', { endDate: dateRange.end });
    }

    if (params.jobId) {
      queryBuilder.andWhere('application.jobPostingId = :jobId', { jobId: params.jobId });
    }

    const applications = await queryBuilder.getMany();

    const summary = {
      total: applications.length,
      byStatus: this.groupBy(applications, 'status'),
      byJob: this.groupBy(applications, 'jobPostingId')
    };

    if (includeDetails) {
      const candidateIds = [...new Set(applications.map(app => app.candidateId))];
      const jobIds = [...new Set(applications.map(app => app.jobPostingId))];

      const [candidates, jobs] = await Promise.all([
        candidateIds.length > 0
          ? this.candidateRepository.find({ where: { candidateId: candidateIds as any } })
          : [],
        jobIds.length > 0
          ? this.jobPostingRepository.find({ where: { jobPostingId: jobIds as any } })
          : []
      ]);

      const candidateMap = new Map<number, CandidateEntity>(candidates.map(c => [c.candidateId, c] as [number, CandidateEntity]));
      const jobMap = new Map<number, JobPostingEntity>(jobs.map(j => [j.jobPostingId, j] as [number, JobPostingEntity]));

      return {
        summary,
        applications: applications.map(app => {
          const candidate = candidateMap.get(app.candidateId);
          const jobPosting = jobMap.get(app.jobPostingId);
          return {
            applicationId: app.applicationId,
            candidate: candidate ? {
              candidateId: candidate.candidateId,
              name: `${candidate.firstName} ${candidate.lastName}`,
              email: candidate.email
            } : null,
            jobPosting: jobPosting ? {
              jobPostingId: jobPosting.jobPostingId,
              title: jobPosting.title
            } : null,
            status: app.status,
            appliedDate: app.appliedDate
          };
        }).filter(app => app.candidate !== null || app.jobPosting !== null)
      };
    }

    return { summary };
  }

  private async generateInterviewsReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const dateRange = this.getDateRange(period, params.startDate, params.endDate);
    
    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .where('interview.status != :cancelled', { cancelled: 'cancelled' });

    if (dateRange.start) {
      queryBuilder.andWhere('interview.scheduled_at >= :startDate', { startDate: dateRange.start });
    }
    if (dateRange.end) {
      queryBuilder.andWhere('interview.scheduled_at <= :endDate', { endDate: dateRange.end });
    }

    if (params.jobId) {
      queryBuilder.andWhere('interview.job_id = :jobId', { jobId: params.jobId });
    }

    const interviews = await queryBuilder.getMany();

    const candidateIds = [...new Set(interviews.map(i => i.candidate_id))];
    const candidates = candidateIds.length > 0
      ? await this.candidateRepository.find({ where: { candidateId: candidateIds as any } })
      : [];

    const candidateMap = new Map(candidates.map(c => [c.candidateId, c]));

    const summary = {
      total: interviews.length,
      byStatus: this.groupBy(interviews, 'status'),
      upcoming: interviews.filter(i => new Date(i.scheduled_at) > new Date()).length,
      completed: interviews.filter(i => i.status === 'completed').length
    };

    if (includeDetails) {
      return {
        summary,
        interviews: interviews.map(interview => {
          const candidate = candidateMap.get(interview.candidate_id);
          return {
            interviewId: interview.interview_id,
            candidate: candidate ? {
              candidateId: candidate.candidateId,
              name: `${candidate.firstName} ${candidate.lastName}`,
              email: candidate.email
            } : null,
            scheduledAt: interview.scheduled_at,
            status: interview.status,
            location: interview.location,
            meetingLink: interview.meeting_link
          };
        })
      };
    }

    return { summary };
  }

  private async generateCandidatesReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const dateRange = this.getDateRange(period, params.startDate, params.endDate);
    
    const queryBuilder = this.candidateRepository.createQueryBuilder('candidate');

    if (dateRange.start) {
      queryBuilder.andWhere('candidate.createdAt >= :startDate', { startDate: dateRange.start });
    }
    if (dateRange.end) {
      queryBuilder.andWhere('candidate.createdAt <= :endDate', { endDate: dateRange.end });
    }

    const candidates = await queryBuilder.getMany();

    const summary = {
      total: candidates.length,
      bySource: this.groupBy(candidates, 'source'),
      active: candidates.filter(c => c.status === 'active').length
    };

    if (includeDetails) {
      return {
        summary,
        candidates: candidates.map(candidate => ({
          candidateId: candidate.candidateId,
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          phoneNumber: candidate.phoneNumber,
          status: candidate.status,
          source: candidate.source,
          createdAt: candidate.createdAt
        }))
      };
    }

    return { summary };
  }

  private async generateJobsReport(period: string, params: any, includeDetails: boolean): Promise<any> {
    const dateRange = this.getDateRange(period, params.startDate, params.endDate);
    
    const queryBuilder = this.jobPostingRepository.createQueryBuilder('job');

    if (dateRange.start) {
      queryBuilder.andWhere('job.createdAt >= :startDate', { startDate: dateRange.start });
    }
    if (dateRange.end) {
      queryBuilder.andWhere('job.createdAt <= :endDate', { endDate: dateRange.end });
    }

    if (params.department) {
      queryBuilder.andWhere('job.departmentId = :department', { department: params.department });
    }

    const jobs = await queryBuilder.getMany();

    const jobIds = jobs.map(j => j.jobPostingId);
    const applicationCounts = jobIds.length > 0
      ? await this.applicationRepository
          .createQueryBuilder('application')
          .select('application.jobPostingId', 'jobId')
          .addSelect('COUNT(*)', 'count')
          .where('application.jobPostingId IN (:...jobIds)', { jobIds })
          .groupBy('application.jobPostingId')
          .getRawMany()
      : [];

    const appCountMap = new Map(applicationCounts.map((item: any) => [item.jobId, parseInt(item.count || '0', 10)]));

    const summary = {
      total: jobs.length,
      byStatus: this.groupBy(jobs, 'status'),
      byDepartment: this.groupBy(jobs, 'departmentId')
    };

    if (includeDetails) {
      return {
        summary,
        jobs: jobs.map(job => ({
          jobPostingId: job.jobPostingId,
          title: job.title,
          status: job.status,
          departmentId: job.departmentId,
          applicationCount: appCountMap.get(job.jobPostingId) || 0,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          applicationDeadline: job.applicationDeadline
        }))
      };
    }

    return { summary };
  }

  private getDateRange(period: string, startDate?: string, endDate?: string): { start: Date | null; end: Date | null } {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let start: Date | null = null;

    if (period === '7d') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === '30d') {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === '90d') {
      start = new Date();
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
    } else if (period === '1y') {
      start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private convertToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => Object.values(item).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','));
      
      return [headers, ...rows].join('\n');
    }

    if (typeof data === 'object') {
      return Object.entries(data).map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}\n${this.convertToCSV(value)}`;
        }
        return `${key},${value}`;
      }).join('\n');
    }

    return String(data);
  }
}

