import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { RagDocumentEntity } from '../../../entities/recruitment/rag-document.entity';
import { ChatSessionEntity } from '../../../entities/recruitment/chat-session.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { CvEmbeddingEntity } from '../../../entities/recruitment/cv-embedding.entity';
import { QuestionSetEntity } from '../../../entities/question/question_set.entity';
import { QuestionSetItemEntity } from '../../../entities/question/question_set_item.entity';
import { QuestionEntity } from '../../../entities/question/question.entity';

// Services
import { ChatbotAgentService } from './chatbot-agent.service';
import { AgentExecutorService } from './services/agent-executor.service';
import { SessionManagerService } from './services/session-manager.service';
import { EmbeddingIndexerService } from './services/embedding-indexer.service';
import { RetrieverService } from './services/retriever.service';
import { RateLimiterService } from './services/rate-limiter.service';

// Tools
import { JobPostingTool } from './tools/job-posting.tool';
import { ApplicationTool } from './tools/application.tool';
import { CandidateTool } from './tools/candidate.tool';
import { AnalyticsTool } from './tools/analytics.tool';
import { InterviewTool } from './tools/interview.tool';
import { NotificationTool } from './tools/notification.tool';
import { EmailTool } from './tools/email.tool';
import { CalendarTool } from './tools/calendar.tool';
import { QuestionSetTool } from './tools/question-set.tool';
import { ReportTool } from './tools/report.tool';

// External services (reuse from existing modules)
import { CvEmbeddingService } from '../cv-screening/processors/cv-embedding.service';
import { RecruitmentEmailModule } from '../email/email.module';
import { AnalyticsModule } from '../analytics/analytics.module';

// Controller
import { ChatbotAgentController } from './chatbot-agent.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RagDocumentEntity,
      ChatSessionEntity,
      JobPostingEntity,
      ApplicationEntity,
      CandidateEntity,
      InterviewEntity,
      CvEmbeddingEntity,
      QuestionSetEntity,
      QuestionSetItemEntity,
      QuestionEntity,
    ]),
    ScheduleModule.forRoot(),
    ConfigModule,
    RecruitmentEmailModule,
    AnalyticsModule,
  ],
  controllers: [ChatbotAgentController],
  providers: [
    // Main service
    ChatbotAgentService,
    
    // Core services
    AgentExecutorService,
    SessionManagerService,
    EmbeddingIndexerService,
    RetrieverService,
    RateLimiterService,
    
    // Tools
    JobPostingTool,
    ApplicationTool,
    CandidateTool,
    AnalyticsTool,
    InterviewTool,
    NotificationTool,
    EmailTool,
    CalendarTool,
    QuestionSetTool,
    ReportTool,
    
    // External services
    CvEmbeddingService,
  ],
  exports: [
    ChatbotAgentService,
    AgentExecutorService,
    SessionManagerService,
    EmbeddingIndexerService,
    RetrieverService,
    RateLimiterService,
  ],
})
export class ChatbotAgentModule {}
