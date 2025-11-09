import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { AnalyticsCacheService } from './analytics-cache.service';
import { CompanyServiceClient } from './company-service.client';
import {
   DashboardStatsDto,
   AnalyticsSummaryDto,
   TrendDataDto,
   DepartmentStatsDto,
   HiringFunnelDataDto,
   ActivityItemDto,
   JobStatusBreakdownDto,
   StatusBreakdownDto,
   GetAnalyticsQueryDto,
   GetTrendsQueryDto,
   GetActivityQueryDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
   private readonly logger = new Logger(AnalyticsService.name);

   constructor(
      @InjectRepository(JobPostingEntity)
      private readonly jobPostingRepository: Repository<JobPostingEntity>,
      @InjectRepository(ApplicationEntity)
      private readonly applicationRepository: Repository<ApplicationEntity>,
      @InjectRepository(CandidateEntity)
      private readonly candidateRepository: Repository<CandidateEntity>,
      @InjectRepository(InterviewEntity)
      private readonly interviewRepository: Repository<InterviewEntity>,
      private readonly cacheService: AnalyticsCacheService,
      private readonly companyServiceClient: CompanyServiceClient,
   ) {}

   private getDateRange(period: '7d' | '30d' | '90d' | '1y' | 'all'): { start: Date | null; end: Date } {
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

   private getWeekRange(): { start: Date; end: Date } {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
   }

   async getDashboardStats(query: GetAnalyticsQueryDto): Promise<DashboardStatsDto> {
      const { period = '30d' } = query;
      const cacheKey = `stats:${period}`;

      const cached = await this.cacheService.get<DashboardStatsDto>(cacheKey);
      if (cached) {
         return cached;
      }

      const { start, end } = this.getDateRange(period);
      const { start: weekStart, end: weekEnd } = this.getWeekRange();

      const [
         totalJobs,
         activeJobs,
         totalApplications,
         pendingApplications,
         totalCandidates,
         totalInterviews,
         interviewsThisWeek,
         recentApplications,
         recentCandidates,
         totalEmployees,
      ] = await Promise.all([
         this.jobPostingRepository.count(),
         this.jobPostingRepository.count({ where: { status: 'published' } }),
         this.applicationRepository.count(),
         this.applicationRepository.count({
            where: { status: 'pending' },
         }),
         this.candidateRepository.count(),
         this.interviewRepository.count(),
         this.interviewRepository.count({
            where: {
               scheduled_at: Between(weekStart, weekEnd),
            },
         }),
         start
            ? this.applicationRepository.count({
                 where: {
                    appliedDate: Between(start, end),
                 },
              })
            : Promise.resolve(0),
         start
            ? this.candidateRepository.count({
                 where: {
                    createdAt: Between(start, end),
                 },
              })
            : Promise.resolve(0),
         this.companyServiceClient.getTotalEmployees(),
      ]);

      const stats: DashboardStatsDto = {
         totalJobs,
         activeJobs,
         totalApplications,
         pendingApplications,
         totalCandidates,
         totalInterviews,
         interviewsThisWeek,
         recentApplications,
         recentCandidates,
         totalEmployees,
      };

      await this.cacheService.set(cacheKey, stats, 300, { period });
      return stats;
   }

   async getSummary(query: GetAnalyticsQueryDto): Promise<AnalyticsSummaryDto> {
      try {
         const { period = '30d', departmentId, jobId } = query;
         const cacheKey = `summary:${period}:${departmentId || 'all'}:${jobId || 'all'}`;

         const cached = await this.cacheService.get<AnalyticsSummaryDto>(cacheKey);
         if (cached) {
            return cached;
         }

         const { start, end } = this.getDateRange(period);

         const whereConditions: any = {};
         if (departmentId) {
            whereConditions.departmentId = departmentId;
         }
         if (jobId) {
            whereConditions.jobPostingId = jobId;
         }

         const [
            totalJobs,
            totalApplications,
            totalCandidates,
            totalInterviews,
            recentJobs,
            recentApplications,
            recentCandidates,
            jobStatusBreakdown,
            applicationStatusBreakdown,
            topDepartments,
         ] = await Promise.all([
            this.jobPostingRepository.count(whereConditions),
            this.applicationRepository.count(whereConditions),
            this.candidateRepository.count(),
            this.interviewRepository.count(),
            start
               ? this.jobPostingRepository.count({
                    where: {
                       ...whereConditions,
                       createdAt: Between(start, end),
                    },
                 })
               : Promise.resolve(0),
            start
               ? this.applicationRepository.count({
                    where: {
                       ...whereConditions,
                       appliedDate: Between(start, end),
                    },
                 })
               : Promise.resolve(0),
            start
               ? this.candidateRepository.count({
                    where: {
                       createdAt: Between(start, end),
                    },
                 })
               : Promise.resolve(0),
            this.getJobStatusBreakdown(whereConditions, start, end),
            this.getApplicationStatusBreakdown(whereConditions, start, end),
            this.getTopDepartments(period),
         ]);

         const summary: AnalyticsSummaryDto = {
            period,
            totalJobs,
            totalApplications,
            totalCandidates,
            totalInterviews,
            recentJobs,
            recentApplications,
            recentCandidates,
            jobStatusBreakdown,
            applicationStatusBreakdown,
            topDepartments,
         };

         await this.cacheService.set(cacheKey, summary, 300, { period, departmentId, jobId });
         return summary;
      } catch (error) {
         this.logger.error(`Error in getSummary: ${error.message}`, error.stack);
         throw error;
      }
   }

   async getTrends(query: GetTrendsQueryDto): Promise<TrendDataDto[]> {
      const { period = '30d', type = 'applications' } = query;
      const cacheKey = `trends:${period}:${type}`;

      const cached = await this.cacheService.get<TrendDataDto[]>(cacheKey);
      if (cached) {
         return cached;
      }

      const { start, end } = this.getDateRange(period);
      if (!start) {
         return [];
      }

      const trends: TrendDataDto[] = [];
      const currentDate = new Date(start);
      const endDate = new Date(end);

      while (currentDate <= endDate) {
         const dayStart = new Date(currentDate);
         dayStart.setHours(0, 0, 0, 0);
         const dayEnd = new Date(currentDate);
         dayEnd.setHours(23, 59, 59, 999);

         let count = 0;

         if (type === 'applications') {
            count = await this.applicationRepository.count({
               where: {
                  appliedDate: Between(dayStart, dayEnd),
               },
            });
         } else if (type === 'jobs') {
            count = await this.jobPostingRepository.count({
               where: {
                  createdAt: Between(dayStart, dayEnd),
               },
            });
         } else if (type === 'candidates') {
            count = await this.candidateRepository.count({
               where: {
                  createdAt: Between(dayStart, dayEnd),
               },
            });
         } else if (type === 'interviews') {
            count = await this.interviewRepository.count({
               where: {
                  scheduled_at: Between(dayStart, dayEnd),
               },
            });
         }

         trends.push({
            date: dayStart.toISOString().split('T')[0],
            value: count,
            label: type.charAt(0).toUpperCase() + type.slice(1),
         });

         currentDate.setDate(currentDate.getDate() + 1);
      }

      await this.cacheService.set(cacheKey, trends, 300, { period, type });
      return trends;
   }

   async getDepartmentStats(query: GetAnalyticsQueryDto): Promise<DepartmentStatsDto[]> {
      const { period = '30d' } = query;
      const cacheKey = `departments:${period}`;

      const cached = await this.cacheService.get<DepartmentStatsDto[]>(cacheKey);
      if (cached) {
         return cached;
      }

      return this.getTopDepartments(period);
   }

   async getHiringFunnel(query: GetAnalyticsQueryDto): Promise<HiringFunnelDataDto[]> {
      const { period = '30d' } = query;
      const cacheKey = `funnel:${period}`;

      const cached = await this.cacheService.get<HiringFunnelDataDto[]>(cacheKey);
      if (cached) {
         return cached;
      }

      const { start, end } = this.getDateRange(period);

      const whereConditions: any = {};
      if (start) {
         whereConditions.appliedDate = Between(start, end);
      }

      const totalApplications = await this.applicationRepository.count(whereConditions);

      const statusCounts = await this.applicationRepository
         .createQueryBuilder('application')
         .select('application.status', 'status')
         .addSelect('COUNT(*)', 'count')
         .where(whereConditions)
         .groupBy('application.status')
         .getRawMany();

      const funnel: HiringFunnelDataDto[] = [];
      const stages = [
         'submitted',
         'screening',
         'interviewing',
         'offer',
         'hired',
      ];

      let totalCount = 0;
      for (const stage of stages) {
         const statusData = statusCounts.find((s) => s.status === stage);
         const count = statusData ? parseInt(statusData.count, 10) : 0;
         totalCount += count;

         funnel.push({
            stage: stage.charAt(0).toUpperCase() + stage.slice(1),
            count,
            percentage: totalApplications > 0 ? Math.round((count / totalApplications) * 100) : 0,
         });
      }

      await this.cacheService.set(cacheKey, funnel, 300, { period });
      return funnel;
   }

   async getRecentActivity(query: GetActivityQueryDto): Promise<ActivityItemDto[]> {
      const { limit = 10 } = query;
      const cacheKey = `activity:${limit}`;

      const cached = await this.cacheService.get<ActivityItemDto[]>(cacheKey);
      if (cached) {
         return cached;
      }

      const activities: ActivityItemDto[] = [];

      const recentJobs = await this.jobPostingRepository.find({
         take: Math.ceil(limit / 4),
         order: { createdAt: 'DESC' },
      });

      const recentApplications = await this.applicationRepository.find({
         take: Math.ceil(limit / 4),
         order: { appliedDate: 'DESC' },
      });

      const recentInterviews = await this.interviewRepository.find({
         take: Math.ceil(limit / 4),
         order: { scheduled_at: 'DESC' },
      });

      const recentCandidates = await this.candidateRepository.find({
         take: Math.ceil(limit / 4),
         order: { createdAt: 'DESC' },
      });

      for (const job of recentJobs) {
         activities.push({
            type: 'job',
            title: 'Job posting published',
            description: job.title,
            timestamp: job.createdAt.toISOString(),
            entityId: job.jobPostingId,
         });
      }

      const jobPostingIds = recentApplications.map((app) => app.jobPostingId);
      const jobPostings = jobPostingIds.length > 0
         ? await this.jobPostingRepository.find({
              where: jobPostingIds.map((id) => ({ jobPostingId: id })),
           })
         : [];
      const jobPostingMap = new Map(jobPostings.map((job) => [job.jobPostingId, job]));

      for (const app of recentApplications) {
         const jobPosting = jobPostingMap.get(app.jobPostingId);
         activities.push({
            type: 'application',
            title: 'New application received',
            description: jobPosting?.title || 'Unknown position',
            timestamp: app.appliedDate.toISOString(),
            entityId: app.applicationId,
         });
      }

      for (const interview of recentInterviews) {
         activities.push({
            type: 'interview',
            title: 'Interview scheduled',
            description: `Interview scheduled for ${interview.scheduled_at.toISOString()}`,
            timestamp: interview.createdAt.toISOString(),
            entityId: interview.interview_id,
         });
      }

      for (const candidate of recentCandidates) {
         activities.push({
            type: 'candidate',
            title: 'New candidate added',
            description: `${candidate.firstName} ${candidate.lastName}`,
            timestamp: candidate.createdAt.toISOString(),
            entityId: candidate.candidateId,
         });
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const result = activities.slice(0, limit);

      await this.cacheService.set(cacheKey, result, 60, { limit });
      return result;
   }

   private async getJobStatusBreakdown(whereConditions?: any, startDate?: Date | null, endDate?: Date): Promise<JobStatusBreakdownDto[]> {
      const queryBuilder = this.jobPostingRepository
         .createQueryBuilder('job')
         .select('job.status', 'status')
         .addSelect('COUNT(*)', 'count');

      if (whereConditions && Object.keys(whereConditions).length > 0) {
         Object.entries(whereConditions).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
               queryBuilder.andWhere(`job.${key} = :${key}`, { [key]: value });
            }
         });
      }

      if (startDate && endDate) {
         queryBuilder.andWhere('job.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate });
      }

      const statusCounts = await queryBuilder
         .groupBy('job.status')
         .getRawMany();

      return statusCounts.map((item) => ({
         status: item.status as 'draft' | 'published' | 'closed',
         count: parseInt(item.count, 10),
      }));
   }

   private async getApplicationStatusBreakdown(whereConditions?: any, startDate?: Date | null, endDate?: Date): Promise<StatusBreakdownDto[]> {
      const queryBuilder = this.applicationRepository
         .createQueryBuilder('application')
         .select('application.status', 'status')
         .addSelect('COUNT(*)', 'count');

      if (whereConditions && Object.keys(whereConditions).length > 0) {
         Object.entries(whereConditions).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
               queryBuilder.andWhere(`application.${key} = :${key}`, { [key]: value });
            }
         });
      }

      if (startDate && endDate) {
         queryBuilder.andWhere('application.appliedDate BETWEEN :start AND :end', { start: startDate, end: endDate });
      }

      const statusCounts = await queryBuilder
         .groupBy('application.status')
         .getRawMany();

      return statusCounts.map((item) => ({
         status: item.status,
         count: parseInt(item.count, 10),
      }));
   }

   private async getTopDepartments(period: '7d' | '30d' | '90d' | '1y' | 'all'): Promise<DepartmentStatsDto[]> {
      try {
         const { start, end } = this.getDateRange(period);

         const departmentQueryBuilder = this.jobPostingRepository
            .createQueryBuilder('job')
            .select('job.departmentId', 'departmentId')
            .addSelect('COUNT(DISTINCT job.jobPostingId)', 'jobCount')
            .addSelect('COUNT(DISTINCT app.applicationId)', 'applicationCount')
            .leftJoin(ApplicationEntity, 'app', 'app.jobPostingId = job.jobPostingId');

         if (start) {
            departmentQueryBuilder.where('job.createdAt BETWEEN :start AND :end', { start, end });
         }

         const departmentStats = await departmentQueryBuilder
            .groupBy('job.departmentId')
            .orderBy('COUNT(DISTINCT job.jobPostingId)', 'DESC')
            .limit(10)
            .getRawMany();

         const interviewQueryBuilder = this.interviewRepository
            .createQueryBuilder('interview')
            .select('job.departmentId', 'departmentId')
            .addSelect('COUNT(*)', 'interviewCount')
            .leftJoin(JobPostingEntity, 'job', 'job.jobPostingId = interview.job_id');

         if (start) {
            interviewQueryBuilder.where('interview.scheduled_at BETWEEN :start AND :end', { start, end });
         }

         const interviewStats = await interviewQueryBuilder
            .groupBy('job.departmentId')
            .getRawMany();

         const interviewMap = new Map(
            interviewStats
               .filter((item) => item.departmentId !== null && item.departmentId !== undefined)
               .map((item) => [item.departmentId, parseInt(item.interviewCount || '0', 10)]),
         );

         const result: DepartmentStatsDto[] = departmentStats
            .filter((item) => item.departmentId !== null && item.departmentId !== undefined)
            .map((item) => ({
               departmentId: item.departmentId,
               departmentName: `Department ${item.departmentId}`,
               jobCount: parseInt(item.jobCount || '0', 10),
               applicationCount: parseInt(item.applicationCount || '0', 10),
               interviewCount: interviewMap.get(item.departmentId) || 0,
            }));

         const cacheKey = `departments:${period}`;
         await this.cacheService.set(cacheKey, result, 300, { period });
         return result;
      } catch (error) {
         this.logger.error(`Error in getTopDepartments: ${error.message}`, error.stack);
         throw error;
      }
   }
}

