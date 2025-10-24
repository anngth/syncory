import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(private redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisService.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const data = JSON.stringify(value);
      await this.redisService.set(key, data, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.redisService.exists(key);
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Cache key generators
  getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  getWorkspaceKey(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  getChannelKey(channelId: string): string {
    return `channel:${channelId}`;
  }

  getMessageKey(messageId: string): string {
    return `message:${messageId}`;
  }

  getUserWorkspacesKey(userId: string): string {
    return `user:${userId}:workspaces`;
  }

  getWorkspaceChannelsKey(workspaceId: string): string {
    return `workspace:${workspaceId}:channels`;
  }

  getChannelMessagesKey(channelId: string): string {
    return `channel:${channelId}:messages`;
  }

  getUserPresenceKey(userId: string): string {
    return `presence:${userId}`;
  }

  getOnlineUsersKey(workspaceId: string): string {
    return `workspace:${workspaceId}:online`;
  }

  getTypingUsersKey(channelId: string): string {
    return `channel:${channelId}:typing`;
  }
}
