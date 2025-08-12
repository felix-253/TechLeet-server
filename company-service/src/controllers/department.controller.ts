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
import { DepartmentService } from '../services/department.service';
import {
   CreateDepartmentDto,
   UpdateDepartmentDto,
   GetDepartmentsQueryDto,
   DepartmentResponseDto,
} from '../dto/department.dto';

@ApiTags('Departments')
@ApiBearerAuth('token')
@Controller('departments')
export class DepartmentController {
   constructor(private readonly departmentService: DepartmentService) {}

   @Post()
   @ApiOperation({ 
      summary: 'Create a new department',
      description: 'Creates a new department in the company'
   })
   @ApiResponse({
      status: 201,
      description: 'Department created successfully',
      type: DepartmentResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Department name already exists or invalid data',
   })
   async create(@Body() createDepartmentDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
      return this.departmentService.create(createDepartmentDto);
   }

   @Get()
   @ApiOperation({ 
      summary: 'Get all departments',
      description: 'Retrieves a paginated list of departments with optional search and sorting'
   })
   @ApiResponse({
      status: 200,
      description: 'Departments retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            data: {
               type: 'array',
               items: { $ref: '#/components/schemas/DepartmentResponseDto' },
            },
            total: { type: 'number', example: 25 },
         },
      },
   })
   async findAll(@Query() query: GetDepartmentsQueryDto): Promise<{ data: DepartmentResponseDto[]; total: number }> {
      return this.departmentService.findAll(query);
   }

   @Get('by-headquarter/:headquarterId')
   @ApiOperation({ 
      summary: 'Get departments by headquarter',
      description: 'Retrieves all departments belonging to a specific headquarter'
   })
   @ApiParam({ name: 'headquarterId', description: 'Headquarter ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Departments retrieved successfully',
      type: [DepartmentResponseDto],
   })
   async findByHeadquarter(@Param('headquarterId', ParseIntPipe) headquarterId: number): Promise<DepartmentResponseDto[]> {
      return this.departmentService.findByHeadquarter(headquarterId);
   }

   @Get('by-type/:departmentTypeId')
   @ApiOperation({ 
      summary: 'Get departments by type',
      description: 'Retrieves all departments of a specific type'
   })
   @ApiParam({ name: 'departmentTypeId', description: 'Department Type ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Departments retrieved successfully',
      type: [DepartmentResponseDto],
   })
   async findByType(@Param('departmentTypeId', ParseIntPipe) departmentTypeId: number): Promise<DepartmentResponseDto[]> {
      return this.departmentService.findByType(departmentTypeId);
   }

   @Get(':id')
   @ApiOperation({ 
      summary: 'Get department by ID',
      description: 'Retrieves a specific department by its ID'
   })
   @ApiParam({ name: 'id', description: 'Department ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Department retrieved successfully',
      type: DepartmentResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Department not found',
   })
   async findOne(@Param('id', ParseIntPipe) id: number): Promise<DepartmentResponseDto> {
      return this.departmentService.findOne(id);
   }

   @Patch(':id')
   @ApiOperation({ 
      summary: 'Update department',
      description: 'Updates an existing department'
   })
   @ApiParam({ name: 'id', description: 'Department ID', type: 'number' })
   @ApiResponse({
      status: 200,
      description: 'Department updated successfully',
      type: DepartmentResponseDto,
   })
   @ApiResponse({
      status: 404,
      description: 'Department not found',
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Department name already exists or invalid data',
   })
   async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateDepartmentDto: UpdateDepartmentDto,
   ): Promise<DepartmentResponseDto> {
      return this.departmentService.update(id, updateDepartmentDto);
   }

   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ 
      summary: 'Delete department',
      description: 'Deletes a department by ID'
   })
   @ApiParam({ name: 'id', description: 'Department ID', type: 'number' })
   @ApiResponse({
      status: 204,
      description: 'Department deleted successfully',
   })
   @ApiResponse({
      status: 404,
      description: 'Department not found',
   })
   async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
      return this.departmentService.remove(id);
   }
}
