import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
   @ApiProperty({
      description: 'Name of the department',
      example: 'Engineering',
      minLength: 2,
      maxLength: 100,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(100)
   departmentName: string;

   @ApiPropertyOptional({
      description: 'ID of the headquarter this department belongs to',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   headquarterId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department type',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   departmentTypeId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department leader (employee)',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   leaderId?: number;
}

export class UpdateDepartmentDto {
   @ApiPropertyOptional({
      description: 'Name of the department',
      example: 'Engineering',
      minLength: 2,
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(100)
   departmentName?: string;

   @ApiPropertyOptional({
      description: 'ID of the headquarter this department belongs to',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   headquarterId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department type',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   departmentTypeId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department leader (employee)',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   leaderId?: number;
}

export class DepartmentResponseDto {
   @ApiProperty({
      description: 'Department ID',
      example: 1,
   })
   departmentId: number;

   @ApiProperty({
      description: 'Name of the department',
      example: 'Engineering',
   })
   departmentName: string;

   @ApiPropertyOptional({
      description: 'ID of the headquarter this department belongs to',
      example: 1,
   })
   headquarterId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department type',
      example: 1,
   })
   departmentTypeId?: number;

   @ApiPropertyOptional({
      description: 'ID of the department leader (employee)',
      example: 1,
   })
   leaderId?: number;
}

export class GetDepartmentsQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Search keyword for department name',
      example: 'Engineering',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'departmentName',
      enum: ['departmentId', 'departmentName', 'headquarterId', 'departmentTypeId'],
   })
   @IsOptional()
   @IsString()
   sortBy?: string;

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'ASC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
