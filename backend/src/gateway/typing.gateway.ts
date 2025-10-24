import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../common/services/cache.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/typing',
})
export class TypingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TypingGateway.name);
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private cacheService: CacheService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Typing connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;
      client.data.email = payload.email;

      this.logger.log(`Typing connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Typing connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    // Clean up any typing indicators
    this.typingTimeouts.forEach((timeout, key) => {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    });

    this.logger.log(`Typing disconnected: ${client.id}`);
  }

  @SubscribeMessage('startTyping')
  async handleStartTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;
    const timeoutKey = `${userId}:${channelId}`;

    try {
      // Add user to typing set in cache
      await this.cacheService.getClient().sadd(
        this.cacheService.getTypingUsersKey(channelId),
        userId,
      );
      await this.cacheService.expire(this.cacheService.getTypingUsersKey(channelId), 10);

      // Broadcast typing indicator to channel (except sender)
      client.to(`channel:${channelId}`).emit('userTyping', {
        userId,
        channelId,
        isTyping: true,
      });

      // Clear existing timeout
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
      }

      // Auto-stop typing after 5 seconds
      const timeout = setTimeout(async () => {
        await this.stopTyping(userId, channelId);
        this.typingTimeouts.delete(timeoutKey);
      }, 5000);

      this.typingTimeouts.set(timeoutKey, timeout);
    } catch (error) {
      this.logger.error('Error starting typing:', error.message);
    }
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;
    const timeoutKey = `${userId}:${channelId}`;

    try {
      await this.stopTyping(userId, channelId);

      // Clear timeout
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey));
        this.typingTimeouts.delete(timeoutKey);
      }

      // Broadcast stop typing to channel
      client.to(`channel:${channelId}`).emit('userTyping', {
        userId,
        channelId,
        isTyping: false,
      });
    } catch (error) {
      this.logger.error('Error stopping typing:', error.message);
    }
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    await client.join(`channel:${channelId}`);
    this.logger.log(`Client ${client.id} joined typing channel ${channelId}`);
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;

    await client.leave(`channel:${channelId}`);
    await this.stopTyping(userId, channelId);

    this.logger.log(`Client ${client.id} left typing channel ${channelId}`);
  }

  @SubscribeMessage('getTypingUsers')
  async handleGetTypingUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const typingUsers = await this.cacheService.getClient().smembers(
        this.cacheService.getTypingUsersKey(data.channelId),
      );

      client.emit('typingUsers', { channelId: data.channelId, users: typingUsers });
    } catch (error) {
      this.logger.error('Error getting typing users:', error.message);
    }
  }

  // Helper methods
  private async stopTyping(userId: string, channelId: string): Promise<void> {
    await this.cacheService.getClient().srem(
      this.cacheService.getTypingUsersKey(channelId),
      userId,
    );
  }
}
