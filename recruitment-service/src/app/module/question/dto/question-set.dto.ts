import { IsString, IsOptional } from 'class-validator';

export class FilterQuestionSetDto {
   @IsOptional()
   @IsString()
   text?: string;
}

export class CreateQuestionSetDto {
   @IsString()
   title: string;

   @IsOptional()
   @IsString()
   description?: string;
}

export class UpdateQuestionSetDto {
   @IsOptional()
   @IsString()
   title?: string;

   @IsOptional()
   @IsString()
   description?: string;
}
