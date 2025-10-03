import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { InterviewEntity } from '../../../entities/recruitment/interview.entity';

@Module({
   imports: [TypeOrmModule.forFeature([InterviewEntity])],
   controllers: [InterviewController],
   providers: [InterviewService],
   exports: [InterviewService],
})
export class InterviewModule {}
