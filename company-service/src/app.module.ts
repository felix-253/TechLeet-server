import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';

// Entities
import { DepartmentEntity } from './entities/master/department.entity';
import { PositionEntity } from './entities/master/position.entity';

// Controllers
import { DepartmentController } from './controllers/department.controller';
import { PositionController } from './controllers/position.controller';

// Services
import { DepartmentService } from './services/department.service';
import { PositionService } from './services/position.service';

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
      TypeOrmModule.forFeature([
         DepartmentEntity,
         PositionEntity,
      ]),
   ],
   controllers: [
      HealthController,
      DepartmentController,
      PositionController,
   ],
   providers: [
      DepartmentService,
      PositionService,
   ],
})
export class AppModule {}
