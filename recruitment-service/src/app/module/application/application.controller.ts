import {
   Controller,
   Get,
   Post,
   Body,
   Patch,
   Param,
   Delete,
   Query,
   ParseIntPipe,
   HttpStatus,
   NotFoundException,
   BadRequestException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiBearerAuth,
   ApiParam,
   ApiQuery,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import {
   CreateApplicationDto,
   UpdateApplicationDto,
   ApplicationResponseDto,
   GetApplicationsQueryDto,
} from './dto/application.dto';

@ApiTags('Applications')
@ApiBearerAuth('token')
@Controller('applications')
export class ApplicationController {
   constructor(private readonly applicationService: ApplicationService) {}

   @Post()
   @ApiOperation({
      summary: 'Create a new application',
      description: 'Creates a new job application for a candidate'
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Application created successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid input data'
   })
   async create(@Body() createApplicationDto: CreateApplicationDto): Promise<ApplicationResponseDto> {
      return this.applicationService.create(createApplicationDto);
   }

   @Get()
   @ApiOperation({
      summary: 'Get all applications',
      description: 'Retrieve a list of applications with optional filtering and pagination'
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Applications retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/ApplicationResponseDto' }
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 0 },
            limit: { type: 'number', example: 10 }
         }
      }
   })
   async findAll(@Query() query: GetApplicationsQueryDto) {
      return this.applicationService.findAll(query);
   }

   @Get(':id')
   @ApiOperation({
      summary: 'Get application by ID',
      description: 'Retrieve a specific application by its ID'
   })
   @ApiParam({
      name: 'id',
      description: 'Application ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Application retrieved successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Application not found'
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApplicationResponseDto> {
      const application = await this.applicationService.findOne(id);
      if (!application) {
         throw new NotFoundException(`Application with ID ${id} not found`);
      }
      return application;
   }

   @Patch(':id')
   @ApiOperation({
      summary: 'Update application',
      description: 'Update an existing application'
   })
   @ApiParam({
      name: 'id',
      description: 'Application ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Application updated successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Application not found'
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateApplicationDto: UpdateApplicationDto
   ): Promise<ApplicationResponseDto> {
      return this.applicationService.update(id, updateApplicationDto);
   }

   @Delete(':id')
   @ApiOperation({
      summary: 'Delete application',
      description: 'Delete an application by ID'
   })
   @ApiParam({
      name: 'id',
      description: 'Application ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Application deleted successfully',
      schema: {
         type: 'object',
         properties: {
            message: { type: 'string', example: 'Application deleted successfully' }
         }
      }
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Application not found'
   })
   async remove(@Param('id', ParseIntPipe) id: number) {
      await this.applicationService.remove(id);
      return { message: 'Application deleted successfully' };
   }

   @Get('job/:jobId')
   @ApiOperation({
      summary: 'Get applications by job posting',
      description: 'Retrieve all applications for a specific job posting'
   })
   @ApiParam({
      name: 'jobId',
      description: 'Job posting ID',
      example: 1
   })
   @ApiQuery({
      name: 'page',
      description: 'Page number (0-based)',
      required: false,
      example: 0
   })
   @ApiQuery({
      name: 'limit',
      description: 'Number of items per page',
      required: false,
      example: 10
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Applications retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/ApplicationResponseDto' }
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' }
         }
      }
   })
   async findByJobPosting(
      @Param('jobId', ParseIntPipe) jobId: number,
      @Query('page') page: number = 0,
      @Query('limit') limit: number = 10
   ) {
      return this.applicationService.findByJobPosting(jobId, page, limit);
   }

   @Get('candidate/:candidateId')
   @ApiOperation({
      summary: 'Get applications by candidate',
      description: 'Retrieve all applications for a specific candidate'
   })
   @ApiParam({
      name: 'candidateId',
      description: 'Candidate ID',
      example: 1
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Applications retrieved successfully',
      type: [ApplicationResponseDto],
   })
   async findByCandidate(@Param('candidateId', ParseIntPipe) candidateId: number): Promise<ApplicationResponseDto[]> {
      return this.applicationService.findByCandidate(candidateId);
   }
}
