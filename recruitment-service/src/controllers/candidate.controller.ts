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
import { CandidateService } from '../services/candidate.service';
import { 
   CreateCandidateDto, 
   UpdateCandidateDto, 
   CandidateResponseDto, 
   GetCandidatesQueryDto 
} from '../dto/candidate.dto';

@ApiTags('Candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidateController {
   constructor(private readonly candidateService: CandidateService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new candidate',
      description: 'Creates a new candidate profile with the provided details'
   })
   @ApiResponse({
      status: 201,
      description: 'Candidate created successfully',
      type: CandidateResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or email already exists',
   })
   async create(@Body() createCandidateDto: CreateCandidateDto): Promise<CandidateResponseDto> {
      return this.candidateService.create(createCandidateDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all candidates',
      description: 'Retrieves a paginated list of candidates with optional filtering and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Candidates retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/CandidateResponseDto' },
            },
            total: { type: 'number', example: 150 },
         },
      },
   })
   async findAll(@Query() query: GetCandidatesQueryDto): Promise<{ data: CandidateResponseDto[]; total: number }> {
      return this.candidateService.findAll(query);
   }

   @Get('by-status/:status')
   @ApiOperation({ 
      summary: 'Get candidates by status',
      description: 'Retrieves all candidates with a specific status'
   })
   @ApiParam({ 
      name: 'status', 
      description: 'Candidate status', 
      enum: ['new', 'screening', 'interviewing', 'hired', 'rejected', 'withdrawn']
   })
   @ApiResponse({
      status: 200,
      description: 'Candidates retrieved successfully',
      type: [CandidateResponseDto],
   })
   async findByStatus(@Param('status') status: string): Promise<CandidateResponseDto[]> {
      return this.candidateService.findByStatus(status);
   }

   @Get('by-skills')
   @ApiOperation({ 
      summary: 'Get candidates by skills',
      description: 'Retrieves candidates that have any of the specified skills'
   })
   @ApiQuery({ 
      name: 'skills', 
      description: 'Comma-separated list of skills', 
      example: 'React,Node.js,TypeScript'
   })
   @ApiResponse({
      status: 200,
      description: 'Candidates retrieved successfully',
      type: [CandidateResponseDto],
   })
   async findBySkills(@Query('skills') skills: string): Promise<CandidateResponseDto[]> {
      const skillArray = skills.split(',').map(skill => skill.trim());
      return this.candidateService.findBySkills(skillArray);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get candidate by ID',
      description: 'Retrieves a specific candidate by their ID'
   })
   @ApiParam({ name: 'id', description: 'Candidate ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Candidate retrieved successfully',
      type: CandidateResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Candidate not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<CandidateResponseDto> {
      return this.candidateService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update candidate',
      description: 'Updates an existing candidate with the provided details'
   })
   @ApiParam({ name: 'id', description: 'Candidate ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Candidate updated successfully',
      type: CandidateResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Candidate not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - validation failed or email already exists',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateCandidateDto: UpdateCandidateDto,
   ): Promise<CandidateResponseDto> {
      return this.candidateService.update(id, updateCandidateDto);
   }

   @Patch(':id/status')
   @ApiOperation({ 
      summary: 'Update candidate status',
      description: 'Updates the status of a candidate in the recruitment process'
   })
   @ApiParam({ name: 'id', description: 'Candidate ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Candidate status updated successfully',
      type: CandidateResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Candidate not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Invalid status provided',
   })
   async updateStatus(
      @Param('id', ParseIntPipe) id: number,
      @Body() body: { status: string },
   ): Promise<CandidateResponseDto> {
      return this.candidateService.updateStatus(id, body.status);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete candidate',
      description: 'Soft deletes a candidate (marks as deleted but keeps in database)'
   })
   @ApiParam({ name: 'id', description: 'Candidate ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Candidate deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Candidate not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.candidateService.remove(id);
   }
}
