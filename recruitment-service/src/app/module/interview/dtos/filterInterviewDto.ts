import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum InterviewStatus {
   SCHEDULED = 'scheduled',
   IN_PROGRESS = 'in_progress',
   COMPLETED = 'completed',
   CANCELLED = 'cancelled',
}

export enum SortBy {
   SCHEDULED_AT = 'scheduled_at',
   SCORE = 'score',
   CREATED_AT = 'createdAt',
}

export enum SortOrder {
   ASC = 'ASC',
   DESC = 'DESC',
}

export class FilterInterviewDto {
   @ApiProperty({ description: 'Interview ID', required: false })
   @IsOptional()
   @IsInt()
   @Transform(({ value }) => parseInt(value))
   id?: number;

   @ApiProperty({ description: 'Candidate ID', required: false })
   @IsOptional()
   @IsInt()
   @Transform(({ value }) => parseInt(value))
   candidate_id?: number;

   @ApiProperty({ description: 'Job ID', required: false })
   @IsOptional()
   @IsInt()
   @Transform(({ value }) => parseInt(value))
   job_id?: number;

   @ApiProperty({ description: 'Interview status', enum: InterviewStatus, required: false })
   @IsOptional()
   @IsEnum(InterviewStatus)
   status?: InterviewStatus;

   @ApiProperty({ description: 'Sort by field', enum: SortBy, default: SortBy.SCHEDULED_AT })
   @IsOptional()
   @IsEnum(SortBy)
   sort_by?: SortBy = SortBy.SCHEDULED_AT;

   @ApiProperty({ description: 'Sort order', enum: SortOrder, default: SortOrder.ASC })
   @IsOptional()
   @IsEnum(SortOrder)
   sort_order?: SortOrder = SortOrder.ASC;

   @ApiProperty({ description: 'Page number', default: 1 })
   @IsOptional()
   @IsInt()
   @Transform(({ value }) => parseInt(value))
   page?: number = 1;

   @ApiProperty({ description: 'Items per page', default: 10 })
   @IsOptional()
   @IsInt()
   @Transform(({ value }) => parseInt(value))
   limit?: number = 10;
}
