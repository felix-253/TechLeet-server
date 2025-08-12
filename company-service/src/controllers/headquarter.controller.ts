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
import { HeadquarterService } from '../services/headquarter.service';
import {
   CreateHeadquarterDto,
   UpdateHeadquarterDto,
   GetHeadquartersQueryDto,
   HeadquarterResponseDto,
} from '../dto/headquarter.dto';

@ApiTags('Headquarters')
@ApiBearerAuth('token')
@Controller('headquarters')
export class HeadquarterController {
   constructor(private readonly headquarterService: HeadquarterService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new headquarter',
      description: 'Creates a new headquarter or office location'
   })
   @ApiResponse({
      status: 201,
      description: 'Headquarter created successfully',
      type: HeadquarterResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Headquarter name or email already exists',
   })
   async create(@Body() createHeadquarterDto: CreateHeadquarterDto): Promise<HeadquarterResponseDto> {
      return this.headquarterService.create(createHeadquarterDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all headquarters',
      description: 'Retrieves a paginated list of headquarters with optional search and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Headquarters retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/HeadquarterResponseDto' },
            },
            total: { type: 'number', example: 5 },
         },
      },
   })
   async findAll(@Query() query: GetHeadquartersQueryDto): Promise<{ data: HeadquarterResponseDto[]; total: number }> {
      return this.headquarterService.findAll(query);
   }

   @Get('main')
   @ApiOperation({ 
      summary: 'Get main headquarter',
      description: 'Retrieves the main headquarter information'
   })
   @ApiResponse({
      status: 200,
      description: 'Main headquarter retrieved successfully',
      type: HeadquarterResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'No main headquarter found',
   })
   async findMainHeadquarter(): Promise<HeadquarterResponseDto | null> {
      return this.headquarterService.findMainHeadquarter();
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get headquarter by ID',
      description: 'Retrieves a specific headquarter by its ID'
   })
   @ApiParam({ name: 'id', description: 'Headquarter ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Headquarter retrieved successfully',
      type: HeadquarterResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Headquarter not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<HeadquarterResponseDto> {
      return this.headquarterService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update headquarter',
      description: 'Updates an existing headquarter'
   })
   @ApiParam({ name: 'id', description: 'Headquarter ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Headquarter updated successfully',
      type: HeadquarterResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Headquarter not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Headquarter name or email already exists',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateHeadquarterDto: UpdateHeadquarterDto,
   ): Promise<HeadquarterResponseDto> {
      return this.headquarterService.update(id, updateHeadquarterDto);
   }

   @Patch(':id/set-main')
   @ApiOperation({ 
      summary: 'Set as main headquarter',
      description: 'Sets the specified headquarter as the main headquarter'
   })
   @ApiParam({ name: 'id', description: 'Headquarter ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Main headquarter set successfully',
      type: HeadquarterResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Headquarter not found',
   })
   async setMainHeadquarter(@Param('id', ParseIntPipe) id: number): Promise<HeadquarterResponseDto> {
      return this.headquarterService.setMainHeadquarter(id);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete headquarter',
      description: 'Deletes a headquarter by ID. Cannot delete main headquarter or headquarters with departments.'
   })
   @ApiParam({ name: 'id', description: 'Headquarter ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Headquarter deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Headquarter not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Cannot delete main headquarter or headquarter with departments',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.headquarterService.remove(id);
   }
}
