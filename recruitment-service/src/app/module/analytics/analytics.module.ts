import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './analytics-cache.service';
import { CompanyServiceClient } from './company-service.client';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         JobPostingEntity,
         ApplicationEntity,
         CandidateEntity,
         InterviewEntity,
      ]),
   ],
   controllers: [AnalyticsController],
   providers: [AnalyticsService, AnalyticsCacheService, CompanyServiceClient],
   exports: [AnalyticsService, CompanyServiceClient],
})
export class AnalyticsModule {}

