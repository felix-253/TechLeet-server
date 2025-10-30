import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { CvScreeningModule } from '../cv-screening/cv-screening.module';
import { RecruitmentEmailModule } from '../email/email.module';
import { QuestionModule } from '../question/question.module';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         ApplicationEntity,
         JobPostingEntity,
         CandidateEntity,
         InterviewEntity,
      ]),
      CvScreeningModule,
      RecruitmentEmailModule,
      QuestionModule,
   ],
   controllers: [ApplicationController],
   providers: [ApplicationService],
   exports: [ApplicationService],
})
export class ApplicationModule {}
