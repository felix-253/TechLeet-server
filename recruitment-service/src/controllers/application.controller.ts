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
import { ApplicationService } from '../services/application.service';
import { 
   CreateApplicationDto, 
   UpdateApplicationDto, 
   ApplicationResponseDto, 
   GetApplicationsQueryDto 
} from '../dto/application.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
   constructor(private readonly applicationService: ApplicationService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new application',
      description: 'Creates a new job application linking a candidate to a job posting'
   })
   @ApiResponse({
      status: 201,
      description: 'Application created successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - job posting not active, candidate already applied, or validation failed',
   })
   @ApiResponse({
      status: 404,
      description: 'Job posting or candidate not found',
   })
   async create(@Body() createApplicationDto: CreateApplicationDto): Promise<ApplicationResponseDto> {
      return this.applicationService.create(createApplicationDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all applications',
      description: 'Retrieves a paginated list of applications with optional filtering and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Applications retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/ApplicationResponseDto' },
            },
            total: { type: 'number', example: 75 },
         },
      },
   })
   async findAll(@Query() query: GetApplicationsQueryDto): Promise<{ data: ApplicationResponseDto[]; total: number }> {
      return this.applicationService.findAll(query);
   }

   @Get('by-job-posting/:jobPostingId')
   @ApiOperation({ 
      summary: 'Get applications by job posting',
      description: 'Retrieves all applications for a specific job posting'
   })
   @ApiParam({ name: 'jobPostingId', description: 'Job Posting ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Applications retrieved successfully',
      type: [ApplicationResponseDto],
   })
   async findByJobPosting(@Param('jobPostingId', ParseIntPipe) jobPostingId: number): Promise<ApplicationResponseDto[]> {
      return this.applicationService.findByJobPosting(jobPostingId);
   }

   @Get('by-candidate/:candidateId')
   @ApiOperation({ 
      summary: 'Get applications by candidate',
      description: 'Retrieves all applications submitted by a specific candidate'
   })
   @ApiParam({ name: 'candidateId', description: 'Candidate ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Applications retrieved successfully',
      type: [ApplicationResponseDto],
   })
   async findByCandidate(@Param('candidateId', ParseIntPipe) candidateId: number): Promise<ApplicationResponseDto[]> {
      return this.applicationService.findByCandidate(candidateId);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get application by ID',
      description: 'Retrieves a specific application by its ID'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Application retrieved successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApplicationResponseDto> {
      return this.applicationService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update application',
      description: 'Updates an existing application with the provided details'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Application updated successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or business rule violation',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateApplicationDto: UpdateApplicationDto,
   ): Promise<ApplicationResponseDto> {
      return this.applicationService.update(id, updateApplicationDto);
   }

   @Patch(':id/status')
   @ApiOperation({ 
      summary: 'Update application status',
      description: 'Updates the status of an application in the recruitment process'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Application status updated successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Invalid status provided',
   })
   async updateStatus(
      @Param('id', ParseIntPipe) id: number,
      @Body() body: { status: string },
   ): Promise<ApplicationResponseDto> {
      return this.applicationService.updateStatus(id, body.status);
   }

   @Post(':id/make-offer')
   @ApiOperation({ 
      summary: 'Make job offer',
      description: 'Makes a job offer to a candidate for their application'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Job offer made successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Application not in interviewing status or invalid offer data',
   })
   async makeOffer(
      @Param('id', ParseIntPipe) id: number,
      @Body() offerData: { offeredSalary: number; offerExpiryDate: string },
   ): Promise<ApplicationResponseDto> {
      return this.applicationService.makeOffer(id, offerData);
   }

   @Post(':id/respond-offer')
   @ApiOperation({ 
      summary: 'Respond to job offer',
      description: 'Allows candidate to accept or reject a job offer'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Offer response recorded successfully',
      type: ApplicationResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   @ApiResponse({
      status: 400,
      description: 'No pending offer found or offer has expired',
   })
   async respondToOffer(
      @Param('id', ParseIntPipe) id: number,
      @Body() response: { response: 'accepted' | 'rejected' },
   ): Promise<ApplicationResponseDto> {
      return this.applicationService.respondToOffer(id, response.response);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete application',
      description: 'Soft deletes an application (marks as deleted but keeps in database)'
   })
   @ApiParam({ name: 'id', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Application deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.applicationService.remove(id);
   }
}
