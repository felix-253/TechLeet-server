import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
   IsString, 
   IsOptional, 
   IsNumber, 
   IsNotEmpty, 
   IsDateString,
   IsInt,
   Min,
   Max,
   IsIn,
   IsUrl
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
   @ApiProperty({
      description: 'ID of the job posting',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   jobPostingId: number;

   @ApiProperty({
      description: 'ID of the candidate',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   candidateId: number;

   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'Dear Hiring Manager, I am excited to apply for the Senior Full Stack Developer position...',
   })
   @IsOptional()
   @IsString()
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file for this specific application',
      example: 'https://storage.example.com/applications/resume-123.pdf',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid URL' })
   resumeUrl?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired (YYYY-MM-DD)',
      example: '2024-03-01',
   })
   @IsOptional()
   @IsDateString()
   expectedStartDate?: string;
}

export class UpdateApplicationDto {
   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'Dear Hiring Manager, I am excited to apply for the Senior Full Stack Developer position...',
   })
   @IsOptional()
   @IsString()
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file for this specific application',
      example: 'https://storage.example.com/applications/resume-123.pdf',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid URL' })
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
      description: 'Date when application was reviewed (YYYY-MM-DD)',
      example: '2024-01-20',
   })
   @IsOptional()
   @IsDateString()
   reviewedDate?: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Strong technical background, good communication skills. Proceed to technical interview.',
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
      example: 'Excellent experience with required technologies. Strong portfolio.',
   })
   @IsOptional()
   @IsString()
   feedback?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was made (YYYY-MM-DD)',
      example: '2024-02-15',
   })
   @IsOptional()
   @IsDateString()
   offerDate?: string;

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
      example: '2024-02-22',
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
      description: 'Date when offer was responded to (YYYY-MM-DD)',
      example: '2024-02-18',
   })
   @IsOptional()
   @IsDateString()
   offerResponseDate?: string;

   @ApiPropertyOptional({
      description: 'Reason for rejection (if applicable)',
      example: 'Candidate did not meet technical requirements for senior level position.',
   })
   @IsOptional()
   @IsString()
   rejectionReason?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired (YYYY-MM-DD)',
      example: '2024-03-01',
   })
   @IsOptional()
   @IsDateString()
   expectedStartDate?: string;

   @ApiPropertyOptional({
      description: 'Additional notes about the application',
      example: 'Candidate showed great enthusiasm during phone screening.',
   })
   @IsOptional()
   @IsString()
   applicationNotes?: string;

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
      description: 'Tags for categorization (comma-separated)',
      example: 'senior-level,react-expert,remote-ok',
   })
   @IsOptional()
   @IsString()
   tags?: string;

   @ApiPropertyOptional({
      description: 'ID of employee who reviewed application (User Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'ID of hiring manager (User Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;
}

export class ApplicationResponseDto {
   @ApiProperty({
      description: 'Application ID',
      example: 1,
   })
   applicationId: number;

   @ApiProperty({
      description: 'Job posting ID',
      example: 1,
   })
   jobPostingId: number;

   @ApiProperty({
      description: 'Candidate ID',
      example: 1,
   })
   candidateId: number;

   @ApiPropertyOptional({
      description: 'Cover letter submitted by candidate',
      example: 'Dear Hiring Manager, I am excited to apply for the Senior Full Stack Developer position...',
   })
   coverLetter?: string;

   @ApiPropertyOptional({
      description: 'URL to resume file for this application',
      example: 'https://storage.example.com/applications/resume-123.pdf',
   })
   resumeUrl?: string;

   @ApiProperty({
      description: 'Application status',
      example: 'submitted',
   })
   status: string;

   @ApiProperty({
      description: 'Date when application was submitted',
      example: '2024-01-15',
   })
   appliedDate: string;

   @ApiPropertyOptional({
      description: 'Date when application was reviewed',
      example: '2024-01-20',
   })
   reviewedDate?: string;

   @ApiPropertyOptional({
      description: 'Notes from reviewer',
      example: 'Strong technical background, good communication skills.',
   })
   reviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Overall application score (1-10)',
      example: 8,
   })
   score?: number;

   @ApiPropertyOptional({
      description: 'Feedback on the application',
      example: 'Excellent experience with required technologies.',
   })
   feedback?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was made',
      example: '2024-02-15',
   })
   offerDate?: string;

   @ApiPropertyOptional({
      description: 'Salary offered (VND)',
      example: 45000000,
   })
   offeredSalary?: number;

   @ApiPropertyOptional({
      description: 'Offer expiration date',
      example: '2024-02-22',
   })
   offerExpiryDate?: string;

   @ApiPropertyOptional({
      description: 'Offer status',
      example: 'pending',
   })
   offerStatus?: string;

   @ApiPropertyOptional({
      description: 'Date when offer was responded to',
      example: '2024-02-18',
   })
   offerResponseDate?: string;

   @ApiPropertyOptional({
      description: 'Reason for rejection (if applicable)',
      example: 'Candidate did not meet technical requirements.',
   })
   rejectionReason?: string;

   @ApiPropertyOptional({
      description: 'Expected start date if hired',
      example: '2024-03-01',
   })
   expectedStartDate?: string;

   @ApiPropertyOptional({
      description: 'Additional notes about the application',
      example: 'Candidate showed great enthusiasm during phone screening.',
   })
   applicationNotes?: string;

   @ApiPropertyOptional({
      description: 'Priority level',
      example: 'high',
   })
   priority?: string;

   @ApiPropertyOptional({
      description: 'Tags for categorization',
      example: 'senior-level,react-expert,remote-ok',
   })
   tags?: string;

   @ApiPropertyOptional({
      description: 'ID of employee who reviewed application',
      example: 1,
   })
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'ID of hiring manager',
      example: 1,
   })
   hiringManagerId?: number;

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
      description: 'Whether offer is currently active',
      example: true,
   })
   isOfferActive?: boolean;

   @ApiPropertyOptional({
      description: 'Days until offer expires',
      example: 4,
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
      example: 'submitted',
      enum: ['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Filter by priority',
      example: 'high',
      enum: ['low', 'medium', 'high', 'urgent'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['low', 'medium', 'high', 'urgent'])
   priority?: string;

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
      description: 'Filter by reviewer ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   reviewedBy?: number;

   @ApiPropertyOptional({
      description: 'Filter by hiring manager ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   hiringManagerId?: number;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'appliedDate',
      enum: ['applicationId', 'appliedDate', 'reviewedDate', 'score', 'status', 'priority'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['applicationId', 'appliedDate', 'reviewedDate', 'score', 'status', 'priority'])
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
