import { IsString, IsEnum, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hello, world!' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Parent message ID for thread replies' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    thumbnailUrl?: string;
  }>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  mentions?: string[];
}
