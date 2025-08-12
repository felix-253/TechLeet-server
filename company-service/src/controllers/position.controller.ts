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
      description: 'Retrieves a paginated list of positions with optional search and sorting'
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
