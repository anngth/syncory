import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '../schemas/channel.schema';

export class CreateChannelDto {
  @ApiProperty({ example: 'general' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'General discussion channel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ChannelType, default: ChannelType.PUBLIC })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiProperty()
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  topic?: string;
}
