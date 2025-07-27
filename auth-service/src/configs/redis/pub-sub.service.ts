import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
   private publisher: RedisClientType;
   private subscriber: RedisClientType;

   async onModuleInit() {
      this.publisher = createClient({
         url: `redis://${process.env.REDIS_HOST_PUBLISHER}:${process.env.REDIS_PORT_PUBLISHER}`,
      });
      if (this.publisher) {
         console.log('REDIS PUB CONNECT');
      } else {
         console.log('REDIS PUB/SUB ERROR');
      }
      this.subscriber = createClient({
         url: `redis://${process.env.REDIS_HOST_SUBSCRIBER}:${process.env.REDIS_PORT_SUBSCRIBER}`,
      });
      if (this.subscriber) {
         console.log('REDIS SUB CONNECT');
      } else {
         console.log('REDIS PUB/SUB ERROR');
      }
      await this.publisher.connect();
      await this.subscriber.connect();
   }

   async onModuleDestroy() {
      await this.publisher.quit();
      await this.subscriber.quit();
   }

   //PUB/SUB
   async publish<T>(channel: string, message: T) {
      if (!this.publisher) {
         throw new Error('Redis publisher not initialized!');
      }
      await this.publisher.publish(channel, JSON.stringify(message));
   }

   async subscribe<T>(channel: string, callback: (message: T) => void) {
      if (!this.subscriber) {
         throw new Error('Redis subscriber not initialized!');
      }
      await this.subscriber.subscribe(channel, (message) => {
         callback(JSON.parse(message));
      });
   }
}
