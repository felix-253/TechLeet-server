import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
   IsString,
   IsOptional,
   IsNumber,
   IsNotEmpty,
   MinLength,
   MaxLength,
   IsDateString,
   IsInt,
   Min,
   Max,
   IsIn,
   IsArray,
   IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateJobPostingDto {
   @ApiProperty({
      description: 'Job posting title',
      example: 'Senior Full Stack Developer',
      minLength: 5,
      maxLength: 200,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(5)
   @MaxLength(200)
   title: string;

   @ApiProperty({
      description: 'Detailed job description',
      example: 'We are looking for a Senior Full Stack Developer to join our engineering team...',
   })
   @IsString()
   @IsNotEmpty()
   description: string;

   @ApiProperty({
      description: 'Job requirements and qualifications',
      example: 'Bachelor degree in Computer Science, 5+ years experience with React/Node.js...',
   })
   @IsString()
   @IsNotEmpty()
   requirements: string;

   @ApiPropertyOptional({
      description: 'Benefits and perks offered',
      example: 'Health insurance, flexible working hours, annual bonus, training budget...',
   })
   @IsOptional()
   @IsString()
   benefits?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary offered (VND)',
      example: 30000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   salaryMin?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary offered (VND)',
      example: 50000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   salaryMax?: number;

   @ApiProperty({
      description: 'Number of open positions',
      example: 2,
      minimum: 1,
      default: 1,
   })
   @IsInt()
   @Min(1)
   @Type(() => Number)
   vacancies: number = 1;

   @ApiProperty({
      description: 'Application deadline (YYYY-MM-DD)',
      example: '2024-12-31',
   })
   @IsDateString()
   applicationDeadline: string;

   @ApiPropertyOptional({
      description: 'Work location or remote',
      example: 'Ho Chi Minh City',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   location?: string;

   @ApiPropertyOptional({
      description: 'Employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract', 'internship'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract', 'internship'])
   employmentType?: string;

   @ApiPropertyOptional({
      description: 'Experience level required',
      example: 'senior',
      enum: ['entry', 'junior', 'senior', 'lead', 'manager'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['entry', 'junior', 'senior', 'lead', 'manager'])
   experienceLevel?: string;

   @ApiProperty({
      description: 'ID of the department (Company Service)',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   departmentId: number;

   @ApiProperty({
      description: 'ID of the position (Company Service)',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   positionId: number;

   @ApiPropertyOptional({
      description: 'ID of the hiring manager (User Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Whether this job posting requires a test',
      example: false,
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   isTest?: boolean;

   @ApiPropertyOptional({
      description: 'ID of the question set used for this job',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   questionSetId?: number;

   @ApiPropertyOptional({
      description: 'Number of questions for this job',
      example: 10,
      minimum: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   quantityQuestion?: number;

   @ApiPropertyOptional({})
   @IsOptional()
   @IsInt()
   @Min(0)
   @Max(10)
   @Type(() => Number)
   minScore?: number;
}

export class UpdateJobPostingDto {
   @ApiPropertyOptional({
      description: 'Job posting title',
      example: 'Senior Full Stack Developer',
      minLength: 5,
      maxLength: 200,
   })
   @IsOptional()
   @IsString()
   @MinLength(5)
   @MaxLength(200)
   title?: string;

   @ApiPropertyOptional({
      description: 'Detailed job description',
      example: 'We are looking for a Senior Full Stack Developer to join our engineering team...',
   })
   @IsOptional()
   @IsString()
   description?: string;

   @ApiPropertyOptional({
      description: 'Job requirements and qualifications',
      example: 'Bachelor degree in Computer Science, 5+ years experience with React/Node.js...',
   })
   @IsOptional()
   @IsString()
   requirements?: string;

   @ApiPropertyOptional({
      description: 'Benefits and perks offered',
      example: 'Health insurance, flexible working hours, annual bonus, training budget...',
   })
   @IsOptional()
   @IsString()
   benefits?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary offered (VND)',
      example: 30000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   salaryMin?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary offered (VND)',
      example: 50000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   salaryMax?: number;

   @ApiPropertyOptional({
      description: 'Number of open positions',
      example: 2,
      minimum: 1,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Type(() => Number)
   vacancies?: number;

   @ApiPropertyOptional({
      description: 'Application deadline (YYYY-MM-DD)',
      example: '2024-12-31',
   })
   @IsOptional()
   @IsDateString()
   applicationDeadline?: string;

   @ApiPropertyOptional({
      description: 'Job posting status',
      example: 'published',
      enum: ['draft', 'published', 'closed', 'cancelled'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['draft', 'published', 'closed', 'cancelled'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Work location or remote',
      example: 'Ho Chi Minh City',
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MaxLength(100)
   location?: string;

   @ApiPropertyOptional({
      description: 'Employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract', 'internship'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract', 'internship'])
   employmentType?: string;

   @ApiPropertyOptional({
      description: 'Experience level required',
      example: 'senior',
      enum: ['entry', 'junior', 'senior', 'lead', 'manager'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['entry', 'junior', 'senior', 'lead', 'manager'])
   experienceLevel?: string;

   @ApiPropertyOptional({
      description: 'ID of the department (Company Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   departmentId?: number;

   @ApiPropertyOptional({
      description: 'ID of the position (Company Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   positionId?: number;

   @ApiPropertyOptional({
      description: 'ID of the hiring manager (User Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Whether this job posting requires a test',
      example: false,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   isTest?: boolean;

   @ApiPropertyOptional({
      description: 'ID of the question set used for this job',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   questionSetId?: number;

   @ApiPropertyOptional({
      description: 'Number of questions for this job',
      example: 10,
      minimum: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   quantityQuestion?: number;

   @ApiPropertyOptional({
      description: 'Minimum score required for this job',
      example: 70,
      minimum: 0,
      maximum: 100,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Max(100)
   @Type(() => Number)
   minScore?: number;
}

export class JobPostingResponseDto {
   @ApiProperty({
      description: 'Job posting ID',
      example: 1,
   })
   jobPostingId: number;

   @ApiProperty({
      description: 'Job posting title',
      example: 'Senior Full Stack Developer',
   })
   title: string;

   @ApiProperty({
      description: 'Detailed job description',
      example: 'We are looking for a Senior Full Stack Developer to join our engineering team...',
   })
   description: string;

   @ApiProperty({
      description: 'Job requirements and qualifications',
      example: 'Bachelor degree in Computer Science, 5+ years experience with React/Node.js...',
   })
   requirements: string;

   @ApiPropertyOptional({
      description: 'Benefits and perks offered',
      example: 'Health insurance, flexible working hours, annual bonus, training budget...',
   })
   benefits?: string;

   @ApiPropertyOptional({
      description: 'Minimum salary offered (VND)',
      example: 30000000,
   })
   salaryMin?: number;

   @ApiPropertyOptional({
      description: 'Maximum salary offered (VND)',
      example: 50000000,
   })
   salaryMax?: number;

   @ApiProperty({
      description: 'Number of open positions',
      example: 2,
   })
   vacancies: number;

   @ApiProperty({
      description: 'Application deadline',
      example: '2024-12-31',
   })
   applicationDeadline: string;

   @ApiProperty({
      description: 'Job posting status',
      example: 'published',
   })
   status: string;

   @ApiPropertyOptional({
      description: 'Work location or remote',
      example: 'Ho Chi Minh City',
   })
   location?: string;

   @ApiPropertyOptional({
      description: 'Employment type',
      example: 'full-time',
   })
   employmentType?: string;

   @ApiPropertyOptional({
      description: 'Experience level required',
      example: 'senior',
   })
   experienceLevel?: string;

   @ApiProperty({
      description: 'Department ID',
      example: 1,
   })
   departmentId: number;

   @ApiProperty({
      description: 'Position ID',
      example: 1,
   })
   positionId: number;

   @ApiPropertyOptional({
      description: 'Hiring manager ID',
      example: 1,
   })
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Whether this job posting requires a test',
      example: false,
   })
   isTest?: boolean;

   @ApiPropertyOptional({
      description: 'ID of the question set used for this job',
      example: 1,
   })
   questionSetId?: number;

   @ApiPropertyOptional({
      description: 'Number of questions for this job',
      example: 10,
   })
   quantityQuestion?: number;

   @ApiPropertyOptional({
      description: 'Minimum score required for this job',
      example: 7,
   })
   minScore?: number;

   @ApiPropertyOptional({
      description: 'Formatted salary range',
      example: '30,000,000 - 50,000,000 VND',
   })
   salaryRange?: string;

   @ApiPropertyOptional({
      description: 'Whether job is currently active',
      example: true,
   })
   isJobActive?: boolean;

   @ApiPropertyOptional({
      description: 'Days until application deadline',
      example: 15,
   })
   daysUntilDeadline?: number;

   @ApiPropertyOptional({
      description: 'Number of applications received',
      example: 25,
   })
   applicationCount?: number;

   @ApiProperty({
      description: 'Creation timestamp',
      example: '2024-01-15T10:30:00Z',
   })
   createdAt: string;

   @ApiProperty({
      description: 'Last update timestamp',
      example: '2024-01-20T14:45:00Z',
   })
   updatedAt: string;
}

export class GetJobPostingsQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @IsInt()
   @Min(0)
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(100)
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Search keyword for title or description',
      example: 'developer',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Filter by status',
      example: 'published',
      enum: ['draft', 'published', 'closed', 'cancelled'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['draft', 'published', 'closed', 'cancelled'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Filter by department ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   departmentId?: number;

   @ApiPropertyOptional({
      description: 'Filter by position ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   positionId?: number;

   @ApiPropertyOptional({
      description: 'Filter by employment type',
      example: 'full-time',
      enum: ['full-time', 'part-time', 'contract', 'internship'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['full-time', 'part-time', 'contract', 'internship'])
   employmentType?: string;

   @ApiPropertyOptional({
      description: 'Filter by experience level',
      example: 'senior',
      enum: ['entry', 'junior', 'senior', 'lead', 'manager'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['entry', 'junior', 'senior', 'lead', 'manager'])
   experienceLevel?: string;

   @ApiPropertyOptional({
      description: 'Filter by location',
      example: 'Ho Chi Minh City',
   })
   @IsOptional()
   @IsString()
   location?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'createdAt',
      enum: ['jobPostingId', 'title', 'createdAt', 'applicationDeadline', 'status', 'vacancies'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['jobPostingId', 'title', 'createdAt', 'applicationDeadline', 'status', 'vacancies'])
   sortBy?: string = 'createdAt';

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'DESC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['ASC', 'DESC'])
   sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
