import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileCloudController } from './file.controller';
@Module({
   imports: [
      ConfigModule, 
      ServeStaticModule.forRootAsync({
         imports: [ConfigModule],
         inject: [ConfigService],
         useFactory: (configService: ConfigService) => {
            const publicFolder = configService.get<string>('PUBLIC_FOLDER');
            if (!publicFolder) {
               throw new Error('PUBLIC_FOLDER is not defined in .env');
            }
            return [
               {
                  rootPath: join(process.cwd(), publicFolder),
                  serveRoot: '/' + publicFolder,
               },
            ];
         },
      }),
   ],
   providers: [FileService],
   exports: [FileService],
   controllers: [FileCloudController],
})
export class FileModule {}
