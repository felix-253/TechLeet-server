import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: [`.env.development`, '.env', '.env.firebase'],
      }),
      RedisModule,
   ],
   providers: [],
   exports: [],
})
export class ConfigAppsModule {}
