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
   IsUrl,
   IsDecimal,
   IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
   @ApiProperty({
      description: 'Reference to job posting',
      example: 1,
   })
   @IsInt()
   @IsNotEmpty()
   jobPostingId: number;

   @ApiProperty({
      description: 'Reference to candidate',
      example: 1,
   })
   @IsInt()
   @IsNotEmpty()
   candidateId: number;

   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'I am very interested in this position...',
   })
   @IsOptional()
   @IsString()
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file for this specific application',
      example: 'https://storage.example.com/resumes/application-123.pdf',
   })
   @IsOptional()
   // @IsUrl({}, { message: 'Please provide a valid resume URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsOptional()
   @IsDateString()
   expectedStartDate?: string;

}

export class UpdateApplicationDto {
   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'Updated cover letter...',
   })
   @IsOptional()
   @IsString()
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file for this specific application',
      example: 'https://storage.example.com/resumes/application-123-updated.pdf',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid resume URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'Application status',
      example: 'screening',
      enum: [
         'submitted',
         'screening',
         'interviewing',
         'offer',
         'hired',
         'rejected',
         'withdrawn',
         'passed_exam',
         'failed_exam',
      ],
   })
   @IsOptional()
   @IsString()
   @IsIn([
      'submitted',
      'screening',
      'interviewing',
      'offer',
      'hired',
      'rejected',
      'withdrawn',
      'passed_exam',
      'failed_exam',
   ])
   status?: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Good technical background, proceed to interview',
   })
   @IsOptional()
   @IsString()
   reviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Salary offered (VND)',
      example: 45000000,
      minimum: 0,
   })
   @IsOptional()
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(0)
   @Type(() => Number)
   offeredSalary?: number;

   @ApiPropertyOptional({
      description: 'Offer expiration date (YYYY-MM-DD)',
      example: '2024-02-15',
   })
   @IsOptional()
   @IsDateString()
   offerExpiryDate?: string;

   @ApiPropertyOptional({
      description: 'Offer status',
      example: 'pending',
      enum: ['pending', 'accepted', 'rejected', 'expired'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['pending', 'accepted', 'rejected', 'expired'])
   offerStatus?: string;

   @ApiPropertyOptional({
      description: 'Reason for rejection (if applicable)',
      example: 'Not a good cultural fit',
   })
   @IsOptional()
   @IsString()
   rejectionReason?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsOptional()
   @IsDateString()
   expectedStartDate?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was made (YYYY-MM-DD)',
      example: '2024-01-20',
   })
   @IsOptional()
   @IsDateString()
   offerDate?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was responded to (YYYY-MM-DD)',
      example: '2024-01-22',
   })
   @IsOptional()
   @IsDateString()
   offerResponseDate?: string;
}

export class ApplicationResponseDto {
   @ApiProperty({
      description: 'Application ID',
      example: 1,
   })
   applicationId: number;

   @ApiProperty({
      description: 'Reference to job posting',
      example: 1,
   })
   jobPostingId: number;

   @ApiProperty({
      description: 'Reference to candidate',
      example: 1,
   })
   candidateId: number;

   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'I am very interested in this position...',
   })
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file',
      example: 'https://storage.example.com/resumes/application-123.pdf',
   })
   resumeUrl?: string;

   @ApiProperty({
      description: 'Application status',
      example: 'submitted',
   })
   status: string;

   @ApiProperty({
      description: 'Date when application was submitted',
      example: '2024-01-15T10:30:00Z',
   })
   appliedDate: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Good technical background',
   })
   reviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was made',
      example: '2024-01-20',
   })
   offerDate?: string;

   @ApiPropertyOptional({
      description: 'Salary offered (VND)',
      example: 45000000,
   })
   offeredSalary?: number;

   @ApiPropertyOptional({
      description: 'Offer expiration date',
      example: '2024-02-15',
   })
   offerExpiryDate?: string;

   @ApiPropertyOptional({
      description: 'Offer status',
      example: 'pending',
   })
   offerStatus?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was responded to',
      example: '2024-01-22',
   })
   offerResponseDate?: string;

   @ApiPropertyOptional({
      description: 'Reason for rejection (if applicable)',
      example: 'Salary expectations too high',
   })
   rejectionReason?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired',
      example: '2024-02-01',
   })
   expectedStartDate?: string;

   // CV Screening fields
   @ApiPropertyOptional({
      description: 'Whether CV screening has been completed',
      example: true,
   })
   isScreeningCompleted?: boolean;

   @ApiPropertyOptional({
      description: 'Overall CV screening score (0-100)',
      example: 85.75,
   })
   screeningScore?: number;

   @ApiPropertyOptional({
      description: 'CV screening status',
      example: 'completed',
   })
   screeningStatus?: string;

   @ApiPropertyOptional({
      description: 'When CV screening was completed',
      example: '2024-01-15T12:30:00Z',
   })
   screeningCompletedAt?: string;

   // Computed properties
   @ApiPropertyOptional({
      description: 'Days since application was submitted',
      example: 5,
   })
   daysSinceApplied?: number;

   @ApiPropertyOptional({
      description: 'Formatted offered salary',
      example: '45,000,000 VND',
   })
   formattedOfferedSalary?: string;

   @ApiPropertyOptional({
      description: 'Whether offer is still active',
      example: true,
   })
   isOfferActive?: boolean;

   @ApiPropertyOptional({
      description: 'Days until offer expires',
      example: 10,
   })
   daysUntilOfferExpiry?: number;

   @ApiPropertyOptional({
      description: 'Status color for UI',
      example: 'blue',
   })
   statusColor?: string;

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

export class GetApplicationsQueryDto {
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
      description: 'Filter by job posting ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   jobPostingId?: number;

   @ApiPropertyOptional({
      description: 'Filter by candidate ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   candidateId?: number;

   @ApiPropertyOptional({
      description: 'Filter by status',
      example: 'screening',
      enum: [
         'submitted',
         'screening',
         'interviewing',
         'offer',
         'hired',
         'rejected',
         'withdrawn',
         'passed_exam',
         'failed_exam',
      ],
   })
   @IsOptional()
   @IsString()
   @IsIn([
      'submitted',
      'screening',
      'interviewing',
      'offer',
      'hired',
      'rejected',
      'withdrawn',
      'passed_exam',
      'failed_exam',
   ])
   status?: string;


   @ApiPropertyOptional({
      description: 'Filter by date range start (YYYY-MM-DD)',
      example: '2024-01-01',
   })
   @IsOptional()
   @IsDateString()
   dateFrom?: string;

   @ApiPropertyOptional({
      description: 'Filter by date range end (YYYY-MM-DD)',
      example: '2024-01-31',
   })
   @IsOptional()
   @IsDateString()
   dateTo?: string;

   @ApiPropertyOptional({
      description: 'Search keyword for candidate name or job title',
      example: 'developer',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Filter by CV screening completion',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   isScreeningCompleted?: boolean;

   @ApiPropertyOptional({
      description: 'Filter by minimum screening score',
      example: 70,
      minimum: 0,
      maximum: 100,
   })
   @IsOptional()
   @IsNumber()
   @Min(0)
   @Max(100)
   @Type(() => Number)
   minScreeningScore?: number;

   @ApiPropertyOptional({
      description: 'Filter by offer status',
      example: 'pending',
      enum: ['pending', 'accepted', 'rejected', 'expired'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['pending', 'accepted', 'rejected', 'expired'])
   offerStatus?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'appliedDate',
      enum: ['applicationId', 'appliedDate', 'screeningScore', 'status'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['applicationId', 'appliedDate', 'screeningScore', 'status'])
   sortBy?: string = 'appliedDate';

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

export class ApproveAfterInterviewDto {
   @ApiProperty({
      description: 'Salary offered (VND)',
      example: 45000000,
      minimum: 1,
   })
   @IsNumber({ maxDecimalPlaces: 2 })
   @Min(1)
   @Type(() => Number)
   offeredSalary: number;

   @ApiProperty({
      description: 'Expected start date (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsDateString()
   expectedStartDate: string;

   @ApiPropertyOptional({
      description: 'Offer expiration date (YYYY-MM-DD)',
      example: '2024-02-15',
   })
   @IsOptional()
   @IsDateString()
   offerExpiryDate?: string;
}

export class RejectAfterInterviewDto {
   @ApiPropertyOptional({
      description: 'Reason for rejection',
      example: 'Not a good cultural fit after interview',
   })
   @IsOptional()
   @IsString()
   rejectionReason?: string;
}
