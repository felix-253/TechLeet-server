import { Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';
import { CandidateModule } from './candidate/candidate.module';
import { InterviewModule } from './interview/interview.module';
import { JobPostingModule } from './job-posting/job-posting.module';
import { FileModule } from './file/file.module';
import { CvScreeningModule } from './cv-screening/cv-screening.module';

@Module({
   imports: [
      ApplicationModule,
      CandidateModule,
      InterviewModule,
      JobPostingModule,
      FileModule,
      CvScreeningModule,
   ],
})
export class CoreModuleModule {}
