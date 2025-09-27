import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FileEntity } from '../../../../entities/recruitment/file.entity';

@Injectable()
export class FileManagementHandler {
   constructor(private readonly entityManager: EntityManager) {}

   /**
    * Save file metadata to database
    */
   async saveFileMetadata(fileData: {
      originalName: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      fileType: string;
      referenceId?: number;
      description?: string;
      metadata?: any;
   }): Promise<FileEntity> {
      try {
         const fileEntity = new FileEntity();
         Object.assign(fileEntity, fileData);
         
         const savedFile = await this.entityManager.save(FileEntity, fileEntity);
         console.log(`💾 File metadata saved: ${savedFile.fileId} - ${savedFile.originalName}`);
         
         return savedFile;
      } catch (error) {
         console.error(`❌ Failed to save file metadata for ${fileData.originalName}:`, error);
         throw error;
      }
   }

   /**
    * Update file metadata
    */
   async updateFileMetadata(fileId: number, updateData: Partial<FileEntity>): Promise<FileEntity> {
      try {
         await this.entityManager.update(FileEntity, fileId, updateData);
         const updatedFile = await this.entityManager.findOne(FileEntity, { where: { fileId } });
         
         if (!updatedFile) {
            throw new Error(`File with ID ${fileId} not found after update`);
         }
         
         console.log(`🔄 File metadata updated: ${fileId}`);
         return updatedFile;
      } catch (error) {
         console.error(`❌ Failed to update file metadata for ID ${fileId}:`, error);
         throw error;
      }
   }

   /**
    * Get file by ID
    */
   async getFileById(fileId: number): Promise<FileEntity | null> {
      try {
         return await this.entityManager.findOne(FileEntity, { where: { fileId } });
      } catch (error) {
         console.error(`❌ Failed to get file by ID ${fileId}:`, error);
         return null;
      }
   }

   /**
    * Get files by reference ID (e.g., candidate ID, job ID)
    */
   async getFilesByReference(referenceId: number, fileType?: string): Promise<FileEntity[]> {
      try {
         const whereClause: any = { referenceId };
         if (fileType) {
            whereClause.fileType = fileType;
         }

         return await this.entityManager.find(FileEntity, { where: whereClause });
      } catch (error) {
         console.error(`❌ Failed to get files by reference ID ${referenceId}:`, error);
         return [];
      }
   }

   /**
    * Delete file (soft delete)
    */
   async deleteFile(fileId: number): Promise<boolean> {
      try {
         await this.entityManager.update(FileEntity, fileId, {
            status: 'deleted' as any,
            deletedAt: new Date()
         });
         
         console.log(`🗑️ File soft deleted: ${fileId}`);
         return true;
      } catch (error) {
         console.error(`❌ Failed to delete file ${fileId}:`, error);
         return false;
      }
   }

   /**
    * Validate file upload constraints
    */
   validateFileUpload(fileData: {
      originalName: string;
      fileSize: number;
      mimeType: string;
   }): { isValid: boolean; issues: string[] } {
      const issues: string[] = [];
      
      // File size limits (50MB max)
      if (fileData.fileSize > 50 * 1024 * 1024) {
         issues.push('File size exceeds 50MB limit');
      }
      
      if (fileData.fileSize === 0) {
         issues.push('File size cannot be zero');
      }
      
      // File name validation
      if (!fileData.originalName || fileData.originalName.trim().length === 0) {
         issues.push('File name is required');
      }
      
      if (fileData.originalName.length > 255) {
         issues.push('File name exceeds 255 characters');
      }
      
      // Check for dangerous file extensions
      const dangerousExtensions = [
         '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.com', '.pif', '.msc'
      ];
      
      const fileName = fileData.originalName.toLowerCase();
      const isDangerous = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (isDangerous) {
         issues.push('File type not allowed for security reasons');
      }
      
      // MIME type validation
      const allowedMimeTypes = [
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'text/plain',
         'image/jpeg',
         'image/jpg', 
         'image/png',
         'image/gif',
         'image/webp',
         'image/tiff'
      ];
      
      if (!allowedMimeTypes.includes(fileData.mimeType)) {
         issues.push(`MIME type ${fileData.mimeType} is not allowed`);
      }
      
      return {
         isValid: issues.length === 0,
         issues
      };
   }

   /**
    * Generate unique file name
    */
   generateUniqueFileName(originalName: string): string {
      const timestamp = Date.now();
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
      
      // Remove special characters and spaces
      const cleanBaseName = baseName
         .replace(/[^a-zA-Z0-9_-]/g, '_')
         .substring(0, 50); // Limit length
      
      return `${timestamp}_${cleanBaseName}${extension}`;
   }

   /**
    * Get file statistics for monitoring
    */
   async getFileStatistics(): Promise<{
      totalFiles: number;
      totalSize: number;
      filesByType: Record<string, number>;
      recentUploads: number;
   }> {
      try {
         const totalFiles = await this.entityManager.count(FileEntity);
         
         const sizeResult = await this.entityManager
            .createQueryBuilder(FileEntity, 'file')
            .select('SUM(file.fileSize)', 'totalSize')
            .getRawOne();
         
         const typeResults = await this.entityManager
            .createQueryBuilder(FileEntity, 'file')
            .select('file.fileType', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('file.fileType')
            .getRawMany();
         
         // Recent uploads (last 24 hours)
         const oneDayAgo = new Date();
         oneDayAgo.setDate(oneDayAgo.getDate() - 1);
         
         const recentUploads = await this.entityManager.count(FileEntity, {
            where: {
               createdAt: { $gte: oneDayAgo } as any
            }
         });
         
         const filesByType = typeResults.reduce((acc, result) => {
            acc[result.type] = parseInt(result.count);
            return acc;
         }, {});
         
         return {
            totalFiles,
            totalSize: parseInt(sizeResult?.totalSize || '0'),
            filesByType,
            recentUploads
         };
      } catch (error) {
         console.error('❌ Failed to get file statistics:', error);
         return {
            totalFiles: 0,
            totalSize: 0,
            filesByType: {},
            recentUploads: 0
         };
      }
   }

   /**
    * Clean up old deleted files (hard delete)
    */
   async cleanupDeletedFiles(olderThanDays: number = 30): Promise<number> {
      try {
         const cutoffDate = new Date();
         cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
         
         const result = await this.entityManager
            .createQueryBuilder()
            .delete()
            .from(FileEntity)
            .where('status = :status', { status: 'deleted' })
            .andWhere('deletedAt < :cutoffDate', { cutoffDate })
            .execute();
         
         console.log(`🧹 Cleaned up ${result.affected} old deleted files`);
         return result.affected || 0;
      } catch (error) {
         console.error('❌ Failed to cleanup deleted files:', error);
         return 0;
      }
   }
}
