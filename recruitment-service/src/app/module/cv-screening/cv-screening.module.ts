import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
   ScreeningController,
   InformationController,
   ThresholdController,
   TestingController,
} from './controllers';
import { CvScreeningService } from './cv-screening.service';
import {
   CvScreeningWorkerService,
   SkillTaxonomyService,
   CvQueueService,
   InformationService,
   AdaptiveThresholdService,
   ScoringService,
} from './services';
import {
   CvTextExtractionService,
   CvNlpProcessingService,
   CvChunkingService,
   CvEmbeddingService,
   CvLlmSummaryService,
} from './processors';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { CvEmbeddingChunkEntity } from '../../../entities/recruitment/cv-embedding-chunk.entity';
import { SkillEntity } from '../../../entities/recruitment/skill.entity';
import { SkillAliasEntity } from '../../../entities/recruitment/skill-alias.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { FilterScoreEntity } from '../../../entities/recruitment/filter-score.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         CvScreeningResultEntity,
         CvEmbeddingEntity,
         CvEmbeddingChunkEntity,
         SkillEntity,
         SkillAliasEntity,
         ApplicationEntity,
         JobPostingEntity,
         CandidateEntity,
         FilterScoreEntity,
      ]),
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
      CvChunkingService,
      SkillTaxonomyService,
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
      CvChunkingService,
      SkillTaxonomyService,
      CvQueueService,
      InformationService,
      AdaptiveThresholdService,
      ScoringService,
   ],
})
export class CvScreeningModule {}
