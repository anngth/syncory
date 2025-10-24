import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMessagesDto {
  @ApiProperty({ example: 'search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
