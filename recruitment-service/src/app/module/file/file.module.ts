import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { BrevoWebhookController } from './brevo-webhook.controller';
import { FileService } from './file.service';
import { FileEntity } from '../../../entities/recruitment/file.entity';
import { InformationService } from '../cv-screening/information.service';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CvTextExtractionService } from '../cv-screening/cv-text-extraction.service';
import { CvNlpProcessingService } from '../cv-screening/cv-nlp-processing.service';
import { CvLlmSummaryService } from '../cv-screening/cv-llm-summary.service';
import { ApplicationService } from '../application/application.service';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CvScreeningService } from '../cv-screening/cv-screening.service';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvScreeningWorkerService } from '../cv-screening/cv-screening-worker.service';
import { CvQueueService } from '../cv-screening/cv-queue.service';
import { CvEmbeddingService } from '../cv-screening/cv-embedding.service';
import { CvChunkingService } from '../cv-screening/cv-chunking.service';
import { SkillTaxonomyService } from '../cv-screening/skill-taxonomy.service';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { CvEmbeddingChunkEntity } from '../../../entities/recruitment/cv-embedding-chunk.entity';
import { SkillEntity } from '../../../entities/recruitment/skill.entity';
import { SkillAliasEntity } from '../../../entities/recruitment/skill-alias.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         FileEntity,
         CandidateEntity,
         ApplicationEntity,
         JobPostingEntity,
         CvScreeningResultEntity,
         CvEmbeddingEntity,
         CvEmbeddingChunkEntity,
         SkillEntity,
         SkillAliasEntity,
      ]),
   ],
   controllers: [FileController, BrevoWebhookController],
   providers: [
      FileService,
      InformationService,
      CvTextExtractionService,
      CvNlpProcessingService,
      CvLlmSummaryService,
      ApplicationService,
      CvScreeningService,
      CvScreeningWorkerService,
      CvQueueService,
      CvEmbeddingService,
      CvChunkingService,
      SkillTaxonomyService,
      
   ],
   exports: [FileService],
})
export class FileModule {}
