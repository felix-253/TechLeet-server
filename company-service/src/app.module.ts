import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';

// Entities
import { HeadquarterEntity } from './entities/master/headquarter.entity';
import { DepartmentEntity } from './entities/master/department.entity';
import { DepartmentTypeEntity } from './entities/master/department-type.entity';
import { PositionEntity } from './entities/master/position.entity';
import { PositionTypeEntity } from './entities/master/position-type.entity';

// Controllers
import { HeadquarterController } from './controllers/headquarter.controller';
import { DepartmentController } from './controllers/department.controller';
import { PositionController } from './controllers/position.controller';

// Services
import { HeadquarterService } from './services/headquarter.service';
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
         HeadquarterEntity,
         DepartmentEntity,
         DepartmentTypeEntity,
         PositionEntity,
         PositionTypeEntity,
      ]),
   ],
   controllers: [
      HealthController,
      HeadquarterController,
      DepartmentController,
      PositionController,
   ],
   providers: [
      HeadquarterService,
      DepartmentService,
      PositionService,
   ],
})
export class AppModule {}
