import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageType } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { PaginationDto, PaginationResult } from '../common/dto/pagination.dto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private cacheService: CacheService,
  ) {}

  async create(createMessageDto: CreateMessageDto, userId: string): Promise<Message> {
    const message = new this.messageModel({
      ...createMessageDto,
      channelId: new Types.ObjectId(createMessageDto.channelId),
      workspaceId: new Types.ObjectId(createMessageDto.workspaceId),
      senderId: new Types.ObjectId(userId),
      parentId: createMessageDto.parentId ? new Types.ObjectId(createMessageDto.parentId) : null,
    });

    await message.save();

    // If this is a thread reply, increment parent's thread count
    if (createMessageDto.parentId) {
      await this.messageModel.findByIdAndUpdate(createMessageDto.parentId, {
        $inc: { threadCount: 1 },
      });
    }

    // Invalidate channel messages cache
    await this.invalidateChannelMessagesCache(createMessageDto.channelId);

    this.logger.log(`Message created in channel ${createMessageDto.channelId} by user ${userId}`);
    
    // Populate and return
    return await this.messageModel
      .findById(message._id)
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();
  }

  async findById(id: string): Promise<Message> {
    const message = await this.messageModel
      .findById(id)
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async findChannelMessages(
    channelId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<Message>> {
    const { page = 1, limit = 50 } = paginationDto;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({
          channelId: new Types.ObjectId(channelId),
          parentId: null, // Only top-level messages
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', '-password')
        .populate('reactions.userId', '-password')
        .populate('mentions', '-password')
        .exec(),
      this.messageModel.countDocuments({
        channelId: new Types.ObjectId(channelId),
        parentId: null,
        isDeleted: false,
      }),
    ]);

    return new PaginationResult(messages.reverse(), total, page, limit);
  }

  async findThreadReplies(parentId: string, paginationDto: PaginationDto): Promise<PaginationResult<Message>> {
    const { page = 1, limit = 50 } = paginationDto;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({
          parentId: new Types.ObjectId(parentId),
          isDeleted: false,
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', '-password')
        .populate('reactions.userId', '-password')
        .populate('mentions', '-password')
        .exec(),
      this.messageModel.countDocuments({
        parentId: new Types.ObjectId(parentId),
        isDeleted: false,
      }),
    ]);

    return new PaginationResult(messages, total, page, limit);
  }

  async update(id: string, updateMessageDto: UpdateMessageDto, userId: string): Promise<Message> {
    const message = await this.findById(id);

    // Only sender can edit
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Only message sender can edit message');
    }

    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...updateMessageDto,
            isEdited: true,
            editedAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();

    await this.invalidateChannelMessagesCache(message.channelId.toString());

    this.logger.log(`Message updated: ${id} by user ${userId}`);
    return updatedMessage;
  }

  async delete(id: string, userId: string): Promise<void> {
    const message = await this.findById(id);

    // Only sender can delete
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Only message sender can delete message');
    }

    await this.messageModel.findByIdAndUpdate(id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Message deleted]',
      },
    });

    await this.invalidateChannelMessagesCache(message.channelId.toString());

    this.logger.log(`Message deleted: ${id} by user ${userId}`);
  }

  async addReaction(messageId: string, addReactionDto: AddReactionDto, userId: string): Promise<Message> {
    const message = await this.findById(messageId);

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.emoji === addReactionDto.emoji && r.userId.toString() === userId,
    );

    if (existingReaction) {
      return message; // Already reacted
    }

    message.reactions.push({
      emoji: addReactionDto.emoji,
      userId: new Types.ObjectId(userId),
      createdAt: new Date(),
    });

    await message.save();

    return await this.messageModel
      .findById(messageId)
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();
  }

  async removeReaction(messageId: string, emoji: string, userId: string): Promise<Message> {
    const message = await this.findById(messageId);

    message.reactions = message.reactions.filter(
      (r) => !(r.emoji === emoji && r.userId.toString() === userId),
    );

    await message.save();

    return await this.messageModel
      .findById(messageId)
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();
  }

  async togglePin(messageId: string, userId: string): Promise<Message> {
    const message = await this.findById(messageId);

    message.isPinned = !message.isPinned;
    await message.save();

    this.logger.log(`Message pin toggled: ${messageId} by user ${userId}`);

    return await this.messageModel
      .findById(messageId)
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .populate('mentions', '-password')
      .exec();
  }

  async searchMessages(
    workspaceId: string,
    searchDto: SearchMessagesDto,
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<Message>> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const query: any = {
      workspaceId: new Types.ObjectId(workspaceId),
      isDeleted: false,
      $text: { $search: searchDto.query },
    };

    if (searchDto.channelId) {
      query.channelId = new Types.ObjectId(searchDto.channelId);
    }

    if (searchDto.senderId) {
      query.senderId = new Types.ObjectId(searchDto.senderId);
    }

    if (searchDto.startDate || searchDto.endDate) {
      query.createdAt = {};
      if (searchDto.startDate) {
        query.createdAt.$gte = new Date(searchDto.startDate);
      }
      if (searchDto.endDate) {
        query.createdAt.$lte = new Date(searchDto.endDate);
      }
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', '-password')
        .populate('channelId', 'name')
        .exec(),
      this.messageModel.countDocuments(query),
    ]);

    return new PaginationResult(messages, total, page, limit);
  }

  async getPinnedMessages(channelId: string): Promise<Message[]> {
    return await this.messageModel
      .find({
        channelId: new Types.ObjectId(channelId),
        isPinned: true,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .populate('senderId', '-password')
      .populate('reactions.userId', '-password')
      .exec();
  }

  // Helper methods
  private async invalidateChannelMessagesCache(channelId: string): Promise<void> {
    await this.cacheService.delete(this.cacheService.getChannelMessagesKey(channelId));
  }
}
