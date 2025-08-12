import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePositionDto {
   @ApiProperty({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
      minLength: 2,
      maxLength: 100,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(100)
   positionName: string;
}

export class UpdatePositionDto {
   @ApiPropertyOptional({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
      minLength: 2,
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(100)
   positionName?: string;
}

export class PositionResponseDto {
   @ApiProperty({
      description: 'Position ID',
      example: 1,
   })
   positionId: number;

   @ApiProperty({
      description: 'Name of the position',
      example: 'Senior Software Engineer',
   })
   positionName: string;
}

export class GetPositionsQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @IsNumber()
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Search keyword for position name',
      example: 'Engineer',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'positionName',
      enum: ['positionId', 'positionName'],
   })
   @IsOptional()
   @IsString()
   sortBy?: string;

   @ApiPropertyOptional({
      description: 'Sort order',
      example: 'ASC',
      enum: ['ASC', 'DESC'],
   })
   @IsOptional()
   @IsString()
   sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
