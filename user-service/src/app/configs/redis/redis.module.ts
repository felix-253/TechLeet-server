import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './pub-sub.service';
@Global()
@Module({
   providers: [RedisService, RedisPubSubService],
   exports: [RedisService, RedisPubSubService],
})
export class RedisModule {}
