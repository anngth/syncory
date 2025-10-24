import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
  @ApiProperty({ example: '👍' })
  @IsString()
  emoji: string;
}
