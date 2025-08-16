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
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
    FileQueryDto,
    FileResponseDto,
    FileUploadDto
} from '../entities/recruitment/file.dto';
import { FileType } from '../entities/recruitment/file.entity';
import { FileService } from '../services/file.service';

// Configure multer for file uploads
const multerConfig = {
   storage: diskStorage({
      destination: (req, file, cb) => {
         // Get file type from body or default to general_document
         const fileType = req.body.fileType || FileType.GENERAL_DOCUMENT;

         // Create directory based on file type
         let uploadDir = '';
         switch (fileType) {
            case FileType.EMPLOYEE_AVATAR:
               uploadDir = './uploads/avatars';
               break;
            case FileType.CANDIDATE_RESUME:
               uploadDir = './uploads/resumes';
               break;
            case FileType.COMPANY_LOGO:
               uploadDir = './uploads/logos';
               break;
            case FileType.JOB_ATTACHMENT:
               uploadDir = './uploads/job-attachments';
               break;
            case FileType.APPLICATION_DOCUMENT:
               uploadDir = './uploads/applications';
               break;
            default:
               uploadDir = './uploads/documents';
         }

         // Create directory if it doesn't exist
         if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
         }

         cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
         // Generate unique filename with timestamp
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
         const ext = extname(file.originalname);
         const baseName = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
         cb(null, `${uniqueSuffix}_${baseName}${ext}`);
      },
   }),
   fileFilter: (req, file, cb) => {
      // Define allowed file types based on upload type
      const fileType = req.body.fileType || FileType.GENERAL_DOCUMENT;
      let allowedTypes: string[] = [];

      switch (fileType) {
         case FileType.EMPLOYEE_AVATAR:
         case FileType.COMPANY_LOGO:
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            break;
         case FileType.CANDIDATE_RESUME:
         case FileType.APPLICATION_DOCUMENT:
            allowedTypes = [
               'application/pdf',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'text/plain',
            ];
            break;
         case FileType.JOB_ATTACHMENT:
         default:
            allowedTypes = [
               'application/pdf',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'text/plain',
               'image/jpeg',
               'image/png',
               'image/gif',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
      }

      if (allowedTypes.includes(file.mimetype)) {
         cb(null, true);
      } else {
         cb(
            new BadRequestException(`File type ${file.mimetype} is not allowed for ${fileType}`),
            false,
         );
      }
   },
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
      description: 'Upload a file with metadata. File will be stored based on its type.',
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'File upload with metadata',
      type: FileUploadDto,
   })
   @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'File uploaded successfully',
      type: FileResponseDto,
   })
   @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid file or file type not allowed',
   })
   @UseInterceptors(FileInterceptor('file', multerConfig))
   async uploadFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() uploadDto: FileUploadDto,
   ): Promise<FileResponseDto> {
      if (!file) {
         throw new BadRequestException('No file provided');
      }

      // In a real application, save to database and return the entity
      // const savedFile = await this.fileService.create({
      //   originalName: file.originalname,
      //   fileName: file.filename,
      //   fileUrl: `/uploads/${file.filename}`,
      //   mimeType: file.mimetype,
      //   fileSize: file.size,
      //   fileType: uploadDto.fileType,
      //   referenceId: uploadDto.referenceId,
      //   referenceType: uploadDto.referenceType,
      //   description: uploadDto.description,
      //   uploadedBy: req.user.id, // Get from JWT token
      // });

      // Mock response for demonstration
      const mockResponse: FileResponseDto = {
         fileId: Math.floor(Math.random() * 1000) + 1,
         originalName: file.originalname,
         fileUrl: `${process.env.BASE_URL || 'http://localhost:3003'}/uploads/${file.filename}`,
         fileType: uploadDto.fileType,
         fileSize: file.size,
         fileSizeFormatted: this.formatFileSize(file.size),
         mimeType: file.mimetype,
         referenceId: uploadDto.referenceId,
         referenceType: uploadDto.referenceType,
         description: uploadDto.description,
         createdAt: new Date(),
         updatedAt: new Date(),
      };

      return mockResponse;
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
      // In a real application, implement actual database query
      // const result = await this.fileService.findWithFilters(query);

      // Mock response for demonstration
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
            referenceType: 'employee',
            description: 'Professional headshot',
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
            referenceType: 'candidate',
            description: 'Updated resume with 5 years experience',
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
         referenceType: 'application',
         description: 'Important document',
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

   @Get('download/:id')
   @ApiOperation({
      summary: 'Download file',
      description: 'Download file by ID',
   })
   @ApiParam({
      name: 'id',
      description: 'File ID',
      example: 1,
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'File download',
   })
   @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'File not found',
   })
   async downloadFile(@Param('id', ParseIntPipe) id: number) {
      // In a real application:
      // const file = await this.fileService.findById(id);
      // return response.download(file.filePath, file.originalName);

      return { message: `Download endpoint for file ${id} - implement actual file streaming here` };
   }

   // Helper method to format file size
   private formatFileSize(bytes: number): string {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
         size /= 1024;
         unitIndex++;
      }

      return `${size.toFixed(1)} ${units[unitIndex]}`;
   }
}
