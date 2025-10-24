import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async delHash(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async setAdd(key: string, member: string): Promise<void> {
    await this.client.sadd(key, member);
  }

  async setRemove(key: string, member: string): Promise<void> {
    await this.client.srem(key, member);
  }

  async setMembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async setIsMember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
}
