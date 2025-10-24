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
import { UsersService } from '../users/users.service';
import { CacheService } from '../common/services/cache.service';
import { UserStatus } from '../users/schemas/user.schema';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private usersService: UsersService,
    private cacheService: CacheService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Presence connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;
      client.data.email = payload.email;

      // Set user online
      await this.setUserPresence(userId, UserStatus.ONLINE);

      this.logger.log(`Presence connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Presence connection error:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId) {
      // Check if user has other active connections
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      
      if (sockets.length === 0) {
        // No more connections, set user offline
        await this.setUserPresence(userId, UserStatus.OFFLINE);
      }
    }

    this.logger.log(`Presence disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinWorkspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    const { workspaceId } = data;
    const userId = client.data.userId;

    // Join workspace room
    await client.join(`workspace:${workspaceId}`);
    await client.join(`user:${userId}`);

    // Set user online in this workspace
    await this.cacheService.getClient().sadd(
      this.cacheService.getOnlineUsersKey(workspaceId),
      userId,
    );

    this.logger.log(`User ${userId} joined workspace ${workspaceId} presence`);

    // Broadcast user online status to workspace
    this.server.to(`workspace:${workspaceId}`).emit('userOnline', {
      userId,
      status: UserStatus.ONLINE,
      timestamp: new Date(),
    });

    // Send current online users to the joining user
    const onlineUsers = await this.cacheService.getClient().smembers(
      this.cacheService.getOnlineUsersKey(workspaceId),
    );

    client.emit('onlineUsers', { users: onlineUsers });
  }

  @SubscribeMessage('leaveWorkspace')
  async handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    const { workspaceId } = data;
    const userId = client.data.userId;

    await client.leave(`workspace:${workspaceId}`);

    // Remove from online users
    await this.cacheService.getClient().srem(
      this.cacheService.getOnlineUsersKey(workspaceId),
      userId,
    );

    this.logger.log(`User ${userId} left workspace ${workspaceId} presence`);

    // Broadcast user offline status
    this.server.to(`workspace:${workspaceId}`).emit('userOffline', {
      userId,
      status: UserStatus.OFFLINE,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('updateStatus')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: UserStatus; statusMessage?: string; workspaceId: string },
  ) {
    const userId = client.data.userId;

    try {
      // Update user status in database
      await this.usersService.updateStatus(userId, {
        status: data.status,
        statusMessage: data.statusMessage,
      });

      // Update presence in cache
      await this.setUserPresence(userId, data.status);

      this.logger.log(`User ${userId} status updated to ${data.status}`);

      // Broadcast status change to workspace
      this.server.to(`workspace:${data.workspaceId}`).emit('statusChanged', {
        userId,
        status: data.status,
        statusMessage: data.statusMessage,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error updating status:', error.message);
      client.emit('error', { message: 'Failed to update status' });
    }
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    try {
      const onlineUsers = await this.cacheService.getClient().smembers(
        this.cacheService.getOnlineUsersKey(data.workspaceId),
      );

      client.emit('onlineUsers', { users: onlineUsers });
    } catch (error) {
      this.logger.error('Error getting online users:', error.message);
      client.emit('error', { message: 'Failed to get online users' });
    }
  }

  // Helper methods
  private async setUserPresence(userId: string, status: UserStatus): Promise<void> {
    const presenceKey = this.cacheService.getUserPresenceKey(userId);
    await this.cacheService.set(presenceKey, { status, timestamp: new Date() }, 300); // 5 min TTL
  }

  async broadcastToWorkspace(workspaceId: string, event: string, data: any) {
    this.server.to(`workspace:${workspaceId}`).emit(event, data);
  }
}
