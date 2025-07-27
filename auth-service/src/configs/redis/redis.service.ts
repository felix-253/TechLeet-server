import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
   private client: Redis;

   async onModuleInit() {
      this.client = new Redis({
         host: process.env.REDIS_HOST || 'localhost',
         port: parseInt(<string>process.env.REDIS_PORT),
      });
      if (this.client) {
         console.log('Redis connected');
         this.client.set('test', 'test', 'EX', 1000);
      } else {
         console.log('Redis connection failed');
      }
   }
   async onModuleDestroy() {
      await this.client.quit();
   }

   //string
   /**
    * Cache String in redis
    * @param key
    * @param value
    * @param ttl
    */
   async set(key: string, value: any, ttl: number = 30 * 60): Promise<void> {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
   }

   async get<T>(key: string): Promise<T | null> {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
   }

   // hash
   /**
    *Cache data with data hash
    * @param key
    * @param value must is object
    * @param ttl time to live in seconds
    */
   async setHash<T extends Record<string, any>>(
      key: string,
      value: T,
      ttl: number = 30000,
   ): Promise<void> {
      const objectKeysValue = Object.entries(value).flat();
      await this.client.hset(key, ...objectKeysValue);
      await this.client.expire(key, ttl);
   }

   async getHash<T>(key: string): Promise<T> {
      const value = await this.client?.hgetall(key);
      return this.parseRecordStringToJson(value);
   }
   // link list
   /**
    * Link List redis
    * add into head
    * @param key
    * @param data  as list object [{},{}]
    * @param ttl
    */
   async pushList<T>(key: string, data: T[], ttl: number = 30 * 60): Promise<void> {
      await this.client.lpush(key, ...data.map((item) => JSON.stringify(item)));
      await this.client.expire(key, ttl);
   }

   /**
    *Get and remove Last -> STACK
    * @param key
    */
   async popLastList<T>(key: string): Promise<T | null> {
      const result = await this.client.rpop(key);
      return JSON.parse(result as string) || null;
   }

   /**
    *Get and Remove First -> QUEUE
    * @param key
    * @param data  as list object [{},{}]
    * @param ttl
    */
   async popFirstList<T>(key: string): Promise<T | null> {
      const result = await this.client.lpop(key);
      return JSON.parse(result as string) || null;
   }

   /**
    * get by index
    * @param key
    * @param index
    * @returns
    */
   async getIndexList<T>(key: string, index: number): Promise<T | null> {
      const result = await this.client.lindex(key, index);
      return JSON.parse(result as string) || null;
   }
   //sort
   /**
    * Add list object to set
    * @param key
    * @param data
    */
   async setSet<T>(key: string, data: T[], ttlInSeconds: number = 5 * 60): Promise<void> {
      await this.client.sadd(key, ...data.map((item) => JSON.stringify(item)));
      await this.client.expire(key, ttlInSeconds);
   }

   async addToSetIfNotExists<T>(key: string, item: T): Promise<void> {
      const members = await this.client.smembers(key);
      const exists = members.some((m) => m === JSON.stringify(item));

      if (!exists) {
         await this.client.sadd(key, JSON.stringify(item));
      }
   }

   async getAllSet<T>(key: string): Promise<T[]> {
      const result = await this.client.smembers(key);
      return this.parseArrayStringTOJSON(result);
   }

   async removeSet(key: string): Promise<void> {
      await this.client.del(key);
   }

   async removeByKeySet<T>(key: string, value: T): Promise<number> {
      const result = await this.client.srem(key, JSON.stringify(value));
      return result;
   }

   async isExistedSet<T>(key: string, value: T): Promise<number> {
      const result = await this.client.sismember(key, JSON.stringify(value));
      return result;
   }

   //sorted set

   async setSortedSet<T, R extends keyof T>(key: string, scoreField: R, data: T[]): Promise<void> {
      const parseScoreData = data
         .map((item) => {
            return [Number(item[scoreField]), JSON.stringify(item)];
         })
         .flat();

      await this.client.zadd(key, ...parseScoreData);
   }

   async getListItemBySortedSet<T>(
      key: string,
      orderby: Extract<'IndexASC' | 'IndexDESC', string>,
      to: number,
      from: number,
   ): Promise<T[] | null> {
      try {
         let result: string[] | null = null;
         switch (orderby) {
            case 'IndexASC':
               result = await this.client.zrange(key, to, from);
               break;
            case 'IndexDESC':
               result = await this.client.zrevrange(key, to, from);
               break;
         }
         if (result) {
            return this.parseArrayStringTOJSON(result);
         }
         return null;
      } catch (error) {
         throw error;
      }
   }

   async removeByKeySortedSet<T>(key: string, value: T): Promise<number> {
      const result = await this.client.zrem(key, JSON.stringify(value));
      return result;
   }

   async adjustScore<T>(key: string, adjustScore: number, member: T): Promise<T> {
      const adjustResult = await this.client.zincrby(key, adjustScore, JSON.stringify(member));
      return JSON.parse(adjustResult);
   }

   /**
    * get from A to B. default get all
    * @param key
    * @param toIndex default = 0
    * @param fromIndex default = -1
    */
   async getList<T>(key: string, fromIndex = 0, toIndex = -1): Promise<T[]> {
      const result = await this.client.lrange(key, fromIndex, toIndex);
      return this.parseArrayStringTOJSON<T>(result);
   }

   /**
    *
    * @param key
    * @returns
    * ttl > 0 => ttl in seconds
    * ttl = -1 => key exists but has no associated expire
    * ttl = -2 => key does not exist
    */
   async ttl(key: string): Promise<number> {
      return this.client.ttl(key);
   }

   /**
    * Check if key exists in redis
    * @param key
    * @returns boolean
    */
   async delete(key: string): Promise<void> {
      await this.client.del(key);
   }

   /**
    * Reset full database
    */
   async reset() {
      await this.client.flushall();
   }

   // parse redis to object T
   private parseArrayStringTOJSON<T>(objString: string[]): T[] {
      const parseResult = objString.map((string) => JSON.parse(string));
      return parseResult;
   }

   private parseRecordStringToJson<T>(objString: Record<string, string>): T {
      const parseResult = {} as T;
      for (const [k, v] of Object.entries(objString)) {
         try {
            parseResult[k] = JSON.parse(v);
         } catch {
            parseResult[k] = v;
         }
      }
      return parseResult;
   }
}
