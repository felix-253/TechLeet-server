import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class AnalyticsCacheService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(AnalyticsCacheService.name);
   private redisClient: ReturnType<typeof createClient> | null = null;
   private readonly enabled: boolean;

   constructor(private readonly configService: ConfigService) {
      this.enabled = this.configService.get<boolean>('REDIS_ENABLED', true);
   }

   async onModuleInit() {
      if (!this.enabled) {
         this.logger.warn('Redis caching is disabled');
         return;
      }

      try {
         const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
         const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
         const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
         const redisDb = this.configService.get<number>('REDIS_DB', 0);

         this.redisClient = createClient({
            socket: {
               host: redisHost,
               port: redisPort,
            },
            password: redisPassword,
            database: redisDb,
         });

         this.redisClient.on('error', (err) => {
            this.logger.error(`Redis Client Error: ${err.message}`);
         });

         await this.redisClient.connect();
         this.logger.log(`Redis cache connected: ${redisHost}:${redisPort}`);
      } catch (error) {
         this.logger.error(`Failed to connect to Redis: ${error.message}`);
         this.redisClient = null;
      }
   }

   async onModuleDestroy() {
      if (this.redisClient) {
         await this.redisClient.quit();
      }
   }

   private getCacheKey(endpoint: string, params?: Record<string, any>): string {
      const paramString = params
         ? Object.entries(params)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => `${key}:${value}`)
              .join(':')
         : '';
      return `dashboard:${endpoint}${paramString ? `:${paramString}` : ''}`;
   }

   async get<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
      if (!this.enabled || !this.redisClient) {
         return null;
      }

      try {
         const key = this.getCacheKey(endpoint, params);
         const cached = await this.redisClient.get(key);
         
         if (cached) {
            this.logger.debug(`Cache hit for key: ${key}`);
            return JSON.parse(cached) as T;
         }

         this.logger.debug(`Cache miss for key: ${key}`);
         return null;
      } catch (error) {
         this.logger.error(`Error getting cache for ${endpoint}: ${error.message}`);
         return null;
      }
   }

   async set<T>(
      endpoint: string,
      data: T,
      ttlSeconds: number = 300,
      params?: Record<string, any>,
   ): Promise<void> {
      if (!this.enabled || !this.redisClient) {
         return;
      }

      try {
         const key = this.getCacheKey(endpoint, params);
         await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
         this.logger.debug(`Cache set for key: ${key} with TTL: ${ttlSeconds}s`);
      } catch (error) {
         this.logger.error(`Error setting cache for ${endpoint}: ${error.message}`);
      }
   }

   async invalidate(endpoint: string, params?: Record<string, any>): Promise<void> {
      if (!this.enabled || !this.redisClient) {
         return;
      }

      try {
         const key = this.getCacheKey(endpoint, params);
         await this.redisClient.del(key);
         this.logger.debug(`Cache invalidated for key: ${key}`);
      } catch (error) {
         this.logger.error(`Error invalidating cache for ${endpoint}: ${error.message}`);
      }
   }

   async invalidatePattern(pattern: string): Promise<void> {
      if (!this.enabled || !this.redisClient) {
         return;
      }

      try {
         const keys = await this.redisClient.keys(`dashboard:${pattern}*`);
         if (keys.length > 0) {
            await this.redisClient.del(keys);
            this.logger.debug(`Cache invalidated for pattern: ${pattern} (${keys.length} keys)`);
         }
      } catch (error) {
         this.logger.error(`Error invalidating cache pattern ${pattern}: ${error.message}`);
      }
   }
}

