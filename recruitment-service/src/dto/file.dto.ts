import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { FileType } from '../entities/recruitment/file.entity';

export class FileUploadDto {
   @ApiProperty({
      type: 'string',
      format: 'binary',
      description: 'File to upload ',
      required: true,
   })
   file: any;
   @ApiProperty({
      description: 'Type/category of the file',
      enum: FileType,
      example: FileType.EMPLOYEE_AVATAR,
   })
   @IsEnum(FileType)
   fileType: FileType;

   @ApiPropertyOptional({
      description: 'Reference ID of the related entity (employee, candidate, company, etc.)',
      example: 123,
   })
   @IsOptional()
   @IsNumber()
   @Transform(({ value }) => (value ? parseInt(value) : undefined))
   referenceId?: number;
}

export class FileResponseDto {
   @ApiProperty({
      description: 'File ID',
      example: 1,
   })
   fileId: number;

   @ApiProperty({
      description: 'Original filename',
      example: 'john_doe_resume.pdf',
   })
   originalName: string;

   @ApiProperty({
      description: 'File URL',
      example: 'https://storage.techleet.com/files/resumes/1642780800000_john_doe_resume.pdf',
   })
   fileUrl: string;

   @ApiProperty({
      description: 'File type',
      enum: FileType,
      example: FileType.CANDIDATE_RESUME,
   })
   fileType: FileType;

   @ApiProperty({
      description: 'File size in bytes',
      example: 2048576,
   })
   fileSize: number;

   @ApiProperty({
      description: 'Formatted file size',
      example: '2.0 MB',
   })
   fileSizeFormatted: string;

   @ApiProperty({
      description: 'MIME type',
      example: 'application/pdf',
   })
   mimeType: string;

   @ApiPropertyOptional({
      description: 'Reference ID',
      example: 123,
   })
   referenceId?: number;

   @ApiProperty({
      description: 'Upload timestamp',
      example: '2024-01-20T10:30:00Z',
   })
   createdAt: Date;

   @ApiProperty({
      description: 'Last update timestamp',
      example: '2024-01-20T15:45:00Z',
   })
   updatedAt: Date;
}

export class FileQueryDto {
   @ApiPropertyOptional({
      description: 'Filter by file type',
      enum: FileType,
      example: FileType.EMPLOYEE_AVATAR,
   })
   @IsOptional()
   @IsEnum(FileType)
   fileType?: FileType;

   @ApiPropertyOptional({
      description: 'Filter by reference ID',
      example: 123,
   })
   @IsOptional()
   @Transform(({ value }) => (value ? parseInt(value) : undefined))
   referenceId?: number;

   @ApiPropertyOptional({
      description: 'Page number for pagination',
      example: 1,
      default: 1,
   })
   @IsOptional()
   @Transform(({ value }) => (value ? parseInt(value) : 1))
   page?: number = 1;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 10,
      default: 10,
   })
   @IsOptional()
   @Transform(({ value }) => (value ? parseInt(value) : 10))
   limit?: number = 10;
}
