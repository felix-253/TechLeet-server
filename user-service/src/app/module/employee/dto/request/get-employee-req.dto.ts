import { EmployeeEntity } from '@/entities/master/employee.entity';
import { PagingBaseQuery } from '@/utils/query/paging-base.query';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class GetEmployeeReqDto extends PagingBaseQuery {
   @ApiPropertyOptional({ description: 'Keyword include full name, email or phone number' })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional()
   @IsOptional()
   @IsBoolean()
   gender?: boolean;

   @ApiPropertyOptional()
   @IsOptional()
   @IsBoolean()
   isActive?: boolean;

   @ApiPropertyOptional()
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   departmentId?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   positionId?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @IsInt()
   @Type(() => Number)
   positionTypeId?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @IsDateString()
   startDateFrom?: string;

   @ApiPropertyOptional()
   @IsOptional()
   @IsDateString()
   startDateTo?: string;

   @ApiPropertyOptional()
   @IsOptional()
   @IsDateString()
   birthDateFrom?: string;

   @ApiPropertyOptional()
   @IsOptional()
   @IsDateString()
   birthDateTo?: string;
}
