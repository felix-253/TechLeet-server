import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileModule } from '../file/file.module';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: [`.env.development`, '.env', '.env.firebase'],
      }),
      FileModule,
   ],
   providers: [],
   exports: [],
})
export class ConfigAppsModule {}
