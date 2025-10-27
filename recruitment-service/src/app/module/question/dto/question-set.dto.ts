import { IsString, IsOptional, IsNumber } from 'class-validator';

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
