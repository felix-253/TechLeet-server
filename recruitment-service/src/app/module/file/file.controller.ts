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
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
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
}
