import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { BrevoWebhookController } from './brevo-webhook.controller';
import { FileService } from './file.service';
import { FileEntity } from '../../../entities/recruitment/file.entity';
import { InformationService } from '../cv-screening/services/information.service';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CvTextExtractionService } from '../cv-screening/processors/cv-text-extraction.service';
import { CvNlpProcessingService } from '../cv-screening/processors/cv-nlp-processing.service';
import { CvLlmSummaryService } from '../cv-screening/processors/cv-llm-summary.service';
import { ApplicationService } from '../application/application.service';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CvScreeningService } from '../cv-screening/cv-screening.service';
import { CvScreeningResultEntity } from '../../../entities/recruitment/cv-screening-result.entity';
import { CvScreeningWorkerService } from '../cv-screening/services/cv-screening-worker.service';
import { CvQueueService } from '../cv-screening/services/cv-queue.service';
import { CvEmbeddingService } from '../cv-screening/processors/cv-embedding.service';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { FilterScoreEntity } from '../../../entities/recruitment/filter-score.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';

// Import new modular services
import { OcrService } from './ocr/ocr.service';
import { CvAnalyzer } from './processors/cv-analyzer.service';
import { CertificateAnalyzer } from './processors/certificate-analyzer.service';
import { BrevoHandler } from './handlers/brevo-handler.service';
import { FileManagementHandler } from './handlers/file-management.service';

// Import email service directly (not module to avoid circular dependency)
import { RecruitmentEmailService } from '../email/email.service';
import { AdaptiveThresholdService } from '../cv-screening/services/adaptive-threshold.service';
import { ScoringService } from '../cv-screening/services/scoring.service';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         FileEntity,
         CandidateEntity,
         ApplicationEntity,
         JobPostingEntity,
         CvScreeningResultEntity,
         CvEmbeddingEntity,
         FilterScoreEntity,
         InterviewEntity,
      ]),
   ],
   controllers: [FileController, BrevoWebhookController],
   providers: [
      FileService,
      InformationService,
      CvTextExtractionService,
      CvNlpProcessingService,
      CvLlmSummaryService,
      AdaptiveThresholdService,
      ApplicationService,
      CvScreeningService,
      CvScreeningWorkerService,
      CvQueueService,
      CvEmbeddingService,
      ScoringService,
      // New modular services
      OcrService,
      CvAnalyzer,
      CertificateAnalyzer,
      BrevoHandler,
      FileManagementHandler,
      RecruitmentEmailService,
   ],
   exports: [
      FileService,
      OcrService,
      CvAnalyzer,
      CertificateAnalyzer,
      BrevoHandler,
      FileManagementHandler,
   ],
})
export class FileModule {}
