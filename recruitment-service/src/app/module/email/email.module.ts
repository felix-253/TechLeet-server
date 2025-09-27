import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecruitmentEmailService } from './email.service';

@Module({
   imports: [ConfigModule],
   providers: [RecruitmentEmailService],
   exports: [RecruitmentEmailService],
})
export class RecruitmentEmailModule {}
