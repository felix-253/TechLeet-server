import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';
import { CvScreeningModule } from '../cv-screening/cv-screening.module';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         ApplicationEntity,
         JobPostingEntity,
         CandidateEntity,
      ]),
      CvScreeningModule,
   ],
   controllers: [ApplicationController],
   providers: [ApplicationService],
   exports: [ApplicationService],
})
export class ApplicationModule {}
