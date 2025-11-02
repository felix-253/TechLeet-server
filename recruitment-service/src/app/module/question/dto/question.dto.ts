import { IsString, IsEnum, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../../../../entities/question/difficulty-level.enum';

export class FilterQuestionDto {
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
      description: 'Search keyword for question content',
      example: 'React',
   })
   @IsOptional()
   @IsString()
   text?: string;

   @ApiPropertyOptional({
      description: 'Filter by difficulty level',
      enum: ['easy', 'medium', 'hard'],
      example: 'medium',
   })
   @IsOptional()
   @IsEnum(DifficultyLevel)
   difficulty?: DifficultyLevel;

   @ApiPropertyOptional({
      description: 'Start date filter',
      example: '2024-01-01',
   })
   @IsOptional()
   @IsDateString()
   startDate?: string;

   @ApiPropertyOptional({
      description: 'End date filter',
      example: '2024-12-31',
   })
   @IsOptional()
   @IsDateString()
   endDate?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'createdAt',
      enum: ['questionId', 'content', 'difficulty', 'createdAt'],
   })
   @IsOptional()
   @IsString()
   sortBy?: string = 'createdAt';

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'DESC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class CreateQuestionDto {
   @IsString()
   content: string;

   @IsString()
   sampleAnswer: string;

   @IsEnum(DifficultyLevel)
   difficulty: DifficultyLevel;
}

export class UpdateQuestionDto {
   @IsOptional()
   @IsString()
   content?: string;

   @IsOptional()
   @IsString()
   sampleAnswer?: string;

   @IsOptional()
   @IsEnum(DifficultyLevel)
   difficulty?: DifficultyLevel;
}
