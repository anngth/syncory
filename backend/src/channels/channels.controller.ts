import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({ status: 201, description: 'Channel created' })
  async create(
    @Body() createChannelDto: CreateChannelDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.create(createChannelDto, userId);
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'Get workspace channels' })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  async getWorkspaceChannels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.findWorkspaceChannels(workspaceId, userId);
  }

  @Get('workspace/:workspaceId/my')
  @ApiOperation({ summary: 'Get user channels in workspace' })
  @ApiResponse({ status: 200, description: 'User channels retrieved' })
  async getUserChannels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.findUserChannels(workspaceId, userId);
  }

  @Get('workspace/:workspaceId/direct/:userId')
  @ApiOperation({ summary: 'Get or find direct channel with user' })
  @ApiResponse({ status: 200, description: 'Direct channel found' })
  async getDirectChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.findDirectChannel(workspaceId, userId, targetUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel found' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async getById(@Param('id') id: string) {
    return this.channelsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel' })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.update(id, updateChannelDto, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to channel' })
  @ApiResponse({ status: 200, description: 'Member added' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.addMember(id, addMemberDto.userId, userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from channel' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelsService.removeMember(id, memberId, userId);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark channel as read' })
  @ApiResponse({ status: 200, description: 'Channel marked as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    await this.channelsService.updateLastRead(id, userId);
    return { message: 'Channel marked as read' };
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive channel' })
  @ApiResponse({ status: 200, description: 'Channel archived' })
  async archive(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.channelsService.archive(id, userId);
  }

  @Put(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive channel' })
  @ApiResponse({ status: 200, description: 'Channel unarchived' })
  async unarchive(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.channelsService.unarchive(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    await this.channelsService.delete(id, userId);
    return { message: 'Channel deleted successfully' };
  }
}
