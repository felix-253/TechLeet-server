import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, MinLength, MaxLength, IsEmail, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHeadquarterDto {
   @ApiProperty({
      description: 'Name of the headquarter or office',
      example: 'Ho Chi Minh Office',
      minLength: 2,
      maxLength: 100,
   })
   @IsString()
   @IsNotEmpty()
   @MinLength(2)
   @MaxLength(100)
   headquarterName: string;

   @ApiProperty({
      description: 'Physical address of the headquarter',
      example: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
   })
   @IsString()
   @IsNotEmpty()
   headquarterAddress: string;

   @ApiProperty({
      description: 'Contact phone number',
      example: '+84 28 1234 5678',
   })
   @IsString()
   @IsNotEmpty()
   @IsPhoneNumber('VN', { message: 'Please provide a valid Vietnamese phone number' })
   headquarterPhone: string;

   @ApiProperty({
      description: 'Contact email address',
      example: 'hcm.office@techleet.com',
   })
   @IsEmail({}, { message: 'Please provide a valid email address' })
   @IsNotEmpty()
   headquarterEmail: string;

   @ApiProperty({
      description: 'City where headquarter is located',
      example: 'Ho Chi Minh City',
   })
   @IsString()
   @IsNotEmpty()
   @MaxLength(50)
   city: string;

   @ApiPropertyOptional({
      description: 'Postal code',
      example: '700000',
   })
   @IsOptional()
   @IsString()
   @MaxLength(10)
   postalCode?: string;

   @ApiPropertyOptional({
      description: 'Additional description or notes about the location',
      example: 'Main office with customer service center',
   })
   @IsOptional()
   @IsString()
   description?: string;

   @ApiPropertyOptional({
      description: 'Whether this is the main headquarters',
      example: true,
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   isMainHeadquarter?: boolean = false;
}

export class UpdateHeadquarterDto {
   @ApiPropertyOptional({
      description: 'Name of the headquarter or office',
      example: 'Ho Chi Minh Office',
      minLength: 2,
      maxLength: 100,
   })
   @IsOptional()
   @IsString()
   @MinLength(2)
   @MaxLength(100)
   headquarterName?: string;

   @ApiPropertyOptional({
      description: 'Physical address of the headquarter',
      example: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
   })
   @IsOptional()
   @IsString()
   headquarterAddress?: string;

   @ApiPropertyOptional({
      description: 'Contact phone number',
      example: '+84 28 1234 5678',
   })
   @IsOptional()
   @IsString()
   @IsPhoneNumber('VN', { message: 'Please provide a valid Vietnamese phone number' })
   headquarterPhone?: string;

   @ApiPropertyOptional({
      description: 'Contact email address',
      example: 'hcm.office@techleet.com',
   })
   @IsOptional()
   @IsEmail({}, { message: 'Please provide a valid email address' })
   headquarterEmail?: string;

   @ApiPropertyOptional({
      description: 'City where headquarter is located',
      example: 'Ho Chi Minh City',
   })
   @IsOptional()
   @IsString()
   @MaxLength(50)
   city?: string;

   @ApiPropertyOptional({
      description: 'Postal code',
      example: '700000',
   })
   @IsOptional()
   @IsString()
   @MaxLength(10)
   postalCode?: string;

   @ApiPropertyOptional({
      description: 'Additional description or notes about the location',
      example: 'Main office with customer service center',
   })
   @IsOptional()
   @IsString()
   description?: string;

   @ApiPropertyOptional({
      description: 'Whether this is the main headquarters',
      example: true,
   })
   @IsOptional()
   @IsBoolean()
   @Type(() => Boolean)
   isMainHeadquarter?: boolean;
}

export class HeadquarterResponseDto {
   @ApiProperty({
      description: 'Headquarter ID',
      example: 1,
   })
   headquarterId: number;

   @ApiProperty({
      description: 'Name of the headquarter or office',
      example: 'Ho Chi Minh Office',
   })
   headquarterName: string;

   @ApiProperty({
      description: 'Physical address of the headquarter',
      example: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
   })
   headquarterAddress: string;

   @ApiProperty({
      description: 'Contact phone number',
      example: '+84 28 1234 5678',
   })
   headquarterPhone: string;

   @ApiProperty({
      description: 'Contact email address',
      example: 'hcm.office@techleet.com',
   })
   headquarterEmail: string;

   @ApiProperty({
      description: 'City where headquarter is located',
      example: 'Ho Chi Minh City',
   })
   city: string;

   @ApiPropertyOptional({
      description: 'Postal code',
      example: '700000',
   })
   postalCode?: string;

   @ApiPropertyOptional({
      description: 'Additional description or notes about the location',
      example: 'Main office with customer service center',
   })
   description?: string;

   @ApiProperty({
      description: 'Whether this is the main headquarters',
      example: true,
   })
   isMainHeadquarter: boolean;

   @ApiProperty({
      description: 'Number of departments in this headquarter',
      example: 5,
   })
   departmentCount?: number;
}

export class GetHeadquartersQueryDto {
   @ApiPropertyOptional({
      description: 'Page number (0-based)',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @Type(() => Number)
   page?: number = 0;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @Type(() => Number)
   limit?: number = 10;

   @ApiPropertyOptional({
      description: 'Search keyword for headquarter name or city',
      example: 'Ho Chi Minh',
   })
   @IsOptional()
   @IsString()
   keyword?: string;

   @ApiPropertyOptional({
      description: 'Sort field',
      example: 'headquarterName',
      enum: ['headquarterId', 'headquarterName', 'city', 'isMainHeadquarter'],
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
