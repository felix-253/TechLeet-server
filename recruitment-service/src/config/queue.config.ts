import { ConfigService } from '@nestjs/config';
import { Queue, QueueOptions } from 'bullmq';

export interface QueueConfig {
   redis: {
      host: string;
      port: number;
      password?: string;
      db?: number;
   };
   defaultJobOptions: {
      removeOnComplete: number;
      removeOnFail: number;
      attempts: number;
      backoff: {
         type: string;
         delay: number;
      };
   };
}

export const getQueueConfig = (configService: ConfigService): QueueConfig => ({
   redis: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
   },
   defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
      attempts: 3, // Retry failed jobs up to 3 times
      backoff: {
         type: 'exponential',
         delay: 2000, // Start with 2 second delay
      },
   },
});

export const createQueueOptions = (configService: ConfigService): QueueOptions => {
   const config = getQueueConfig(configService);
   
   return {
      connection: config.redis,
      defaultJobOptions: config.defaultJobOptions,
   };
};
