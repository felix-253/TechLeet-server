import {
   Controller,
   Post,
   Get,
   Param,
   Body,
   Query,
   HttpStatus,
   ParseIntPipe,
   BadRequestException,
   NotFoundException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
   ApiParam,
   ApiQuery,
} from '@nestjs/swagger';
import { CvScreeningService } from './cv-screening.service';
import {
   TriggerScreeningDto,
   ScreeningResultDto,
   GetScreeningResultsQueryDto,
   ScreeningStatsDto,
   BulkScreeningDto,
   RetryScreeningDto,
   TestLocalCvDto,
} from './cv-screening.dto';

@ApiTags('CV Screening')
@ApiBearerAuth('token')
@Controller('cv-screening')
export class CvScreeningController {
   constructor(private readonly screeningService: CvScreeningService) {}

   @Post('trigger')
   @ApiOperation({
      summary: 'Trigger CV screening for an application',
      description: 'Starts the CV screening pipeline for a specific application'
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Screening job triggered successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid application ID or missing resume'
   })
   async triggerScreening(@Body() triggerDto: TriggerScreeningDto): Promise<ScreeningResultDto> {
      return this.screeningService.triggerScreening(
         triggerDto.applicationId,
         triggerDto.resumePath,
         triggerDto.priority
      );
   }

   @Post('bulk-trigger')
   @ApiOperation({
      summary: 'Trigger CV screening for multiple applications',
      description: 'Starts the CV screening pipeline for multiple applications'
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Bulk screening jobs triggered successfully',
      schema: {
         type: 'object',
         properties: {
            triggered: { type: 'number', example: 5 },
            failed: { type: 'number', example: 0 },
            results: {
               type: 'array',
               items: { $ref: '#/components/schemas/ScreeningResultDto' }
            }
         }
      }
   })
   async triggerBulkScreening(@Body() bulkDto: BulkScreeningDto) {
      return this.screeningService.triggerBulkScreening(
         bulkDto.applicationIds,
         bulkDto.priority
      );
   }

   @Get('results')
   @ApiOperation({
      summary: 'Get screening results with filtering',
      description: 'Retrieve screening results with optional filtering and pagination'
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening results retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/ScreeningResultDto' }
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 0 },
            limit: { type: 'number', example: 10 }
         }
      }
   })
   async getScreeningResults(@Query() query: GetScreeningResultsQueryDto) {
      return this.screeningService.getScreeningResults(query);
   }

   @Get('result/:id')
   @ApiOperation({
      summary: 'Get screening result by ID',
      description: 'Retrieve a specific screening result by its ID'
   })
   @ApiParam({
      name: 'id',
      description: 'Screening result ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening result retrieved successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Screening result not found'
   })
   async getScreeningResult(
      @Param('id', ParseIntPipe) id: number
   ): Promise<ScreeningResultDto> {
      const result = await this.screeningService.getScreeningResult(id);
      if (!result) {
         throw new NotFoundException(`Screening result with ID ${id} not found`);
      }
      return result;
   }

   @Get('application/:applicationId')
   @ApiOperation({
      summary: 'Get screening result by application ID',
      description: 'Retrieve screening result for a specific application'
   })
   @ApiParam({
      name: 'applicationId',
      description: 'Application ID',
      example: 123
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening result retrieved successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Screening result not found for this application'
   })
   async getScreeningByApplication(
      @Param('applicationId', ParseIntPipe) applicationId: number
   ): Promise<ScreeningResultDto> {
      const result = await this.screeningService.getScreeningByApplication(applicationId);
      if (!result) {
         throw new NotFoundException(`Screening result for application ${applicationId} not found`);
      }
      return result;
   }

   @Get('stats')
   @ApiOperation({
      summary: 'Get screening statistics',
      description: 'Retrieve overall screening statistics and metrics'
   })
   @ApiQuery({
      name: 'jobPostingId',
      description: 'Filter stats by job posting ID',
      required: false,
      example: 456
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening statistics retrieved successfully',
      type: ScreeningStatsDto,
   })
   async getScreeningStats(
      @Query('jobPostingId') jobPostingId?: number
   ): Promise<ScreeningStatsDto> {
      return this.screeningService.getScreeningStats(jobPostingId);
   }

   @Post('retry')
   @ApiOperation({
      summary: 'Retry failed screening',
      description: 'Retry a failed screening or force retry any screening'
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening retry triggered successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Cannot retry screening in current status'
   })
   async retryScreening(@Body() retryDto: RetryScreeningDto): Promise<ScreeningResultDto> {
      return this.screeningService.retryScreening(retryDto.screeningId, retryDto.force);
   }

   @Post('cancel/:id')
   @ApiOperation({
      summary: 'Cancel pending screening',
      description: 'Cancel a pending or processing screening job'
   })
   @ApiParam({
      name: 'id',
      description: 'Screening result ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening cancelled successfully',
      schema: {
         type: 'object',
         properties: {
            cancelled: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Screening cancelled successfully' }
         }
      }
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Cannot cancel screening in current status'
   })
   async cancelScreening(@Param('id', ParseIntPipe) id: number) {
      const cancelled = await this.screeningService.cancelScreening(id);
      return {
         cancelled,
         message: cancelled ? 'Screening cancelled successfully' : 'Could not cancel screening'
      };
   }

   @Post('test-local-cv')
   @ApiOperation({
      summary: 'Test CV screening with local file',
      description: 'Test the CV screening pipeline with a local CV file (for development/testing)'
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Test screening completed successfully',
      schema: {
         type: 'object',
         properties: {
            success: { type: 'boolean', example: true },
            processingTimeMs: { type: 'number', example: 15000 },
            extractedText: { type: 'string', example: 'CV text content...' },
            processedData: { type: 'object' },
            scores: { type: 'object' },
            summary: { type: 'object' },
            error: { type: 'string' }
         }
      }
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid file path or processing error'
   })
   async testLocalCv(@Body() testDto: TestLocalCvDto) {
      return this.screeningService.testLocalCvScreening(
         testDto.filePath,
         testDto.jobPostingId,
         testDto.mockApplicationId
      );
   }

   @Get('queue/status')
   @ApiOperation({
      summary: 'Get queue status',
      description: 'Get current status of screening queues'
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Queue status retrieved successfully',
      schema: {
         type: 'object',
         properties: {
           cvProcessing: {
             type: 'object',
             properties: {
               waiting: { type: 'number', example: 5 },
               active: { type: 'number', example: 2 },
               completed: { type: 'number', example: 100 },
               failed: { type: 'number', example: 3 },
               delayed: { type: 'number', example: 0 }
             }
           },
           similarity: { type: 'object' },
           summary: { type: 'object' }
         }
      }
   })
   async getQueueStatus() {
      return this.screeningService.getQueueStatus();
   }

   @Post('reprocess-job/:jobPostingId')
   @ApiOperation({
      summary: 'Reprocess all applications for a job posting',
      description: 'Trigger screening for all applications of a specific job posting'
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'Job posting ID',
      example: 456
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Reprocessing triggered successfully',
      schema: {
         type: 'object',
         properties: {
           jobPostingId: { type: 'number', example: 456 },
           applicationsFound: { type: 'number', example: 10 },
           screeningsTriggered: { type: 'number', example: 8 }
         }
      }
   })
   async reprocessJobApplications(@Param('jobPostingId', ParseIntPipe) jobPostingId: number) {
      return this.screeningService.reprocessJobApplications(jobPostingId);
   }
}
