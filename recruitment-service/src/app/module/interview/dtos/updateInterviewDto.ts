import { PartialType } from '@nestjs/swagger';
import { CreateInterviewDto } from './createInterviewDto';
import { IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInterviewDto extends PartialType(CreateInterviewDto) {
   @ApiProperty({ description: 'Scores from interviewers', type: [Number], required: false })
   @IsOptional()
   @IsArray()
   @IsNumber({}, { each: true })
   scores?: number[];

   @ApiProperty({ description: 'Comments from interviewers', type: [String], required: false })
   @IsOptional()
   @IsArray()
   comments?: string[];
}
