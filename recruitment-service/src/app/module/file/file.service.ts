import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { FileQueryDto, FileResponseDto } from './file.dto';
import { FileEntity, FileStatus, FileType } from '../../../entities/recruitment/file.entity';
import { InboundAttachment } from './brevo-webhook.dto';
import * as fs from 'fs-extra';
import axios from 'axios';
import { InformationService } from '../cv-screening/information.service';
import { ApplicationService } from '../application/application.service';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';

// Import modular components
import { OcrService } from './ocr/ocr.service';
import { CvAnalyzer } from './processors/cv-analyzer.service';
import { CertificateAnalyzer } from './processors/certificate-analyzer.service';
import { BrevoHandler } from './handlers/brevo-handler.service';
import { FileManagementHandler } from './handlers/file-management.service';

interface FileUploadData {
   originalName: string;
   fileName: string;
   fileUrl: string;
   fileSize: number;
   mimeType: string;
   fileType: FileType;
   referenceId?: number;
   description?: string;
}

@Injectable()
export class FileService {
   constructor(
      @InjectRepository(FileEntity)
      private readonly fileRepository: Repository<FileEntity>,
      private readonly dataSource: DataSource,
      private readonly informationService: InformationService,
      private readonly applicationService: ApplicationService,
      // New modular services
      private readonly ocrService: OcrService,
      private readonly cvAnalyzer: CvAnalyzer,
      private readonly certificateAnalyzer: CertificateAnalyzer,
      private readonly brevoHandler: BrevoHandler,
      private readonly fileManagementHandler: FileManagementHandler,
   ) {}

   async create(fileData: FileUploadData): Promise<FileEntity> {
      try {
         let folder = 'documents';
         switch (fileData.fileType) {
            case FileType.EMPLOYEE_AVATAR:
               folder = 'avatars';
               break;
            case FileType.CANDIDATE_RESUME:
            case FileType.EMPLOYEE_RESUME:
               folder = 'resumes';
               break;
            case FileType.COMPANY_LOGO:
               folder = 'logos';
               break;
            case FileType.CANDIDATE_CERTIFICATE:
               folder = 'certificates';
               break;
         }

         const fileEntity = this.fileRepository.create({
            ...fileData,
            status: FileStatus.ACTIVE,
         });

         return await this.fileRepository.save(fileEntity);
      } catch (error) {
         throw new BadRequestException('Failed to create file record');
      }
   }

   async findAll(query: FileQueryDto): Promise<{
      files: FileEntity[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   }> {
      const { page = 1, limit = 10, fileType } = query;
      const skip = (page - 1) * limit;

      const whereCondition: FindOptionsWhere<FileEntity> = {};
      if (fileType) {
         whereCondition.fileType = fileType;
      }

      const [files, total] = await this.fileRepository.findAndCount({
         where: whereCondition,
         skip,
         take: limit,
         order: { createdAt: 'DESC' },
      });

      return {
         files,
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
      };
   }

   async findOne(fileId: number): Promise<FileEntity> {
      const file = await this.fileRepository.findOne({
         where: { fileId },
      });

      if (!file) {
         throw new NotFoundException('File not found');
      }

      return file;
   }

   async update(fileId: number, updateData: Partial<FileEntity>): Promise<FileEntity> {
      const file = await this.findOne(fileId);

      Object.assign(file, updateData);
      return await this.fileRepository.save(file);
   }

   async softDelete(fileId: number): Promise<void> {
      const file = await this.findOne(fileId);

      file.status = FileStatus.DELETED;
      file.deletedAt = new Date();

      await this.fileRepository.save(file);
   }

   async hardDelete(fileId: number): Promise<void> {
      const file = await this.findOne(fileId);

      // Delete physical file if it exists
      try {
         if (existsSync(file.fileUrl)) {
            await unlink(file.fileUrl);
         }
      } catch (fileError) {
         console.warn(`Failed to delete physical file: ${file.fileUrl}`, fileError);
      }

      await this.fileRepository.remove(file);
   }

   async getFilesByType(fileType: FileType): Promise<FileEntity[]> {
      return await this.fileRepository.find({
         where: { fileType, status: FileStatus.ACTIVE },
         order: { createdAt: 'DESC' },
      });
   }

   async getFilesByReference(referenceId: number, fileType?: FileType): Promise<FileEntity[]> {
      const whereCondition: FindOptionsWhere<FileEntity> = {
         referenceId,
         status: FileStatus.ACTIVE,
      };

      if (fileType) {
         whereCondition.fileType = fileType;
      }

      return await this.fileRepository.find({
         where: whereCondition,
         order: { createdAt: 'DESC' },
      });
   }

   async findByCandidateId(candidateId: number): Promise<FileEntity[]> {
      return await this.fileRepository.find({
         where: { 
            referenceId: candidateId,
            status: FileStatus.ACTIVE,
         },
         order: { createdAt: 'DESC' },
      });
   }

   async archiveOldFiles(olderThanDays: number = 90): Promise<number> {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.fileRepository
         .createQueryBuilder()
         .update(FileEntity)
         .set({ status: FileStatus.ARCHIVED })
         .where('createdAt < :cutoffDate', { cutoffDate })
         .andWhere('status = :status', { status: FileStatus.ACTIVE })
         .execute();

      return result.affected || 0;
   }

   /**
    * Process Brevo email attachments with enhanced file classification
    * Delegates to BrevoHandler for modular processing and sends thank you emails
    * @param attachments Array of Brevo attachments
    * @param emailMetadata Additional metadata from the email
    * @returns Array of created file entities
    */
   async processBrevoAttachments(
      attachments: InboundAttachment[],
      emailMetadata?: {
         messageId?: string;
         senderEmail?: string;
         subject?: string;
         referenceId?: number;
         recipientEmail: string;
      },
   ): Promise<FileEntity[]> {
      // Extract job info from Brevo email
      const jobInfo = this.brevoHandler.extractJobInfoFromBrevoEmail({
         Recipient: [emailMetadata?.recipientEmail],
         From: { Email: emailMetadata?.senderEmail }
      });

      if (!jobInfo.jobId || !jobInfo.candidateEmail) {
         throw new BadRequestException('Unable to extract job ID or candidate email from Brevo data');
      }

      // Process attachments using BrevoHandler
      const processedFiles = await this.brevoHandler.processBrevoAttachments(
         attachments,
         jobInfo.candidateEmail,
         jobInfo.jobId,
         jobInfo.candidateName || undefined
      );

      // Convert processed files back to FileEntity format for compatibility
      const fileEntities: FileEntity[] = [];
      for (const processedFile of processedFiles) {
         if (!processedFile.failed) {
            const fileEntity = await this.fileManagementHandler.getFileById(processedFile.id);
            if (fileEntity) {
               fileEntities.push(fileEntity);
            }
         }
      }

      return fileEntities;
   }

   // Delegate methods to modular services

   /**
    * Analyze CV files - delegates to CvAnalyzer
    */
   private async analyzeCVFile(cvFile: FileEntity): Promise<any> {
      return await this.cvAnalyzer.analyzeCVFile(cvFile);
   }

   /**
    * Enhanced image certificate analysis with OCR - delegates to CertificateAnalyzer
    */
   private async analyzeImageCertificateWithOCR(certFile: FileEntity): Promise<any> {
      return await this.certificateAnalyzer.analyzeImageCertificateWithOCR(certFile);
   }

   /**
    * Perform OCR analysis - delegates to OcrService
    */
   private async performOCRAnalysis(imageUrl: string): Promise<{
      success: boolean;
      text: string;
      confidence: number;
      processingTime: number;
      error?: string;
   }> {
      return await this.ocrService.performOCRAnalysis(imageUrl);
   }

   // Legacy methods that can be cleaned up over time

   private async downloadBrevoAttachment(downloadToken: string): Promise<Buffer> {
      try {
         const response = await axios.get(`https://files.sendinblue.com/${downloadToken}`, {
            responseType: 'arraybuffer',
         });
         return Buffer.from(response.data);
      } catch (error) {
         throw new BadRequestException(`Failed to download attachment: ${error.message}`);
      }
   }

   private async detectFileType(attachment: InboundAttachment, filePath: string): Promise<FileType> {
      const fileName = attachment.Name.toLowerCase();
      const mimeType = attachment.ContentType?.toLowerCase() || '';

      // Step 1: Enhanced filename analysis
      const cvKeywords = [
         'cv', 'resume', 'curriculum', 'vitae', 'profile', 'bio',
         'portfolio', 'experience', 'background', 'career',
         'hoso', 'lichsu', 'bangcap', 'kinhnghiem', // Vietnamese
         'sơ yếu', 'lý lịch', 'kinh nghiệm' // Vietnamese with diacritics
      ];

      const certificateKeywords = [
         'certificate', 'cert', 'diploma', 'degree', 'award', 'license',
         'graduation', 'completion', 'training', 'toeic', 'ielts', 'toefl',
         'chứng chỉ', 'bằng', 'giấy chứng nhận', 'tốt nghiệp'
      ];

      const hasCVKeyword = cvKeywords.some(keyword => fileName.includes(keyword));
      const hasCertKeyword = certificateKeywords.some(keyword => fileName.includes(keyword));

      // If filename is clearly indicating one type, use it
      if (hasCVKeyword && !hasCertKeyword) {
         console.log(`Detected CV from filename: ${fileName}`);
         return FileType.CANDIDATE_RESUME;
      }

      if (hasCertKeyword && !hasCVKeyword) {
         console.log(`Detected certificate from filename: ${fileName}`);
         return FileType.CANDIDATE_CERTIFICATE;
      }

      // Step 2: Content-based analysis for PDFs
      if (mimeType === 'application/pdf') {
         try {
            const contentAnalysis = await this.analyzePdfContent(filePath);

            if (contentAnalysis.isCV) {
               console.log(`Detected CV from content analysis: ${fileName}`);
               return FileType.CANDIDATE_RESUME;
            }

            if (contentAnalysis.isCertificate) {
               console.log(`Detected certificate from content analysis: ${fileName}`);
               return FileType.CANDIDATE_CERTIFICATE;
            }
         } catch (error) {
            console.warn(`PDF content analysis failed for ${fileName}:`, error.message);
         }
      }

      // Step 3: Image files are likely certificates (unless filename suggests CV)
      if (mimeType.startsWith('image/')) {
         if (hasCVKeyword) {
            console.log(`Image file with CV keyword: ${fileName} -> treating as CV`);
            return FileType.CANDIDATE_RESUME;
         }
         console.log(`Image file detected: ${fileName} -> treating as certificate`);
         return FileType.CANDIDATE_CERTIFICATE;
      }

      // Default fallback
      console.log(`Unable to determine file type for ${fileName}, defaulting to CV`);
      return FileType.CANDIDATE_RESUME;
   }

   private async analyzePdfContent(filePath: string): Promise<{ isCV: boolean; isCertificate: boolean; confidence: number }> {
      // This would need PDF parsing implementation
      // For now, return basic analysis
      return {
         isCV: true,
         isCertificate: false,
         confidence: 0.5
      };
   }

   private async processCVFile(cvFile: FileEntity, jobId: number): Promise<number> {
      try {
         console.log(`📄 Processing CV file: ${cvFile.originalName} for job ${jobId}`);

         // Extract and process CV information using existing service
         const cvInfo = await this.informationService.extractCandidateInformationFromPdf(
            cvFile.fileUrl,
            jobId,
         );

         if (cvInfo && cvInfo.success && cvInfo.candidateId) {
            console.log(`✅ CV processed successfully. Candidate ID: ${cvInfo.candidateId}`);
            return cvInfo.candidateId;
         }

         throw new Error('Failed to extract candidate information from CV');
      } catch (error) {
         console.error(`❌ CV processing failed for ${cvFile.originalName}:`, error);
         throw error;
      }
   }

   private async processCertificateFile(certFile: FileEntity, candidateId: number): Promise<void> {
      try {
         console.log(`🏆 Processing certificate file: ${certFile.originalName} for candidate ${candidateId}`);

         // Analyze certificate based on file type
         let analysis: any;
         if (certFile.mimeType.startsWith('image/')) {
            analysis = await this.analyzeImageCertificateWithOCR(certFile);
         } else {
            analysis = await this.analyzeCVFile(certFile); // Use CV analyzer for document certificates
         }

         console.log(`✅ Certificate analysis complete for ${certFile.originalName}:`, {
            type: analysis.type,
            confidence: analysis.confidence,
            summary: analysis.summary?.substring(0, 100) + '...'
         });

      } catch (error) {
         console.error(`❌ Certificate processing failed for ${certFile.originalName}:`, error);
         // Don't throw - certificate processing failure shouldn't break the flow
      }
   }
}
