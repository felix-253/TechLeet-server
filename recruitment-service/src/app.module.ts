import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: '.env',
      }),
      TypeOrmModule.forRootAsync({
         imports: [ConfigModule],
         useFactory: getDatabaseConfig,
         inject: [ConfigService],
      }),
   ],
   controllers: [HealthController],
})
export class AppModule {}
