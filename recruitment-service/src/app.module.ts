import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';

// Controllers
import { ApplicationController } from './controllers/application.controller';
import { CandidateController } from './controllers/candidate.controller';
import { InterviewController } from './controllers/interview.controller';
import { JobPostingController } from './controllers/job-posting.controller';

// Services
import { ApplicationService } from './services/application.service';
import { CandidateService } from './services/candidate.service';
import { InterviewService } from './services/interview.service';
import { JobPostingService } from './services/job-posting.service';

// Entities
import { ApplicationEntity } from './entities/recruitment/application.entity';
import { CandidateEntity } from './entities/recruitment/candidate.entity';
import { InterviewEntity } from './entities/recruitment/interview.entity';
import { JobPostingEntity } from './entities/recruitment/job-posting.entity';

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
         ApplicationEntity,
         CandidateEntity,
         InterviewEntity,
         JobPostingEntity,
      ]),
   ],
   controllers: [
      HealthController,
      ApplicationController,
      CandidateController,
      InterviewController,
      JobPostingController,
   ],
   providers: [
      ApplicationService,
      CandidateService,
      InterviewService,
      JobPostingService,
   ],
})
export class AppModule {}
