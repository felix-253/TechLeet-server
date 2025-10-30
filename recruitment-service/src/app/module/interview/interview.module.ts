import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { RecruitmentEmailModule } from '../email/email.module';

@Module({
   imports: [
      TypeOrmModule.forFeature([InterviewEntity, CandidateEntity, JobPostingEntity, ApplicationEntity]),
      RecruitmentEmailModule,
   ],
   controllers: [InterviewController],
   providers: [InterviewService],
   exports: [InterviewService],
})
export class InterviewModule {}
