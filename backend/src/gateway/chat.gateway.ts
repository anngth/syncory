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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { ChannelsService } from '../channels/channels.service';
import { CacheService } from '../common/services/cache.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private messagesService: MessagesService,
    private channelsService: ChannelsService,
    private cacheService: CacheService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Client connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store user data in socket
      client.data.userId = userId;
      client.data.email = payload.email;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('Client connection error:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;

    try {
      // Verify user has access to channel
      const channel = await this.channelsService.findById(channelId);
      if (!this.channelsService.isMember(channel, userId)) {
        client.emit('error', { message: 'Not a member of this channel' });
        return;
      }

      // Join channel room
      await client.join(`channel:${channelId}`);
      
      this.logger.log(`User ${userId} joined channel ${channelId}`);
      
      // Notify others in channel
      client.to(`channel:${channelId}`).emit('userJoined', {
        userId,
        channelId,
      });

      client.emit('joinedChannel', { channelId });
    } catch (error) {
      this.logger.error('Error joining channel:', error.message);
      client.emit('error', { message: 'Failed to join channel' });
    }
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;

    await client.leave(`channel:${channelId}`);
    
    this.logger.log(`User ${userId} left channel ${channelId}`);
    
    // Notify others in channel
    client.to(`channel:${channelId}`).emit('userLeft', {
      userId,
      channelId,
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const userId = client.data.userId;

    try {
      // Create message in database
      const message = await this.messagesService.create(data, userId);

      // Broadcast to channel
      this.server.to(`channel:${data.channelId}`).emit('newMessage', message);

      this.logger.log(`Message sent by ${userId} in channel ${data.channelId}`);
    } catch (error) {
      this.logger.error('Error sending message:', error.message);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.messagesService.update(
        data.messageId,
        { content: data.content },
        userId,
      );

      // Broadcast to channel
      this.server.to(`channel:${message.channelId}`).emit('messageEdited', message);

      this.logger.log(`Message ${data.messageId} edited by ${userId}`);
    } catch (error) {
      this.logger.error('Error editing message:', error.message);
      client.emit('error', { message: 'Failed to edit message' });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; channelId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.messagesService.delete(data.messageId, userId);

      // Broadcast to channel
      this.server.to(`channel:${data.channelId}`).emit('messageDeleted', {
        messageId: data.messageId,
      });

      this.logger.log(`Message ${data.messageId} deleted by ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting message:', error.message);
      client.emit('error', { message: 'Failed to delete message' });
    }
  }

  @SubscribeMessage('addReaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string; channelId: string },
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.messagesService.addReaction(
        data.messageId,
        { emoji: data.emoji },
        userId,
      );

      // Broadcast to channel
      this.server.to(`channel:${data.channelId}`).emit('reactionAdded', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId,
        reactions: message.reactions,
      });

      this.logger.log(`Reaction added to message ${data.messageId} by ${userId}`);
    } catch (error) {
      this.logger.error('Error adding reaction:', error.message);
      client.emit('error', { message: 'Failed to add reaction' });
    }
  }

  @SubscribeMessage('removeReaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string; channelId: string },
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.messagesService.removeReaction(
        data.messageId,
        data.emoji,
        userId,
      );

      // Broadcast to channel
      this.server.to(`channel:${data.channelId}`).emit('reactionRemoved', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId,
        reactions: message.reactions,
      });

      this.logger.log(`Reaction removed from message ${data.messageId} by ${userId}`);
    } catch (error) {
      this.logger.error('Error removing reaction:', error.message);
      client.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  // Method to send message from outside gateway
  sendMessageToChannel(channelId: string, event: string, data: any) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }
}
