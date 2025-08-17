import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ScreeningStatus } from '../../../entities/recruitment/cv-screening-result.entity';

export class TriggerScreeningDto {
   @ApiProperty({
      description: 'Application ID to screen',
      example: 123
   })
   @IsNumber()
   @Type(() => Number)
   applicationId: number;

   @ApiPropertyOptional({
      description: 'Custom resume file path (optional)',
      example: '/uploads/resumes/resume-123.pdf'
   })
   @IsOptional()
   @IsString()
   resumePath?: string;

   @ApiPropertyOptional({
      description: 'Priority level for processing (higher = more priority)',
      example: 5,
      default: 0
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   priority?: number;
}

export class ScreeningResultDto {
   @ApiProperty({
      description: 'Screening result ID',
      example: 1
   })
   screeningId: number;

   @ApiProperty({
      description: 'Application ID',
      example: 123
   })
   applicationId: number;

   @ApiProperty({
      description: 'Job posting ID',
      example: 456
   })
   jobPostingId: number;

   @ApiProperty({
      description: 'Current screening status',
      enum: ScreeningStatus,
      example: ScreeningStatus.COMPLETED
   })
   status: ScreeningStatus;

   @ApiPropertyOptional({
      description: 'Overall similarity score (0-100)',
      example: 85.75
   })
   overallScore?: number;

   @ApiPropertyOptional({
      description: 'Skills match score (0-100)',
      example: 92.50
   })
   skillsScore?: number;

   @ApiPropertyOptional({
      description: 'Experience match score (0-100)',
      example: 78.25
   })
   experienceScore?: number;

   @ApiPropertyOptional({
      description: 'Education match score (0-100)',
      example: 88.00
   })
   educationScore?: number;

   @ApiPropertyOptional({
      description: 'AI-generated summary of the CV',
      example: 'Experienced software engineer with 5+ years in full-stack development...'
   })
   aiSummary?: string;

   @ApiPropertyOptional({
      description: 'Key highlights identified by AI',
      example: [
         'Strong technical skills in modern web technologies',
         'Leadership experience managing development teams'
      ]
   })
   keyHighlights?: string[];

   @ApiPropertyOptional({
      description: 'Potential concerns or gaps identified',
      example: [
         'Limited experience with cloud platforms'
      ]
   })
   concerns?: string[];

   @ApiPropertyOptional({
      description: 'Processing time in milliseconds',
      example: 15000
   })
   processingTimeMs?: number;

   @ApiPropertyOptional({
      description: 'Error message if screening failed',
      example: 'Failed to extract text from PDF'
   })
   errorMessage?: string;

   @ApiProperty({
      description: 'When the screening was created',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @ApiProperty({
      description: 'When the screening was last updated',
      example: '2024-01-15T10:35:00Z'
   })
   updatedAt: Date;

   @ApiPropertyOptional({
      description: 'When the screening was completed',
      example: '2024-01-15T10:35:00Z'
   })
   completedAt?: Date;
}

export class GetScreeningResultsQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of results per page',
      example: 10,
      default: 10
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Filter by screening status',
      enum: ScreeningStatus,
      example: ScreeningStatus.COMPLETED
   })
   @IsOptional()
   @IsEnum(ScreeningStatus)
   status?: ScreeningStatus;

   @ApiPropertyOptional({
      description: 'Filter by job posting ID',
      example: 456
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   jobPostingId?: number;

   @ApiPropertyOptional({
      description: 'Minimum overall score filter',
      example: 70
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   minScore?: number;

   @ApiPropertyOptional({
      description: 'Maximum overall score filter',
      example: 100
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   maxScore?: number;

   @ApiPropertyOptional({
      description: 'Sort by field',
      example: 'overallScore',
      default: 'createdAt'
   })
   @IsOptional()
   @IsString()
   sortBy?: string = 'createdAt';

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'DESC',
      default: 'DESC'
   })
   @IsOptional()
   @IsString()
   sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ScreeningStatsDto {
   @ApiProperty({
      description: 'Total number of screenings',
      example: 150
   })
   total: number;

   @ApiProperty({
      description: 'Number of completed screenings',
      example: 120
   })
   completed: number;

   @ApiProperty({
      description: 'Number of pending screenings',
      example: 20
   })
   pending: number;

   @ApiProperty({
      description: 'Number of processing screenings',
      example: 5
   })
   processing: number;

   @ApiProperty({
      description: 'Number of failed screenings',
      example: 5
   })
   failed: number;

   @ApiProperty({
      description: 'Average overall score',
      example: 75.5
   })
   averageScore: number;

   @ApiProperty({
      description: 'Average processing time in milliseconds',
      example: 12500
   })
   averageProcessingTime: number;
}

export class BulkScreeningDto {
   @ApiProperty({
      description: 'Array of application IDs to screen',
      example: [123, 124, 125]
   })
   @IsArray()
   @IsNumber({}, { each: true })
   @Type(() => Number)
   applicationIds: number[];

   @ApiPropertyOptional({
      description: 'Priority level for all jobs',
      example: 5,
      default: 0
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   priority?: number;
}

export class RetryScreeningDto {
   @ApiProperty({
      description: 'Screening ID to retry',
      example: 1
   })
   @IsNumber()
   @Type(() => Number)
   screeningId: number;

   @ApiPropertyOptional({
      description: 'Whether to force retry even if not failed',
      example: false,
      default: false
   })
   @IsOptional()
   @IsBoolean()
   force?: boolean;
}
