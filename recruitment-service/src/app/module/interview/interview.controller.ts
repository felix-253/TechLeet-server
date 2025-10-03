import {
   Controller,
   Post,
   Put,
   Delete,
   Get,
   Body,
   Param,
   Query,
   ParseIntPipe,
} from '@nestjs/common';
import { InterviewService } from './interview.service';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateInterviewDto } from './dtos/createInterviewDto';
import { UpdateInterviewDto } from './dtos/updateInterviewDto';
import { FilterInterviewDto, SortBy } from './dtos/filterInterviewDto';

@ApiTags('Interview')
@Controller('interview')
export class InterviewController {
   constructor(private readonly interviewService: InterviewService) {}

   @Post()
   @ApiOperation({ summary: 'Create interview' })
   @ApiBody({ type: CreateInterviewDto })
   async createInterview(@Body() createInterviewDto: CreateInterviewDto) {
      return this.interviewService.createInterview(createInterviewDto);
   }

   @Put(':id')
   @ApiOperation({ summary: 'Update interview' })
   @ApiParam({ name: 'id', description: 'Interview ID' })
   @ApiBody({ type: UpdateInterviewDto })
   async updateInterview(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateInterviewDto: UpdateInterviewDto,
   ) {
      return this.interviewService.updateInterview(id, updateInterviewDto);
   }

   @Delete(':id')
   @ApiOperation({ summary: 'Soft delete interview' })
   @ApiParam({ name: 'id', description: 'Interview ID' })
   async softDeleteInterview(@Param('id', ParseIntPipe) id: number) {
      await this.interviewService.softDeleteInterview(id);
      return { message: 'Interview deleted successfully' };
   }

   @Get(':id')
   @ApiOperation({ summary: 'Get interview by ID' })
   @ApiParam({ name: 'id', description: 'Interview ID' })
   async getInterviewById(@Param('id', ParseIntPipe) id: number) {
      return this.interviewService.getInterviewById(id);
   }

   @Get('candidate/:candidateId')
   @ApiOperation({ summary: 'Get interviews by candidate ID' })
   @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
   @ApiQuery({ name: 'sortBy', enum: SortBy, required: false, description: 'Sort by field' })
   async getInterviewsByCandidateId(
      @Param('candidateId', ParseIntPipe) candidateId: number,
      @Query('sortBy') sortBy?: SortBy,
   ) {
      return this.interviewService.getInterviewsByCandidateId(candidateId, sortBy);
   }

   @Get('job/:jobId')
   @ApiOperation({ summary: 'Get interviews by job ID' })
   @ApiParam({ name: 'jobId', description: 'Job ID' })
   @ApiQuery({ name: 'sortBy', enum: SortBy, required: false, description: 'Sort by field' })
   async getInterviewsByJobId(
      @Param('jobId', ParseIntPipe) jobId: number,
      @Query('sortBy') sortBy?: SortBy,
   ) {
      return this.interviewService.getInterviewsByJobId(jobId, sortBy);
   }

   @Get('all/scheduled')
   @ApiOperation({ summary: 'Get all interviews sorted by scheduled_at' })
   async getAllInterviewsSortedByScheduledAt() {
      return this.interviewService.getAllInterviewsSortedByScheduledAt();
   }

   @Get('status/:status')
   @ApiOperation({ summary: 'Get interviews by status' })
   @ApiParam({ name: 'status', description: 'Interview status' })
   async getInterviewsByStatus(@Param('status') status: string) {
      return this.interviewService.getInterviewsByStatus(status);
   }

   @Get()
   @ApiOperation({ summary: 'Filter interviews with pagination' })
   async filterInterviews(@Query() filterDto: FilterInterviewDto) {
      return this.interviewService.filterInterviews(filterDto);
   }
}
