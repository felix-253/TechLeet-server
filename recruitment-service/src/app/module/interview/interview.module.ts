import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';
import { ApplicationEntity } from '../../../entities/recruitment/application.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         InterviewEntity,
         ApplicationEntity,
      ]),
   ],
   controllers: [InterviewController],
   providers: [InterviewService],
   exports: [InterviewService],
})
export class InterviewModule {}
