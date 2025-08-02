import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PagingBaseQuery {
   @ApiPropertyOptional({ example: 0 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   page?: number = 0;

   @ApiPropertyOptional({ example: 10 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   limit?: number = 10;

   @ApiPropertyOptional({ example: 'createdAt' })
   @IsOptional()
   @IsString()
   sortBy?: string = 'createdAt';

   @ApiPropertyOptional({ example: 'DESC' })
   @IsOptional()
   @IsString()
   sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
