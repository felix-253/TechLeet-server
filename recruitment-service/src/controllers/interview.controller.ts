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
   ApiQuery,
   ApiBearerAuth,
} from '@nestjs/swagger';
import { InterviewService } from '../services/interview.service';
import { 
   CreateInterviewDto, 
   UpdateInterviewDto, 
   InterviewResponseDto, 
   GetInterviewsQueryDto 
} from '../dto/interview.dto';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewController {
   constructor(private readonly interviewService: InterviewService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Schedule a new interview',
      description: 'Schedules a new interview for an application'
   })
   @ApiResponse({
      status: 201,
      description: 'Interview scheduled successfully',
      type: InterviewResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - application not in valid status, scheduling conflict, or validation failed',
   })
   @ApiResponse({
      status: 404,
      description: 'Application not found',
   })
   async create(@Body() createInterviewDto: CreateInterviewDto): Promise<InterviewResponseDto> {
      return this.interviewService.create(createInterviewDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all interviews',
      description: 'Retrieves a paginated list of interviews with optional filtering and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Interviews retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/InterviewResponseDto' },
            },
            total: { type: 'number', example: 45 },
         },
      },
   })
   async findAll(@Query() query: GetInterviewsQueryDto): Promise<{ data: InterviewResponseDto[]; total: number }> {
      return this.interviewService.findAll(query);
   }

   @Get('upcoming')
   @ApiOperation({ 
      summary: 'Get upcoming interviews',
      description: 'Retrieves all scheduled interviews for the next 7 days'
   })
   @ApiQuery({ 
      name: 'interviewerId', 
      description: 'Filter by interviewer ID', 
      required: false, 
      type: 'number'
   })
   @ApiResponse({
      status: 200,
      description: 'Upcoming interviews retrieved successfully',
      type: [InterviewResponseDto],
   })
   async findUpcoming(@Query('interviewerId', new ParseIntPipe({ optional: true })) interviewerId?: number): Promise<InterviewResponseDto[]> {
      return this.interviewService.findUpcoming(interviewerId);
   }

   @Get('by-application/:applicationId')
   @ApiOperation({ 
      summary: 'Get interviews by application',
      description: 'Retrieves all interviews for a specific application'
   })
   @ApiParam({ name: 'applicationId', description: 'Application ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Interviews retrieved successfully',
      type: [InterviewResponseDto],
   })
   async findByApplication(@Param('applicationId', ParseIntPipe) applicationId: number): Promise<InterviewResponseDto[]> {
      return this.interviewService.findByApplication(applicationId);
   }

   @Get('by-interviewer/:interviewerId')
   @ApiOperation({ 
      summary: 'Get interviews by interviewer',
      description: 'Retrieves all interviews for a specific interviewer with optional date range'
   })
   @ApiParam({ name: 'interviewerId', description: 'Interviewer ID', type: 'number' })
   @ApiQuery({ 
      name: 'dateFrom', 
      description: 'Start date (YYYY-MM-DD)', 
      required: false, 
      type: 'string'
   })
   @ApiQuery({ 
      name: 'dateTo', 
      description: 'End date (YYYY-MM-DD)', 
      required: false, 
      type: 'string'
   })
   @ApiResponse({
      status: 200,
      description: 'Interviews retrieved successfully',
      type: [InterviewResponseDto],
   })
   async findByInterviewer(
      @Param('interviewerId', ParseIntPipe) interviewerId: number,
      @Query('dateFrom') dateFrom?: string,
      @Query('dateTo') dateTo?: string,
   ): Promise<InterviewResponseDto[]> {
      return this.interviewService.findByInterviewer(interviewerId, dateFrom, dateTo);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get interview by ID',
      description: 'Retrieves a specific interview by its ID'
   })
   @ApiParam({ name: 'id', description: 'Interview ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Interview retrieved successfully',
      type: InterviewResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Interview not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<InterviewResponseDto> {
      return this.interviewService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update interview',
      description: 'Updates an existing interview with the provided details'
   })
   @ApiParam({ name: 'id', description: 'Interview ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Interview updated successfully',
      type: InterviewResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Interview not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or business rule violation',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateInterviewDto: UpdateInterviewDto,
   ): Promise<InterviewResponseDto> {
      return this.interviewService.update(id, updateInterviewDto);
   }

   @Patch(':id/status')
   @ApiOperation({ 
      summary: 'Update interview status',
      description: 'Updates the status of an interview'
   })
   @ApiParam({ name: 'id', description: 'Interview ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Interview status updated successfully',
      type: InterviewResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Interview not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Invalid status provided',
   })
   async updateStatus(
      @Param('id', ParseIntPipe) id: number,
      @Body() body: { status: string },
   ): Promise<InterviewResponseDto> {
      return this.interviewService.updateStatus(id, body.status);
   }

   @Post(':id/complete')
   @ApiOperation({ 
      summary: 'Complete interview',
      description: 'Marks an interview as completed and records assessment results'
   })
   @ApiParam({ name: 'id', description: 'Interview ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Interview completed successfully',
      type: InterviewResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Interview not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Interview not in valid status for completion',
   })
   async completeInterview(
      @Param('id', ParseIntPipe) id: number,
      @Body() completionData: {
         score?: number;
         feedback?: string;
         result?: string;
         strengths?: string;
         weaknesses?: string;
         recommendForNextRound?: boolean;
      },
   ): Promise<InterviewResponseDto> {
      return this.interviewService.completeInterview(id, completionData);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete interview',
      description: 'Soft deletes an interview (marks as deleted but keeps in database)'
   })
   @ApiParam({ name: 'id', description: 'Interview ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Interview deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Interview not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.interviewService.remove(id);
   }
}
