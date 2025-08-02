import { EmployeeEntity } from '@/entities/master/employee.entity';
import { PagingBaseQuery } from '@/utils/query/paging-base.query';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   IsArray,
   IsBoolean,
   IsBooleanString,
   IsDateString,
   IsEnum,
   IsInt,
   IsNumber,
   IsOptional,
   IsString,
   Min,
} from 'class-validator';

export class GetEmployeeReqDto extends PagingBaseQuery {
   @ApiPropertyOptional({ description: 'Keyword include full name, email or phone number' })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional()
   @IsOptional()
   @IsBooleanString()
   gender?: boolean;

   @ApiPropertyOptional()
   @IsOptional()
   @IsBooleanString()
   isActive?: boolean;

   @ApiPropertyOptional({
      type: [Number],
   })
   @IsOptional()
   @Type(() => Number)
   @IsArray()
   @IsInt({ each: true })
   departmentId?: number[];

   @ApiPropertyOptional({
      type: [Number],
   })
   @IsOptional()
   @Type(() => Number)
   @IsArray()
   @IsInt({ each: true })
   positionId?: number[];

   @ApiPropertyOptional({
      type: [Number],
   })
   @IsOptional()
   @Type(() => Number)
   @IsArray()
   @IsInt({ each: true })
   positionTypeId?: number[];

   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   @IsNumber()
   @Min(0)
   baseSalaryFrom?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @Min(0)
   @IsNumber()
   @Type(() => Number)
   baseSalaryTo?: number;

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
