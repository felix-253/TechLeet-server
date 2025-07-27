import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
   transform(file: Express.Multer.File) {
      if (!file) return file;

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
         throw new BadRequestException(
            `File vượt quá dung lượng tối đa ${maxSize / 1024 / 1024}MB`,
         );
      }

      return file;
   }
}
