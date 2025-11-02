import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterQuestionSetDto {
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
      description: 'Search keyword for title or description',
      example: 'React',
   })
   @IsOptional()
   @IsString()
   text?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'createdAt',
      enum: ['setId', 'title', 'createdAt'],
   })
   @IsOptional()
   @IsString()
   @IsIn(['setId', 'title', 'createdAt'])
   sortBy?: string = 'createdAt';

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
