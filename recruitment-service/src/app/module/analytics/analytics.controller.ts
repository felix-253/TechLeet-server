import { Controller, Get, Query } from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
   ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
   DashboardStatsDto,
   AnalyticsSummaryDto,
   TrendDataDto,
   DepartmentStatsDto,
   HiringFunnelDataDto,
   ActivityItemDto,
   GetAnalyticsQueryDto,
   GetTrendsQueryDto,
   GetActivityQueryDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics/dashboard')
export class AnalyticsController {
   constructor(private readonly analyticsService: AnalyticsService) {}

   @Get('stats')
   @ApiOperation({
      summary: 'Get dashboard statistics',
      description: 'Retrieves comprehensive dashboard statistics including jobs, applications, candidates, interviews, and employees',
   })
   @ApiResponse({
      status: 200,
      description: 'Dashboard statistics retrieved successfully',
      type: DashboardStatsDto,
   })
   async getDashboardStats(@Query() query: GetAnalyticsQueryDto): Promise<DashboardStatsDto> {
      return this.analyticsService.getDashboardStats(query);
   }

   @Get('summary')
   @ApiOperation({
      summary: 'Get analytics summary',
      description: 'Retrieves a comprehensive analytics summary with breakdowns by status and department',
   })
   @ApiResponse({
      status: 200,
      description: 'Analytics summary retrieved successfully',
      type: AnalyticsSummaryDto,
   })
   async getSummary(@Query() query: GetAnalyticsQueryDto): Promise<AnalyticsSummaryDto> {
      return this.analyticsService.getSummary(query);
   }

   @Get('trends')
   @ApiOperation({
      summary: 'Get trend data',
      description: 'Retrieves trend data over time for applications, jobs, candidates, or interviews',
   })
   @ApiQuery({
      name: 'type',
      enum: ['applications', 'jobs', 'candidates', 'interviews'],
      required: false,
      description: 'Type of trend data to retrieve',
   })
   @ApiResponse({
      status: 200,
      description: 'Trend data retrieved successfully',
      type: [TrendDataDto],
   })
   async getTrends(@Query() query: GetTrendsQueryDto): Promise<TrendDataDto[]> {
      return this.analyticsService.getTrends(query);
   }

   @Get('departments')
   @ApiOperation({
      summary: 'Get department statistics',
      description: 'Retrieves statistics grouped by department',
   })
   @ApiResponse({
      status: 200,
      description: 'Department statistics retrieved successfully',
      type: [DepartmentStatsDto],
   })
   async getDepartmentStats(@Query() query: GetAnalyticsQueryDto): Promise<DepartmentStatsDto[]> {
      return this.analyticsService.getDepartmentStats(query);
   }

   @Get('funnel')
   @ApiOperation({
      summary: 'Get hiring funnel data',
      description: 'Retrieves hiring funnel data showing the progression of applications through different stages',
   })
   @ApiResponse({
      status: 200,
      description: 'Hiring funnel data retrieved successfully',
      type: [HiringFunnelDataDto],
   })
   async getHiringFunnel(@Query() query: GetAnalyticsQueryDto): Promise<HiringFunnelDataDto[]> {
      return this.analyticsService.getHiringFunnel(query);
   }

   @Get('activity')
   @ApiOperation({
      summary: 'Get recent activity',
      description: 'Retrieves recent activity including new applications, interviews, job postings, and candidates',
   })
   @ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: 'Number of activity items to return (default: 10, max: 50)',
   })
   @ApiResponse({
      status: 200,
      description: 'Recent activity retrieved successfully',
      type: [ActivityItemDto],
   })
   async getRecentActivity(@Query() query: GetActivityQueryDto): Promise<ActivityItemDto[]> {
      return this.analyticsService.getRecentActivity(query);
   }
}

