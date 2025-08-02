import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '@/app/configs/redis';

@Global()
@Module({
   imports: [ConfigModule],
   providers: [EmailService, RedisService],
   exports: [EmailService],
})
export class EmailModule {}
