import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import {
   ScreeningController,
   InformationController,
   ThresholdController,
   TestingController,
} from './controllers';
import { CvScreeningService } from './cv-screening.service';
import {
   CvScreeningWorkerService,
   CvQueueService,
   InformationService,
   AdaptiveThresholdService,
   ScoringService,
} from './services';
import {
   CvTextExtractionService,
   CvNlpProcessingService,
   CvEmbeddingService,
   CvLlmSummaryService,
} from './processors';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { FilterScoreEntity } from '../../../entities/recruitment/filter-score.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { ExaminationEntity } from '../../../entities/question/examination.entity';
import { RecruitmentEmailModule } from '../email/email.module';
import { CandidateModule } from '../candidate/candidate.module';
import { ApplicationModule } from '../application/application.module';
import { QuestionModule } from '../question/question.module';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         CvScreeningResultEntity,
         CvEmbeddingEntity,
         ApplicationEntity,
         JobPostingEntity,
         CandidateEntity,
         FilterScoreEntity,
         InterviewEntity,
         ExaminationEntity,
      ]),
      ScheduleModule.forRoot(),
      RecruitmentEmailModule,
      CandidateModule,
      forwardRef(() => ApplicationModule),
      forwardRef(() => QuestionModule),
   ],
   controllers: [
      ScreeningController,
      InformationController,
      ThresholdController,
      TestingController,
   ],
   providers: [
      CvScreeningService,
      CvScreeningWorkerService,
      CvTextExtractionService,
      CvNlpProcessingService,
      CvEmbeddingService,
      CvLlmSummaryService,
      CvQueueService,
      InformationService,
      AdaptiveThresholdService,
      ScoringService,
   ],
   exports: [
      CvScreeningService,
      CvScreeningWorkerService,
      CvTextExtractionService,
      CvNlpProcessingService,
      CvEmbeddingService,
      CvLlmSummaryService,
      CvQueueService,
      InformationService,
      AdaptiveThresholdService,
      ScoringService,
   ],
})
export class CvScreeningModule {}
