import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DifficultyLevel } from '../../../../entities/question/difficulty-level.enum';

export class FilterQuestionDto {
   @IsOptional()
   @IsString()
   text?: string;

   @IsOptional()
   @IsEnum(DifficultyLevel)
   difficulty?: DifficultyLevel;

   @IsOptional()
   @IsDateString()
   startDate?: string;

   @IsOptional()
   @IsDateString()
   endDate?: string;
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
