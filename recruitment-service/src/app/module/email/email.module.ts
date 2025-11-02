import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RecruitmentEmailService } from './email.service';
import { EmailController } from './email.controller';

@Module({
   imports: [ConfigModule],
   controllers: [EmailController],
   providers: [RecruitmentEmailService],
   exports: [RecruitmentEmailService],
})
export class RecruitmentEmailModule {}
