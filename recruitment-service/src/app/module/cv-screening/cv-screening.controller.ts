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
import { InformationService } from './information.service';
import {
   TriggerScreeningDto,
   ScreeningResultDto,
   GetScreeningResultsQueryDto,
   ScreeningStatsDto,
   BulkScreeningDto,
   RetryScreeningDto,
   TestLocalCvDto,
} from './cv-screening.dto';
import { CreateInformationCandidateDto } from '../application/dto/information-candidate';

@ApiTags('CV Screening')
@ApiBearerAuth('token')
@Controller('cv-screening')
export class CvScreeningController {
   constructor(
      private readonly screeningService: CvScreeningService,
      private readonly informationService: InformationService,
   ) {}

   @Post('trigger')
   @ApiOperation({
      summary: 'Trigger CV screening for an application',
      description: 'Starts the CV screening pipeline for a specific application',
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Screening job triggered successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid application ID or missing resume',
   })
   async triggerScreening(@Body() triggerDto: TriggerScreeningDto): Promise<ScreeningResultDto> {
      return this.screeningService.triggerScreening(
         triggerDto.applicationId,
         triggerDto.resumePath,
         triggerDto.priority,
      );
   }

   @Post('bulk-trigger')
   @ApiOperation({
      summary: 'Trigger CV screening for multiple applications',
      description: 'Starts the CV screening pipeline for multiple applications',
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
               items: { $ref: '#/components/schemas/ScreeningResultDto' },
            },
         },
      },
   })
   async triggerBulkScreening(@Body() bulkDto: BulkScreeningDto) {
      return this.screeningService.triggerBulkScreening(bulkDto.applicationIds, bulkDto.priority);
   }

   @Get('results')
   @ApiOperation({
      summary: 'Get screening results with filtering',
      description: 'Retrieve screening results with optional filtering and pagination',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening results retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/ScreeningResultDto' },
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 0 },
            limit: { type: 'number', example: 10 },
         },
      },
   })
   async getScreeningResults(@Query() query: GetScreeningResultsQueryDto) {
      return this.screeningService.getScreeningResults(query);
   }

   @Get('result/:id')
   @ApiOperation({
      summary: 'Get screening result by ID',
      description: 'Retrieve a specific screening result by its ID',
   })
   @ApiParam({
      name: 'id',
      description: 'Screening result ID',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening result retrieved successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Screening result not found',
   })
   async getScreeningResult(@Param('id', ParseIntPipe) id: number): Promise<ScreeningResultDto> {
      const result = await this.screeningService.getScreeningResult(id);
      if (!result) {
         throw new NotFoundException(`Screening result with ID ${id} not found`);
      }
      return result;
   }

   @Get('application/:applicationId')
   @ApiOperation({
      summary: 'Get screening result by application ID',
      description: 'Retrieve screening result for a specific application',
   })
   @ApiParam({
      name: 'applicationId',
      description: 'Application ID',
      example: 123,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening result retrieved successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Screening result not found for this application',
   })
   async getScreeningByApplication(
      @Param('applicationId', ParseIntPipe) applicationId: number,
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
      description: 'Retrieve overall screening statistics and metrics',
   })
   @ApiQuery({
      name: 'jobPostingId',
      description: 'Filter stats by job posting ID',
      required: false,
      example: 456,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening statistics retrieved successfully',
      type: ScreeningStatsDto,
   })
   async getScreeningStats(
      @Query('jobPostingId') jobPostingId?: number,
   ): Promise<ScreeningStatsDto> {
      return this.screeningService.getScreeningStats(jobPostingId);
   }

   @Post('retry')
   @ApiOperation({
      summary: 'Retry failed screening',
      description: 'Retry a failed screening or force retry any screening',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening retry triggered successfully',
      type: ScreeningResultDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Cannot retry screening in current status',
   })
   async retryScreening(@Body() retryDto: RetryScreeningDto): Promise<ScreeningResultDto> {
      return this.screeningService.retryScreening(retryDto.screeningId, retryDto.force);
   }

   @Post('cancel/:id')
   @ApiOperation({
      summary: 'Cancel pending screening',
      description: 'Cancel a pending or processing screening job',
   })
   @ApiParam({
      name: 'id',
      description: 'Screening result ID',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Screening cancelled successfully',
      schema: {
         type: 'object',
         properties: {
            cancelled: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Screening cancelled successfully' },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Cannot cancel screening in current status',
   })
   async cancelScreening(@Param('id', ParseIntPipe) id: number) {
      const cancelled = await this.screeningService.cancelScreening(id);
      return {
         cancelled,
         message: cancelled ? 'Screening cancelled successfully' : 'Could not cancel screening',
      };
   }

   @Post('test-local-cv')
   @ApiOperation({
      summary: 'Test CV screening with local file',
      description: 'Test the CV screening pipeline with a local CV file (for development/testing)',
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
            error: { type: 'string' },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid file path or processing error',
   })
   async testLocalCv(@Body() testDto: TestLocalCvDto) {
      return this.screeningService.testLocalCvScreening(
         testDto.filePath,
         testDto.jobPostingId,
         testDto.mockApplicationId,
      );
   }

   @Get('queue/status')
   @ApiOperation({
      summary: 'Get queue status',
      description: 'Get current status of screening queues',
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
                  delayed: { type: 'number', example: 0 },
               },
            },
            similarity: { type: 'object' },
            summary: { type: 'object' },
         },
      },
   })
   async getQueueStatus() {
      return this.screeningService.getQueueStatus();
   }

   @Post('reprocess-job/:jobPostingId')
   @ApiOperation({
      summary: 'Reprocess all applications for a job posting',
      description: 'Trigger screening for all applications of a specific job posting',
   })
   @ApiParam({
      name: 'jobPostingId',
      description: 'Job posting ID',
      example: 456,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Reprocessing triggered successfully',
      schema: {
         type: 'object',
         properties: {
            jobPostingId: { type: 'number', example: 456 },
            applicationsFound: { type: 'number', example: 10 },
            screeningsTriggered: { type: 'number', example: 8 },
         },
      },
   })
   async reprocessJobApplications(@Param('jobPostingId', ParseIntPipe) jobPostingId: number) {
      return this.screeningService.reprocessJobApplications(jobPostingId);
   }

   // ========== INFORMATION SERVICE ENDPOINTS ==========

   @Post('extract-candidate-info')
   @ApiOperation({
      summary: 'Trích xuất thông tin ứng viên từ file PDF',
      description: 'Đọc file PDF và trích xuất thông tin ứng viên để filter vào table',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Thông tin ứng viên đã được trích xuất thành công',
      schema: {
         type: 'object',
         properties: {
            success: { type: 'boolean', example: true },
            candidateId: { type: 'number', example: 123 },
            applicationId: { type: 'number', example: 456 },
            extractedData: {
               type: 'object',
               properties: {
                  personalInfo: {
                     type: 'object',
                     properties: {
                        firstName: { type: 'string', example: 'Nguyễn' },
                        lastName: { type: 'string', example: 'Văn A' },
                        email: { type: 'string', example: 'nguyenvana@email.com' },
                        phoneNumber: { type: 'string', example: '0123456789' },
                        address: { type: 'string', example: 'Hồ Chí Minh' },
                     },
                  },
                  professionalInfo: {
                     type: 'object',
                     properties: {
                        yearsOfExperience: { type: 'number', example: 5 },
                        currentJobTitle: { type: 'string', example: 'Senior Developer' },
                        currentCompany: { type: 'string', example: 'ABC Company' },
                        educationLevel: { type: 'string', example: 'Bachelor' },
                        university: { type: 'string', example: 'Đại học Bách Khoa' },
                        graduationYear: { type: 'number', example: 2019 },
                        skills: {
                           type: 'array',
                           items: { type: 'string' },
                           example: ['JavaScript', 'React', 'Node.js'],
                        },
                        programmingLanguages: {
                           type: 'array',
                           items: { type: 'string' },
                           example: ['JavaScript', 'Python'],
                        },
                        summary: {
                           type: 'string',
                           example: 'Experienced developer with 5 years...',
                        },
                     },
                  },
                  aiAnalysis: {
                     type: 'object',
                     properties: {
                        summary: { type: 'string', example: 'Ứng viên có kinh nghiệm tốt...' },
                        keyHighlights: {
                           type: 'array',
                           items: { type: 'string' },
                           example: ['Kỹ năng kỹ thuật mạnh', 'Kinh nghiệm lãnh đạo'],
                        },
                        concerns: {
                           type: 'array',
                           items: { type: 'string' },
                           example: ['Thiếu kinh nghiệm cloud'],
                        },
                        fitScore: { type: 'number', example: 85 },
                        recommendation: { type: 'string', example: 'phù_hợp_tốt' },
                     },
                  },
               },
            },
            processingTimeMs: { type: 'number', example: 15000 },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'File PDF không tồn tại hoặc lỗi xử lý',
   })
   async extractCandidateInformationFromPdf(@Body() body: CreateInformationCandidateDto) {
      const { pdfFilePath, jobPostingId, candidateId } = body;
      if (!pdfFilePath) {
         throw new BadRequestException('pdfFilePath là bắt buộc');
      }

      return this.informationService.extractCandidateInformationFromPdf(
         pdfFilePath,
         jobPostingId,
         candidateId,
      );
   }

   @Get('filtered-candidates')
   @ApiOperation({
      summary: 'Lấy danh sách ứng viên đã được filter',
      description: 'Lấy danh sách ứng viên đã được xử lý và filter theo các tiêu chí',
   })
   @ApiQuery({
      name: 'jobPostingId',
      required: false,
      type: Number,
      description: 'ID của job posting',
   })
   @ApiQuery({
      name: 'minExperience',
      required: false,
      type: Number,
      description: 'Số năm kinh nghiệm tối thiểu',
   })
   @ApiQuery({
      name: 'maxExperience',
      required: false,
      type: Number,
      description: 'Số năm kinh nghiệm tối đa',
   })
   @ApiQuery({
      name: 'educationLevel',
      required: false,
      type: String,
      description: 'Trình độ học vấn',
   })
   @ApiQuery({
      name: 'skills',
      required: false,
      type: String,
      description: 'Kỹ năng (comma-separated)',
   })
   @ApiQuery({
      name: 'minFitScore',
      required: false,
      type: Number,
      description: 'Điểm fit tối thiểu',
   })
   @ApiQuery({ name: 'status', required: false, type: String, description: 'Trạng thái ứng viên' })
   @ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Số lượng kết quả tối đa',
   })
   @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu' })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Danh sách ứng viên đã được filter',
      schema: {
         type: 'object',
         properties: {
            candidates: {
               type: 'array',
               items: {
                  type: 'object',
                  properties: {
                     candidateId: { type: 'number', example: 123 },
                     applicationId: { type: 'number', example: 456 },
                     fullName: { type: 'string', example: 'Nguyễn Văn A' },
                     email: { type: 'string', example: 'nguyenvana@email.com' },
                     phoneNumber: { type: 'string', example: '0123456789' },
                     yearsOfExperience: { type: 'number', example: 5 },
                     currentJobTitle: { type: 'string', example: 'Senior Developer' },
                     currentCompany: { type: 'string', example: 'ABC Company' },
                     educationLevel: { type: 'string', example: 'Bachelor' },
                     skills: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['JavaScript', 'React'],
                     },
                     aiSummary: { type: 'string', example: 'Experienced developer...' },
                     fitScore: { type: 'number', example: 85 },
                     screeningStatus: { type: 'string', example: 'completed' },
                     appliedDate: {
                        type: 'string',
                        format: 'date-time',
                        example: '2024-01-15T10:30:00Z',
                     },
                  },
               },
            },
            total: { type: 'number', example: 50 },
            filters: { type: 'object' },
         },
      },
   })
   async getFilteredCandidates(
      @Query('jobPostingId') jobPostingId?: number,
      @Query('minExperience') minExperience?: number,
      @Query('maxExperience') maxExperience?: number,
      @Query('educationLevel') educationLevel?: string,
      @Query('skills') skills?: string,
      @Query('minFitScore') minFitScore?: number,
      @Query('status') status?: string,
      @Query('limit') limit?: number,
      @Query('offset') offset?: number,
   ) {
      const filters = {
         jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
         minExperience: minExperience ? Number(minExperience) : undefined,
         maxExperience: maxExperience ? Number(maxExperience) : undefined,
         educationLevel,
         skills: skills ? skills.split(',').map((s) => s.trim()) : undefined,
         minFitScore: minFitScore ? Number(minFitScore) : undefined,
         status,
         limit: limit ? Number(limit) : undefined,
         offset: offset ? Number(offset) : undefined,
      };

      return this.informationService.getFilteredCandidates(filters);
   }

   @Get('candidate-statistics')
   @ApiOperation({
      summary: 'Lấy thống kê về ứng viên',
      description: 'Lấy thống kê tổng quan về ứng viên đã được xử lý',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Thống kê ứng viên',
      schema: {
         type: 'object',
         properties: {
            totalCandidates: { type: 'number', example: 150 },
            totalApplications: { type: 'number', example: 200 },
            averageExperience: { type: 'number', example: 4.5 },
            topSkills: {
               type: 'array',
               items: {
                  type: 'object',
                  properties: {
                     skill: { type: 'string', example: 'JavaScript' },
                     count: { type: 'number', example: 45 },
                  },
               },
            },
            educationDistribution: {
               type: 'array',
               items: {
                  type: 'object',
                  properties: {
                     level: { type: 'string', example: 'Bachelor' },
                     count: { type: 'number', example: 60 },
                  },
               },
            },
            screeningStats: {
               type: 'object',
               properties: {
                  completed: { type: 'number', example: 120 },
                  pending: { type: 'number', example: 20 },
                  averageScore: { type: 'number', example: 75.5 },
               },
            },
         },
      },
   })
   async getCandidateStatistics() {
      return this.informationService.getCandidateStatistics();
   }
}
