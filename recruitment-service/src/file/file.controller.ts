import {
   Body,
   Controller,
   Post,
   UploadedFile,
   UploadedFiles,
   UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
   ApiTags,
   ApiConsumes,
   ApiBody,
   ApiOperation,
   ApiResponse,
   ApiProperty,
} from '@nestjs/swagger';
import { FileSizeValidationPipe } from '../common/pipe/fileSizeValidationPipe.pipe';
import { MultipleFileSizeValidationPipe } from '../common/pipe/multipleFileSizeValidationPipe.pipe';
import { UploadFileToRoom } from './dto/uploadFileToRoom.dto';
import { FileService } from './file.service';

// DTO for single file upload with form data
class SingleFileUploadDto {
   @ApiProperty({
      type: 'string',
      format: 'binary',
      description: 'Single file to upload',
   })
   fileSingle: any;

   @ApiProperty({
      type: 'string',
      example: '213534dfg568',
      description: 'Room ID where the file will be uploaded',
   })
   roomId: string;
}

// DTO for multiple files upload
class MultipleFilesUploadDto {
   @ApiProperty({
      type: 'array',
      items: {
         type: 'string',
         format: 'binary',
      },
      description: 'Multiple files to upload',
   })
   multipleFiles: any[];
}

@Controller('/file-cloud')
@ApiTags('file-cloud')
export class FileCloudController {
   constructor(private fileService: FileService) {}

   @Post('upload-multiple-files')
   @UseInterceptors(FilesInterceptor('multipleFiles'))
   @ApiOperation({
      summary: 'Upload multiple files',
      description: 'Upload multiple files to the server',
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'Multiple files upload',
      type: MultipleFilesUploadDto,
   })
   @ApiResponse({
      status: 201,
      description: 'Files uploaded successfully',
      schema: {
         type: 'object',
         properties: {
            message: { type: 'string', example: 'Files uploaded successfully' },
            filesCount: { type: 'number', example: 3 },
            uploadedFiles: {
               type: 'array',
               items: {
                  type: 'object',
                  properties: {
                     originalname: { type: 'string' },
                     filename: { type: 'string' },
                     size: { type: 'number' },
                  },
               },
            },
         },
      },
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Invalid file format or size',
   })
   async uploadMultipleFiles(
      @UploadedFiles(new MultipleFileSizeValidationPipe()) files: Express.Multer.File[],
   ) {
      console.log(files);
      return {
         message: 'Files uploaded successfully',
         filesCount: files.length,
         uploadedFiles: files.map((file) => ({
            originalname: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
         })),
      };
   }

   @Post('upload-single-file')
   @UseInterceptors(FileInterceptor('fileSingle'))
   @ApiOperation({
      summary: 'Upload single file',
      description: 'Upload a single file to a specific room',
   })
   @ApiConsumes('multipart/form-data')
   @ApiBody({
      description: 'Single file upload with room ID',
      type: SingleFileUploadDto,
   })
   @ApiResponse({
      status: 201,
      description: 'File uploaded successfully',
      schema: {
         type: 'object',
         properties: {
            message: { type: 'string', example: 'File uploaded successfully' },
            roomId: { type: 'string', example: '213534dfg568' },
            file: {
               type: 'object',
               properties: {
                  originalname: { type: 'string' },
                  filename: { type: 'string' },
                  size: { type: 'number' },
                  mimetype: { type: 'string' },
               },
            },
         },
      },
   })
   @ApiResponse({
      status: 400,
      description: 'Bad request - Invalid file format or size',
   })
   @ApiResponse({
      status: 500,
      description: 'Internal server error',
   })
   async uploadSingleFile(
      @Body() data: UploadFileToRoom,
      @UploadedFile(new FileSizeValidationPipe()) fileSingle: Express.Multer.File,
   ) {
      return await this.fileService.saveSingleFile(fileSingle, data);
   }
}
