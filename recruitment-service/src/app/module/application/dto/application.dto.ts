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
   IsBoolean
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
   @IsUrl({}, { message: 'Please provide a valid resume URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired (YYYY-MM-DD)',
      example: '2024-02-01',
   })
   @IsOptional()
   @IsDateString()
   expectedStartDate?: string;

   @ApiPropertyOptional({
      description: 'Priority level',
      example: 'medium',
      enum: ['low', 'medium', 'high', 'urgent'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['low', 'medium', 'high', 'urgent'])
   priority?: string;

   @ApiPropertyOptional({
      description: 'Additional notes about the application',
      example: 'Candidate has relevant experience in similar projects',
   })
   @IsOptional()
   @IsString()
   applicationNotes?: string;

   @ApiPropertyOptional({
      description: 'Tags for categorization (JSON array)',
      example: '["urgent", "local-candidate"]',
   })
   @IsOptional()
   @IsString()
   tags?: string;
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
      enum: ['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Good technical background, proceed to interview',
   })
   @IsOptional()
   @IsString()
   reviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Overall application score (1-10)',
      example: 8,
      minimum: 1,
      maximum: 10,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(10)
   @Type(() => Number)
   score?: number;

   @ApiPropertyOptional({
      description: 'Feedback on the application',
      example: 'Strong candidate with relevant experience',
   })
   @IsOptional()
   @IsString()
   feedback?: string;

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
      description: 'Priority level',
      example: 'high',
      enum: ['low', 'medium', 'high', 'urgent'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['low', 'medium', 'high', 'urgent'])
   priority?: string;

   @ApiPropertyOptional({
      description: 'Additional notes about the application',
      example: 'Updated notes after interview',
   })
   @IsOptional()
   @IsString()
   applicationNotes?: string;

   @ApiPropertyOptional({
      description: 'Tags for categorization (JSON array)',
      example: '["interviewed", "recommended"]',
   })
   @IsOptional()
   @IsString()
   tags?: string;

   @ApiPropertyOptional({
      description: 'Reference to employee who reviewed application',
      example: 5,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'Reference to hiring manager',
      example: 3,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Date when application was reviewed (YYYY-MM-DD)',
      example: '2024-01-16',
   })
   @IsOptional()
   @IsDateString()
   reviewedDate?: string;

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
      description: 'Date when application was reviewed',
      example: '2024-01-16T14:20:00Z',
   })
   reviewedDate?: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Good technical background',
   })
   reviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Overall application score (1-10)',
      example: 8,
   })
   score?: number;

   @ApiPropertyOptional({
      description: 'Feedback on the application',
      example: 'Strong candidate with relevant experience',
   })
   feedback?: string;

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

   @ApiPropertyOptional({
      description: 'Additional notes about the application',
      example: 'Candidate has relevant experience',
   })
   applicationNotes?: string;

   @ApiPropertyOptional({
      description: 'Priority level',
      example: 'medium',
   })
   priority?: string;

   @ApiPropertyOptional({
      description: 'Tags for categorization',
      example: '["urgent", "local-candidate"]',
   })
   tags?: string;

   @ApiPropertyOptional({
      description: 'Reference to employee who reviewed application',
      example: 5,
   })
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'Reference to hiring manager',
      example: 3,
   })
   hiringManagerId?: number;

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
      enum: ['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Filter by minimum score',
      example: 7,
      minimum: 1,
      maximum: 10,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(10)
   @Type(() => Number)
   minScore?: number;

   @ApiPropertyOptional({
      description: 'Filter by maximum score',
      example: 10,
      minimum: 1,
      maximum: 10,
   })
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(10)
   @Type(() => Number)
   maxScore?: number;

   @ApiPropertyOptional({
      description: 'Filter by priority level',
      example: 'high',
      enum: ['low', 'medium', 'high', 'urgent'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['low', 'medium', 'high', 'urgent'])
   priority?: string;

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
      description: 'Filter by employee who reviewed application',
      example: 5,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'Filter by hiring manager ID',
      example: 3,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'appliedDate',
      enum: ['applicationId', 'appliedDate', 'score', 'screeningScore', 'status'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['applicationId', 'appliedDate', 'score', 'screeningScore', 'status'])
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
