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
   BadRequestException,
} from '@nestjs/common';
import {
   ApiTags,
   ApiOperation,
   ApiResponse,
   ApiParam,
   ApiQuery,
   ApiBearerAuth,
} from '@nestjs/swagger';
import { PositionService } from '../services/position.service';
import {
   CreatePositionDto,
   UpdatePositionDto,
   GetPositionsQueryDto,
   PositionResponseDto,
} from '../dto/position.dto';

@ApiTags('Positions')
@ApiBearerAuth('token')
@Controller('positions')
export class PositionController {
   constructor(private readonly positionService: PositionService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new position',
      description: 'Creates a new job position in the company'
   })
   @ApiResponse({
      status: 201,
      description: 'Position created successfully',
      type: PositionResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Position name already exists or invalid data',
   })
   async create(@Body() createPositionDto: CreatePositionDto): Promise<PositionResponseDto> {
      return this.positionService.create(createPositionDto);
   }

   @Get()
   @ApiOperation({
      summary: 'Get all positions',
      description: 'Retrieves a paginated list of positions with optional search, filtering, and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Positions retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/PositionResponseDto' },
            },
            total: { type: 'number', example: 15 },
         },
      },
   })
   async findAll(@Query() query: GetPositionsQueryDto): Promise<{ data: PositionResponseDto[]; total: number }> {
      return this.positionService.findAll(query);
   }

   @Get('by-type/:positionTypeId')
   @ApiOperation({
      summary: 'Get positions by type',
      description: 'Retrieves all positions of a specific type'
   })
   @ApiParam({ name: 'positionTypeId', description: 'Position Type ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Positions retrieved successfully',
      type: [PositionResponseDto],
   })
   async findByType(@Param('positionTypeId', ParseIntPipe) positionTypeId: number): Promise<PositionResponseDto[]> {
      return this.positionService.findByType(positionTypeId);
   }

   @Get('by-level/:level')
   @ApiOperation({
      summary: 'Get positions by level',
      description: 'Retrieves all positions of a specific level'
   })
   @ApiParam({
      name: 'level',
      description: 'Position Level (1=Entry, 2=Junior, 3=Senior, 4=Lead, 5=Manager)',
      type: 'number',
      enum: [1, 2, 3, 4, 5]
   })
   @ApiResponse({
      status: 200,
      description: 'Positions retrieved successfully',
      type: [PositionResponseDto],
   })
   async findByLevel(@Param('level', ParseIntPipe) level: number): Promise<PositionResponseDto[]> {
      if (level < 1 || level > 5) {
         throw new BadRequestException('Position level must be between 1 and 5');
      }
      return this.positionService.findByLevel(level);
   }

   @Get('by-salary-range')
   @ApiOperation({
      summary: 'Get positions by salary range',
      description: 'Retrieves positions within a specified salary range'
   })
   @ApiQuery({
      name: 'minSalary',
      description: 'Minimum salary (VND)',
      required: false,
      type: 'number',
      example: 20000000
   })
   @ApiQuery({
      name: 'maxSalary',
      description: 'Maximum salary (VND)',
      required: false,
      type: 'number',
      example: 50000000
   })
   @ApiResponse({
      status: 200,
      description: 'Positions retrieved successfully',
      type: [PositionResponseDto],
   })
   async findBySalaryRange(
      @Query('minSalary', new ParseIntPipe({ optional: true })) minSalary?: number,
      @Query('maxSalary', new ParseIntPipe({ optional: true })) maxSalary?: number,
   ): Promise<PositionResponseDto[]> {
      return this.positionService.findBySalaryRange(minSalary, maxSalary);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get position by ID',
      description: 'Retrieves a specific position by its ID'
   })
   @ApiParam({ name: 'id', description: 'Position ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Position retrieved successfully',
      type: PositionResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Position not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<PositionResponseDto> {
      return this.positionService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update position',
      description: 'Updates an existing position'
   })
   @ApiParam({ name: 'id', description: 'Position ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Position updated successfully',
      type: PositionResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Position not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Position name already exists or invalid data',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updatePositionDto: UpdatePositionDto,
   ): Promise<PositionResponseDto> {
      return this.positionService.update(id, updatePositionDto);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete position',
      description: 'Deletes a position by ID'
   })
   @ApiParam({ name: 'id', description: 'Position ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Position deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Position not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.positionService.remove(id);
   }
}
