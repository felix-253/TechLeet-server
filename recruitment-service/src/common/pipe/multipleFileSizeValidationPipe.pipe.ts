import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class MultipleFileSizeValidationPipe implements PipeTransform {
   transform(files: Express.Multer.File[], metadata: ArgumentMetadata) {
      const maxSize = 100 * 1024 * 1024; //byte > kb > mb
      if (files.length >= 45) throw new BadRequestException('Just send 45 files at a time');
      for (const file of files) {
         if (file.size > maxSize) {
            throw new BadRequestException(
               `File exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
            );
         }
      }
      return files;
   }
}
