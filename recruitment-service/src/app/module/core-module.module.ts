import { Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';
import { CandidateModule } from './candidate/candidate.module';
import { JobPostingModule } from './job-posting/job-posting.module';
import { FileModule } from './file/file.module';
import { CvScreeningModule } from './cv-screening/cv-screening.module';
import { InterviewModule } from './interview/interview.module';
import { ChatbotAgentModule } from './chatbot-agent/chatbot-agent.module';

@Module({
   imports: [
      ApplicationModule,
      CandidateModule,
      JobPostingModule,
      InterviewModule,
      FileModule,
      CvScreeningModule,
      ChatbotAgentModule,
   ],
})
export class CoreModuleModule {}
