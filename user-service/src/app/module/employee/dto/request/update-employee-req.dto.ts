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
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEmployeeDto {
   @IsNumber()
   @ApiProperty({ example: 1, description: 'EmployeeId of employee need update' })
   employeeId: number;

   @IsString()
   @ApiProperty({ example: 'Trần', description: 'First name of the employee' })
   firstName?: string;

   @IsString()
   @ApiProperty({ example: 'Viễn', description: 'Last name of the employee' })
   lastName?: string;

   @IsString()
   @ApiProperty({
      example: '07 Xô Viết Nghệ Tĩnh, Huyện Hòa Vang, TP. Đà Nẵng',
      description: 'Address of the employee',
   })
   address?: string;

   @Type(() => Date)
   @IsDate()
   @ApiProperty({ example: '1995-11-20T00:00:00.000Z', description: 'Birth date of the employee' })
   birthDate?: Date;

   @IsEmail()
   @ApiProperty({ example: 'tran.vien@example.com', description: 'Email of the employee' })
   email: string;

   @IsBoolean()
   @ApiProperty({ example: true, description: 'Gender of the employee' })
   gender?: boolean;

   @Type(() => Date)
   @IsDate()
   @ApiProperty({ example: '2023-07-01T00:00:00.000Z', description: 'Start date of the employee' })
   startDate?: Date;

   @IsOptional()
   @IsBoolean()
   @ApiProperty({ example: true, description: 'Is the employee active?' })
   isActive?: boolean;

   @IsOptional()
   @IsString()
   @ApiProperty({
      example: 'https://example.com/avatar.jpg',
      description: 'Avatar URL of the employee',
   })
   avatarUrl?: string;

   @IsOptional()
   @IsPhoneNumber('VN', { message: 'Invalid phone number format' })
   @ApiProperty({ example: '0930139700', description: 'Phone number of the employee' })
   phoneNumber?: string;

   @IsNumber()
   @Min(0)
   @ApiProperty({ example: 12000000, description: 'Base salary of the employee' })
   baseSalary: number;

   @IsOptional()
   @IsInt()
   @ApiProperty({ example: 1, description: 'Department ID of the employee' })
   departmentId?: number;

   @IsOptional()
   @IsInt()
   @ApiProperty({ example: 1, description: 'Position ID of the employee' })
   positionId?: number;

   @IsOptional()
   @IsInt()
   @ApiProperty({ example: 1, description: 'Position type ID of the employee' })
   positionTypeId?: number;

   @IsOptional()
   @IsArray()
   @ArrayNotEmpty()
   @IsInt({ each: true })
   @ApiProperty({ example: [1, 2], description: 'Permissions of the employee' })
   permissions?: number[];
}
