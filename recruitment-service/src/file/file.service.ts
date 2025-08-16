import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import { UploadFileToRoom } from './dto/uploadFileToRoom.dto';

export type UploadMultipleFilesType = {
   files: Express.Multer.File[];
   dateSave: UploadFileToRoom;
};

export type ResponseFileData = {
   url: string;
   index: number;
   data: {
      name: string;
      size: string;
      type: string;
   };
};
@Injectable()
export class FileService {
   private baseUploadPath = join(process.cwd() + `/${process.env.PUBLIC_FOLDER}`);

   async saveSingleFile(
      fileSingle: Express.Multer.File,
      dataUpload: UploadFileToRoom,
   ): Promise<ResponseFileData> {
      try {
         const uploadPath = join(this.baseUploadPath, dataUpload.roomId);

         await fs.ensureDir(uploadPath);
         await fs.chmod(uploadPath, 0o755);
         const uniqueName = `${uuid()}-${Date.now()}-${fileSingle.originalname}`;
         const filePath = `${uploadPath}/${uniqueName}`;
         await fs.writeFile(filePath, fileSingle.buffer);
         await fs.chmod(filePath, 0o644);
         const relativePath = join(
            process.env.PUBLIC_FOLDER || '',
            dataUpload.roomId,
            uniqueName,
         ).replace(/\\/g, '/');
         return {
            url: `${process.env.FULL_DOMAIN}/${relativePath}`,
            index: 0,
            data: {
               name: fileSingle.originalname,
               size: fileSingle.size.toString(),
               type: fileSingle.mimetype,
            },
         };
      } catch (error) {
         throw new InternalServerErrorException(`Error saving file: ${error.message}`);
      }
   }

   async saveMultipleFile(files: UploadMultipleFilesType): Promise<ResponseFileData[]> {
      const savedFiles: ResponseFileData[] = [];
      for (const [index, file] of files.files.entries()) {
         const fileSaved = await this.saveSingleFile(file, files.dateSave);
         fileSaved.index = index;
         savedFiles.push(fileSaved);
         console.log('fileSaved', fileSaved);
      }
      return savedFiles;
   }

   async removeFileByLink(link: string) {
      try {
         const relativePath = link.replace(`${process.env.FULL_DOMAIN}/`, '');
         const absolutePath = join(process.cwd(), relativePath);

         const fileExists = await fs.pathExists(absolutePath);
         if (!fileExists) {
            throw new InternalServerErrorException(`File not found at path: ${absolutePath}`);
         }

         await fs.remove(absolutePath);
      } catch (error) {
         throw new InternalServerErrorException(`Error removing file at path: ${error.message}`);
      }
   }
}
