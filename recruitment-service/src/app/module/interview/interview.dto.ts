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
   IsUrl,
   IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInterviewDto {
   @ApiProperty({
      description: 'ID of the application',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   applicationId: number;

   @ApiProperty({
      description: 'Type of interview',
      example: 'technical',
      enum: ['phone', 'video', 'onsite', 'technical', 'hr', 'final'],
   })
   @IsString()
   @IsNotEmpty()
   @IsIn(['phone', 'video', 'onsite', 'technical', 'hr', 'final'])
   interviewType: string;

   @ApiProperty({
      description: 'Scheduled date and time for interview (ISO 8601)',
      example: '2024-01-25T14:00:00Z',
   })
   @IsDateString()
   scheduledDate: string;

   @ApiProperty({
      description: 'Interview duration in minutes',
      example: 60,
      minimum: 15,
      maximum: 480,
      default: 60,
   })
   @IsInt()
   @Min(15)
   @Max(480)
   @Type(() => Number)
   durationMinutes: number = 60;

   @ApiPropertyOptional({
      description: 'Interview location or address',
      example: 'Meeting Room A, 5th Floor, TechLeet Office',
      maxLength: 200,
   })
   @IsOptional()
   @IsString()
   location?: string;

   @ApiPropertyOptional({
      description: 'Video meeting link (Zoom, Teams, etc.)',
      example: 'https://zoom.us/j/123456789',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid meeting link' })
   meetingLink?: string;

   @ApiPropertyOptional({
      description: 'Interview agenda or topics to cover',
      example: 'Technical assessment, system design discussion, Q&A session',
   })
   @IsOptional()
   @IsString()
   agenda?: string;

   @ApiProperty({
      description: 'ID of interviewer employee (User Service)',
      example: 1,
   })
   @IsInt()
   @Type(() => Number)
   interviewerId: number;

   @ApiPropertyOptional({
      description: 'ID of secondary interviewer (User Service)',
      example: 2,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   secondaryInterviewerId?: number;
}

export class UpdateInterviewDto {
   @ApiPropertyOptional({
      description: 'Type of interview',
      example: 'technical',
      enum: ['phone', 'video', 'onsite', 'technical', 'hr', 'final'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['phone', 'video', 'onsite', 'technical', 'hr', 'final'])
   interviewType?: string;

   @ApiPropertyOptional({
      description: 'Scheduled date and time for interview (ISO 8601)',
      example: '2024-01-25T14:00:00Z',
   })
   @IsOptional()
   @IsDateString()
   scheduledDate?: string;

   @ApiPropertyOptional({
      description: 'Interview duration in minutes',
      example: 60,
      minimum: 15,
      maximum: 480,
   })
   @IsOptional()
   @IsInt()
   @Min(15)
   @Max(480)
   @Type(() => Number)
   durationMinutes?: number;

   @ApiPropertyOptional({
      description: 'Interview location or address',
      example: 'Meeting Room A, 5th Floor, TechLeet Office',
      maxLength: 200,
   })
   @IsOptional()
   @IsString()
   location?: string;

   @ApiPropertyOptional({
      description: 'Video meeting link (Zoom, Teams, etc.)',
      example: 'https://zoom.us/j/123456789',
   })
   @IsOptional()
   @IsUrl({}, { message: 'Please provide a valid meeting link' })
   meetingLink?: string;

   @ApiPropertyOptional({
      description: 'Interview status',
      example: 'confirmed',
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Interview agenda or topics to cover',
      example: 'Technical assessment, system design discussion, Q&A session',
   })
   @IsOptional()
   @IsString()
   agenda?: string;

   @ApiPropertyOptional({
      description: 'Notes taken during the interview',
      example: 'Candidate demonstrated strong problem-solving skills...',
   })
   @IsOptional()
   @IsString()
   interviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Overall interview score (1-10)',
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
      description: 'Detailed feedback from interviewer',
      example: 'Strong technical skills, good communication, fits team culture well.',
   })
   @IsOptional()
   @IsString()
   feedback?: string;

   @ApiPropertyOptional({
      description: 'Interview result',
      example: 'pass',
      enum: ['pass', 'fail', 'pending', 'strong-pass', 'weak-pass'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['pass', 'fail', 'pending', 'strong-pass', 'weak-pass'])
   result?: string;

   @ApiPropertyOptional({
      description: 'Strengths observed during interview',
      example: 'Excellent problem-solving approach, clear communication',
   })
   @IsOptional()
   @IsString()
   strengths?: string;

   @ApiPropertyOptional({
      description: 'Areas for improvement or concerns',
      example: 'Could improve knowledge of advanced algorithms',
   })
   @IsOptional()
   @IsString()
   weaknesses?: string;

   @ApiPropertyOptional({
      description: 'Technical skills assessment',
      example: 'Strong in React and Node.js, good understanding of system design',
   })
   @IsOptional()
   @IsString()
   technicalAssessment?: string;

   @ApiPropertyOptional({
      description: 'Communication skills assessment',
      example: 'Clear and articulate, asks good questions',
   })
   @IsOptional()
   @IsString()
   communicationAssessment?: string;

   @ApiPropertyOptional({
      description: 'Cultural fit assessment',
      example: 'Good team player, aligns with company values',
   })
   @IsOptional()
   @IsString()
   culturalFitAssessment?: string;

   @ApiPropertyOptional({
      description: 'Whether interviewer recommends candidate for next round',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   recommendForNextRound?: boolean;

   @ApiPropertyOptional({
      description: 'Questions asked during the interview',
      example: 'How would you design a scalable web application?',
   })
   @IsOptional()
   @IsString()
   questionsAsked?: string;

   @ApiPropertyOptional({
      description: 'Candidate questions and concerns',
      example: 'Asked about team structure and growth opportunities',
   })
   @IsOptional()
   @IsString()
   candidateQuestions?: string;

   @ApiPropertyOptional({
      description: 'Actual start time of the interview (ISO 8601)',
      example: '2024-01-25T14:05:00Z',
   })
   @IsOptional()
   @IsDateString()
   actualStartTime?: string;

   @ApiPropertyOptional({
      description: 'Actual end time of the interview (ISO 8601)',
      example: '2024-01-25T15:10:00Z',
   })
   @IsOptional()
   @IsDateString()
   actualEndTime?: string;

   @ApiPropertyOptional({
      description: 'Reason for cancellation (if applicable)',
      example: 'Candidate requested to reschedule due to emergency',
   })
   @IsOptional()
   @IsString()
   cancellationReason?: string;

   @ApiPropertyOptional({
      description: 'Follow-up actions required',
      example: 'Schedule final interview with CTO',
   })
   @IsOptional()
   @IsString()
   followUpActions?: string;

   @ApiPropertyOptional({
      description: 'Additional notes or comments',
      example: 'Candidate was very well prepared and enthusiastic',
   })
   @IsOptional()
   @IsString()
   additionalNotes?: string;

   @ApiPropertyOptional({
      description: 'ID of interviewer employee (User Service)',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   interviewerId?: number;

   @ApiPropertyOptional({
      description: 'ID of secondary interviewer (User Service)',
      example: 2,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   secondaryInterviewerId?: number;
}

export class InterviewResponseDto {
   @ApiProperty({
      description: 'Interview ID',
      example: 1,
   })
   interviewId: number;

   @ApiProperty({
      description: 'Application ID',
      example: 1,
   })
   applicationId: number;

   @ApiProperty({
      description: 'Type of interview',
      example: 'technical',
   })
   interviewType: string;

   @ApiProperty({
      description: 'Scheduled date and time for interview',
      example: '2024-01-25T14:00:00Z',
   })
   scheduledDate: string;

   @ApiProperty({
      description: 'Interview duration in minutes',
      example: 60,
   })
   durationMinutes: number;

   @ApiPropertyOptional({
      description: 'Interview location or address',
      example: 'Meeting Room A, 5th Floor, TechLeet Office',
   })
   location?: string;

   @ApiPropertyOptional({
      description: 'Video meeting link',
      example: 'https://zoom.us/j/123456789',
   })
   meetingLink?: string;

   @ApiProperty({
      description: 'Interview status',
      example: 'scheduled',
   })
   status: string;

   @ApiPropertyOptional({
      description: 'Interview agenda or topics to cover',
      example: 'Technical assessment, system design discussion, Q&A session',
   })
   agenda?: string;

   @ApiPropertyOptional({
      description: 'Notes taken during the interview',
      example: 'Candidate demonstrated strong problem-solving skills...',
   })
   interviewNotes?: string;

   @ApiPropertyOptional({
      description: 'Overall interview score (1-10)',
      example: 8,
   })
   score?: number;

   @ApiPropertyOptional({
      description: 'Detailed feedback from interviewer',
      example: 'Strong technical skills, good communication, fits team culture well.',
   })
   feedback?: string;

   @ApiPropertyOptional({
      description: 'Interview result',
      example: 'pass',
   })
   result?: string;

   @ApiPropertyOptional({
      description: 'Strengths observed during interview',
      example: 'Excellent problem-solving approach, clear communication',
   })
   strengths?: string;

   @ApiPropertyOptional({
      description: 'Areas for improvement or concerns',
      example: 'Could improve knowledge of advanced algorithms',
   })
   weaknesses?: string;

   @ApiPropertyOptional({
      description: 'Technical skills assessment',
      example: 'Strong in React and Node.js, good understanding of system design',
   })
   technicalAssessment?: string;

   @ApiPropertyOptional({
      description: 'Communication skills assessment',
      example: 'Clear and articulate, asks good questions',
   })
   communicationAssessment?: string;

   @ApiPropertyOptional({
      description: 'Cultural fit assessment',
      example: 'Good team player, aligns with company values',
   })
   culturalFitAssessment?: string;

   @ApiPropertyOptional({
      description: 'Whether interviewer recommends candidate for next round',
      example: true,
   })
   recommendForNextRound?: boolean;

   @ApiPropertyOptional({
      description: 'Questions asked during the interview',
      example: 'How would you design a scalable web application?',
   })
   questionsAsked?: string;

   @ApiPropertyOptional({
      description: 'Candidate questions and concerns',
      example: 'Asked about team structure and growth opportunities',
   })
   candidateQuestions?: string;

   @ApiPropertyOptional({
      description: 'Actual start time of the interview',
      example: '2024-01-25T14:05:00Z',
   })
   actualStartTime?: string;

   @ApiPropertyOptional({
      description: 'Actual end time of the interview',
      example: '2024-01-25T15:10:00Z',
   })
   actualEndTime?: string;

   @ApiPropertyOptional({
      description: 'Reason for cancellation (if applicable)',
      example: 'Candidate requested to reschedule due to emergency',
   })
   cancellationReason?: string;

   @ApiPropertyOptional({
      description: 'Follow-up actions required',
      example: 'Schedule final interview with CTO',
   })
   followUpActions?: string;

   @ApiPropertyOptional({
      description: 'Additional notes or comments',
      example: 'Candidate was very well prepared and enthusiastic',
   })
   additionalNotes?: string;

   @ApiProperty({
      description: 'Interviewer ID',
      example: 1,
   })
   interviewerId: number;

   @ApiPropertyOptional({
      description: 'Secondary interviewer ID',
      example: 2,
   })
   secondaryInterviewerId?: number;

   @ApiPropertyOptional({
      description: 'Actual duration in minutes',
      example: 65,
   })
   actualDurationMinutes?: number;

   @ApiPropertyOptional({
      description: 'Whether interview is upcoming',
      example: true,
   })
   isUpcoming?: boolean;

   @ApiPropertyOptional({
      description: 'Whether interview is overdue',
      example: false,
   })
   isOverdue?: boolean;

   @ApiPropertyOptional({
      description: 'Hours until interview',
      example: 24,
   })
   hoursUntilInterview?: number;

   @ApiPropertyOptional({
      description: 'Formatted scheduled time',
      example: '25/01/2024 14:00',
   })
   formattedScheduledTime?: string;

   @ApiPropertyOptional({
      description: 'Status color for UI',
      example: 'blue',
   })
   statusColor?: string;

   @ApiPropertyOptional({
      description: 'Result color for UI',
      example: 'green',
   })
   resultColor?: string;

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

export class GetInterviewsQueryDto {
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
      description: 'Filter by application ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   applicationId?: number;

   @ApiPropertyOptional({
      description: 'Filter by interview type',
      example: 'technical',
      enum: ['phone', 'video', 'onsite', 'technical', 'hr', 'final'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['phone', 'video', 'onsite', 'technical', 'hr', 'final'])
   interviewType?: string;

   @ApiPropertyOptional({
      description: 'Filter by status',
      example: 'scheduled',
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
   status?: string;

   @ApiPropertyOptional({
      description: 'Filter by result',
      example: 'pass',
      enum: ['pass', 'fail', 'pending', 'strong-pass', 'weak-pass'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['pass', 'fail', 'pending', 'strong-pass', 'weak-pass'])
   result?: string;

   @ApiPropertyOptional({
      description: 'Filter by interviewer ID',
      example: 1,
   })
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   interviewerId?: number;

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
      description: 'Sort field',
      example: 'scheduledDate',
      enum: ['interviewId', 'scheduledDate', 'interviewType', 'status', 'score', 'result'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['interviewId', 'scheduledDate', 'interviewType', 'status', 'score', 'result'])
   sortBy?: string = 'scheduledDate';

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'ASC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['ASC', 'DESC'])
   sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
