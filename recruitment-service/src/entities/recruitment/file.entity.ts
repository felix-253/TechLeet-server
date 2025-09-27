import {
   Entity,
   PrimaryGeneratedColumn,
   Column,
   CreateDateColumn,
   UpdateDateColumn,
   Index,
   ManyToOne,
   JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum FileType {
   EMPLOYEE_AVATAR = 'employee_avatar',
   CANDIDATE_RESUME = 'candidate_resume', // CV
   EMPLOYEE_RESUME = 'employee_resume',
   COMPANY_LOGO = 'company_logo',
   GENERAL_DOCUMENT = 'general_document',
   CANDIDATE_CERTIFICATE = 'candidate_certificate',
}

export enum FileStatus {
   ACTIVE = 'active',
   ARCHIVED = 'archived',
   DELETED = 'deleted',
}

@Entity('files')
@Index(['fileType', 'referenceId'])
@Index(['fileType', 'status'])
export class FileEntity {
   @PrimaryGeneratedColumn()
   @ApiProperty({
      description: 'Unique identifier for the file',
      example: 1,
   })
   fileId: number;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: false,
   })
   @ApiProperty({
      description: 'Original filename as uploaded',
      example: 'john_doe_resume.pdf',
   })
   originalName: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: false,
      unique: true,
   })
   @ApiProperty({
      description: 'Unique filename stored on server',
      example: '1642780800000_john_doe_resume.pdf',
   })
   fileName: string;

   @Column({
      type: 'text',
      nullable: false,
   })
   @ApiProperty({
      description: 'Full URL or path to access the file',
      example: 'https://storage.techleet.com/files/avatars/1642780800000_john_doe_resume.pdf',
   })
   fileUrl: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
   })
   @ApiProperty({
      description: 'MIME type of the file',
      example: 'application/pdf',
   })
   mimeType: string;

   @Column({
      type: 'bigint',
      nullable: false,
   })
   @ApiProperty({
      description: 'File size in bytes',
      example: 2048576,
   })
   fileSize: number;

   @Column({
      type: 'enum',
      enum: FileType,
      nullable: false,
   })
   @ApiProperty({
      description: 'Type/category of the file',
      enum: FileType,
      example: FileType.EMPLOYEE_AVATAR,
   })
   fileType: FileType;

   @Column({
      type: 'int',
      nullable: true,
   })
   @ApiProperty({
      description: 'ID of the related entity (employee, candidate, company, etc.)',
      example: 123,
      required: false,
   })
   referenceId?: number;

   @Column({
      type: 'enum',
      enum: FileStatus,
      default: FileStatus.ACTIVE,
   })
   @ApiProperty({
      description: 'Current status of the file',
      enum: FileStatus,
      example: FileStatus.ACTIVE,
   })
   status: FileStatus;

   @Column({
      type: 'varchar',
      length: 500,
      nullable: true,
   })
   @ApiProperty({
      description: 'Optional description or notes about the file',
      example: 'Updated resume with latest experience',
      required: false,
   })
   description?: string;

   @Column({
      type: 'json',
      nullable: true,
   })
   @ApiProperty({
      description: 'Additional metadata for the file',
      example: {
         dimensions: { width: 800, height: 600 },
         format: 'PDF',
         pages: 2,
      },
      required: false,
   })
   metadata?: any;

   @CreateDateColumn({
      name: 'created_at',
      type: 'timestamp',
   })
   @ApiProperty({
      description: 'Timestamp when the file was uploaded',
      example: '2024-01-20T10:30:00Z',
   })
   createdAt: Date;

   @UpdateDateColumn({
      name: 'updated_at',
      type: 'timestamp',
   })
   @ApiProperty({
      description: 'Timestamp when the file record was last updated',
      example: '2024-01-20T15:45:00Z',
   })
   updatedAt: Date;

   @Column({
      type: 'timestamp',
      nullable: true,
   })
   @ApiProperty({
      description: 'Timestamp when the file was marked as deleted',
      example: '2024-01-25T09:15:00Z',
      required: false,
   })
   deletedAt?: Date;

   // Virtual properties for easier access
   get isImage(): boolean {
      return this.mimeType.startsWith('image/');
   }

   get isPdf(): boolean {
      return this.mimeType === 'application/pdf';
   }

   get isDocument(): boolean {
      const documentTypes = [
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'text/plain',
      ];
      return documentTypes.includes(this.mimeType);
   }

   get fileSizeFormatted(): string {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = this.fileSize;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
         size /= 1024;
         unitIndex++;
      }

      return `${size.toFixed(1)} ${units[unitIndex]}`;
   }
}
