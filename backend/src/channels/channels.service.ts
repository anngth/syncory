import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Channel, ChannelType } from './schemas/channel.schema';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<Channel>,
    private cacheService: CacheService,
  ) {}

  async create(createChannelDto: CreateChannelDto, userId: string): Promise<Channel> {
    // Check if channel name already exists in workspace
    const existing = await this.channelModel.findOne({
      workspaceId: new Types.ObjectId(createChannelDto.workspaceId),
      name: createChannelDto.name,
    });

    if (existing) {
      throw new ConflictException('Channel with this name already exists in workspace');
    }

    const channel = new this.channelModel({
      ...createChannelDto,
      workspaceId: new Types.ObjectId(createChannelDto.workspaceId),
      createdBy: new Types.ObjectId(userId),
      members: [
        {
          userId: new Types.ObjectId(userId),
          joinedAt: new Date(),
        },
      ],
    });

    await channel.save();

    // Cache channel
    await this.cacheChannel(channel);
    await this.invalidateWorkspaceChannelsCache(createChannelDto.workspaceId);

    this.logger.log(`Channel created: ${channel.name} in workspace ${createChannelDto.workspaceId}`);
    return channel;
  }

  async findById(id: string): Promise<Channel> {
    // Try cache first
    const cacheKey = this.cacheService.getChannelKey(id);
    const cached = await this.cacheService.get<Channel>(cacheKey);
    if (cached) return cached;

    const channel = await this.channelModel
      .findById(id)
      .populate('members.userId', '-password')
      .populate('createdBy', '-password')
      .exec();

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.cacheChannel(channel);
    return channel;
  }

  async findWorkspaceChannels(workspaceId: string, userId: string): Promise<Channel[]> {
    // Try cache first
    const cacheKey = this.cacheService.getWorkspaceChannelsKey(workspaceId);
    const cached = await this.cacheService.get<Channel[]>(cacheKey);
    if (cached) {
      // Filter by user access
      return this.filterChannelsByAccess(cached, userId);
    }

    const channels = await this.channelModel
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        isArchived: false,
      })
      .populate('members.userId', '-password')
      .populate('createdBy', '-password')
      .sort({ createdAt: 1 })
      .exec();

    // Cache result
    await this.cacheService.set(cacheKey, channels, 1800); // 30 minutes

    return this.filterChannelsByAccess(channels, userId);
  }

  async findUserChannels(workspaceId: string, userId: string): Promise<Channel[]> {
    return await this.channelModel
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        'members.userId': new Types.ObjectId(userId),
        isArchived: false,
      })
      .populate('members.userId', '-password')
      .populate('createdBy', '-password')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findDirectChannel(workspaceId: string, user1Id: string, user2Id: string): Promise<Channel | null> {
    return await this.channelModel
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        type: ChannelType.DIRECT,
        $and: [
          { 'members.userId': new Types.ObjectId(user1Id) },
          { 'members.userId': new Types.ObjectId(user2Id) },
        ],
      })
      .populate('members.userId', '-password')
      .exec();
  }

  async update(id: string, updateChannelDto: UpdateChannelDto, userId: string): Promise<Channel> {
    const channel = await this.findById(id);

    // Check permissions (creator or workspace admin)
    if (channel.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only channel creator can update channel');
    }

    const updatedChannel = await this.channelModel
      .findByIdAndUpdate(id, { $set: updateChannelDto }, { new: true })
      .populate('members.userId', '-password')
      .populate('createdBy', '-password')
      .exec();

    // Update cache
    await this.cacheChannel(updatedChannel);
    await this.invalidateWorkspaceChannelsCache(channel.workspaceId.toString());

    this.logger.log(`Channel updated: ${id} by user ${userId}`);
    return updatedChannel;
  }

  async addMember(channelId: string, userId: string, requestUserId: string): Promise<Channel> {
    const channel = await this.findById(channelId);

    // Check if already a member
    const isMember = channel.members.some((m) => m.userId.toString() === userId);
    if (isMember) {
      throw new ConflictException('User is already a member');
    }

    // For private channels, only members can add others
    if (channel.type === ChannelType.PRIVATE) {
      const isRequesterMember = channel.members.some((m) => m.userId.toString() === requestUserId);
      if (!isRequesterMember) {
        throw new ForbiddenException('Only channel members can add others');
      }
    }

    channel.members.push({
      userId: new Types.ObjectId(userId),
      joinedAt: new Date(),
    });

    await channel.save();

    // Update cache
    await this.cacheChannel(channel);

    this.logger.log(`Member added to channel ${channelId}: ${userId}`);
    return channel;
  }

  async removeMember(channelId: string, userId: string, requestUserId: string): Promise<Channel> {
    const channel = await this.findById(channelId);

    // Users can remove themselves, or creator can remove others
    if (userId !== requestUserId && channel.createdBy.toString() !== requestUserId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    channel.members = channel.members.filter((m) => m.userId.toString() !== userId);
    await channel.save();

    // Update cache
    await this.cacheChannel(channel);

    this.logger.log(`Member removed from channel ${channelId}: ${userId}`);
    return channel;
  }

  async updateLastRead(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) return;

    const member = channel.members.find((m) => m.userId.toString() === userId);
    if (member) {
      member.lastRead = new Date();
      await channel.save();
      await this.cacheChannel(channel);
    }
  }

  async archive(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.findById(channelId);

    // Check permissions
    if (channel.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only channel creator can archive channel');
    }

    channel.isArchived = true;
    await channel.save();

    // Update cache
    await this.cacheChannel(channel);
    await this.invalidateWorkspaceChannelsCache(channel.workspaceId.toString());

    this.logger.log(`Channel archived: ${channelId} by user ${userId}`);
    return channel;
  }

  async unarchive(channelId: string, userId: string): Promise<Channel> {
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check permissions
    if (channel.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only channel creator can unarchive channel');
    }

    channel.isArchived = false;
    await channel.save();

    // Update cache
    await this.cacheChannel(channel);
    await this.invalidateWorkspaceChannelsCache(channel.workspaceId.toString());

    this.logger.log(`Channel unarchived: ${channelId} by user ${userId}`);
    return channel;
  }

  async delete(id: string, userId: string): Promise<void> {
    const channel = await this.findById(id);

    // Only creator can delete
    if (channel.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only channel creator can delete channel');
    }

    await this.channelModel.findByIdAndDelete(id).exec();

    // Clear cache
    await this.cacheService.delete(this.cacheService.getChannelKey(id));
    await this.invalidateWorkspaceChannelsCache(channel.workspaceId.toString());

    this.logger.log(`Channel deleted: ${id} by user ${userId}`);
  }

  // Helper methods
  private filterChannelsByAccess(channels: Channel[], userId: string): Channel[] {
    return channels.filter((channel) => {
      if (channel.type === ChannelType.PUBLIC) return true;
      return channel.members.some((m) => m.userId.toString() === userId);
    });
  }

  private async cacheChannel(channel: Channel): Promise<void> {
    const cacheKey = this.cacheService.getChannelKey(channel._id.toString());
    await this.cacheService.set(cacheKey, channel, 3600); // 1 hour
  }

  private async invalidateWorkspaceChannelsCache(workspaceId: string): Promise<void> {
    await this.cacheService.delete(this.cacheService.getWorkspaceChannelsKey(workspaceId));
  }

  isMember(channel: Channel, userId: string): boolean {
    return channel.members.some((m) => m.userId.toString() === userId);
  }
}
