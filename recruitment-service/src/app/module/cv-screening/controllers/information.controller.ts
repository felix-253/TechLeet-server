import {
   Controller,
   Post,
   Get,
   Query,
   Body,
   HttpStatus,
   BadRequestException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
   ApiQuery,
} from '@nestjs/swagger';
import { InformationService } from '../services/information.service';
import { CreateInformationCandidateDto } from '../../application/dto/information-candidate';

@ApiTags('CV Information Extraction')
@ApiBearerAuth('token')
@Controller('cv-screening')
export class InformationController {
   constructor(
      private readonly informationService: InformationService,
   ) {}

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

