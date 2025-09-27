import {
   BadRequestException,
   Body,
   Controller,
   Delete,
   Get,
   HttpStatus,
   NotFoundException,
   Param,
   ParseIntPipe,
   Post,
   Query,
   UploadedFile,
   UploadedFiles,
   UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
   ApiBearerAuth,
   ApiBody,
   ApiConsumes,
   ApiOperation,
   ApiParam,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { FileQueryDto, FileResponseDto, FileUploadDto } from './file.dto';
import { FileType } from '../../../entities/recruitment/file.entity';
import { FileService } from './file.service';

// Configure multer for file uploads
const multerConfig = {
   storage: diskStorage({
      destination: './temp-uploads', // A temporary directory
      filename: (req, file, cb) => {
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
         cb(null, `${uniqueSuffix}-${file.originalname}`);
      },
   }),
   limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
   },
};

@ApiTags('Files')
@Controller('files')
@ApiBearerAuth()
export class FileController {
   constructor(private readonly fileService: FileService) {}

   @Post('upload')
   @ApiOperation({
      summary: 'Upload a file',
      description: `Upload a file with metadata. Supported file types:
      
      **Employee Avatar:** JPEG, PNG, GIF, WebP images (max 10MB)
      **Candidate Resume:** PDF, Word documents, plain text (max 10MB)
      **Employee Resume:** PDF, Word documents, plain text (max 10MB)
      **Company Logo:** JPEG, PNG, GIF, WebP images (max 10MB)
      **General Document:** All supported formats (max 10MB)
      
      Files are automatically organized into folders based on file type.
      
      **Usage Examples:**
      - Employee Avatar: Select image file, set fileType to 'employee_avatar', add employee ID as referenceId
      - Candidate Resume: Select PDF/DOC file, set fileType to 'candidate_resume', add candidate ID as referenceId
      - Employee Resume: Select PDF/DOC file, set fileType to 'employee_resume', add employee ID as referenceId
      - Company Logo: Select image file, set fileType to 'company_logo', add company ID as referenceId`,
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'File upload form with metadata',
      type: FileUploadDto,
      examples: {
         employeeAvatar: {
            summary: 'Upload Employee Avatar',
            value: {
               file: 'employee_photo.jpg',
               fileType: 'employee_avatar',
               referenceId: 123,
               referenceType: 'employee',
               description: 'Professional headshot photo',
            },
         },
         candidateResume: {
            summary: 'Upload Candidate Resume',
            value: {
               file: 'john_doe_resume.pdf',
               fileType: 'candidate_resume',
               referenceId: 456,
               referenceType: 'candidate',
               description: 'Updated resume with 5 years experience',
            },
         },
         employeeResume: {
            summary: 'Upload Employee Resume',
            value: {
               file: 'employee_resume.pdf',
               fileType: 'employee_resume',
               referenceId: 789,
               referenceType: 'employee',
               description: 'Current employee resume',
            },
         },
         companyLogo: {
            summary: 'Upload Company Logo',
            value: {
               file: 'company_logo.png',
               fileType: 'company_logo',
               referenceId: 789,
               referenceType: 'company',
               description: 'Official company brand logo',
            },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'File uploaded successfully',
      type: FileResponseDto,
      examples: {
         success: {
            summary: 'Successful Upload',
            value: {
               fileId: 123,
               originalName: 'employee_photo.jpg',
               fileUrl: 'http://localhost:3003/uploads/avatars/1692180000000_employee_photo.jpg',
               fileType: 'employee_avatar',
               fileSize: 1048576,
               fileSizeFormatted: '1.0 MB',
               mimeType: 'image/jpeg',
               referenceId: 123,
               createdAt: '2025-08-16T10:30:00Z',
               updatedAt: '2025-08-16T10:30:00Z',
            },
         },
      },
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid file, file type not allowed, or validation error',
      examples: {
         noFile: {
            summary: 'No File Provided',
            value: {
               statusCode: 400,
               message: 'No file provided',
               error: 'Bad Request',
            },
         },
         invalidType: {
            summary: 'Invalid File Type',
            value: {
               statusCode: 400,
               message: 'File type application/exe is not allowed for employee_avatar',
               error: 'Bad Request',
            },
         },
         fileTooLarge: {
            summary: 'File Too Large',
            value: {
               statusCode: 400,
               message: 'File too large',
               error: 'Bad Request',
            },
         },
      },
   })
   @UseInterceptors(FileInterceptor('file', multerConfig))
   async uploadFile(
      @Body() uploadDto: FileUploadDto,
      @UploadedFile() file: Express.Multer.File,
   ): Promise<FileResponseDto> {
      if (!file) {
         throw new BadRequestException('No file provided');
      }
      return await this.fileService.create({
         fileName: file.filename,
         fileSize: file.size,
         mimeType: file.mimetype,
         fileType: uploadDto.fileType,
         referenceId: uploadDto.referenceId,
         fileUrl: '',
         originalName: file.originalname,
      });
   }

   @Get('file-types')
   @ApiOperation({
      summary: 'Get supported file types',
      description: 'Get information about supported file types and their allowed MIME types',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'File type information retrieved successfully',
      schema: {
         type: 'object',
         properties: {
            fileTypes: {
               type: 'array',
               items: {
                  type: 'object',
                  properties: {
                     type: { type: 'string', example: 'employee_avatar' },
                     description: { type: 'string', example: 'Employee profile pictures' },
                     allowedMimeTypes: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                     },
                     maxSize: { type: 'string', example: '10MB' },
                     uploadPath: { type: 'string', example: './uploads/avatars' },
                  },
               },
            },
         },
      },
   })
   async getFileTypes() {
      return {
         fileTypes: [
            {
               type: FileType.EMPLOYEE_AVATAR,
               description: 'Employee profile pictures',
               allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
               maxSize: '10MB',
               uploadPath: './uploads/avatars',
               examples: ['employee_photo.jpg', 'profile_pic.png'],
            },
            {
               type: FileType.CANDIDATE_RESUME,
               description: 'Candidate CV/resume files',
               allowedMimeTypes: [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain',
               ],
               maxSize: '10MB',
               uploadPath: './uploads/candidate_resume',
               examples: ['john_doe_resume.pdf', 'cv_2025.docx'],
            },
            {
               type: FileType.COMPANY_LOGO,
               description: 'Company brand logos',
               allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
               maxSize: '10MB',
               uploadPath: './uploads/logos',
               examples: ['company_logo.png', 'brand_logo.svg'],
            },
            {
               type: FileType.EMPLOYEE_RESUME,
               description: 'Employee resume files',
               allowedMimeTypes: [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain',
               ],
               maxSize: '10MB',
               uploadPath: './uploads/employee_resume',
               examples: ['employee_resume.pdf', 'updated_cv.docx'],
            },
            {
               type: FileType.GENERAL_DOCUMENT,
               description: 'General document files',
               allowedMimeTypes: [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain',
                  'image/jpeg',
                  'image/png',
                  'image/gif',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               ],
               maxSize: '10MB',
               uploadPath: './uploads/documents',
               examples: ['document.pdf', 'spreadsheet.xlsx'],
            },
         ],
      };
   }

   @Get()
   @ApiOperation({
      summary: 'Get files with filters',
      description: 'Retrieve files with optional filtering and pagination',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Files retrieved successfully',
      type: [FileResponseDto],
   })
   async getFiles(@Query() query: FileQueryDto): Promise<{
      data: FileResponseDto[];
      total: number;
      page: number;
      limit: number;
   }> {
      const mockFiles: FileResponseDto[] = [
         {
            fileId: 1,
            originalName: 'john_doe_avatar.jpg',
            fileUrl: 'http://localhost:3003/uploads/avatars/1642780800000_john_doe_avatar.jpg',
            fileType: FileType.EMPLOYEE_AVATAR,
            fileSize: 1024000,
            fileSizeFormatted: '1.0 MB',
            mimeType: 'image/jpeg',
            referenceId: 123,
            createdAt: new Date('2024-01-20T10:30:00Z'),
            updatedAt: new Date('2024-01-20T10:30:00Z'),
         },
         {
            fileId: 2,
            originalName: 'jane_smith_resume.pdf',
            fileUrl: 'http://localhost:3003/uploads/resumes/1642780900000_jane_smith_resume.pdf',
            fileType: FileType.CANDIDATE_RESUME,
            fileSize: 2048000,
            fileSizeFormatted: '2.0 MB',
            mimeType: 'application/pdf',
            referenceId: 456,
            createdAt: new Date('2024-01-20T11:00:00Z'),
            updatedAt: new Date('2024-01-20T11:00:00Z'),
         },
      ];

      // Apply filters (simplified example)
      let filteredFiles = mockFiles;
      if (query.fileType) {
         filteredFiles = filteredFiles.filter((f) => f.fileType === query.fileType);
      }
      if (query.referenceId) {
         filteredFiles = filteredFiles.filter((f) => f.referenceId === query.referenceId);
      }

      return {
         data: filteredFiles,
         total: filteredFiles.length,
         page: query.page || 1,
         limit: query.limit || 10,
      };
   }

   @Get('candidate/:candidateId')
   @ApiOperation({
      summary: 'Get files by candidateId ',
      description: 'Retrieve all files associated with a specific candidateId',
   })
   @ApiParam({
      name: 'candidateId',
      description: 'candidateId ID',
      example: 1,
   })
   async getFilesByCandidateId(
      @Param('candidateId') candidateId: number,
   ): Promise<FileResponseDto[]> {
      try {
         const files = await this.fileService.findByCandidateId(candidateId);
         return files;
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException(
            `Failed to retrieve files for application: ${error.message}`,
         );
      }
   }

   @Get(':id')
   @ApiOperation({
      summary: 'Get file by ID',
      description: 'Retrieve a specific file by its ID',
   })
   @ApiParam({
      name: 'id',
      description: 'File ID',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'File retrieved successfully',
      type: FileResponseDto,
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'File not found',
   })
   async getFileById(@Param('id', ParseIntPipe) id: number): Promise<FileResponseDto> {
      // In a real application: const file = await this.fileService.findById(id);
      // if (!file) throw new NotFoundException('File not found');

      // Mock response
      const mockFile: FileResponseDto = {
         fileId: id,
         originalName: 'example_file.pdf',
         fileUrl: `http://localhost:3003/uploads/documents/1642780800000_example_file.pdf`,
         fileType: FileType.GENERAL_DOCUMENT,
         fileSize: 1536000,
         fileSizeFormatted: '1.5 MB',
         mimeType: 'application/pdf',
         referenceId: 789,
         createdAt: new Date('2024-01-20T10:30:00Z'),
         updatedAt: new Date('2024-01-20T10:30:00Z'),
      };

      return mockFile;
   }

   @Delete(':id')
   @ApiOperation({
      summary: 'Delete file',
      description: 'Hard delete a file (permanently removes file and database record)',
   })
   @ApiParam({
      name: 'id',
      description: 'File ID',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'File deleted successfully',
   })
   @ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Error occurred during file deletion',
   })
   async deleteFile(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
      try {
         await this.fileService.hardDelete(id);
         return { message: `File with ID ${id} has been permanently deleted successfully` };
      } catch (error) {
         if (error instanceof NotFoundException) {
            throw error;
         }
         throw new BadRequestException(`Failed to delete file: ${error.message}`);
      }
   }

   @Post('test-certificate-ocr')
   @ApiOperation({
      summary: '🧪 Test Certificate OCR Analysis',
      description: `Test endpoint to analyze certificate images using OCR without sending emails.
      
      **Perfect for testing:**
      - TOEIC, IELTS, TOEFL certificate photos
      - AWS, Google, Microsoft certification screenshots  
      - University diplomas and academic certificates
      - Any photographed or scanned certificate
      
      **Supports:**
      - Image formats: JPG, PNG, TIFF, WebP
      - Languages: English + Vietnamese OCR
      - Automatic text extraction and analysis
      - Certificate type detection and scoring
      
      **What it extracts:**
      - Certificate type (TOEIC, AWS, etc.)
      - Scores and grades
      - Issue/expiry dates  
      - Candidate names
      - Confidence ratings`,
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'Certificate image file for OCR analysis',
      schema: {
         type: 'object',
         properties: {
           file: {
             type: 'string',
             format: 'binary',
             description: 'Certificate image file (JPG, PNG, TIFF, WebP)',
           },
           candidateId: {
             type: 'number',
             description: 'Optional candidate ID to associate with certificate',
             example: 123
           }
         },
         required: ['file']
       },
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'OCR analysis completed successfully',
      schema: {
         type: 'object',
         properties: {
            success: { type: 'boolean', example: true },
            processingTimeMs: { type: 'number', example: 5420 },
            fileName: { type: 'string', example: 'toeic_certificate.jpg' },
            fileSize: { type: 'string', example: '2.1 MB' },
            ocrResults: {
               type: 'object',
               properties: {
                  type: { type: 'string', example: 'image_certificate_ocr' },
                  ocrSuccess: { type: 'boolean', example: true },
                  extractedText: { type: 'string', example: 'TOEIC Listening and Reading Test Certificate...' },
                  ocrConfidence: { type: 'number', example: 89.5 },
                  certificateType: { type: 'string', example: 'TOEIC' },
                  score: { type: 'string', example: '850' },
                  candidateName: { type: 'string', example: 'Nguyen Van An' },
                  issueDate: { type: 'string', example: '15/03/2024' },
                  confidence: { type: 'string', example: 'high' },
                  summary: { type: 'string', example: 'TOEIC | Score: 850 | Candidate: Nguyen Van An (90% OCR confidence)' },
                  recommendations: { 
                     type: 'array', 
                     items: { type: 'string' },
                     example: ['TOEIC certificate detected - high value credential']
                  }
               }
            }
         }
      }
   })
   @UseInterceptors(FileInterceptor('file', multerConfig))
   async testCertificateOCR(
      @Body('candidateId') candidateId?: number,
      @UploadedFile() file?: Express.Multer.File,
   ) {
      if (!file) {
         throw new BadRequestException('No certificate file provided');
      }

      // Validate file type (should be image)
      if (!file.mimetype.startsWith('image/')) {
         throw new BadRequestException('File must be an image (JPG, PNG, TIFF, WebP)');
      }

      const startTime = Date.now();

      try {
         // Create a temporary file entity for testing
         const tempFile = await this.fileService.create({
            originalName: file.originalname,
            fileName: file.filename, 
            fileUrl: file.path,
            mimeType: file.mimetype,
            fileSize: file.size,
            fileType: FileType.CANDIDATE_CERTIFICATE,
            referenceId: candidateId,
            // metadata: {
            //    source: 'test_endpoint',
            //    isTest: true,
            // }
         });

         // Run OCR analysis
         const ocrResults = await this.fileService['analyzeImageCertificateWithOCR'](tempFile);
         
         const processingTime = Date.now() - startTime;

         return {
            success: true,
            processingTimeMs: processingTime,
            fileName: file.originalname,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            testFileId: tempFile.fileId,
            ocrResults,
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         
         return {
            success: false,
            processingTimeMs: processingTime,
            fileName: file.originalname,
            error: error.message,
            details: 'OCR analysis failed - check file quality and format'
         };
      }
   }

   @Post('test-brevo-simulation')
   @ApiOperation({
      summary: '🧪 Test Brevo Email Simulation',
      description: `Simulate Brevo email processing with multiple file attachments without sending real emails.
      
      **Perfect for testing:**
      - CV + Certificate combinations 
      - Multiple certificate files
      - File type detection (CV vs Certificate)
      - Complete candidate processing workflow
      
      **Upload multiple files:**
      - First file that looks like CV → Processed as resume
      - Image files → Processed as certificates with OCR
      - PDF files → Analyzed for content type
      
      **Simulates real email flow:**
      - Downloads and analyzes all attachments
      - Determines file types intelligently  
      - Processes CV to create candidate + application
      - Analyzes certificates with OCR
      - Links all files to candidate profile`,
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'Multiple files simulating email attachments',
      schema: {
         type: 'object',
         properties: {
           files: {
             type: 'array',
             items: {
               type: 'string',
               format: 'binary'
             },
             description: 'Multiple files (CVs, certificates, etc.)'
           },
           jobId: {
             type: 'number',
             description: 'Job posting ID for application creation',
             example: 123
           },
           senderEmail: {
             type: 'string',
             description: 'Simulated sender email',
             example: 'candidate@example.com'
           }
         },
         required: ['files', 'jobId']
       }
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Brevo simulation completed successfully',
      schema: {
         type: 'object',
         properties: {
            success: { type: 'boolean' },
            processingTimeMs: { type: 'number' },
            candidateId: { type: 'number' },
            filesProcessed: { type: 'number' },
            cvFile: { type: 'object' },
            certificateFiles: { type: 'array' },
            fileAnalysis: { type: 'object' }
         }
      }
   })
   @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
   async testBrevoSimulation(
      @Body('jobId', ParseIntPipe) jobId: number,
      @Body('senderEmail') senderEmail: string = 'test@example.com',
      @UploadedFiles() files?: Express.Multer.File[],
   ) {
      if (!files || files.length === 0) {
         throw new BadRequestException('No files provided for simulation');
      }

      const startTime = Date.now();

      try {
         // Simulate Brevo attachments structure
         const mockAttachments = files.map((file, index) => ({
            Name: file.originalname,
            ContentType: file.mimetype,
            DownloadToken: `mock-token-${index}`,
            // We'll use file.path as the "downloaded" file path
            mockFilePath: file.path
         }));

         // Simulate email metadata
         const emailMetadata = {
            messageId: `test-message-${Date.now()}`,
            senderEmail: senderEmail,
            subject: 'Test Application with Attachments', 
            recipientEmail: `job${jobId}@techleet.me`
         };

         // Mock the download process by copying files
         for (let i = 0; i < mockAttachments.length; i++) {
            const attachment = mockAttachments[i];
            const originalFile = files[i];
            
            // Copy file to temp location that processBrevoAttachments expects
            const fs = require('fs');
            const tempPath = `temp-uploads/${Date.now()}-${attachment.Name}`;
            fs.copyFileSync(originalFile.path, tempPath);
            attachment.mockFilePath = tempPath;
         }

         // Process using the same logic as Brevo webhooks
         const processedFiles = await this.fileService['processBrevoAttachments'](
            mockAttachments as any,
            emailMetadata
         );

         const processingTime = Date.now() - startTime;

         // Analyze results
         const cvFiles = processedFiles.filter(f => f.fileType === FileType.CANDIDATE_RESUME);
         const certificateFiles = processedFiles.filter(f => f.fileType === FileType.CANDIDATE_CERTIFICATE);
         
         return {
            success: true,
            processingTimeMs: processingTime,
            simulation: {
               emailMetadata,
               filesUploaded: files.length,
               filesProcessed: processedFiles.length,
            },
            results: {
               candidateId: processedFiles[0]?.referenceId || null,
               cvFiles: cvFiles.length,
               certificateFiles: certificateFiles.length,
               totalFiles: processedFiles.length
            },
            fileAnalysis: {
               cvFile: cvFiles[0] ? {
                  fileName: cvFiles[0].originalName,
                  fileType: cvFiles[0].fileType,
                  candidateId: cvFiles[0].referenceId
               } : null,
               certificates: certificateFiles.map(f => ({
                  fileName: f.originalName,
                  fileType: f.fileType,
                  candidateId: f.referenceId,
                  metadata: f.metadata
               }))
            },
            processedFiles: processedFiles.map(f => ({
               fileId: f.fileId,
               originalName: f.originalName,
               fileType: f.fileType,
               referenceId: f.referenceId,
               metadata: f.metadata
            }))
         };

      } catch (error) {
         const processingTime = Date.now() - startTime;
         
         return {
            success: false,
            processingTimeMs: processingTime,
            error: error.message,
            details: 'Brevo simulation failed - check files and job ID'
         };
      }
   }
}
