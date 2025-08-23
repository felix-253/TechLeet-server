import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { getDatabaseConfig } from './config/database.config';
import { ConfigAppsModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { CoreModuleModule } from './app/module/core-module.module';

@Module({
   imports: [
      ConfigAppsModule,
      TypeOrmModule.forRootAsync({
         imports: [ConfigModule],
         useFactory: getDatabaseConfig,
         inject: [ConfigService],
      }),
      ServeStaticModule.forRoot({
         rootPath: join(__dirname, '..', 'uploads'),
         serveRoot: '/api/uploads',
      }),
      CoreModuleModule,
   ],
   controllers: [HealthController],
})
export class AppModule {}
