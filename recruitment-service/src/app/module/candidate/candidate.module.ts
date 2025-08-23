import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { CandidateEntity } from '../../../entities/recruitment/candidate.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([CandidateEntity]),
   ],
   controllers: [CandidateController],
   providers: [CandidateService],
   exports: [CandidateService],
})
export class CandidateModule {}
