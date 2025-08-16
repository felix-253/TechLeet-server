import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FileQueryDto, FileResponseDto } from '../dto/file.dto';
import { FileEntity, FileStatus, FileType } from '../entities/recruitment/file.entity';

export interface FileUploadData {
   originalName: string;
   fileName: string;
   fileUrl: string;
   mimeType: string;
   fileSize: number;
   fileType: FileType;
   referenceId?: number;
   metadata?: any;
}

@Injectable()
export class FileService {
   constructor(
      @InjectRepository(FileEntity)
      private readonly fileRepository: Repository<FileEntity>,
      private readonly dataSource: DataSource,
   ) {}

   async create(fileData: FileUploadData): Promise<FileEntity> {
      try {
         const file = this.fileRepository.create({
            ...fileData,
            status: FileStatus.ACTIVE,
         });

         return await this.fileRepository.save(file);
      } catch (error) {
         throw new BadRequestException('Failed to save file record: ' + error);
      }
   }

   async findById(id: number): Promise<FileEntity> {
      const file = await this.fileRepository.findOne({
         where: {
            fileId: id,
            status: FileStatus.ACTIVE,
         },
      });

      if (!file) {
         throw new NotFoundException(`File with ID ${id} not found`);
      }

      return file;
   }

   async findWithFilters(query: FileQueryDto): Promise<{
      data: FileEntity[];
      total: number;
      page: number;
      limit: number;
   }> {
      const { page = 1, limit = 10, ...filters } = query;
      const skip = (page - 1) * limit;

      const whereConditions: FindOptionsWhere<FileEntity> = {
         status: FileStatus.ACTIVE,
      };

      // Apply filters
      if (filters.fileType) {
         whereConditions.fileType = filters.fileType;
      }
      if (filters.referenceId) {
         whereConditions.referenceId = filters.referenceId;
      }
      

      const [data, total] = await this.fileRepository.findAndCount({
         where: whereConditions,
         order: { createdAt: 'DESC' },
         skip,
         take: limit,
      });

      return {
         data,
         total,
         page,
         limit,
      };
   }

   async findByReference(referenceId: number, fileType?: FileType): Promise<FileEntity[]> {
      const whereConditions: FindOptionsWhere<FileEntity> = {
         referenceId,
         status: FileStatus.ACTIVE,
      };

      if (fileType) {
         whereConditions.fileType = fileType;
      }

      return await this.fileRepository.find({
         where: whereConditions,
         order: { createdAt: 'DESC' },
      });
   }

   async hardDelete(id: number): Promise<void> {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
         // Find the file first
         const file = await this.findById(id);

         // Delete from database first
         await queryRunner.manager.delete(FileEntity, id);

         // Commit transaction
         await queryRunner.commitTransaction();

         // Delete physical file after successful database deletion
         try {
            await this.deletePhysicalFile(file.fileName, file.fileType);
         } catch (fileError) {
            // Log the error but don't fail the operation since DB deletion succeeded
            console.error('Failed to delete physical file:', fileError);
         }
      } catch (error) {
         // Rollback transaction on any error
         await queryRunner.rollbackTransaction();
         throw new BadRequestException(`Failed to delete file: ${error.message}`);
      } finally {
         await queryRunner.release();
      }
   }

   async deletePhysicalFile(fileName: string, fileType: FileType): Promise<void> {
      try {
         let uploadDir = '';
         switch (fileType) {
            case FileType.EMPLOYEE_AVATAR:
               uploadDir = './uploads/avatars';
               break;
            case FileType.CANDIDATE_RESUME:
               uploadDir = './uploads/candidate_resume';
               break;
            case FileType.COMPANY_LOGO:
               uploadDir = './uploads/logos';
               break;
            case FileType.EMPLOYEE_RESUME:
               uploadDir = './uploads/employee_resumes';
               break;
            default:
               uploadDir = './uploads/documents';
         }

         const filePath = join(uploadDir, fileName);

         if (existsSync(filePath)) {
            await unlink(filePath);
         }
      } catch (error) {
         console.error(`Failed to delete physical file ${fileName}:`, error);
         // Don't throw error - file might already be deleted
      }
   }

   async getEmployeeAvatar(employeeId: number): Promise<FileEntity | null> {
      return await this.fileRepository.findOne({
         where: {
            referenceId: employeeId,
            fileType: FileType.EMPLOYEE_AVATAR,
            status: FileStatus.ACTIVE,
         },
         order: { createdAt: 'DESC' },
      });
   }

   async getCandidateResumes(candidateId: number): Promise<FileEntity[]> {
      return await this.fileRepository.find({
         where: {
            referenceId: candidateId,
            fileType: FileType.CANDIDATE_RESUME,
            status: FileStatus.ACTIVE,
         },
         order: { createdAt: 'DESC' },
      });
   }

   async getCompanyLogo(companyId: number): Promise<FileEntity | null> {
      return await this.fileRepository.findOne({
         where: {
            referenceId: companyId,
            fileType: FileType.COMPANY_LOGO,
            status: FileStatus.ACTIVE,
         },
         order: { createdAt: 'DESC' },
      });
   }

   async updateEmployeeAvatar(employeeId: number, fileData: FileUploadData): Promise<FileEntity> {
      // Mark old avatar as archived
      const oldAvatar = await this.getEmployeeAvatar(employeeId);
      if (oldAvatar) {
         oldAvatar.status = FileStatus.ARCHIVED;
         await this.fileRepository.save(oldAvatar);
      }

      // Create new avatar
      return await this.create({
         ...fileData,
         referenceId: employeeId,
         fileType: FileType.EMPLOYEE_AVATAR,
      });
   }

   async updateCompanyLogo(companyId: number, fileData: FileUploadData): Promise<FileEntity> {
      // Mark old logo as archived
      const oldLogo = await this.getCompanyLogo(companyId);
      if (oldLogo) {
         oldLogo.status = FileStatus.ARCHIVED;
         await this.fileRepository.save(oldLogo);
      }

      // Create new logo
      return await this.create({
         ...fileData,
         referenceId: companyId,
         fileType: FileType.COMPANY_LOGO,
      });
   }

   async getFileStats(): Promise<{
      totalFiles: number;
      totalSize: number;
      filesByType: Record<FileType, number>;
      averageFileSize: number;
   }> {
      const files = await this.fileRepository.find({
         where: { status: FileStatus.ACTIVE },
      });

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      const filesByType = files.reduce(
         (acc, file) => {
            acc[file.fileType] = (acc[file.fileType] || 0) + 1;
            return acc;
         },
         {} as Record<FileType, number>,
      );

      return {
         totalFiles,
         totalSize,
         filesByType,
         averageFileSize,
      };
   }

   // Transform entity to response DTO
   toResponseDto(file: FileEntity): FileResponseDto {
      return {
         fileId: file.fileId,
         originalName: file.originalName,
         fileUrl: file.fileUrl,
         fileType: file.fileType,
         fileSize: file.fileSize,
         fileSizeFormatted: file.fileSizeFormatted,
         mimeType: file.mimeType,
         referenceId: file.referenceId,
         createdAt: file.createdAt,
         updatedAt: file.updatedAt,
      };
   }
}
