import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateExaminationDto {
   @IsNumber()
   applicationId: number;

   @IsNumber()
   sourceSetId: number;

   @IsNumber()
   @IsOptional()
   quantityQuestion?: number;
}

export class SubmitExaminationDto {
   answers: {
      [examQuestionId: string]: {
         answerText: string;
         score?: number;
         reason?: string;
      };
   };
}

export class UpdateScoreDto {
   @IsNumber()
   score: number;

   @IsOptional()
   @IsString()
   reason?: string;
}
