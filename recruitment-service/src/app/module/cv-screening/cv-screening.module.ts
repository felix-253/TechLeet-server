import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvScreeningController } from './cv-screening.controller';
import { CvScreeningService } from './cv-screening.service';
import { CvScreeningWorkerService } from './cv-screening-worker.service';
import { CvTextExtractionService } from './cv-text-extraction.service';
import { CvNlpProcessingService } from './cv-nlp-processing.service';
import { CvEmbeddingService } from './cv-embedding.service';
import { CvLlmSummaryService } from './cv-llm-summary.service';
import { CvChunkingService } from './cv-chunking.service';
import { SkillTaxonomyService } from './skill-taxonomy.service';
import { CvQueueService } from './cv-queue.service';
import { InformationService } from './information.service';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { CvEmbeddingChunkEntity } from '../../../entities/recruitment/cv-embedding-chunk.entity';
import { SkillEntity } from '../../../entities/recruitment/skill.entity';
import { SkillAliasEntity } from '../../../entities/recruitment/skill-alias.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
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
      ]),
   ],
   controllers: [CvScreeningController],
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
   ],
})
export class CvScreeningModule {}
