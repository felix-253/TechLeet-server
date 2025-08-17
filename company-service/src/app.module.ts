import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';
import { ConfigAppsModule } from './config/config.module';
import { CoreModuleModule } from './app/module/core-module.module';

@Module({
   imports: [
      ConfigAppsModule,
      TypeOrmModule.forRootAsync({
         imports: [ConfigModule],
         useFactory: getDatabaseConfig,
         inject: [ConfigService],
      }),
      CoreModuleModule,
   ],
   controllers: [HealthController],
})
export class AppModule {}
