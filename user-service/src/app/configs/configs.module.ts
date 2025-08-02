import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtCoreModule } from './jwt/jwt.module';
import { DatabaseModule } from '@/common/database/database.module';
import { RedisModule } from './redis';
// import { FileModule } from './file/file.module';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: [`.env.development`, '.env', '.env.firebase'],
      }),
      DatabaseModule,
      // FileModule,
      RedisModule,
      JwtCoreModule,
   ],
   providers: [],
   exports: [],
})
export class ConfigAppsModule {}
