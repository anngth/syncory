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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created' })
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.create(createMessageDto, userId);
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get channel messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.messagesService.findChannelMessages(channelId, paginationDto);
  }

  @Get('channel/:channelId/pinned')
  @ApiOperation({ summary: 'Get pinned messages in channel' })
  @ApiResponse({ status: 200, description: 'Pinned messages retrieved' })
  async getPinnedMessages(@Param('channelId') channelId: string) {
    return this.messagesService.getPinnedMessages(channelId);
  }

  @Get('thread/:parentId')
  @ApiOperation({ summary: 'Get thread replies' })
  @ApiResponse({ status: 200, description: 'Thread replies retrieved' })
  async getThreadReplies(
    @Param('parentId') parentId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.messagesService.findThreadReplies(parentId, paginationDto);
  }

  @Get('search/:workspaceId')
  @ApiOperation({ summary: 'Search messages in workspace' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchMessages(
    @Param('workspaceId') workspaceId: string,
    @Query() searchDto: SearchMessagesDto,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.messagesService.searchMessages(workspaceId, searchDto, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: 200, description: 'Message found' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getById(@Param('id') id: string) {
    return this.messagesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update message' })
  @ApiResponse({ status: 200, description: 'Message updated' })
  @ApiResponse({ status: 403, description: 'Only sender can edit' })
  async update(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.update(id, updateMessageDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Only sender can delete' })
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    await this.messagesService.delete(id, userId);
    return { message: 'Message deleted successfully' };
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiResponse({ status: 200, description: 'Reaction added' })
  async addReaction(
    @Param('id') id: string,
    @Body() addReactionDto: AddReactionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.addReaction(id, addReactionDto, userId);
  }

  @Delete(':id/reactions/:emoji')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  async removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.removeReaction(id, emoji, userId);
  }

  @Put(':id/pin')
  @ApiOperation({ summary: 'Toggle pin status of message' })
  @ApiResponse({ status: 200, description: 'Pin status toggled' })
  async togglePin(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.messagesService.togglePin(id, userId);
  }
}
