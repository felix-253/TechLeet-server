import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostingController } from './job-posting.controller';
import { JobPostingService } from './job-posting.service';
import { JobPostingEntity } from '../../../entities/recruitment/job-posting.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([JobPostingEntity]),
   ],
   controllers: [JobPostingController],
   providers: [JobPostingService],
   exports: [JobPostingService],
})
export class JobPostingModule {}
