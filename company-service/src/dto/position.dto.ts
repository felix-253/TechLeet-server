import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty, MinLength, MaxLength, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePositionDto {
   @ApiProperty({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
      minLength: 2,
      maxLength: 100,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(100)
   positionName: string;

   @ApiPropertyOptional({
      description: 'Detailed description of position responsibilities',
      example: 'Responsible for developing and maintaining web applications, mentoring junior developers, and participating in architectural decisions.',
   })
   @IsOptional()
   @IsString()
   description?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary for this position (VND)',
      example: 25000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0, { message: 'Minimum salary must be a positive number' })
   @Type(() => Number)
   minSalary?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary for this position (VND)',
      example: 45000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0, { message: 'Maximum salary must be a positive number' })
   @Type(() => Number)
   maxSalary?: number;

   @ApiPropertyOptional({
      description: 'Position level (1=Entry, 2=Junior, 3=Senior, 4=Lead, 5=Manager)',
      example: 3,
      minimum: 1,
      maximum: 5,
      default: 1,
   })
   @IsOptional()
   @IsInt()
   @Min(1, { message: 'Position level must be between 1 and 5' })
   @Max(5, { message: 'Position level must be between 1 and 5' })
   @Type(() => Number)
   level?: number = 1;

   @ApiPropertyOptional({
      description: 'Position code for internal reference',
      example: 'SSE-001',
      maxLength: 20,
   })
   @IsOptional()
   @IsString()
   @MaxLength(20)
   positionCode?: string;

   @ApiPropertyOptional({
      description: 'Required skills and qualifications',
      example: 'Bachelor degree in Computer Science, 3+ years experience with React/Node.js, strong problem-solving skills',
   })
   @IsOptional()
   @IsString()
   requirements?: string;

   @ApiPropertyOptional({
      description: 'ID of the position type',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   positionTypeId?: number;
}

export class UpdatePositionDto {
   @ApiPropertyOptional({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
      minLength: 2,
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(100)
   positionName?: string;

   @ApiPropertyOptional({
      description: 'Detailed description of position responsibilities',
      example: 'Responsible for developing and maintaining web applications, mentoring junior developers, and participating in architectural decisions.',
   })
   @IsOptional()
   @IsString()
   description?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary for this position (VND)',
      example: 25000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0, { message: 'Minimum salary must be a positive number' })
   @Type(() => Number)
   minSalary?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary for this position (VND)',
      example: 45000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0, { message: 'Maximum salary must be a positive number' })
   @Type(() => Number)
   maxSalary?: number;

   @ApiPropertyOptional({
      description: 'Position level (1=Entry, 2=Junior, 3=Senior, 4=Lead, 5=Manager)',
      example: 3,
      minimum: 1,
      maximum: 5,
   })
   @IsOptional()
   @IsInt()
   @Min(1, { message: 'Position level must be between 1 and 5' })
   @Max(5, { message: 'Position level must be between 1 and 5' })
   @Type(() => Number)
   level?: number;

   @ApiPropertyOptional({
      description: 'Position code for internal reference',
      example: 'SSE-001',
      maxLength: 20,
   })
   @IsOptional()
   @IsString()
   @MaxLength(20)
   positionCode?: string;

   @ApiPropertyOptional({
      description: 'Required skills and qualifications',
      example: 'Bachelor degree in Computer Science, 3+ years experience with React/Node.js, strong problem-solving skills',
   })
   @IsOptional()
   @IsString()
   requirements?: string;

   @ApiPropertyOptional({
      description: 'ID of the position type',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   positionTypeId?: number;
}

export class PositionResponseDto {
   @ApiProperty({
      description: 'Position ID',
      example: 1,
   })
   positionId: number;

   @ApiProperty({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
   })
   positionName: string;

   @ApiPropertyOptional({
      description: 'Detailed description of position responsibilities',
      example: 'Responsible for developing and maintaining web applications, mentoring junior developers, and participating in architectural decisions.',
   })
   description?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary for this position (VND)',
      example: 25000000,
   })
   minSalary?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary for this position (VND)',
      example: 45000000,
   })
   maxSalary?: number;

   @ApiPropertyOptional({
      description: 'Position level (1=Entry, 2=Junior, 3=Senior, 4=Lead, 5=Manager)',
      example: 3,
   })
   level?: number;

   @ApiPropertyOptional({
      description: 'Position code for internal reference',
      example: 'SSE-001',
   })
   positionCode?: string;

   @ApiPropertyOptional({
      description: 'Required skills and qualifications',
      example: 'Bachelor degree in Computer Science, 3+ years experience with React/Node.js, strong problem-solving skills',
   })
   requirements?: string;

   @ApiPropertyOptional({
      description: 'ID of the position type',
      example: 1,
   })
   positionTypeId?: number;

   @ApiPropertyOptional({
      description: 'Position type name',
      example: 'Technical',
   })
   positionTypeName?: string;

   @ApiPropertyOptional({
      description: 'Salary range display',
      example: '25,000,000 - 45,000,000 VND',
   })
   salaryRange?: string;

   @ApiPropertyOptional({
      description: 'Position level display',
      example: 'Senior Level',
   })
   levelDisplay?: string;
}

export class GetPositionsQueryDto {
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
      description: 'Search keyword for position name',
      example: 'Engineer',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Filter by position type ID',
      example: 1,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   positionTypeId?: number;

   @ApiPropertyOptional({
      description: 'Filter by minimum level',
      example: 2,
      minimum: 1,
      maximum: 5,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(5)
   @Type(() => Number)
   minLevel?: number;

   @ApiPropertyOptional({
      description: 'Filter by maximum level',
      example: 4,
      minimum: 1,
      maximum: 5,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(5)
   @Type(() => Number)
   maxLevel?: number;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'positionName',
      enum: ['positionId', 'positionName', 'level', 'minSalary', 'maxSalary', 'positionTypeId'],
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
