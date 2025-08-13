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
   HttpCode,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiParam,
   ApiBearerAuth,
} from '@nestjs/swagger';
import { JobPostingService } from '../services/job-posting.service';
import { 
   CreateJobPostingDto, 
   UpdateJobPostingDto, 
   JobPostingResponseDto, 
   GetJobPostingsQueryDto 
} from '../dto/job-posting.dto';

@ApiTags('Job Postings')
@ApiBearerAuth()
@Controller('job-postings')
export class JobPostingController {
   constructor(private readonly jobPostingService: JobPostingService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new job posting',
      description: 'Creates a new job posting with the provided details. The posting will be created in draft status.'
   })
   @ApiResponse({
      status: 201,
      description: 'Job posting created successfully',
      type: JobPostingResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or business rule violation',
   })
   async create(@Body() createJobPostingDto: CreateJobPostingDto): Promise<JobPostingResponseDto> {
      return this.jobPostingService.create(createJobPostingDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all job postings',
      description: 'Retrieves a paginated list of job postings with optional filtering and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Job postings retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/JobPostingResponseDto' },
            },
            total: { type: 'number', example: 25 },
         },
      },
   })
   async findAll(@Query() query: GetJobPostingsQueryDto): Promise<{ data: JobPostingResponseDto[]; total: number }> {
      return this.jobPostingService.findAll(query);
   }

   @Get('active')
   @ApiOperation({ 
      summary: 'Get active job postings',
      description: 'Retrieves all published job postings that are still accepting applications'
   })
   @ApiResponse({
      status: 200,
      description: 'Active job postings retrieved successfully',
      type: [JobPostingResponseDto],
   })
   async findActive(): Promise<JobPostingResponseDto[]> {
      return this.jobPostingService.findActive();
   }

   @Get('by-department/:departmentId')
   @ApiOperation({ 
      summary: 'Get job postings by department',
      description: 'Retrieves all job postings for a specific department'
   })
   @ApiParam({ name: 'departmentId', description: 'Department ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job postings retrieved successfully',
      type: [JobPostingResponseDto],
   })
   async findByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number): Promise<JobPostingResponseDto[]> {
      return this.jobPostingService.findByDepartment(departmentId);
   }

   @Get('by-position/:positionId')
   @ApiOperation({ 
      summary: 'Get job postings by position',
      description: 'Retrieves all job postings for a specific position'
   })
   @ApiParam({ name: 'positionId', description: 'Position ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job postings retrieved successfully',
      type: [JobPostingResponseDto],
   })
   async findByPosition(@Param('positionId', ParseIntPipe) positionId: number): Promise<JobPostingResponseDto[]> {
      return this.jobPostingService.findByPosition(positionId);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get job posting by ID',
      description: 'Retrieves a specific job posting by its ID'
   })
   @ApiParam({ name: 'id', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job posting retrieved successfully',
      type: JobPostingResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<JobPostingResponseDto> {
      return this.jobPostingService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update job posting',
      description: 'Updates an existing job posting with the provided details'
   })
   @ApiParam({ name: 'id', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job posting updated successfully',
      type: JobPostingResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or business rule violation',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateJobPostingDto: UpdateJobPostingDto,
   ): Promise<JobPostingResponseDto> {
      return this.jobPostingService.update(id, updateJobPostingDto);
   }

   @Patch(':id/publish')
   @ApiOperation({ 
      summary: 'Publish job posting',
      description: 'Changes job posting status from draft to published, making it visible to candidates'
   })
   @ApiParam({ name: 'id', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job posting published successfully',
      type: JobPostingResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Job posting cannot be published (not in draft status or deadline passed)',
   })
   async publish(@Param('id', ParseIntPipe) id: number): Promise<JobPostingResponseDto> {
      return this.jobPostingService.publish(id);
   }

   @Patch(':id/close')
   @ApiOperation({ 
      summary: 'Close job posting',
      description: 'Changes job posting status from published to closed, stopping new applications'
   })
   @ApiParam({ name: 'id', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job posting closed successfully',
      type: JobPostingResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Job posting cannot be closed (not in published status)',
   })
   async close(@Param('id', ParseIntPipe) id: number): Promise<JobPostingResponseDto> {
      return this.jobPostingService.close(id);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete job posting',
      description: 'Soft deletes a job posting (marks as deleted but keeps in database)'
   })
   @ApiParam({ name: 'id', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Job posting deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.jobPostingService.remove(id);
   }
}
