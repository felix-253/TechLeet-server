import {
   IsInt,
   IsArray,
   IsString,
   IsDateString,
   IsOptional,
   IsNumber,
   Min,
   Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInterviewDto {
   @ApiProperty({ description: 'Candidate ID' })
   @IsInt()
   candidate_id: number;

   @ApiProperty({ description: 'Job ID' })
   @IsInt()
   job_id: number;

   @ApiProperty({ description: 'Interviewer IDs', type: [Number] })
   @IsArray()
   @IsInt({ each: true })
   interviewer_ids: number[];

   @ApiProperty({ description: 'Scheduled date and time', example: '2024-01-15T10:00:00Z' })
   @IsDateString()
   scheduled_at: string;

   @ApiProperty({ description: 'Duration in minutes', default: 30 })
   @IsOptional()
   @IsInt()
   @Min(15)
   @Max(480)
   duration_minutes?: number;

   @ApiProperty({ description: 'Meeting link' })
   @IsString()
   meeting_link: string;

   @ApiProperty({ description: 'Location', required: false })
   @IsOptional()
   @IsString()
   location?: string;

   @ApiProperty({ description: 'Status', default: 'scheduled' })
   @IsOptional()
   @IsString()
   status?: string;
}
