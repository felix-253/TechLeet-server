import {
   IsString,
   IsEmail,
   IsOptional,
   IsBoolean,
   IsDate,
   IsArray,
   IsInt,
   IsPhoneNumber,
   ArrayNotEmpty,
   IsNumber,
   Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
   @IsString()
   firstName?: string;

   @IsString()
   lastName?: string;

   @IsString()
   address?: string;

   @Type(() => Date)
   @IsDate()
   birthDate?: Date;

   @IsEmail()
   email: string;

   @IsBoolean()
   gender?: boolean;

   @Type(() => Date)
   @IsDate()
   startDate?: Date;

   @IsOptional()
   @Type(() => Date)
   @IsDate()
   confirmationDate?: Date;

   @IsOptional()
   @IsBoolean()
   isActive?: boolean;

   @IsOptional()
   @IsString()
   avatarUrl?: string;

   @IsOptional()
   @IsPhoneNumber('VN', { message: 'Invalid phone number format' })
   phoneNumber?: string;

   @IsNumber()
   @Min(0)
   baseSalary: number;

   @IsOptional()
   @IsInt()
   departmentId?: number;

   @IsOptional()
   @IsInt()
   positionId?: number;

   @IsOptional()
   @IsInt()
   positionTypeId?: number;

   @IsOptional()
   @IsArray()
   @ArrayNotEmpty()
   @IsInt({ each: true })
   permissions?: number[];
}
