import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvScreeningController } from './cv-screening.controller';
import { CvScreeningService } from './cv-screening.service';
import { CvScreeningWorkerService } from './cv-screening-worker.service';
import { CvTextExtractionService } from './cv-text-extraction.service';
import { CvNlpProcessingService } from './cv-nlp-processing.service';
import { CvEmbeddingService } from './cv-embedding.service';
import { CvLlmSummaryService } from './cv-llm-summary.service';
import { CvQueueService } from './cv-queue.service';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         CvScreeningResultEntity,
         CvEmbeddingEntity,
         ApplicationEntity,
         JobPostingEntity,
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
      CvQueueService,
   ],
   exports: [
      CvScreeningService,
      CvScreeningWorkerService,
      CvTextExtractionService,
      CvNlpProcessingService,
      CvEmbeddingService,
      CvLlmSummaryService,
      CvQueueService,
   ],
})
export class CvScreeningModule {}
