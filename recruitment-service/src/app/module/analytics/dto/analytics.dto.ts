import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAnalyticsQueryDto {
   @ApiPropertyOptional({
      description: 'Time period for analytics',
      enum: ['7d', '30d', '90d', '1y', 'all'],
      default: '30d',
   })
   @IsOptional()
   @IsIn(['7d', '30d', '90d', '1y', 'all'])
   period?: '7d' | '30d' | '90d' | '1y' | 'all' = '30d';

   @ApiPropertyOptional({
      description: 'Filter by department ID',
      type: Number,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   departmentId?: number;

   @ApiPropertyOptional({
      description: 'Filter by job ID',
      type: Number,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   jobId?: number;
}

export class GetTrendsQueryDto extends GetAnalyticsQueryDto {
   @ApiPropertyOptional({
      description: 'Type of trend data',
      enum: ['applications', 'jobs', 'candidates', 'interviews'],
      default: 'applications',
   })
   @IsOptional()
   @IsIn(['applications', 'jobs', 'candidates', 'interviews'])
   type?: 'applications' | 'jobs' | 'candidates' | 'interviews' = 'applications';
}

export class GetActivityQueryDto {
   @ApiPropertyOptional({
      description: 'Number of activity items to return',
      type: Number,
      default: 10,
      minimum: 1,
      maximum: 50,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(50)
   @Type(() => Number)
   limit?: number = 10;
}

export class DashboardStatsDto {
   @ApiProperty({ description: 'Total number of job postings', example: 45 })
   totalJobs: number;

   @ApiProperty({ description: 'Number of active (published) job postings', example: 12 })
   activeJobs: number;

   @ApiProperty({ description: 'Total number of applications', example: 234 })
   totalApplications: number;

   @ApiProperty({ description: 'Number of pending applications', example: 77 })
   pendingApplications: number;

   @ApiProperty({ description: 'Total number of candidates', example: 189 })
   totalCandidates: number;

   @ApiProperty({ description: 'Total number of interviews', example: 56 })
   totalInterviews: number;

   @ApiProperty({ description: 'Number of interviews scheduled this week', example: 8 })
   interviewsThisWeek: number;

   @ApiProperty({ description: 'Number of recent applications in the period', example: 45 })
   recentApplications: number;

   @ApiProperty({ description: 'Number of recent candidates in the period', example: 23 })
   recentCandidates: number;

   @ApiProperty({ description: 'Total number of employees', example: 106 })
   totalEmployees: number;
}

export class StatusBreakdownDto {
   @ApiProperty({ description: 'Status name', example: 'pending' })
   status: string;

   @ApiProperty({ description: 'Count for this status', example: 24 })
   count: number;
}

export class JobStatusBreakdownDto extends StatusBreakdownDto {
   @ApiProperty({ description: 'Job status', enum: ['draft', 'published', 'closed'] })
   declare status: 'draft' | 'published' | 'closed';
}

export class TrendDataDto {
   @ApiProperty({ description: 'Date in ISO format', example: '2024-01-15' })
   date: string;

   @ApiProperty({ description: 'Value for this date', example: 12 })
   value: number;

   @ApiPropertyOptional({ description: 'Optional label', example: 'Applications' })
   label?: string;
}

export class DepartmentStatsDto {
   @ApiProperty({ description: 'Department ID', example: 1 })
   departmentId: number;

   @ApiProperty({ description: 'Department name', example: 'Engineering' })
   departmentName: string;

   @ApiProperty({ description: 'Number of job postings in this department', example: 15 })
   jobCount: number;

   @ApiProperty({ description: 'Number of applications in this department', example: 89 })
   applicationCount: number;

   @ApiProperty({ description: 'Number of interviews in this department', example: 23 })
   interviewCount: number;
}

export class HiringFunnelDataDto {
   @ApiProperty({ description: 'Stage name', example: 'Applied' })
   stage: string;

   @ApiProperty({ description: 'Count for this stage', example: 234 })
   count: number;

   @ApiProperty({ description: 'Percentage of total', example: 100 })
   percentage: number;
}

export class AnalyticsSummaryDto {
   @ApiProperty({ description: 'Time period', example: '30d' })
   period: string;

   @ApiProperty({ description: 'Total number of job postings', example: 45 })
   totalJobs: number;

   @ApiProperty({ description: 'Total number of applications', example: 234 })
   totalApplications: number;

   @ApiProperty({ description: 'Total number of candidates', example: 189 })
   totalCandidates: number;

   @ApiProperty({ description: 'Total number of interviews', example: 56 })
   totalInterviews: number;

   @ApiProperty({ description: 'Number of recent jobs in the period', example: 5 })
   recentJobs: number;

   @ApiProperty({ description: 'Number of recent applications in the period', example: 45 })
   recentApplications: number;

   @ApiProperty({ description: 'Number of recent candidates in the period', example: 23 })
   recentCandidates: number;

   @ApiProperty({ description: 'Job status breakdown', type: [JobStatusBreakdownDto] })
   jobStatusBreakdown: JobStatusBreakdownDto[];

   @ApiProperty({ description: 'Application status breakdown', type: [StatusBreakdownDto] })
   applicationStatusBreakdown: StatusBreakdownDto[];

   @ApiProperty({ description: 'Top departments by activity', type: [DepartmentStatsDto] })
   topDepartments: DepartmentStatsDto[];
}

export class ActivityItemDto {
   @ApiProperty({ description: 'Activity type', enum: ['application', 'interview', 'job', 'candidate'] })
   type: 'application' | 'interview' | 'job' | 'candidate';

   @ApiProperty({ description: 'Activity title', example: 'New application received' })
   title: string;

   @ApiProperty({ description: 'Activity description', example: 'Frontend Developer position' })
   description: string;

   @ApiProperty({ description: 'Timestamp of the activity', example: '2024-01-15T10:30:00Z' })
   timestamp: string;

   @ApiPropertyOptional({ description: 'Related entity ID', example: 123 })
   entityId?: number;
}

